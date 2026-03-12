import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { apiClient } from '../../../api/client'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

type SummaryResponse = {
  today_jobs: number
  pending_reports: number
  calibration_alerts: number
  personnel_alerts: number
  operation_tasks_open: number
  operation_tasks_overdue: number
  operation_tasks_blocking: number
  operation_tasks_completed_today: number
  status_counts: {
    PENDING: number
    IN_PROGRESS: number
    COMPLETED: number
    CANCELLED: number
  }
  priority_counts: {
    LOW: number
    MEDIUM: number
    HIGH: number
    CRITICAL: number
  }
  assignee_workload: Array<{
    assigned_to: string
    total: number
    pending: number
    in_progress: number
    overdue: number
    critical: number
  }>
  urgent_tasks: Array<{
    id: number
    title: string
    status: string
    priority: string
    assigned_to: string
    task_type: string
    due_date?: string | null
    is_overdue: boolean
  }>
  recent_activity: Array<{
    id: number
    task_id: number
    task_title: string
    action: string
    note: string
    created_at?: string | null
  }>
  recent_tasks: Array<{
    id: number
    title: string
    status: string
    priority: string
    assigned_to: string
    task_type: string
    due_date?: string | null
    created_at?: string | null
    completed_at?: string | null
  }>
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f4f6f8',
  padding: 24,
  fontFamily: 'Arial, sans-serif',
  color: '#111827',
}

const shellStyle: React.CSSProperties = {
  maxWidth: 1420,
  margin: '0 auto',
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 18,
  border: '1px solid #e5e7eb',
  boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
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
  background: '#fff',
}

const buttonStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 700,
  cursor: 'pointer',
}

const primaryButtonStyle: React.CSSProperties = {
  background: '#b91c1c',
  border: '1px solid #b91c1c',
  color: '#ffffff',
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 700,
  cursor: 'pointer',
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

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('tr-TR')
}

