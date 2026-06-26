import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Sidebar.module.css'

interface NavItem {
  to: string
  icon: string
  label: string
}

const ownerNav: NavItem[] = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/barbershop', icon: '✂️', label: 'Mi Barbería' },
  { to: '/barbers', icon: '👤', label: 'Barberos' },
  { to: '/services', icon: '📋', label: 'Servicios' },
  { to: '/inventory', icon: '📦', label: 'Inventario' },
  { to: '/appointments', icon: '📅', label: 'Citas' },
  { to: '/reports', icon: '📈', label: 'Reportes' },
]

const barberNav: NavItem[] = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/appointments', icon: '📅', label: 'Mis Citas' },
  { to: '/sales', icon: '💶', label: 'Ventas' },
  { to: '/stats', icon: '📈', label: 'Mis Stats' },
]

const developerNav: NavItem[] = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/barbershops', icon: '🏪', label: 'Barberías' },
  { to: '/users', icon: '👥', label: 'Usuarios' },
  { to: '/reports', icon: '📈', label: 'Reportes' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navItems =
    user?.role === 'developer' ? developerNav :
    user?.role === 'owner' ? ownerNav :
    barberNav

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
        <span className={styles.brandIcon}>✂️</span>
        <span className={styles.brandName}>BarberFlow</span>
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
        {navItems.map(item => (
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
      </nav>

      <button className={styles.logoutBtn} onClick={handleLogout}>
        <span>🚪</span>
        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}
