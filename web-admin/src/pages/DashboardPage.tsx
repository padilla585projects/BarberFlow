import { useAuth } from '../contexts/AuthContext'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { user, logout } = useAuth()

  const roleLabel: Record<string, string> = {
    client: 'Cliente',
    barber: 'Barbero',
    owner: 'Dueño',
    developer: 'Developer',
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.brand}>✂️ BarberFlow</span>
        <div className={styles.userInfo}>
          {user?.photoURL && (
            <img src={user.photoURL} alt="avatar" className={styles.avatar} />
          )}
          <span>{user?.displayName}</span>
          <span className={styles.role}>{roleLabel[user?.role ?? '']}</span>
          <button className={styles.logoutBtn} onClick={logout}>Salir</button>
        </div>
      </header>

      <main className={styles.main}>
        <h1>Bienvenido, {user?.displayName?.split(' ')[0]} 👋</h1>
        <p className={styles.sub}>Panel {roleLabel[user?.role ?? '']} — en construcción</p>

        <div className={styles.grid}>
          <StatCard icon="📅" label="Citas hoy" value="—" />
          <StatCard icon="👥" label="Clientes" value="—" />
          <StatCard icon="💶" label="Ingresos" value="—" />
          <StatCard icon="📦" label="Productos" value="—" />
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className={styles.card}>
      <span className={styles.cardIcon}>{icon}</span>
      <span className={styles.cardValue}>{value}</span>
      <span className={styles.cardLabel}>{label}</span>
    </div>
  )
}
