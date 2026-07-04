import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, orderBy, Timestamp, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ClientAppointmentsPage.module.css'

type AppStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

interface ClientAppointment {
  id: string
  serviceName: string
  barberName?: string
  barbershopId: string
  date: Date
  timeSlot: string
  status: AppStatus
  servicePrice: number
  barbershopName?: string
}

const STATUS_LABEL: Record<AppStatus, string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show:   'No presentado',
}

const STATUS_CLASS: Record<AppStatus, string> = {
  pending:   'statusPending',
  confirmed: 'statusConfirmed',
  completed: 'statusCompleted',
  cancelled: 'statusCancelled',
  no_show:   'statusCancelled',
}

export default function ClientAppointmentsPage() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<ClientAppointment[]>([])
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const q = query(
        collection(db, 'appointments'),
        where('clientId', '==', user.uid),
        orderBy('date', 'desc')
      )
      const snap = await getDocs(q)
      const list: ClientAppointment[] = snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          serviceName: data.serviceName ?? data.services?.[0]?.name ?? 'Servicio',
          barberName: data.barberName ?? '',
          barbershopId: data.barbershopId,
          barbershopName: data.barbershopName ?? '',
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
          timeSlot: data.timeSlot ?? data.time ?? '',
          status: data.status as AppStatus,
          servicePrice: data.servicePrice ?? data.totalPrice ?? 0,
        }
      })
      setAppointments(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user])

  const handleCancel = async (id: string) => {
    if (!window.confirm('¿Seguro que quieres cancelar esta cita?')) return
    setCancelling(id)
    try {
      await updateDoc(doc(db, 'appointments', id), { status: 'cancelled' })
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mis Citas</h1>
        <button className={styles.refreshBtn} onClick={load} disabled={loading}>
          {loading ? '...' : '↻ Actualizar'}
        </button>
      </div>

      {loading && appointments.length === 0 && (
        <p className={styles.muted}>Cargando citas...</p>
      )}

      {!loading && appointments.length === 0 && (
        <div className={styles.empty}>
          <span>📅</span>
          <p>No tienes citas registradas</p>
        </div>
      )}

      <div className={styles.list}>
        {appointments.map(apt => (
          <div key={apt.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.serviceName}>{apt.serviceName}</p>
                {apt.barbershopName && (
                  <p className={styles.barbershopName}>{apt.barbershopName}</p>
                )}
              </div>
              <span className={`${styles.badge} ${styles[STATUS_CLASS[apt.status]]}`}>
                {STATUS_LABEL[apt.status]}
              </span>
            </div>

            <div className={styles.cardMeta}>
              <span>📅 {apt.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>🕐 {apt.timeSlot}</span>
              {apt.barberName && <span>💈 {apt.barberName}</span>}
              <span>💰 {apt.servicePrice.toFixed(2)} €</span>
            </div>

            {(apt.status === 'pending' || apt.status === 'confirmed') && (
              <button
                className={styles.cancelBtn}
                onClick={() => handleCancel(apt.id)}
                disabled={cancelling === apt.id}
              >
                {cancelling === apt.id ? 'Cancelando...' : 'Cancelar cita'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
