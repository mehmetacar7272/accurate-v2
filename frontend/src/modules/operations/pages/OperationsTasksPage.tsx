import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type SortKey =
  | 'created_desc'
  | 'deadline_asc'
  | 'priority_desc'
  | 'assignee_asc'
  | 'status_asc'

type Task = {
  id: number
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee?: string | null
  deadline?: string | null
  created_at: string
  updated_at: string
}

type TaskFilters = {
  statuses: TaskStatus[]
  priorities: TaskPriority[]
  assignee: string
  overdueOnly: boolean
  dueTodayOnly: boolean
}

type DashboardMetrics = {
  total: number
  pending: number
  in_progress: number
  completed: number
  cancelled: number
  overdue: number
  due_today: number
  by_priority: Record<TaskPriority, number>
  by_assignee: Record<string, number>
}

type ToastItem = {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

type ApiAdapter = {
  loadTasks: () => Promise<Task[]>
  createTask: (payload: Partial<Task>) => Promise<Task>
  updateTask: (taskId: number, payload: Partial<Task>) => Promise<Task>
  deleteTask: (taskId: number) => Promise<void>
}

type OperationsTaskBoardProps = {
  api?: ApiAdapter
  storageKey?: string
  title?: string
}

const BOARD_STORAGE_KEY = 'accurate.operations.taskboard.v2'
const TASKS_CACHE_KEY = 'accurate.operations.tasks.cache.v2'
const API_BASE = 'http://127.0.0.1:8000/api/v1'

const STATUS_META: Record<
  TaskStatus,
  { label: string; badge: string; column: string; header: string }
> = {
  PENDING: {
    label: 'Planlandı',
    badge: 'bg-slate-100 text-slate-700 border border-slate-200',
    column: 'Planlandı',
    header: 'bg-slate-50 border-slate-200',
  },
  IN_PROGRESS: {
    label: 'Devam Ediyor',
    badge: 'bg-amber-100 text-amber-800 border border-amber-200',
    column: 'Devam Ediyor',
    header: 'bg-amber-50 border-amber-200',
  },
  COMPLETED: {
    label: 'Tamamlandı',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    column: 'Tamamlandı',
    header: 'bg-emerald-50 border-emerald-200',
  },
  CANCELLED: {
    label: 'İptal',
    badge: 'bg-rose-100 text-rose-800 border border-rose-200',
    column: 'İptal',
    header: 'bg-rose-50 border-rose-200',
  },
}

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; badge: string; weight: number }
> = {
  LOW: {
    label: 'Düşük',
    badge: 'bg-slate-100 text-slate-700 border border-slate-200',
    weight: 1,
  },
  MEDIUM: {
    label: 'Orta',
    badge: 'bg-blue-100 text-blue-700 border border-blue-200',
    weight: 2,
  },
  HIGH: {
    label: 'Yüksek',
    badge: 'bg-orange-100 text-orange-700 border border-orange-200',
    weight: 3,
  },
  CRITICAL: {
    label: 'Kritik',
    badge: 'bg-red-100 text-red-700 border border-red-200',
    weight: 4,
  },
}

const STATUSES: TaskStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function nowIso() {
  return new Date().toISOString()
}

function toDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function isToday(value?: string | null) {
  const d = toDate(value)
  if (!d) return false
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function isOverdue(task: Task) {
  if (!task.deadline) return false
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return false
  const deadline = toDate(task.deadline)
  if (!deadline) return false
  return deadline.getTime() < Date.now()
}

function formatDate(value?: string | null) {
  const d = toDate(value)
  if (!d) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

function formatDateTime(value?: string | null) {
  const d = toDate(value)
  if (!d) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function normalizeTask(task: Partial<Task>, fallbackId = Date.now()): Task {
  return {
    id: Number(task.id ?? fallbackId),
    title: String(task.title ?? '').trim() || 'Başlıksız Görev',
    description: task.description ?? '',
    status: (task.status as TaskStatus) ?? 'PENDING',
    priority: (task.priority as TaskPriority) ?? 'MEDIUM',
    assignee: task.assignee ?? '',
    deadline: task.deadline ?? null,
    created_at: task.created_at ?? nowIso(),
    updated_at: task.updated_at ?? nowIso(),
  }
}

function calculateMetrics(tasks: Task[]): DashboardMetrics {
  const metrics: DashboardMetrics = {
    total: tasks.length,
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
    due_today: 0,
    by_priority: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    },
    by_assignee: {},
  }

  for (const task of tasks) {
    if (task.status === 'PENDING') metrics.pending += 1
    if (task.status === 'IN_PROGRESS') metrics.in_progress += 1
    if (task.status === 'COMPLETED') metrics.completed += 1
    if (task.status === 'CANCELLED') metrics.cancelled += 1

    if (isOverdue(task)) metrics.overdue += 1
    if (isToday(task.deadline)) metrics.due_today += 1

    metrics.by_priority[task.priority] += 1

    const assignee = (task.assignee || 'Atanmamış').trim()
    metrics.by_assignee[assignee] = (metrics.by_assignee[assignee] || 0) + 1
  }

  return metrics
}

function filterTasks(
  tasks: Task[],
  search: string,
  filters: TaskFilters
): Task[] {
  const q = search.trim().toLowerCase()

  return tasks.filter((task) => {
    const matchesSearch =
      !q ||
      task.title.toLowerCase().includes(q) ||
      String(task.description || '').toLowerCase().includes(q) ||
      String(task.assignee || '').toLowerCase().includes(q)

    const matchesStatus =
      filters.statuses.length === 0 || filters.statuses.includes(task.status)

    const matchesPriority =
      filters.priorities.length === 0 ||
      filters.priorities.includes(task.priority)

    const matchesAssignee =
      !filters.assignee ||
      String(task.assignee || '')
        .toLowerCase()
        .includes(filters.assignee.toLowerCase())

    const matchesOverdue = !filters.overdueOnly || isOverdue(task)
    const matchesDueToday = !filters.dueTodayOnly || isToday(task.deadline)

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesAssignee &&
      matchesOverdue &&
      matchesDueToday
    )
  })
}

function sortTasks(tasks: Task[], sortKey: SortKey): Task[] {
  const list = [...tasks]

  list.sort((a, b) => {
    switch (sortKey) {
      case 'created_desc':
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

      case 'deadline_asc': {
        const da = a.deadline
          ? new Date(a.deadline).getTime()
          : Number.MAX_SAFE_INTEGER
        const db = b.deadline
          ? new Date(b.deadline).getTime()
          : Number.MAX_SAFE_INTEGER
        return da - db
      }

      case 'priority_desc':
        return PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight

      case 'assignee_asc':
        return String(a.assignee || '').localeCompare(
          String(b.assignee || ''),
          'tr'
        )

      case 'status_asc':
        return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status)

      default:
        return 0
    }
  })

  return list
}

function usePersistentBoardState(storageKey: string) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_desc')
  const [filters, setFilters] = useState<TaskFilters>({
    statuses: [],
    priorities: [],
    assignee: '',
    overdueOnly: false,
    dueTodayOnly: false,
  })

  useEffect(() => {
    const saved = safeJsonParse<{
      search: string
      sortKey: SortKey
      filters: TaskFilters
    } | null>(localStorage.getItem(storageKey), null)

    if (!saved) return
    setSearch(saved.search ?? '')
    setSortKey(saved.sortKey ?? 'created_desc')
    setFilters(
      saved.filters ?? {
        statuses: [],
        priorities: [],
        assignee: '',
        overdueOnly: false,
        dueTodayOnly: false,
      }
    )
  }, [storageKey])

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        search,
        sortKey,
        filters,
      })
    )
  }, [storageKey, search, sortKey, filters])

  return {
    search,
    setSearch,
    sortKey,
    setSortKey,
    filters,
    setFilters,
  }
}

