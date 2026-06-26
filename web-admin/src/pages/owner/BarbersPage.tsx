import { useEffect, useState } from 'react'
import { getAllBarbershops } from '../../services/barbershops'
import { getUsersByBarbershop, updateBarberSettings } from '../../services/users'
import { getAppointmentsByBarbershop } from '../../services/appointments'
import { useAuth } from '../../contexts/AuthContext'
import { Barbershop, User, Appointment } from '../../types'
import styles from './BarbersPage.module.css'

// Slot en minutos según citas/hora
const slotLabel = (n: number) => {
  const mins = Math.round(60 / n)
  return `${mins} min/cita`
}

export default function BarbersPage() {
  const { user } = useAuth()
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [barbers, setBarbers] = useState<User[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  // capacity draft per barber uid
  const [capacity, setCapacity] = useState<Record<string, number>>({})

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const [users, apps] = await Promise.all([
      getUsersByBarbershop(shopId),
      getAppointmentsByBarbershop(shopId),
    ])
    const bs = users.filter(u => u.role === 'barber' || u.role === 'owner')
    setBarbers(bs)
    setAppointments(apps)
    // Inicializar capacidad con los valores guardados (default 1)
    const caps: Record<string, number> = {}
    bs.forEach(b => { caps[b.uid] = b.appointmentsPerHour ?? 1 })
    setCapacity(caps)
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const shops = await getAllBarbershops()
      setBarbershops(shops)
      const shopId = user?.barbershopId ?? shops[0]?.id ?? ''
      setSelectedShop(shopId)
      await load(shopId)
    }
    init()
  }, [])

  const handleCapacity = (uid: string, val: number) => {
    const clamped = Math.min(4, Math.max(1, val))
    setCapacity(prev => ({ ...prev, [uid]: clamped }))
  }

  const saveCapacity = async (uid: string) => {
    setSaving(uid)
    await updateBarberSettings(uid, { appointmentsPerHour: capacity[uid] })
    setBarbers(prev => prev.map(b => b.uid === uid ? { ...b, appointmentsPerHour: capacity[uid] } : b))
    setSaving(null)
  }

  const getBarberStats = (uid: string) => {
    const barberApps = appointments.filter(a => a.barberId === uid)
    const completed = barberApps.filter(a => a.status === 'completed')
    const ingresos = completed.reduce((s, a) => s + a.totalPrice, 0)
    const today = barberApps.filter(a => {
      const d = new Date(a.date)
      return d.toDateString() === new Date().toDateString()
    })
    return { total: barberApps.length, completed: completed.length, ingresos, today: today.length }
  }

  const isDirty = (b: User) => capacity[b.uid] !== (b.appointmentsPerHour ?? 1)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Barberos</h1>
          <p className={styles.sub}>
            {barbers.length} barbero{barbers.length !== 1 ? 's' : ''} · {barbershops.find(b => b.id === selectedShop)?.name}
          </p>
        </div>
        {user?.role === 'developer' && (
          <select className={styles.shopSelect} value={selectedShop}
            onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}>
            {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Info banner */}
      <div className={styles.infoBanner}>
        <span className={styles.infoIcon}>💡</span>
        <p>
          La <strong>capacidad por hora</strong> determina cada cuántos minutos se genera un hueco de reserva.
          Un barbero con <strong>2 citas/hora</strong> tiene turnos cada <strong>30 min</strong>;
          con <strong>1 cita/hora</strong>, cada <strong>60 min</strong>.
        </p>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : barbers.length === 0 ? (
        <div className={styles.empty}>
          <span>👤</span>
          <p>No hay barberos en esta barbería</p>
          <small>Asigna usuarios desde el panel de Usuarios</small>
        </div>
      ) : (
        <div className={styles.grid}>
          {barbers.map(b => {
            const stats = getBarberStats(b.uid)
            const cap = capacity[b.uid] ?? 1
            const dirty = isDirty(b)
            const isSaving = saving === b.uid

            return (
              <div key={b.uid} className={styles.card}>
                {/* Avatar + info */}
                <div className={styles.cardTop}>
                  {b.photoURL
                    ? <img src={b.photoURL} alt={b.displayName} className={styles.avatar} />
                    : <div className={styles.avatarFallback}>{b.displayName?.[0]?.toUpperCase()}</div>
                  }
                  <div className={styles.info}>
                    <p className={styles.name}>{b.displayName}</p>
                    <p className={styles.email}>{b.email}</p>
                    <span className={`${styles.roleBadge} ${b.role === 'owner' ? styles.ownerBadge : ''}`}>
                      {b.role === 'owner' ? 'Dueño' : 'Barbero'}
                    </span>
                  </div>
                </div>

                {/* Stats rápidas */}
                <div className={styles.miniStats}>
                  <div className={styles.miniStat}>
                    <span className={styles.miniVal}>{stats.today}</span>
                    <span className={styles.miniLabel}>Hoy</span>
                  </div>
                  <div className={styles.miniStat}>
                    <span className={styles.miniVal}>{stats.total}</span>
                    <span className={styles.miniLabel}>Total citas</span>
                  </div>
                  <div className={styles.miniStat}>
                    <span className={styles.miniVal}>{stats.ingresos.toFixed(0)}€</span>
                    <span className={styles.miniLabel}>Ingresos</span>
                  </div>
                </div>

                {/* Capacidad */}
                <div className={styles.capacitySection}>
                  <div className={styles.capacityHeader}>
                    <span className={styles.capacityLabel}>Citas por hora</span>
                    <span className={styles.slotLabel}>{slotLabel(cap)}</span>
                  </div>

                  <div className={styles.capacityControl}>
                    <button
                      className={styles.capBtn}
                      onClick={() => handleCapacity(b.uid, cap - 1)}
                      disabled={cap <= 1}
                    >−</button>

                    <div className={styles.capDisplay}>
                      {[1, 2, 3, 4].map(n => (
                        <button
                          key={n}
                          className={`${styles.capOption} ${cap === n ? styles.capActive : ''}`}
                          onClick={() => handleCapacity(b.uid, n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>

                    <button
                      className={styles.capBtn}
                      onClick={() => handleCapacity(b.uid, cap + 1)}
                      disabled={cap >= 4}
                    >+</button>
                  </div>

                  <div className={styles.slotsPreview}>
                    {Array.from({ length: cap }, (_, i) => {
                      const mins = Math.round((i * 60) / cap)
      const h = String(Math.floor(mins / 60) + 9).padStart(2, '0')
                      const m = String(mins % 60).padStart(2, '0')
                      return (
                        <span key={i} className={styles.slotChip}>
                          {h}:{m}
                        </span>
                      )
                    }).concat(
                      <span key="dots" className={styles.slotDots}>· · ·</span>
                    )}
                    <span className={styles.slotsNote}>huecos/hora</span>
                  </div>
                </div>

                {dirty && (
                  <button
                    className={styles.saveBtn}
                    onClick={() => saveCapacity(b.uid)}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Guardando...' : '✓ Guardar cambios'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
