import { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useWebCart } from '../../contexts/WebCartContext'
import IphoneBanner from './IphoneBanner'
import styles from './ClientLayout.module.css'

interface Tab {
  to: string
  icon: string
  label: string
}

const TABS: Tab[] = [
  { to: '/client/home',         icon: '🏠', label: 'Inicio' },
  { to: '/client/shop',         icon: '🛍️', label: 'Tienda' },
  { to: '/client/orders',       icon: '📦', label: 'Pedidos' },
  { to: '/client/appointments', icon: '📅', label: 'Citas' },
  { to: '/client/profile',      icon: '👤', label: 'Perfil' },
]

export default function ClientLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { items } = useWebCart()
  const navigate = useNavigate()

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className={styles.layout}>
      {/* Navbar superior */}
      <header className={styles.navbar}>
        <div className={styles.navbarLogo} onClick={() => navigate('/client/home')}>
          <img src="/logo.png" alt="BarberFlow" className={styles.logoImg} />
          <span className={styles.logoText}>BarberFlow</span>
        </div>
        <div className={styles.navbarRight}>
          {cartCount > 0 && (
            <button className={styles.cartBtn} onClick={() => navigate('/client/cart')}>
              🛒
              <span className={styles.cartBadge}>{cartCount}</span>
            </button>
          )}
          <div className={styles.avatarWrap}>
            {user?.photoURL
              ? <img src={user.photoURL} alt="avatar" className={styles.avatar} />
              : <div className={styles.avatarFallback}>{user?.displayName?.[0]?.toUpperCase() ?? '?'}</div>
            }
            <span className={styles.userName}>{user?.displayName?.split(' ')[0]}</span>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className={styles.main}>
        {children}
      </main>

      {/* Banner iPhone */}
      <IphoneBanner />

      {/* Tab bar inferior */}
      <nav className={styles.tabBar}>
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
