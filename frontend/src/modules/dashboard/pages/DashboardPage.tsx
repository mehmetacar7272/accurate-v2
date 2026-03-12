import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../../api/client'

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
  maxWidth: 1400,
  margin: '0 auto',
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 18,
  border: '1px solid #e5e7eb',
  boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
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

export function DashboardPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>Operations Dashboard</h1>
            <p style={{ marginTop: 8, color: '#6b7280', fontSize: 15 }}>
              Operasyon yoğunluğu, kritik görevler ve personel iş yükü tek ekranda.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDashboard}
            style={{
              background: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: 10,
              padding: '10px 14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Yenile
          </button>
        </div>

        {loading && <div style={{ ...cardStyle, padding: 20 }}>Dashboard yükleniyor...</div>}
        {!!error && <div style={{ ...cardStyle, padding: 20, color: '#b91c1c', border: '1px solid #fecaca', background: '#fef2f2' }}>{error}</div>}

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
              {cards.map((item) => (
                <div key={item.label} style={{ ...cardStyle, padding: 16 }}>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: 20,
                marginBottom: 20,
              }}
            >
              <div style={{ ...cardStyle, padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Durum Dağılımı</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    ['Beklemede', summary.status_counts.PENDING],
                    ['Devam Ediyor', summary.status_counts.IN_PROGRESS],
                    ['Tamamlandı', summary.status_counts.COMPLETED],
                    ['İptal', summary.status_counts.CANCELLED],
                  ].map(([label, value]) => (
                    <div key={String(label)} style={{ background: '#f9fafb', border: '1px solid #edf2f7', borderRadius: 14, padding: 16 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...cardStyle, padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Öncelik Dağılımı</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[
                    ['Düşük', summary.priority_counts.LOW],
                    ['Orta', summary.priority_counts.MEDIUM],
                    ['Yüksek', summary.priority_counts.HIGH],
                    ['Kritik', summary.priority_counts.CRITICAL],
                  ].map(([label, value]) => (
                    <div key={String(label)} style={{ background: '#f9fafb', border: '1px solid #edf2f7', borderRadius: 14, padding: 16 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</div>
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
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Acil / Kritik Görevler</div>
                {summary.urgent_tasks.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>Acil görev yok.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {summary.urgent_tasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          background: task.priority === 'CRITICAL' ? '#fff7f7' : '#f9fafb',
                          border: task.priority === 'CRITICAL' ? '1px solid #fecaca' : '1px solid #edf2f7',
                          borderRadius: 14,
                          padding: 14,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                          <div style={{ fontWeight: 800 }}>{task.title || `Görev #${task.id}`}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ ...statusPill(task.status), borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 800 }}>
                              {getStatusLabel(task.status)}
                            </div>
                            <div style={{ ...priorityPill(task.priority), borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 800 }}>
                              {getPriorityLabel(task.priority)}
                            </div>
                          </div>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.5 }}>
                          Sorumlu: <strong>{task.assigned_to || '-'}</strong> · Tür: <strong>{task.task_type || '-'}</strong>
                        </div>
                        <div style={{ marginTop: 8, color: task.is_overdue ? '#b91c1c' : '#6b7280', fontSize: 13, fontWeight: task.is_overdue ? 800 : 500 }}>
                          Termin: {formatDate(task.due_date)} {task.is_overdue ? '• Gecikmiş' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ ...cardStyle, padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Personel İş Yükü</div>
                {summary.assignee_workload.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>Personel verisi yok.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {summary.assignee_workload.map((row) => (
                      <div key={row.assigned_to} style={{ background: '#f9fafb', border: '1px solid #edf2f7', borderRadius: 14, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                          <strong>{row.assigned_to}</strong>
                          <span style={{ color: '#6b7280', fontSize: 13 }}>Toplam: {row.total}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <span style={{ background: '#fff7ed', color: '#c2410c', borderRadius: 999, padding: '5px 9px', fontSize: 12, fontWeight: 700 }}>
                            Beklemede: {row.pending}
                          </span>
                          <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '5px 9px', fontSize: 12, fontWeight: 700 }}>
                            Devam: {row.in_progress}
                          </span>
                          <span style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 999, padding: '5px 9px', fontSize: 12, fontWeight: 700 }}>
                            Gecikmiş: {row.overdue}
                          </span>
                          <span style={{ background: '#7f1d1d', color: '#fff', borderRadius: 999, padding: '5px 9px', fontSize: 12, fontWeight: 700 }}>
                            Kritik: {row.critical}
                          </span>
                        </div>
                      </div>
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
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Son Eklenen Görevler</div>
                {summary.recent_tasks.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>Görev bulunamadı.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {summary.recent_tasks.map((task) => (
                      <div key={task.id} style={{ background: '#f9fafb', border: '1px solid #edf2f7', borderRadius: 14, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                          <strong>{task.title || `Görev #${task.id}`}</strong>
                          <span style={{ ...statusPill(task.status), borderRadius: 999, padding: '5px 9px', fontSize: 12, fontWeight: 800 }}>
                            {getStatusLabel(task.status)}
                          </span>
                        </div>
                        <div style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.5 }}>
                          Sorumlu: <strong>{task.assigned_to || '-'}</strong> · Öncelik:{' '}
                          <span style={{ ...priorityPill(task.priority), borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 800 }}>
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
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Son Aktiviteler</div>
                {summary.recent_activity.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>Aktivite kaydı bulunamadı.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {summary.recent_activity.map((log) => (
                      <div key={log.id} style={{ background: '#f9fafb', border: '1px solid #edf2f7', borderRadius: 14, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                          <strong>{log.action}</strong>
                          <span style={{ color: '#6b7280', fontSize: 12 }}>{formatDate(log.created_at)}</span>
                        </div>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>{log.task_title}</div>
                        <div style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.5 }}>{log.note || '-'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}