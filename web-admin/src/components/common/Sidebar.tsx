import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Sidebar.module.css'

interface NavItem {
  to: string
  icon: string
  label: string
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const ownerSections: NavSection[] = [
  {
    items: [
      { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    ],
  },
  {
    title: 'Mi Negocio',
    items: [
      { to: '/barbershop',   icon: '✂️',  label: 'Mi Barbería' },
      { to: '/barbers',      icon: '👤', label: 'Barberos' },
      { to: '/services',     icon: '📋', label: 'Servicios' },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { to: '/appointments', icon: '📅', label: 'Citas' },
      { to: '/inventory',    icon: '📦', label: 'Inventario' },
      { to: '/orders',       icon: '🛍️', label: 'Pedidos Shop' },
      { to: '/sales',        icon: '💶', label: 'Ventas POS' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { to: '/finances', icon: '💰', label: 'Finanzas' },
      { to: '/payments', icon: '💳', label: 'Pagos' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/promos',  icon: '🎟️', label: 'Promociones' },
      { to: '/reviews', icon: '⭐', label: 'Reseñas' },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { to: '/reports', icon: '📈', label: 'Reportes' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { to: '/notifications', icon: '🔔', label: 'Notificaciones' },
      { to: '/messages',      icon: '💬', label: 'Mensajes' },
    ],
  },
]

const barberSections: NavSection[] = [
  {
    items: [
      { to: '/dashboard',    icon: '📊', label: 'Dashboard' },
      { to: '/appointments', icon: '📅', label: 'Mis Citas' },
      { to: '/sales',        icon: '💶', label: 'Ventas' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { to: '/notifications', icon: '🔔', label: 'Notificaciones' },
      { to: '/messages',      icon: '💬', label: 'Mensajes' },
    ],
  },
]

const developerSections: NavSection[] = [
  {
    items: [
      { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { to: '/barbershops', icon: '🏪', label: 'Barberías' },
      { to: '/users',       icon: '👥', label: 'Usuarios' },
      { to: '/services',    icon: '📋', label: 'Servicios' },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { to: '/appointments', icon: '📅', label: 'Citas' },
      { to: '/inventory',    icon: '📦', label: 'Inventario' },
      { to: '/orders',       icon: '🛍️', label: 'Pedidos Shop' },
      { to: '/sales',        icon: '💶', label: 'Ventas POS' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { to: '/finances', icon: '💰', label: 'Finanzas' },
      { to: '/payments', icon: '💳', label: 'Pagos' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/promos',  icon: '🎟️', label: 'Promociones' },
      { to: '/reviews', icon: '⭐', label: 'Reseñas' },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { to: '/reports', icon: '📈', label: 'Reportes' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { to: '/notifications', icon: '🔔', label: 'Notificaciones' },
      { to: '/messages',      icon: '💬', label: 'Mensajes' },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const sections =
    user?.role === 'developer' ? developerSections :
    user?.role === 'owner' ? ownerSections :
    barberSections

  const roleLabel: Record<string, string> = {
    barber: 'Barbero',
    owner: 'Dueño',
    developer: 'Developer',
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <img src="/logo.png" alt="BarberFlow" className={styles.brandLogo} />
      </div>

      <div className={styles.userInfo}>
        {user?.photoURL
          ? <img src={user.photoURL} alt="avatar" className={styles.avatar} />
          : <div className={styles.avatarFallback}>{user?.displayName?.[0]}</div>
        }
        <div>
          <p className={styles.userName}>{user?.displayName}</p>
          <span className={styles.role}>{roleLabel[user?.role ?? '']}</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {sections.map((section, i) => (
          <div key={i} className={styles.navSection}>
            {section.title && (
              <p className={styles.sectionTitle}>{section.title}</p>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <button className={styles.logoutBtn} onClick={handleLogout}>
        <span>🚪</span>
        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}
