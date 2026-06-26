import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import Layout from './components/common/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BarbershopsPage from './pages/developer/BarbershopsPage'
import BarbershopFormPage from './pages/developer/BarbershopFormPage'
import UsersPage from './pages/developer/UsersPage'
import InventoryPage from './pages/owner/InventoryPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

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
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
