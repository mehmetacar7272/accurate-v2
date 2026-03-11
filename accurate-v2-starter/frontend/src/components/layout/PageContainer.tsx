import { ReactNode } from 'react'

export function PageContainer({ children }: { children: ReactNode }) {
  return <main style={{ padding: 24 }}>{children}</main>
}
