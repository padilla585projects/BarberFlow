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
      { to: '/dashboard', icon: '\u{1F4CA}', label: 'Dashboard' },
    ],
  },
  {
    title: 'Mi Negocio',
    items: [
      { to: '/barbershop',   icon: '✂️',  label: 'Mi Barbería' },
      { to: '/barbers',             icon: '\u{1F464}', label: 'Barberos' },
      { to: '/barber-applications', icon: '✂️',         label: 'Solicitudes barberos' },
      { to: '/services',     icon: '\u{1F4CB}', label: 'Servicios' },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { to: '/appointments', icon: '\u{1F4C5}', label: 'Citas' },
      { to: '/inventory',    icon: '\u{1F4E6}', label: 'Inventario' },
      { to: '/orders',       icon: '\u{1F6CD}️', label: 'Pedidos Shop' },
      { to: '/sales',        icon: '\u{1F4B6}', label: 'Ventas POS' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { to: '/finances',        icon: '\u{1F4B0}', label: 'Finanzas' },
      { to: '/client-payments', icon: '\u{1F9FE}', label: 'Cobros de clientes' },
      { to: '/payments',        icon: '\u{1F4B3}', label: 'Pagos' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/promos',      icon: '\u{1F39F}️', label: 'Promociones' },
      { to: '/reviews',     icon: '⭐',          label: 'Reseñas' },
      { to: '/gift-cards',  icon: '🎁',          label: 'Tarjetas regalo' },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { to: '/reports', icon: '\u{1F4C8}', label: 'Reportes' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { to: '/notifications', icon: '\u{1F514}', label: 'Notificaciones' },
      { to: '/messages',      icon: '\u{1F4AC}', label: 'Mensajes' },
    ],
  },
]

const barberSections: NavSection[] = [
  {
    items: [
      { to: '/dashboard',    icon: '\u{1F4CA}', label: 'Dashboard' },
      { to: '/appointments', icon: '\u{1F4C5}', label: 'Mis Citas' },
      { to: '/sales',        icon: '\u{1F4B6}', label: 'Ventas' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { to: '/notifications', icon: '\u{1F514}', label: 'Notificaciones' },
      { to: '/messages',      icon: '\u{1F4AC}', label: 'Mensajes' },
    ],
  },
]

const developerSections: NavSection[] = [
  {
    items: [
      { to: '/dashboard', icon: '\u{1F4CA}', label: 'Dashboard' },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { to: '/barbershops', icon: '\u{1F3EA}', label: 'Barberías' },
      { to: '/users',       icon: '\u{1F465}', label: 'Usuarios' },
      { to: '/services',    icon: '\u{1F4CB}', label: 'Servicios' },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { to: '/appointments', icon: '\u{1F4C5}', label: 'Citas' },
      { to: '/inventory',    icon: '\u{1F4E6}', label: 'Inventario' },
      { to: '/orders',       icon: '\u{1F6CD}️', label: 'Pedidos Shop' },
      { to: '/sales',        icon: '\u{1F4B6}', label: 'Ventas POS' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { to: '/finances',        icon: '\u{1F4B0}', label: 'Finanzas' },
      { to: '/client-payments', icon: '\u{1F9FE}', label: 'Cobros de clientes' },
      { to: '/payments',        icon: '\u{1F4B3}', label: 'Pagos' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/promos',      icon: '\u{1F39F}️', label: 'Promociones' },
      { to: '/reviews',     icon: '⭐',          label: 'Reseñas' },
      { to: '/gift-cards',  icon: '🎁',          label: 'Tarjetas regalo' },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { to: '/reports', icon: '\u{1F4C8}', label: 'Reportes' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { to: '/notifications', icon: '\u{1F514}', label: 'Notificaciones' },
      { to: '/messages',      icon: '\u{1F4AC}', label: 'Mensajes' },
    ],
  },
]

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
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
    client: 'Cliente',
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    onClose?.()
  }

  return (
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
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
                onClick={handleNavClick}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <button className={styles.logoutBtn} onClick={handleLogout}>
        <span>{'\u{1F6AA}'}</span>
        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}
