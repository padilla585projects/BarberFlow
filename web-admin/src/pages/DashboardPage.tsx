import { useAuth } from '../contexts/AuthContext'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { user } = useAuth()

  const roleLabel: Record<string, string> = {
    client: 'Cliente',
    barber: 'Barbero',
    owner: 'Dueño',
    developer: 'Developer',
  }

  return (
    <div className={styles.page}>
      <h1>Bienvenido, {user?.displayName?.split(' ')[0]} 👋</h1>
      <p className={styles.sub}>Panel {roleLabel[user?.role ?? '']} — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      <div className={styles.grid}>
        <StatCard icon="📅" label="Citas hoy" value="—" />
        <StatCard icon="👥" label="Clientes" value="—" />
        <StatCard icon="💶" label="Ingresos" value="—" />
        <StatCard icon="📦" label="Productos" value="—" />
      </div>
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
