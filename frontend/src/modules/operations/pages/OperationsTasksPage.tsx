import { useEffect, useMemo, useState } from 'react'

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

type Task = {
  id: number
  title: string
  description?: string | null
  task_type: string
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string
  due_date?: string | null
  created_at?: string | null
  completed_at?: string | null
  updated_at?: string | null
  form_id?: number | null
  revision_id?: number | null
}

type TaskLog = {
  id: number
  task_id: number
  action: string
  note: string
  created_at?: string | null
}

const API_BASE = 'http://127.0.0.1:8000/api/v1/operations'

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f4f6f8',
  padding: 24,
  fontFamily: 'Arial, sans-serif',
  color: '#1f2937',
}

const shellStyle: React.CSSProperties = {
  maxWidth: 1380,
  margin: '0 auto',
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 18,
  border: '1px solid #e5e7eb',
  boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  zIndex: 1000,
}

const modalCardStyle: React.CSSProperties = {
  width: 'min(920px, 100%)',
  maxHeight: '90vh',
  overflow: 'auto',
  background: '#fff',
  borderRadius: 20,
  padding: 24,
  boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  outline: 'none',
  fontSize: 14,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const textAreaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 110,
  resize: 'vertical',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontWeight: 700,
  fontSize: 13,
  color: '#374151',
}

const primaryButton: React.CSSProperties = {
  background: '#b91c1c',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '12px 18px',
  fontWeight: 700,
  cursor: 'pointer',
}

const ghostButton: React.CSSProperties = {
  background: '#fff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 700,
  cursor: 'pointer',
}

const dangerButton: React.CSSProperties = {
  background: '#fff',
  color: '#b91c1c',
  border: '1px solid #fecaca',
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 700,
  cursor: 'pointer',
}

