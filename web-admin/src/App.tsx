import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/common/ErrorBoundary'
import { ToastProvider } from './components/common/Toast'
import ProtectedRoute from './components/common/ProtectedRoute'
import Layout from './components/common/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BarbershopsPage from './pages/developer/BarbershopsPage'
import BarbershopFormPage from './pages/developer/BarbershopFormPage'
import UsersPage from './pages/developer/UsersPage'
import InventoryPage from './pages/owner/InventoryPage'
import AppointmentsPage from './pages/owner/AppointmentsPage'
import BarbersPage from './pages/owner/BarbersPage'
import ServicesPage from './pages/owner/ServicesPage'
import BarbershopPage from './pages/owner/BarbershopPage'
import ReportsPage from './pages/owner/ReportsPage'
import SalesPage from './pages/owner/SalesPage'
import OrdersPage from './pages/owner/OrdersPage'
import ReviewsPage from './pages/owner/ReviewsPage'
import PromosPage from './pages/owner/PromosPage'
import FinancePage from './pages/owner/FinancePage'
import PaymentsPage from './pages/owner/PaymentsPage'
import ClientPaymentsPage from './pages/owner/ClientPaymentsPage'
import BarberApplicationsPage from './pages/owner/BarberApplicationsPage'
import NotificationsPage from './pages/owner/NotificationsPage'
import MessagesPage from './pages/owner/MessagesPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import PrivacyPage from './pages/PrivacyPage'
import LandingPage from './pages/LandingPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Rutas protegidas con layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute allowedRoles={['barber', 'owner', 'developer']}>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                {/* Developer */}
                <Route path="/barbershops" element={<ProtectedRoute allowedRoles={['developer']}><BarbershopsPage /></ProtectedRoute>} />
                <Route path="/barbershops/:id" element={<ProtectedRoute allowedRoles={['developer']}><BarbershopFormPage /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute allowedRoles={['developer']}><UsersPage /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><InventoryPage /></ProtectedRoute>} />
                <Route path="/appointments" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><AppointmentsPage /></ProtectedRoute>} />
                <Route path="/barbers" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><BarbersPage /></ProtectedRoute>} />
                <Route path="/services" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><ServicesPage /></ProtectedRoute>} />
                <Route path="/barbershop" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><BarbershopPage /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><ReportsPage /></ProtectedRoute>} />
                <Route path="/sales" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><SalesPage /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><OrdersPage /></ProtectedRoute>} />
                <Route path="/reviews" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><ReviewsPage /></ProtectedRoute>} />
                <Route path="/promos" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><PromosPage /></ProtectedRoute>} />
                <Route path="/finances" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><FinancePage /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><PaymentsPage /></ProtectedRoute>} />
                <Route path="/client-payments" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><ClientPaymentsPage /></ProtectedRoute>} />
                <Route path="/barber-applications" element={<ProtectedRoute allowedRoles={['owner', 'developer']}><BarberApplicationsPage /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute allowedRoles={['barber', 'owner', 'developer']}><NotificationsPage /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute allowedRoles={['barber', 'owner', 'developer']}><MessagesPage /></ProtectedRoute>} />
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
