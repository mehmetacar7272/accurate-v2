import { ReactNode } from 'react'

export function DataTable({ children }: { children: ReactNode }) {
  return <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: 16 }}>{children}</div>
}
