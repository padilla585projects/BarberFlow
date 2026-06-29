import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function UnauthorizedPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#C9A84C',
            marginBottom: 16,
          }}
        >
          403
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: '#FFFFFF',
            margin: '0 0 12px',
          }}
        >
          Acceso denegado
        </h1>
        <p
          style={{
            fontSize: 15,
            color: '#999999',
            margin: '0 0 32px',
            lineHeight: 1.5,
          }}
        >
          No tienes permisos para acceder a esta página.
        </p>
        <button
          onClick={() => navigate(user ? '/dashboard' : '/login')}
          style={{
            backgroundColor: '#C9A84C',
            color: '#0A0A0A',
            border: 'none',
            borderRadius: 8,
            padding: '12px 32px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {user ? 'Volver al panel' : 'Iniciar sesión'}
        </button>
      </div>
    </div>
  )
}