function Toasts({
  items,
  onRemove,
}: {
  items: ToastItem[]
  onRemove: (id: number) => void
}) {
  useEffect(() => {
    if (items.length === 0) return
    const timers = items.map((item) =>
      window.setTimeout(() => onRemove(item.id), 2800)
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [items, onRemove])

  return (
    <div className="fixed right-4 top-4 z-[100] flex w-[340px] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${
            item.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : item.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-slate-200 bg-white text-slate-800'
          }`}
        >
          <div className="text-sm font-medium">{item.message}</div>
        </div>
      ))}
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  )
}

function DashboardSummary({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-7">
      <MetricCard label="Toplam" value={metrics.total} />
      <MetricCard label="Planlandı" value={metrics.pending} />
      <MetricCard label="Devam Ediyor" value={metrics.in_progress} />
      <MetricCard label="Tamamlandı" value={metrics.completed} />
      <MetricCard label="İptal" value={metrics.cancelled} />
      <MetricCard label="Geciken" value={metrics.overdue} />
      <MetricCard label="Bugün" value={metrics.due_today} />
    </div>
  )
}

function TaskToolbar({
  search,
  setSearch,
  sortKey,
  setSortKey,
  filters,
  setFilters,
  assignees,
  onCreate,
  totalFiltered,
}: {
  search: string
  setSearch: (value: string) => void
  sortKey: SortKey
  setSortKey: (value: SortKey) => void
  filters: TaskFilters
  setFilters: React.Dispatch<React.SetStateAction<TaskFilters>>
  assignees: string[]
  onCreate: () => void
  totalFiltered: number
}) {
  const toggleStatus = (status: TaskStatus) => {
    setFilters((prev) => {
      const exists = prev.statuses.includes(status)
      return {
        ...prev,
        statuses: exists
          ? prev.statuses.filter((s) => s !== status)
          : [...prev.statuses, status],
      }
    })
  }

  const togglePriority = (priority: TaskPriority) => {
    setFilters((prev) => {
      const exists = prev.priorities.includes(priority)
      return {
        ...prev,
        priorities: exists
          ? prev.priorities.filter((p) => p !== priority)
          : [...prev.priorities, priority],
      }
    })
  }

  const clearFilters = () => {
    setSearch('')
    setSortKey('created_desc')
    setFilters({
      statuses: [],
      priorities: [],
      assignee: '',
      overdueOnly: false,
      dueTodayOnly: false,
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-3 xl:flex-row xl:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Görev ara..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-400 xl:max-w-sm"
          />

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
          >
            <option value="created_desc">Sıralama: Yeni oluşturulan</option>
            <option value="deadline_asc">Sıralama: Son tarih yakın</option>
            <option value="priority_desc">Sıralama: Öncelik yüksek</option>
            <option value="assignee_asc">Sıralama: Atanan kişi</option>
            <option value="status_asc">Sıralama: Durum</option>
          </select>

          <select
            value={filters.assignee}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, assignee: e.target.value }))
            }
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
          >
            <option value="">Tüm kişiler</option>
            {assignees.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearFilters}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Temizle
          </button>
          <button
            onClick={onCreate}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Yeni Görev
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((status) => {
          const active = filters.statuses.includes(status)
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {STATUS_META[status].label}
            </button>
          )
        })}

        {PRIORITIES.map((priority) => {
          const active = filters.priorities.includes(priority)
          return (
            <button
              key={priority}
              onClick={() => togglePriority(priority)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {PRIORITY_META[priority].label}
            </button>
          )
        })}

        <button
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              overdueOnly: !prev.overdueOnly,
            }))
          }
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            filters.overdueOnly
              ? 'bg-rose-600 text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Gecikenler
        </button>

        <button
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              dueTodayOnly: !prev.dueTodayOnly,
            }))
          }
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            filters.dueTodayOnly
              ? 'bg-blue-600 text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Bugün Bitecekler
        </button>

        <div className="ml-auto text-xs text-slate-500">
          Görünen görev: <span className="font-semibold">{totalFiltered}</span>
        </div>
      </div>
    </div>
  )
}

function TaskModal({
  open,
  mode,
  initialTask,
  onClose,
  onSubmit,
}: {
  open: boolean
  mode: 'create' | 'edit'
  initialTask?: Task | null
  onClose: () => void
  onSubmit: (payload: Partial<Task>) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('PENDING')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [assignee, setAssignee] = useState('')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setTitle(initialTask?.title ?? '')
    setDescription(initialTask?.description ?? '')
    setStatus(initialTask?.status ?? 'PENDING')
    setPriority(initialTask?.priority ?? 'MEDIUM')
    setAssignee(initialTask?.assignee ?? '')
    setDeadline(
      initialTask?.deadline
        ? new Date(initialTask.deadline).toISOString().slice(0, 10)
        : ''
    )
  }, [open, initialTask])

  if (!open) return null

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSubmit({
        title,
        description,
        status,
        priority,
        assignee,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {mode === 'create' ? 'Yeni Görev' : 'Görev Düzenle'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Başlık
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Açıklama
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Durum
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {STATUS_META[item].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Öncelik
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
              >
                {PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {PRIORITY_META[item].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Atanan kişi
              </label>
              <input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Son tarih
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskQuickActions({
  task,
  onEdit,
  onDuplicate,
  onDelete,
  onQuickPatch,
}: {
  task: Task
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onQuickPatch: (payload: Partial<Task>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
        title="Hızlı İşlemler"
      >
        ⋯
      </button>

      {open ? (
        <div className="absolute right-0 top-9 z-30 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Durum
          </div>
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => {
                onQuickPatch({ status })
                setOpen(false)
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span>{STATUS_META[status].label}</span>
              {task.status === status ? <span>✓</span> : null}
            </button>
          ))}

          <div className="my-1 border-t border-slate-100" />
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Öncelik
          </div>
          {PRIORITIES.map((priority) => (
            <button
              key={priority}
              onClick={() => {
                onQuickPatch({ priority })
                setOpen(false)
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span>{PRIORITY_META[priority].label}</span>
              {task.priority === priority ? <span>✓</span> : null}
            </button>
          ))}

          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={() => {
              onEdit()
              setOpen(false)
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Düzenle
          </button>

          <button
            onClick={() => {
              const assignee = window.prompt(
                'Atanan kişiyi girin:',
                task.assignee || ''
              )
              if (assignee !== null) onQuickPatch({ assignee })
              setOpen(false)
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Atanan kişiyi değiştir
          </button>

          <button
            onClick={() => {
              const deadline = window.prompt(
                'Son tarih girin (YYYY-MM-DD):',
                task.deadline ? task.deadline.slice(0, 10) : ''
              )
              if (deadline !== null) {
                onQuickPatch({
                  deadline: deadline ? new Date(deadline).toISOString() : null,
                })
              }
              setOpen(false)
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Son tarihi değiştir
          </button>

          <button
            onClick={() => {
              onDuplicate()
              setOpen(false)
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Kopyala
          </button>

          <button
            onClick={() => {
              onDelete()
              setOpen(false)
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
          >
            Sil
          </button>
        </div>
      ) : null}
    </div>
  )
}

function TaskCard({
  task,
  onDragStart,
  onEdit,
  onDuplicate,
  onDelete,
  onQuickPatch,
  busy,
}: {
  task: Task
  onDragStart: (taskId: number) => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onQuickPatch: (payload: Partial<Task>) => void
  busy: boolean
}) {
  const overdue = isOverdue(task)

  return (
    <div
      draggable={!busy}
      onDragStart={() => onDragStart(task.id)}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        overdue
          ? 'border-rose-300 ring-1 ring-rose-200'
          : 'border-slate-200 hover:border-slate-300'
      } ${busy ? 'cursor-wait opacity-70' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold text-slate-900">
            {task.title}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Oluşturma: {formatDateTime(task.created_at)}
          </div>
        </div>

        <TaskQuickActions
          task={task}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onQuickPatch={onQuickPatch}
        />
      </div>

      {task.description ? (
        <div className="mb-3 line-clamp-3 text-sm text-slate-600">
          {task.description}
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_META[task.status].badge}`}
        >
          {STATUS_META[task.status].label}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_META[task.priority].badge}`}
        >
          {PRIORITY_META[task.priority].label}
        </span>
        {overdue ? (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
            Gecikmiş
          </span>
        ) : null}
      </div>

      <div className="space-y-1 text-xs text-slate-600">
        <div>
          <span className="font-medium text-slate-700">Atanan:</span>{' '}
          {task.assignee || 'Atanmamış'}
        </div>
        <div>
          <span className="font-medium text-slate-700">Son tarih:</span>{' '}
          {formatDate(task.deadline)}
        </div>
      </div>
    </div>
  )
}

function KanbanColumn({
  status,
  tasks,
  draggingTaskId,
  onDropTask,
  onDragStart,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  onQuickPatch,
  busyTaskIds,
}: {
  status: TaskStatus
  tasks: Task[]
  draggingTaskId: number | null
  onDropTask: (status: TaskStatus) => void
  onDragStart: (taskId: number) => void
  onEditTask: (task: Task) => void
  onDuplicateTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  onQuickPatch: (task: Task, payload: Partial<Task>) => void
  busyTaskIds: Set<number>
}) {
  const [isOver, setIsOver] = useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsOver(false)
        onDropTask(status)
      }}
      className={`min-h-[520px] rounded-2xl border p-3 transition ${
        isOver
          ? 'border-red-400 bg-red-50'
          : `border-slate-200 ${STATUS_META[status].header}`
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-bold text-slate-800">
          {STATUS_META[status].column}
        </div>
        <div className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
          {tasks.length}
        </div>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-5 text-center text-sm text-slate-500">
            Bu kolonda görev yok.
          </div>
        ) : null}

        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onEdit={() => onEditTask(task)}
            onDuplicate={() => onDuplicateTask(task)}
            onDelete={() => onDeleteTask(task)}
            onQuickPatch={(payload) => onQuickPatch(task, payload)}
            busy={busyTaskIds.has(task.id)}
          />
        ))}

        {isOver && draggingTaskId !== null ? (
          <div className="rounded-2xl border border-dashed border-red-300 bg-white/80 p-4 text-center text-sm text-slate-500">
            Görevi buraya bırak
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SkeletonBoard() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="min-h-[520px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="mb-4 h-6 w-24 rounded bg-slate-200" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-2 h-4 w-2/3 rounded bg-slate-200" />
                <div className="mb-2 h-3 w-full rounded bg-slate-100" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OperationsTaskBoard({
  api = defaultApi,
  storageKey = BOARD_STORAGE_KEY,
  title = 'Operations Task Board',
}: OperationsTaskBoardProps) {
  const { search, setSearch, sortKey, setSortKey, filters, setFilters } =
    usePersistentBoardState(storageKey)

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null)
  const [busyTaskIds, setBusyTaskIds] = useState<Set<number>>(new Set())
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const rollbackRef = useRef<Map<number, Task>>(new Map())

  const pushToast = useCallback((type: ToastItem['type'], message: string) => {
    setToasts((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 10000),
        type,
        message,
      },
    ])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const markTaskBusy = useCallback((taskId: number, busy: boolean) => {
    setBusyTaskIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(taskId)
      else next.delete(taskId)
      return next
    })
  }, [])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const remote = await api.loadTasks()
      const normalized = remote.map((task) => normalizeTask(task))
      setTasks(normalized)
      localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(normalized))
    } catch (error) {
      const cached = safeJsonParse<Task[]>(
        localStorage.getItem(TASKS_CACHE_KEY),
        []
      )
      setTasks(cached.map((task) => normalizeTask(task)))
      pushToast('error', 'Görevler yüklenemedi. Önbellek verisi gösterildi.')
    } finally {
      setLoading(false)
    }
  }, [api, pushToast])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const metrics = useMemo(() => calculateMetrics(tasks), [tasks])

  const filteredTasks = useMemo(() => {
    return sortTasks(filterTasks(tasks, search, filters), sortKey)
  }, [tasks, search, filters, sortKey])

  const assignees = useMemo(() => {
    return Array.from(
      new Set(
        tasks
          .map((t) => String(t.assignee || '').trim())
          .filter((x) => Boolean(x))
      )
    ).sort((a, b) => a.localeCompare(b, 'tr'))
  }, [tasks])

  const columnTasks = useMemo(() => {
    return {
      PENDING: filteredTasks.filter((task) => task.status === 'PENDING'),
      IN_PROGRESS: filteredTasks.filter((task) => task.status === 'IN_PROGRESS'),
      COMPLETED: filteredTasks.filter((task) => task.status === 'COMPLETED'),
      CANCELLED: filteredTasks.filter((task) => task.status === 'CANCELLED'),
    }
  }, [filteredTasks])

  const optimisticPatchTask = useCallback(
    async (task: Task, patch: Partial<Task>, successMessage?: string) => {
      const previous = { ...task }
      const optimistic: Task = normalizeTask({
        ...task,
        ...patch,
        updated_at: nowIso(),
      })

      rollbackRef.current.set(task.id, previous)
      markTaskBusy(task.id, true)

      setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)))

      try {
        const saved = await api.updateTask(task.id, patch)
        const normalized = normalizeTask(saved)
        setTasks((prev) => prev.map((t) => (t.id === task.id ? normalized : t)))
        rollbackRef.current.delete(task.id)
        if (successMessage) pushToast('success', successMessage)
      } catch (error) {
        const rollback = rollbackRef.current.get(task.id)
        if (rollback) {
          setTasks((prev) => prev.map((t) => (t.id === task.id ? rollback : t)))
          rollbackRef.current.delete(task.id)
        }
        pushToast('error', 'İşlem kaydedilemedi. Değişiklik geri alındı.')
      } finally {
        markTaskBusy(task.id, false)
      }
    },
    [api, markTaskBusy, pushToast]
  )

  const handleDropTask = useCallback(
    async (nextStatus: TaskStatus) => {
      if (draggingTaskId === null) return
      const task = tasks.find((t) => t.id === draggingTaskId)
      setDraggingTaskId(null)
      if (!task || task.status === nextStatus) return

      await optimisticPatchTask(
        task,
        { status: nextStatus },
        'Görev durumu güncellendi.'
      )
    },
    [draggingTaskId, optimisticPatchTask, tasks]
  )

  const handleCreate = async (payload: Partial<Task>) => {
    const tempId = Date.now()
    const optimistic = normalizeTask(
      {
        ...payload,
        id: tempId,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      tempId
    )

    setTasks((prev) => [optimistic, ...prev])

    try {
      const created = await api.createTask(payload)
      const normalized = normalizeTask(created)
      setTasks((prev) => prev.map((t) => (t.id === tempId ? normalized : t)))
      pushToast('success', 'Yeni görev oluşturuldu.')
    } catch (error) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId))
      pushToast('error', 'Yeni görev oluşturulamadı.')
      throw error
    }
  }

  const handleEdit = async (payload: Partial<Task>) => {
    if (!activeTask) return
    await optimisticPatchTask(activeTask, payload, 'Görev güncellendi.')
  }

  const handleDeleteTask = async (task: Task) => {
    const confirmed = window.confirm(
      `"${task.title}" görevini silmek istiyor musunuz?`
    )
    if (!confirmed) return

    const previousTasks = [...tasks]
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    markTaskBusy(task.id, true)

    try {
      await api.deleteTask(task.id)
      pushToast('success', 'Görev silindi.')
    } catch (error) {
      setTasks(previousTasks)
      pushToast('error', 'Görev silinemedi. Geri alındı.')
    } finally {
      markTaskBusy(task.id, false)
    }
  }

  const handleDuplicateTask = async (task: Task) => {
    await handleCreate({
      title: `${task.title} (Kopya)`,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      deadline: task.deadline,
    })
  }

  const openCreateModal = () => {
    setModalMode('create')
    setActiveTask(null)
    setModalOpen(true)
  }

  const openEditModal = (task: Task) => {
    setModalMode('edit')
    setActiveTask(task)
    setModalOpen(true)
  }

  return (
    <div className="space-y-5 p-4 xl:p-6">
      <Toasts items={toasts} onRemove={removeToast} />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quick Actions, canlı dashboard senkronu ve geliştirilmiş Kanban deneyimi
          </p>
        </div>

        <button
          onClick={loadTasks}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Yenile
        </button>
      </div>

      <DashboardSummary metrics={metrics} />

      <TaskToolbar
        search={search}
        setSearch={setSearch}
        sortKey={sortKey}
        setSortKey={setSortKey}
        filters={filters}
        setFilters={setFilters}
        assignees={assignees}
        onCreate={openCreateModal}
        totalFiltered={filteredTasks.length}
      />

      {loading ? (
        <SkeletonBoard />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columnTasks[status]}
              draggingTaskId={draggingTaskId}
              onDropTask={handleDropTask}
              onDragStart={setDraggingTaskId}
              onEditTask={openEditModal}
              onDuplicateTask={handleDuplicateTask}
              onDeleteTask={handleDeleteTask}
              onQuickPatch={(task, payload) =>
                optimisticPatchTask(task, payload, 'Görev güncellendi.')
              }
              busyTaskIds={busyTaskIds}
            />
          ))}
        </div>
      )}

      {!loading && tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="text-lg font-semibold text-slate-800">
            Henüz görev bulunmuyor
          </div>
          <div className="mt-2 text-sm text-slate-500">
            İlk görevi oluşturarak operasyon akışını başlatabilirsin.
          </div>
          <button
            onClick={openCreateModal}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            İlk görevi oluştur
          </button>
        </div>
      ) : null}

      <TaskModal
        open={modalOpen}
        mode={modalMode}
        initialTask={activeTask}
        onClose={() => setModalOpen(false)}
        onSubmit={modalMode === 'create' ? handleCreate : handleEdit}
      />
    </div>
  )
}

