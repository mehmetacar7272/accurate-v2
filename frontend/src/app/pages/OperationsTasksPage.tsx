import { useEffect, useState } from "react"
import axios from "axios"

type Task = {
  id: number
  status: string
  due_date?: string
}

export default function OperationsTasksPage() {

  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    const res = await axios.get("http://127.0.0.1:8000/api/v1/operations/tasks")
    setTasks(res.data)
  }

  const getColor = (task: Task) => {
    if (!task.due_date) return "#6b7280"

    const due = new Date(task.due_date).getTime()
    const now = new Date().getTime()

    if (due < now) return "#ef4444"
    if (due - now < 86400000) return "#f59e0b"

    return "#22c55e"
  }

  return (
    <div style={{ padding: 30 }}>
      <h2>Operasyon Görevleri</h2>

      {tasks.map(t => (
        <div key={t.id}
             style={{
               padding: 15,
               marginBottom: 10,
               background: getColor(t),
               borderRadius: 8,
               color: "white"
             }}>
          Görev #{t.id} — {t.status}
        </div>
      ))}
    </div>
  )
}