import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { PageContainer } from './PageContainer'

export function AppShell() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ background: '#f6f7fb' }}>
        <Topbar />
        <PageContainer>
          <Outlet />
        </PageContainer>
      </div>
    </div>
  )
}
