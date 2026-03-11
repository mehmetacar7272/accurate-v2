import { ReactNode } from 'react'

export function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </section>
  )
}
