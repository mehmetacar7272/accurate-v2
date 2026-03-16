import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../../modules/auth/pages/LoginPage'
import { DashboardPage } from '../../modules/dashboard/pages/DashboardPage'
import { AppShell } from '../../components/layout/AppShell'
import OperationsTasksPage from '../../modules/operations/pages/OperationsTasksPage'
import InspectionDefinitionsPage from '../../modules/admin/pages/InspectionDefinitionsPage'
import QualityDocumentsPage from '../../modules/quality/pages/QualityDocumentsPage'
import RequestListPage from '../../modules/request/pages/RequestListPage'
import OfferListPage from '../../modules/offer/pages/OfferListPage'
import OfferDetailPage from '../../modules/offer/pages/OfferDetailPage'
import ApprovedOfferListPage from '../../modules/offer/pages/ApprovedOfferListPage'
import ProtocolListPage from '../../modules/protocol/pages/ProtocolListPage'
import ProtocolDetailPage from '../../modules/protocol/pages/ProtocolDetailPage'
import CustomerListPage from '../../modules/customer/pages/CustomerListPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="operations/tasks" element={<OperationsTasksPage />} />
        <Route path="admin/inspection-definitions" element={<InspectionDefinitionsPage />} />
        <Route path="quality/documents" element={<QualityDocumentsPage />} />
        <Route path="customers" element={<CustomerListPage />} />
        <Route path="requests" element={<RequestListPage />} />
        <Route path="offers" element={<OfferListPage />} />
        <Route path="offers/approved" element={<ApprovedOfferListPage />} />
        <Route path="offers/:offerId" element={<OfferDetailPage />} />
        <Route path="protocols" element={<ProtocolListPage />} />
        <Route path="protocols/:protocolId" element={<ProtocolDetailPage />} />
      </Route>
    </Routes>
  )
}
