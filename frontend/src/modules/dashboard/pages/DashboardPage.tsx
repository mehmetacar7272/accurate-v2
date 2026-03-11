import { useEffect, useState } from 'react'
import { FormCard } from '../../../components/forms/FormCard'
import { DataTable } from '../../../components/tables/DataTable'
import { StatusBadge } from '../../../components/badges/StatusBadge'
import { apiClient } from '../../../api/client'

type DashboardSummary = {
  today_jobs: number
  pending_reports: number
  calibration_alerts: number
  personnel_alerts: number
  operation_tasks_open: number
  operation_tasks_overdue: number
  operation_tasks_blocking: number
}

type OperationTask = {
  id: number
  title: string
  task_type: string
  status: string
  assigned_to: string
  due_date: string | null
  is_overdue: boolean
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [tasks, setTasks] = useState<OperationTask[]>([])

  useEffect(() => {
    async function load() {
      const [summaryRes, taskRes] = await Promise.all([
        apiClient.get('/dashboard'),
        apiClient.get('/operations/tasks'),
      ])
      setSummary(summaryRes.data)
      setTasks(taskRes.data)
    }
    load().catch(console.error)
  }, [])

  const cards = [
    ['Bugünkü İşler', String(summary?.today_jobs ?? 0)],
    ['Bekleyen Raporlar', String(summary?.pending_reports ?? 0)],
    ['Açık Operasyon Görevleri', String(summary?.operation_tasks_open ?? 0)],
    ['Geciken Görevler', String(summary?.operation_tasks_overdue ?? 0)],
  ]

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <FormCard title="Dashboard">
        <p style={{ marginBottom: 0 }}>
          Sprint 2 Patch-1 hazır. Operasyon form ve görev altyapısı backend tarafında kuruldu.
        </p>
      </FormCard>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {cards.map(([title, value]) => (
          <FormCard key={title} title={title}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
          </FormCard>
        ))}
      </div>
      <DataTable>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Operasyon Görevleri</strong>
          <StatusBadge label={summary?.operation_tasks_blocking ? `Bloklayan: ${summary.operation_tasks_blocking}` : 'Görev sistemi aktif'} />
        </div>
        {tasks.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Henüz operasyon görevi üretilmedi.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {tasks.slice(0, 8).map((task) => (
              <div
                key={task.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 12,
                  background: task.is_overdue ? '#fff1f2' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong>{task.title}</strong>
                  <StatusBadge label={task.is_overdue ? 'Gecikti' : task.status || 'Açık'} />
                </div>
                <div style={{ color: '#6b7280', marginTop: 6, fontSize: 14 }}>
                  Tür: {task.task_type || '-'} | Sorumlu: {task.assigned_to || '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </DataTable>
    </div>
  )
}
