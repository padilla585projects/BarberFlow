import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'

interface Props {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div style={{ color: 'white', padding: 40 }}>Cargando...</div>

  if (!user) return <Navigate to="/login" replace />

  // Si el usuario es cliente y está intentando acceder a rutas no-client, redirigir a /client/home
  if (user.role === 'client' && !location.pathname.startsWith('/client')) {
    return <Navigate to="/client/home" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
