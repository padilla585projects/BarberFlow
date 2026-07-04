import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ClientHomePage.module.css'

interface QuickCard {
  icon: string
  title: string
  description: string
  to: string
}

const QUICK_CARDS: QuickCard[] = [
  { icon: '🛍️', title: 'Tienda',        description: 'Compra productos de tu barbería favorita',  to: '/client/shop' },
  { icon: '📅', title: 'Reservar cita', description: 'Agenda tu próxima visita en minutos',        to: '/client/book' },
  { icon: '📦', title: 'Mis pedidos',   description: 'Revisa el estado de tus compras',             to: '/client/orders' },
  { icon: '🗓️', title: 'Mis citas',    description: 'Consulta y gestiona tus citas',               to: '/client/appointments' },
]

export default function ClientHomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const firstName = user?.displayName?.split(' ')[0] ?? 'Cliente'
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.greeting}>
          <p className={styles.date}>{today}</p>
          <h1 className={styles.title}>Hola, {firstName} 👋</h1>
          <p className={styles.subtitle}>¿Qué necesitas hoy?</p>
        </div>
        <div className={styles.avatarWrap}>
          {user?.photoURL
            ? <img src={user.photoURL} alt="avatar" className={styles.avatar} />
            : <div className={styles.avatarFallback}>{firstName[0]?.toUpperCase()}</div>
          }
        </div>
      </div>

      <div className={styles.grid}>
        {QUICK_CARDS.map(card => (
          <button
            key={card.to}
            className={styles.card}
            onClick={() => navigate(card.to)}
          >
            <span className={styles.cardIcon}>{card.icon}</span>
            <h3 className={styles.cardTitle}>{card.title}</h3>
            <p className={styles.cardDesc}>{card.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