function formatDate(value?: string | null) {
  if (!value) return 'Tarih yok'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Geçersiz tarih'
  return date.toLocaleString('tr-TR')
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

function getStatusLabel(status: TaskStatus) {
  switch (status) {
    case 'PENDING':
      return 'Beklemede'
    case 'IN_PROGRESS':
      return 'Devam Ediyor'
    case 'COMPLETED':
      return 'Tamamlandı'
    case 'CANCELLED':
      return 'İptal'
    default:
      return status
  }
}

function getPriorityLabel(priority: TaskPriority) {
  switch (priority) {
    case 'LOW':
      return 'Düşük'
    case 'MEDIUM':
      return 'Orta'
    case 'HIGH':
      return 'Yüksek'
    case 'CRITICAL':
      return 'Kritik'
    default:
      return priority
  }
}

function getStatusPillStyle(status: TaskStatus): React.CSSProperties {
  switch (status) {
    case 'PENDING':
      return { background: '#fff7ed', color: '#c2410c' }
    case 'IN_PROGRESS':
      return { background: '#eff6ff', color: '#1d4ed8' }
    case 'COMPLETED':
      return { background: '#ecfdf5', color: '#047857' }
    case 'CANCELLED':
      return { background: '#f3f4f6', color: '#4b5563' }
  }
}

function getPriorityPillStyle(priority: TaskPriority): React.CSSProperties {
  switch (priority) {
    case 'LOW':
      return { background: '#f3f4f6', color: '#4b5563' }
    case 'MEDIUM':
      return { background: '#fef3c7', color: '#92400e' }
    case 'HIGH':
      return { background: '#fee2e2', color: '#b91c1c' }
    case 'CRITICAL':
      return { background: '#7f1d1d', color: '#ffffff' }
  }
}

function getUrgency(task: Task) {
  if (!task.due_date) {
    return { label: 'Plansız', color: '#6b7280', bg: '#f3f4f6' }
  }

  const due = new Date(task.due_date).getTime()
  const now = Date.now()
  const diff = due - now

  if (diff < 0) {
    return { label: 'Gecikmiş', color: '#b91c1c', bg: '#fef2f2' }
  }

  if (diff < 1000 * 60 * 60 * 24) {
    return { label: 'Bugün / Yakın', color: '#b45309', bg: '#fffbeb' }
  }

  if (diff < 1000 * 60 * 60 * 24 * 3) {
    return { label: 'Yaklaşıyor', color: '#1d4ed8', bg: '#eff6ff' }
  }

  return { label: 'Planlandı', color: '#047857', bg: '#ecfdf5' }
}

export function OperationsTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<TaskLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'ALL' | TaskStatus>('ALL')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const [form, setForm] = useState({
    title: '',
    assigned_to: '',
    description: '',
    priority: 'MEDIUM' as TaskPriority,
    due_date: '',
    task_type: 'MANUAL',
  })

  const [editForm, setEditForm] = useState({
    title: '',
    assigned_to: '',
    description: '',
    priority: 'MEDIUM' as TaskPriority,
    due_date: '',
    task_type: 'MANUAL',
  })

  async function loadTasks() {
    try {
      setLoading(true)
      setError('')

      const query =
        activeFilter === 'ALL' ? '' : `?status=${encodeURIComponent(activeFilter)}`

      const res = await fetch(`${API_BASE}/tasks${query}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      setTasks(data)
    } catch (err) {
      console.error('Görevler yüklenemedi:', err)
      setError('Görevler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  useEffect(() => {
    loadTasks()
  }, [activeFilter])

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()

    if (!form.title.trim() || !form.assigned_to.trim()) {
      setError('Görev başlığı ve atanan kişi zorunludur.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const payload = {
        title: form.title.trim(),
        assigned_to: form.assigned_to.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        task_type: form.task_type,
      }

      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      setForm({
        title: '',
        assigned_to: '',
        description: '',
        priority: 'MEDIUM',
        due_date: '',
        task_type: 'MANUAL',
      })

      await loadTasks()
    } catch (err) {
      console.error('Görev oluşturulamadı:', err)
      setError('Görev oluşturulamadı.')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(taskId: number, status: TaskStatus) {
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      await loadTasks()

      if (selectedTask?.id === taskId) {
        await openTaskDetail(taskId, true)
      }
    } catch (err) {
      console.error('Durum güncellenemedi:', err)
      setError('Görev durumu güncellenemedi.')
    }
  }

  async function openTaskDetail(taskId: number, keepEditMode = false) {
    try {
      setModalLoading(true)
      setEditMode(keepEditMode ? editMode : false)

      const [taskRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/tasks/${taskId}`),
        fetch(`${API_BASE}/tasks/${taskId}/logs`),
      ])

      if (!taskRes.ok || !logsRes.ok) {
        throw new Error('Detay verisi alınamadı')
      }

      const taskData = await taskRes.json()
      const logsData = await logsRes.json()

      setSelectedTask(taskData)
      setLogs(logsData)
      setEditForm({
        title: taskData.title || '',
        assigned_to: taskData.assigned_to || '',
        description: taskData.description || '',
        priority: taskData.priority || 'MEDIUM',
        due_date: toDateTimeLocalValue(taskData.due_date),
        task_type: taskData.task_type || 'MANUAL',
      })
    } catch (err) {
      console.error(err)
      setError('Görev detayı yüklenemedi.')
    } finally {
      setModalLoading(false)
    }
  }

  function closeModal() {
    setSelectedTask(null)
    setLogs([])
    setEditMode(false)
  }

  async function handleUpdateTask() {
    if (!selectedTask) return
    if (!editForm.title.trim() || !editForm.assigned_to.trim()) {
      setError('Görev başlığı ve atanan kişi zorunludur.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const payload = {
        title: editForm.title.trim(),
        assigned_to: editForm.assigned_to.trim(),
        description: editForm.description.trim() || null,
        priority: editForm.priority,
        due_date: editForm.due_date ? new Date(editForm.due_date).toISOString() : null,
        task_type: editForm.task_type,
      }

      const res = await fetch(`${API_BASE}/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      await loadTasks()
      await openTaskDetail(selectedTask.id, false)
      setEditMode(false)
    } catch (err) {
      console.error(err)
      setError('Görev güncellenemedi.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTask(taskId: number) {
    const approved = window.confirm('Bu görev kaldırılsın mı?')
    if (!approved) return

    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      await loadTasks()
      if (selectedTask?.id === taskId) {
        closeModal()
      }
    } catch (err) {
      console.error(err)
      setError('Görev silinemedi.')
    }
  }

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'PENDING').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      completed: tasks.filter((t) => t.status === 'COMPLETED').length,
      cancelled: tasks.filter((t) => t.status === 'CANCELLED').length,
      critical: tasks.filter((t) => t.priority === 'CRITICAL').length,
    }
  }, [tasks])

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>
            Operasyon Görev Yönetimi
          </h1>
          <p style={{ marginTop: 8, color: '#6b7280', fontSize: 15 }}>
            Görev oluşturma, düzenleme, durum güncelleme ve operasyon takibi tek ekranda.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            { label: 'Toplam Görev', value: stats.total },
            { label: 'Beklemede', value: stats.pending },
            { label: 'Devam Eden', value: stats.inProgress },
            { label: 'Tamamlanan', value: stats.completed },
            { label: 'İptal', value: stats.cancelled },
            { label: 'Kritik', value: stats.critical },
          ].map((item) => (
            <div key={item.label} style={{ ...cardStyle, padding: 16 }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '400px 1fr',
            gap: 20,
            alignItems: 'start',
          }}
        >
          <div style={{ ...cardStyle, padding: 20, position: 'sticky', top: 20 }}>
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 20 }}>
              Yeni Görev Oluştur
            </h2>

            <form onSubmit={handleCreateTask}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Görev Başlığı</label>
                <input
                  style={inputStyle}
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Örn: HEPA filtre saha kontrolü"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Atanan Personel</label>
                <input
                  style={inputStyle}
                  value={form.assigned_to}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, assigned_to: e.target.value }))
                  }
                  placeholder="Örn: Ahmet Yılmaz"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Görev Açıklaması</label>
                <textarea
                  style={textAreaStyle}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Görev detayı, saha notu, istenen işlem..."
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>Öncelik</label>
                  <select
                    style={inputStyle}
                    value={form.priority}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        priority: e.target.value as TaskPriority,
                      }))
                    }
                  >
                    <option value="LOW">Düşük</option>
                    <option value="MEDIUM">Orta</option>
                    <option value="HIGH">Yüksek</option>
                    <option value="CRITICAL">Kritik</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Görev Tipi</label>
                  <select
                    style={inputStyle}
                    value={form.task_type}
                    onChange={(e) => setForm((prev) => ({ ...prev, task_type: e.target.value }))}
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="PERIODIC">Periodic</option>
                    <option value="FIELD">Field</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Termin Tarihi</label>
                <input
                  style={inputStyle}
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                />
              </div>

              <button type="submit" style={primaryButton} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Görevi Oluştur'}
              </button>
            </form>
          </div>

          <div>
            <div
              style={{
                ...cardStyle,
                padding: 16,
                marginBottom: 16,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map(
                  (filterKey) => {
                    const active = activeFilter === filterKey
                    return (
                      <button
                        key={filterKey}
                        type="button"
                        style={{
                          ...(active ? primaryButton : ghostButton),
                          padding: '10px 12px',
                        }}
                        onClick={() => setActiveFilter(filterKey)}
                      >
                        {filterKey === 'ALL' ? 'Tümü' : getStatusLabel(filterKey)}
                      </button>
                    )
                  }
                )}
              </div>

              <button type="button" style={ghostButton} onClick={loadTasks}>
                Yenile
              </button>
            </div>

            {loading && (
              <div style={{ ...cardStyle, padding: 20 }}>Görevler yükleniyor...</div>
            )}

            {!!error && (
              <div
                style={{
                  ...cardStyle,
                  padding: 16,
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            {!loading && !error && tasks.length === 0 && (
              <div style={{ ...cardStyle, padding: 20 }}>Henüz görev yok.</div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: 16,
              }}
            >
              {tasks.map((task) => {
                const urgency = getUrgency(task)
                const criticalStyle =
                  task.priority === 'CRITICAL'
                    ? {
                        border: '1px solid #fecaca',
                        boxShadow: '0 12px 28px rgba(185, 28, 28, 0.12)',
                      }
                    : {}

                return (
                  <div
                    key={task.id}
                    style={{
                      ...cardStyle,
                      ...criticalStyle,
                      padding: 18,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 12,
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#6b7280',
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          GÖREV #{task.id}
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            lineHeight: 1.35,
                          }}
                        >
                          {task.title || 'Başlıksız Görev'}
                        </div>
                      </div>

                      <div
                        style={{
                          ...getStatusPillStyle(task.status),
                          borderRadius: 999,
                          padding: '8px 10px',
                          fontSize: 12,
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {getStatusLabel(task.status)}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          ...getPriorityPillStyle(task.priority),
                          borderRadius: 999,
                          padding: '7px 10px',
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        Öncelik: {getPriorityLabel(task.priority)}
                      </div>

                      <div
                        style={{
                          background: urgency.bg,
                          color: urgency.color,
                          borderRadius: 999,
                          padding: '7px 10px',
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {urgency.label}
                      </div>
                    </div>

                    {task.description && (
                      <div
                        style={{
                          background: '#f9fafb',
                          border: '1px solid #edf2f7',
                          borderRadius: 12,
                          padding: 12,
                          marginBottom: 14,
                          color: '#374151',
                          lineHeight: 1.55,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {task.description}
                      </div>
                    )}

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 10,
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          background: '#f9fafb',
                          borderRadius: 12,
                          padding: 12,
                          border: '1px solid #edf2f7',
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                          Atanan
                        </div>
                        <div style={{ fontWeight: 700 }}>{task.assigned_to || '-'}</div>
                      </div>

                      <div
                        style={{
                          background: '#f9fafb',
                          borderRadius: 12,
                          padding: 12,
                          border: '1px solid #edf2f7',
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                          Görev Tipi
                        </div>
                        <div style={{ fontWeight: 700 }}>{task.task_type || '-'}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                      Termin: {formatDate(task.due_date)}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                      Oluşturulma: {formatDate(task.created_at)}
                    </div>
                    {task.completed_at && (
                      <div
                        style={{
                          fontSize: 12,
                          color: '#047857',
                          marginBottom: 14,
                          fontWeight: 700,
                        }}
                      >
                        Tamamlanma: {formatDate(task.completed_at)}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        type="button"
                        style={ghostButton}
                        onClick={() => openTaskDetail(task.id)}
                      >
                        Detay
                      </button>
                      <button
                        type="button"
                        style={ghostButton}
                        onClick={() => updateStatus(task.id, 'IN_PROGRESS')}
                      >
                        Başlat
                      </button>
                      <button
                        type="button"
                        style={{
                          ...ghostButton,
                          border: '1px solid #bbf7d0',
                          color: '#047857',
                        }}
                        onClick={() => updateStatus(task.id, 'COMPLETED')}
                      >
                        Tamamla
                      </button>
                      <button
                        type="button"
                        style={dangerButton}
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {selectedTask && (
          <div style={modalOverlayStyle} onClick={closeModal}>
            <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
              {modalLoading ? (
                <div>Detay yükleniyor...</div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
                        GÖREV DETAYI #{selectedTask.id}
                      </div>
                      <h2 style={{ margin: '6px 0 0 0' }}>{selectedTask.title}</h2>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        style={ghostButton}
                        onClick={() => setEditMode((prev) => !prev)}
                      >
                        {editMode ? 'Görünüme Dön' : 'Düzenle'}
                      </button>
                      <button type="button" style={ghostButton} onClick={closeModal}>
                        Kapat
                      </button>
                    </div>
                  </div>

                  {!editMode ? (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          flexWrap: 'wrap',
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            ...getStatusPillStyle(selectedTask.status),
                            borderRadius: 999,
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {getStatusLabel(selectedTask.status)}
                        </div>

                        <div
                          style={{
                            ...getPriorityPillStyle(selectedTask.priority),
                            borderRadius: 999,
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          Öncelik: {getPriorityLabel(selectedTask.priority)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 12,
                          marginBottom: 16,
                        }}
                      >
                        <div style={{ ...cardStyle, padding: 14 }}>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                            Atanan Personel
                          </div>
                          <div style={{ fontWeight: 700 }}>{selectedTask.assigned_to}</div>
                        </div>

                        <div style={{ ...cardStyle, padding: 14 }}>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                            Görev Tipi
                          </div>
                          <div style={{ fontWeight: 700 }}>{selectedTask.task_type}</div>
                        </div>
                      </div>

                      <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                          Açıklama
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {selectedTask.description || 'Açıklama yok'}
                        </div>
                      </div>

                      <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                          Tarihler
                        </div>
                        <div style={{ lineHeight: 1.8 }}>
                          <div>Termin: {formatDate(selectedTask.due_date)}</div>
                          <div>Oluşturulma: {formatDate(selectedTask.created_at)}</div>
                          <div>Güncellenme: {formatDate(selectedTask.updated_at)}</div>
                          <div>Tamamlanma: {formatDate(selectedTask.completed_at)}</div>
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>Hızlı İşlemler</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <button
                            type="button"
                            style={ghostButton}
                            onClick={() => updateStatus(selectedTask.id, 'PENDING')}
                          >
                            Beklemede
                          </button>
                          <button
                            type="button"
                            style={ghostButton}
                            onClick={() => updateStatus(selectedTask.id, 'IN_PROGRESS')}
                          >
                            Başlat
                          </button>
                          <button
                            type="button"
                            style={{
                              ...ghostButton,
                              border: '1px solid #bbf7d0',
                              color: '#047857',
                            }}
                            onClick={() => updateStatus(selectedTask.id, 'COMPLETED')}
                          >
                            Tamamla
                          </button>
                          <button
                            type="button"
                            style={ghostButton}
                            onClick={() => updateStatus(selectedTask.id, 'CANCELLED')}
                          >
                            İptal
                          </button>
                          <button
                            type="button"
                            style={dangerButton}
                            onClick={() => handleDeleteTask(selectedTask.id)}
                          >
                            Sil
                          </button>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>Görev Geçmişi</div>
                        <div style={{ display: 'grid', gap: 10 }}>
                          {logs.length === 0 && (
                            <div style={{ ...cardStyle, padding: 14 }}>Kayıt bulunamadı.</div>
                          )}
                          {logs.map((log) => (
                            <div key={log.id} style={{ ...cardStyle, padding: 14 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  marginBottom: 6,
                                }}
                              >
                                <strong>{log.action}</strong>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                  {formatDate(log.created_at)}
                                </span>
                              </div>
                              <div style={{ color: '#374151', lineHeight: 1.5 }}>
                                {log.note || '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 12,
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <label style={labelStyle}>Görev Başlığı</label>
                          <input
                            style={inputStyle}
                            value={editForm.title}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, title: e.target.value }))
                            }
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Atanan Personel</label>
                          <input
                            style={inputStyle}
                            value={editForm.assigned_to}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, assigned_to: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={labelStyle}>Açıklama</label>
                        <textarea
                          style={textAreaStyle}
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, description: e.target.value }))
                          }
                        />
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: 12,
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <label style={labelStyle}>Öncelik</label>
                          <select
                            style={inputStyle}
                            value={editForm.priority}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                priority: e.target.value as TaskPriority,
                              }))
                            }
                          >
                            <option value="LOW">Düşük</option>
                            <option value="MEDIUM">Orta</option>
                            <option value="HIGH">Yüksek</option>
                            <option value="CRITICAL">Kritik</option>
                          </select>
                        </div>

                        <div>
                          <label style={labelStyle}>Görev Tipi</label>
                          <select
                            style={inputStyle}
                            value={editForm.task_type}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, task_type: e.target.value }))
                            }
                          >
                            <option value="MANUAL">Manual</option>
                            <option value="PERIODIC">Periodic</option>
                            <option value="FIELD">Field</option>
                          </select>
                        </div>

                        <div>
                          <label style={labelStyle}>Termin Tarihi</label>
                          <input
                            style={inputStyle}
                            type="datetime-local"
                            value={editForm.due_date}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, due_date: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" style={primaryButton} onClick={handleUpdateTask}>
                          {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button
                          type="button"
                          style={ghostButton}
                          onClick={() => setEditMode(false)}
                        >
                          Vazgeç
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}