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
        <svg className={styles.brandLogo} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          {/* Círculo */}
          <circle cx="100" cy="100" r="95" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.5"/>

          {/* Tijeras */}
          <g transform="translate(100, 85) rotate(-35)">
            <circle cx="-15" cy="-30" r="7" fill="none" stroke="#c9a84c" strokeWidth="2"/>
            <circle cx="15" cy="-30" r="7" fill="none" stroke="#c9a84c" strokeWidth="2"/>
            <path d="M -15 -23 Q 0 -12 15 -23" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round"/>
          </g>

          {/* Navaja */}
          <g transform="translate(100, 85) rotate(35)">
            <path d="M 8 -35 L 16 15 Q 16 20 11 23 Q 8 23 8 20 L 8 -35" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="8" cy="-35" r="5" fill="none" stroke="#c9a84c" strokeWidth="1.5"/>
          </g>

          {/* Peine */}
          <g transform="translate(100, 85) translate(-8, 8)">
            <rect x="-2" y="-18" width="4" height="25" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="-6" y1="-5" x2="2" y2="-5" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="-6" y1="5" x2="2" y2="5" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="-6" y1="15" x2="2" y2="15" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
          </g>
        </svg>
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

      <div className={styles.logoutDivider} />
      <button className={styles.logoutBtn} onClick={handleLogout}>
        <span>🚪</span>
        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}
