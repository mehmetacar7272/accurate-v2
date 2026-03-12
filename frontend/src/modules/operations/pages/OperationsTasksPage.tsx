import { useEffect, useState } from 'react'

type Task = {
  id: number
  status: string
  due_date?: string | null
}

export function OperationsTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError('')

      const res = await fetch('http://127.0.0.1:8000/api/v1/operations/tasks')
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

  const getColor = (task: Task) => {
    if (!task.due_date) return '#6b7280'

    const due = new Date(task.due_date).getTime()
    const now = new Date().getTime()

    if (due < now) return '#ef4444'
    if (due - now < 86400000) return '#f59e0b'

    return '#22c55e'
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Operasyon Görevleri</h2>

      {loading && <p>Yükleniyor...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && tasks.length === 0 && <p>Henüz görev yok.</p>}

      {tasks.map((t) => (
        <div
          key={t.id}
          style={{
            padding: 14,
            marginBottom: 10,
            background: getColor(t),
            borderRadius: 8,
            color: 'white',
          }}
        >
          Görev #{t.id} — {t.status}
        </div>
      ))}
    </div>
  )
}