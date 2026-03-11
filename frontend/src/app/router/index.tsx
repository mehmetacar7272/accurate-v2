import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../../modules/auth/pages/LoginPage'
import { DashboardPage } from '../../modules/dashboard/pages/DashboardPage'
import { AppShell } from '../../components/layout/AppShell'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
      </Route>
    </Routes>
  )
}