async function parseJsonSafe(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function tryRequest(
  attempts: Array<{
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: unknown
  }>
) {
  let lastError: unknown = null

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: attempt.method,
        headers: { 'Content-Type': 'application/json' },
        body:
          attempt.body === undefined ? undefined : JSON.stringify(attempt.body),
      })

      if (response.ok) {
        return { response, data: await parseJsonSafe(response) }
      }

      const errorBody = await parseJsonSafe(response)
      lastError = {
        status: response.status,
        statusText: response.statusText,
        url: attempt.url,
        method: attempt.method,
        body: errorBody,
      }

      console.error('API ATTEMPT FAILED', lastError)
    } catch (error) {
      lastError = error
      console.error('API ATTEMPT ERROR', {
        url: attempt.url,
        method: attempt.method,
        error,
      })
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(JSON.stringify(lastError))
}

function mapTaskPayload(payload: Partial<Task>) {
  return {
    title: payload.title ?? '',
    description: payload.description ?? '',
    status: payload.status ?? 'PENDING',
    priority: payload.priority ?? 'MEDIUM',
    assignee: payload.assignee ?? '',
    deadline: payload.deadline ?? null,
  }
}

const defaultApi: ApiAdapter = {
  async loadTasks() {
    const { data } = await tryRequest([
      { url: `${API_BASE}/operations/tasks`, method: 'GET' },
      { url: `${API_BASE}/tasks`, method: 'GET' },
    ])

    if (Array.isArray(data)) return data.map((x) => normalizeTask(x))
    if (data && Array.isArray((data as { items?: Task[] }).items)) {
      return (data as { items: Task[] }).items.map((x) => normalizeTask(x))
    }
    if (data && Array.isArray((data as { data?: Task[] }).data)) {
      return (data as { data: Task[] }).data.map((x) => normalizeTask(x))
    }

    return []
  },

  async createTask(payload) {
  const body = mapTaskPayload(payload)

  const attempts = [
    {
      url: `${API_BASE}/operations/tasks`,
      method: 'POST' as const,
      body,
    },
    {
      url: `${API_BASE}/operations/tasks`,
      method: 'POST' as const,
      body: { task: body },
    },
    {
      url: `${API_BASE}/operations/tasks/create`,
      method: 'POST' as const,
      body,
    },
    {
      url: `${API_BASE}/operations/tasks/create`,
      method: 'POST' as const,
      body: { task: body },
    },
    {
      url: `${API_BASE}/tasks`,
      method: 'POST' as const,
      body,
    },
    {
      url: `${API_BASE}/tasks`,
      method: 'POST' as const,
      body: { task: body },
    },
    {
      url: `${API_BASE}/tasks/create`,
      method: 'POST' as const,
      body,
    },
    {
      url: `${API_BASE}/tasks/create`,
      method: 'POST' as const,
      body: { task: body },
    },
  ]

  let lastError: unknown = null

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: attempt.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt.body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        lastError = new Error(
          `Görev oluşturulamadı | ${response.status} | ${attempt.url} | ${errorText}`
        )
        console.error('TASK CREATE ATTEMPT FAILED', {
          status: response.status,
          statusText: response.statusText,
          url: attempt.url,
          body: attempt.body,
          errorText,
        })
        continue
      }

      const data = await parseJsonSafe(response)
      const result =
        data && typeof data === 'object' && 'item' in data
          ? (data as { item: Partial<Task> }).item
          : (data as Partial<Task>)

      return normalizeTask(result)
    } catch (error) {
      lastError = error
      console.error('TASK CREATE ATTEMPT ERROR', {
        url: attempt.url,
        body: attempt.body,
        error,
      })
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Görev oluşturulamadı')
},

  async updateTask(taskId, payload) {
    const body = mapTaskPayload(payload)

    const { data } = await tryRequest([
      {
        url: `${API_BASE}/operations/tasks/${taskId}`,
        method: 'PATCH',
        body,
      },
      {
        url: `${API_BASE}/operations/tasks/${taskId}`,
        method: 'PUT',
        body,
      },
      {
        url: `${API_BASE}/tasks/${taskId}`,
        method: 'PATCH',
        body,
      },
      {
        url: `${API_BASE}/tasks/${taskId}`,
        method: 'PUT',
        body,
      },
      {
        url: `${API_BASE}/operations/tasks/${taskId}/status`,
        method: 'PATCH',
        body,
      },
    ])

    const result =
      data && typeof data === 'object' && 'item' in data
        ? (data as { item: Partial<Task> }).item
        : (data as Partial<Task>)

    return normalizeTask(result)
  },

  async deleteTask(taskId) {
    await tryRequest([
      {
        url: `${API_BASE}/operations/tasks/${taskId}`,
        method: 'DELETE',
      },
      {
        url: `${API_BASE}/tasks/${taskId}`,
        method: 'DELETE',
      },
    ])
  },
}