function getStatusLabel(status: string) {
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

function getPriorityLabel(priority: string) {
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

function statusPill(status: string): React.CSSProperties {
  switch (status) {
    case 'PENDING':
      return { background: '#fff7ed', color: '#c2410c' }
    case 'IN_PROGRESS':
      return { background: '#eff6ff', color: '#1d4ed8' }
    case 'COMPLETED':
      return { background: '#ecfdf5', color: '#047857' }
    case 'CANCELLED':
      return { background: '#f3f4f6', color: '#4b5563' }
    default:
      return { background: '#f3f4f6', color: '#374151' }
  }
}

function priorityPill(priority: string): React.CSSProperties {
  switch (priority) {
    case 'LOW':
      return { background: '#f3f4f6', color: '#4b5563' }
    case 'MEDIUM':
      return { background: '#fef3c7', color: '#92400e' }
    case 'HIGH':
      return { background: '#fee2e2', color: '#b91c1c' }
    case 'CRITICAL':
      return { background: '#7f1d1d', color: '#ffffff' }
    default:
      return { background: '#f3f4f6', color: '#374151' }
  }
}

type SortKey = 'deadline' | 'priority' | 'assignee' | 'status'

const priorityRank: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

export function DashboardPage() {
  const navigate = useNavigate()

  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('deadline')
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null)

  async function loadDashboard() {
    try {
      setLoading(true)
      setError('')
      const response = await apiClient.get('/dashboard')
      setSummary(response.data)
    } catch (err) {
      console.error(err)
      setError('Dashboard verileri yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const cards = useMemo(() => {
    return [
      { label: 'Açık Görevler', value: summary?.operation_tasks_open ?? 0 },
      { label: 'Geciken Görevler', value: summary?.operation_tasks_overdue ?? 0 },
      { label: 'Kritik Görevler', value: summary?.operation_tasks_blocking ?? 0 },
      { label: 'Bugün Planlı', value: summary?.today_jobs ?? 0 },
      { label: 'Bugün Tamamlanan', value: summary?.operation_tasks_completed_today ?? 0 },
      { label: 'Bekleyen Raporlar', value: summary?.pending_reports ?? 0 },
    ]
  }, [summary])

  const chartData = useMemo(() => {
    if (!summary) return null

    return {
      labels: ['Beklemede', 'Devam Ediyor', 'Tamamlandı', 'İptal'],
      datasets: [
        {
          label: 'Görev Sayısı',
          data: [
            summary.status_counts.PENDING,
            summary.status_counts.IN_PROGRESS,
            summary.status_counts.COMPLETED,
            summary.status_counts.CANCELLED,
          ],
        },
      ],
    }
  }, [summary])

  const filteredUrgentTasks = useMemo(() => {
    if (!summary) return []

    const q = searchText.trim().toLocaleLowerCase('tr-TR')

    let items = [...summary.urgent_tasks]

    if (q) {
      items = items.filter((task) => {
        const blob = [
          task.title,
          task.assigned_to,
          task.status,
          task.priority,
          task.task_type,
        ]
          .join(' ')
          .toLocaleLowerCase('tr-TR')

        return blob.includes(q)
      })
    }

    items.sort((a, b) => {
      if (sortKey === 'priority') {
        return (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99)
      }

      if (sortKey === 'assignee') {
        return (a.assigned_to || '').localeCompare(b.assigned_to || '', 'tr')
      }

      if (sortKey === 'status') {
        return (a.status || '').localeCompare(b.status || '', 'tr')
      }

      const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })

    return items
  }, [summary, searchText, sortKey])

  const assigneeTasks = useMemo(() => {
    if (!summary || !selectedAssignee) return []

    const pool = [...summary.urgent_tasks, ...summary.recent_tasks]
    const seen = new Map<number, (typeof pool)[number]>()

    pool.forEach((task) => {
      if ((task.assigned_to || 'Atanmamış') === selectedAssignee) {
        seen.set(task.id, task)
      }
    })

    return Array.from(seen.values()).sort((a, b) => {
      const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })
  }, [summary, selectedAssignee])

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div
          style={{
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>
              Operations Dashboard
            </h1>
            <p style={{ marginTop: 8, color: '#6b7280', fontSize: 15 }}>
              Operasyon yoğunluğu, kritik görevler ve personel iş yükü tek ekranda.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={loadDashboard} style={buttonStyle}>
              Yenile
            </button>
            <button
              type="button"
              onClick={() => navigate('/operations/tasks')}
              style={primaryButtonStyle}
            >
              Tüm Görevleri Gör
            </button>
          </div>
        </div>

        {loading && <div style={{ ...cardStyle, padding: 20 }}>Dashboard yükleniyor...</div>}

        {!!error && (
          <div
            style={{
              ...cardStyle,
              padding: 20,
              color: '#b91c1c',
              border: '1px solid #fecaca',
              background: '#fef2f2',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && summary && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                marginBottom: 20,
              }}
            >
              {cards.map((item) => {
                const isOverdue = item.label === 'Geciken Görevler' && item.value > 0
                const isCritical = item.label === 'Kritik Görevler' && item.value > 0

                return (
                  <div
                    key={item.label}
                    style={{
                      ...cardStyle,
                      padding: 16,
                      border: isOverdue
                        ? '1px solid #fecaca'
                        : isCritical
                        ? '1px solid #fca5a5'
                        : cardStyle.border,
                      boxShadow: isOverdue
                        ? '0 10px 25px rgba(185, 28, 28, 0.14)'
                        : isCritical
                        ? '0 10px 25px rgba(127, 29, 29, 0.14)'
                        : cardStyle.boxShadow,
                    }}
                  >
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{item.value}</div>
                  </div>
                )
              })}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.1fr 0.9fr',
                gap: 20,
                marginBottom: 20,
                alignItems: 'start',
              }}
            >
              <div style={{ ...cardStyle, padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                  Durum Dağılımı
                </div>

                <div style={{ height: 280 }}>
                  {chartData && (
                    <Bar
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0,
                            },
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </div>

              <div style={{ ...cardStyle, padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                  Öncelik Dağılımı
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[
                    ['Düşük', summary.priority_counts.LOW],
                    ['Orta', summary.priority_counts.MEDIUM],
                    ['Yüksek', summary.priority_counts.HIGH],
                    ['Kritik', summary.priority_counts.CRITICAL],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      style={{
                        background: '#f9fafb',
                        border: '1px solid #edf2f7',
                        borderRadius: 14,
                        padding: 16,
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.1fr 0.9fr',
                gap: 20,
                marginBottom: 20,
                alignItems: 'start',
              }}
            >
              <div style={{ ...cardStyle, padding: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                    marginBottom: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Acil / Kritik Görevler</div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 180px',
                      gap: 10,
                      width: 'min(520px, 100%)',
                    }}
                  >
                    <input
                      style={inputStyle}
                      placeholder="Görev ara..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                    <select
                      style={inputStyle}
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                    >
                      <option value="deadline">Termin</option>
                      <option value="priority">Öncelik</option>
                      <option value="assignee">Personel</option>
                      <option value="status">Durum</option>
                    </select>
                  </div>
                </div>

                {filteredUrgentTasks.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>Eşleşen görev yok.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {filteredUrgentTasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          background: task.priority === 'CRITICAL' ? '#fff7f7' : '#f9fafb',
                          border:
                            task.priority === 'CRITICAL'
                              ? '1px solid #fecaca'
                              : task.is_overdue
                              ? '1px solid #fca5a5'
                              : '1px solid #edf2f7',
                          borderRadius: 14,
                          padding: 14,
                          boxShadow: task.is_overdue
                            ? '0 8px 18px rgba(185, 28, 28, 0.10)'
                            : 'none',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            marginBottom: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ fontWeight: 800 }}>
                            {task.title || `Görev #${task.id}`}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <div
                              style={{
                                ...statusPill(task.status),
                                borderRadius: 999,
                                padding: '6px 10px',
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {getStatusLabel(task.status)}
                            </div>
                            <div
                              style={{
                                ...priorityPill(task.priority),
                                borderRadius: 999,
                                padding: '6px 10px',
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {getPriorityLabel(task.priority)}
                            </div>
                          </div>
                        </div>

                        <div style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.5 }}>
                          Sorumlu: <strong>{task.assigned_to || '-'}</strong> · Tür:{' '}
                          <strong>{task.task_type || '-'}</strong>
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            color: task.is_overdue ? '#b91c1c' : '#6b7280',
                            fontSize: 13,
                            fontWeight: task.is_overdue ? 800 : 500,
                          }}
                        >
                          Termin: {formatDate(task.due_date)}{' '}
                          {task.is_overdue ? '• Gecikmiş' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ ...cardStyle, padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                  Personel İş Yükü
                </div>

                {summary.assignee_workload.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>Personel verisi yok.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {summary.assignee_workload.map((row) => (
                      <button
                        key={row.assigned_to}
                        type="button"
                        onClick={() => setSelectedAssignee(row.assigned_to)}
                        style={{
                          background: '#f9fafb',
                          border: '1px solid #edf2f7',
                          borderRadius: 14,
                          padding: 14,
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            marginBottom: 10,
                          }}
                        >
                          <strong>{row.assigned_to}</strong>
                          <span style={{ color: '#6b7280', fontSize: 13 }}>
                            Toplam: {row.total}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <span
                            style={{
                              background: '#fff7ed',
                              color: '#c2410c',
                              borderRadius: 999,
                              padding: '5px 9px',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            Beklemede: {row.pending}
                          </span>
                          <span
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              borderRadius: 999,
                              padding: '5px 9px',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            Devam: {row.in_progress}
                          </span>
                          <span
                            style={{
                              background: '#fef2f2',
                              color: '#b91c1c',
                              borderRadius: 999,
                              padding: '5px 9px',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            Gecikmiş: {row.overdue}
                          </span>
                          <span
                            style={{
                              background: '#7f1d1d',
                              color: '#fff',
                              borderRadius: 999,
                              padding: '5px 9px',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            Kritik: {row.critical}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 20,
                alignItems: 'start',
              }}
            >
              <div style={{ ...cardStyle, padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                  Son Eklenen Görevler
                </div>

                {summary.recent_tasks.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>Görev bulunamadı.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {summary.recent_tasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          background: '#f9fafb',
                          border: '1px solid #edf2f7',
                          borderRadius: 14,
                          padding: 14,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            marginBottom: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <strong>{task.title || `Görev #${task.id}`}</strong>
                          <span
                            style={{
                              ...statusPill(task.status),
                              borderRadius: 999,
                              padding: '5px 9px',
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {getStatusLabel(task.status)}
                          </span>
                        </div>

                        <div style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.5 }}>
                          Sorumlu: <strong>{task.assigned_to || '-'}</strong> · Öncelik:{' '}
                          <span
                            style={{
                              ...priorityPill(task.priority),
                              borderRadius: 999,
                              padding: '4px 8px',
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>

                        <div style={{ marginTop: 8, color: '#6b7280', fontSize: 13 }}>
                          Oluşturulma: {formatDate(task.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ ...cardStyle, padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                  Son Aktiviteler
                </div>

                {summary.recent_activity.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>Aktivite kaydı bulunamadı.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {summary.recent_activity.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          background: '#f9fafb',
                          border: '1px solid #edf2f7',
                          borderRadius: 14,
                          padding: 14,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            marginBottom: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <strong>{log.action}</strong>
                          <span style={{ color: '#6b7280', fontSize: 12 }}>
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                          {log.task_title}
                        </div>
                        <div style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.5 }}>
                          {log.note || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {selectedAssignee && summary && (
          <div style={modalOverlayStyle} onClick={() => setSelectedAssignee(null)}>
            <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  marginBottom: 18,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
                    PERSONEL DETAYI
                  </div>
                  <h2 style={{ margin: '6px 0 0 0' }}>{selectedAssignee}</h2>
                </div>

                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => setSelectedAssignee(null)}
                >
                  Kapat
                </button>
              </div>

              {assigneeTasks.length === 0 ? (
                <div style={{ ...cardStyle, padding: 16 }}>
                  Bu personel için dashboard içinde listelenen görev bulunamadı.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {assigneeTasks.map((task) => (
                    <div key={task.id} style={{ ...cardStyle, padding: 16 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          marginBottom: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <strong>{task.title || `Görev #${task.id}`}</strong>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              ...statusPill(task.status),
                              borderRadius: 999,
                              padding: '5px 9px',
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {getStatusLabel(task.status)}
                          </span>
                          <span
                            style={{
                              ...priorityPill(task.priority),
                              borderRadius: 999,
                              padding: '5px 9px',
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>
                      </div>

                      <div style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.5 }}>
                        Tür: <strong>{task.task_type || '-'}</strong>
                      </div>

                      <div style={{ marginTop: 8, color: '#6b7280', fontSize: 13 }}>
                        Termin: {formatDate(task.due_date)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}