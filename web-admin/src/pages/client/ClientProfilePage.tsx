import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ClientProfilePage.module.css'

export default function ClientProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [totalOrders, setTotalOrders] = useState(0)
  const [totalAppointments, setTotalAppointments] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchStats = async () => {
      try {
        const [ordersSnap, aptsSnap] = await Promise.all([
          getDocs(query(collection(db, 'orders'), where('clientId', '==', user.uid))),
          getDocs(query(collection(db, 'appointments'), where('clientId', '==', user.uid))),
        ])
        setTotalOrders(ordersSnap.size)
        setTotalAppointments(aptsSnap.size)
        const spent = ordersSnap.docs.reduce((sum, d) => {
          const data = d.data()
          return sum + (data.totalAmount ?? data.totalPrice ?? 0)
        }, 0)
        setTotalSpent(spent)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [user])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initial = user?.displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Mi Perfil</h1>

      {/* Avatar */}
      <div className={styles.avatarSection}>
        {user?.photoURL
          ? <img src={user.photoURL} alt="avatar" className={styles.avatar} />
          : <div className={styles.avatarFallback}>{initial}</div>
        }
        <div>
          <p className={styles.displayName}>{user?.displayName}</p>
          <p className={styles.email}>{user?.email}</p>
          <span className={styles.roleBadge}>Cliente</span>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📦</span>
          <p className={styles.statValue}>{loading ? '...' : totalOrders}</p>
          <p className={styles.statLabel}>Pedidos</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📅</span>
          <p className={styles.statValue}>{loading ? '...' : totalAppointments}</p>
          <p className={styles.statLabel}>Citas</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>💰</span>
          <p className={styles.statValue}>{loading ? '...' : `${totalSpent.toFixed(0)} €`}</p>
          <p className={styles.statLabel}>Gasto total</p>
        </div>
      </div>

      {/* Acciones */}
      <div className={styles.actions}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  )
}
