import { useEffect, useState } from 'react'
import { getAppointmentsByBarbershop, updateAppointmentStatus } from '../../services/appointments'
import { getAllBarbershops } from '../../services/barbershops'
import { getUsersByBarbershop } from '../../services/users'
import { useAuth } from '../../contexts/AuthContext'
import { Appointment, Barbershop, User } from '../../types'
import styles from './AppointmentsPage.module.css'

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

const STATUS_COLORS = {
  pending: '#fbbf24',
  confirmed: '#60a5fa',
  completed: '#4ade80',
  cancelled: '#f87171',
}

type FilterStatus = 'all' | Appointment['status']

export default function AppointmentsPage() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [barbers, setBarbers] = useState<User[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [barberFilter, setBarberFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const [apps, barberList] = await Promise.all([
      getAppointmentsByBarbershop(shopId),
      getUsersByBarbershop(shopId),
    ])
    setAppointments(apps)
    setBarbers(barberList.filter(u => u.role === 'barber' || u.role === 'owner'))
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

  const handleStatus = async (id: string, status: Appointment['status']) => {
    await updateAppointmentStatus(id, status)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  const filtered = appointments
    .filter(a => statusFilter === 'all' || a.status === statusFilter)
    .filter(a => barberFilter === 'all' || a.barberId === barberFilter)
    .filter(a => !dateFilter || new Date(a.date).toLocaleDateString('es-ES') === new Date(dateFilter).toLocaleDateString('es-ES'))

  const today = appointments.filter(a => {
    const d = new Date(a.date)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })

  const totalIngresos = appointments
    .filter(a => a.status === 'completed')
    .reduce((s, a) => s + a.totalPrice, 0)

  const getBarberName = (id: string) => barbers.find(b => b.uid === id)?.displayName ?? id.slice(0, 8)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Citas</h1>
          <p className={styles.sub}>{appointments.length} citas totales · {barbershops.find(b => b.id === selectedShop)?.name}</p>
        </div>
        {user?.role === 'developer' && (
          <select className={styles.shopSelect} value={selectedShop}
            onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}>
            {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{today.length}</span>
          <span className={styles.statLabel}>Hoy</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{appointments.filter(a => a.status === 'pending').length}</span>
          <span className={styles.statLabel}>Pendientes</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{appointments.filter(a => a.status === 'completed').length}</span>
          <span className={styles.statLabel}>Completadas</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalIngresos.toFixed(0)}€</span>
          <span className={styles.statLabel}>Ingresos</span>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filters}>
        <div className={styles.statusTabs}>
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as FilterStatus[]).map(s => (
            <button
              key={s}
              className={`${styles.tab} ${statusFilter === s ? styles.tabActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'Todas' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className={styles.filterRow}>
          <select className={styles.filterSelect} value={barberFilter}
            onChange={e => setBarberFilter(e.target.value)}>
            <option value="all">Todos los barberos</option>
            {barbers.map(b => <option key={b.uid} value={b.uid}>{b.displayName}</option>)}
          </select>
          <input
            type="date"
            className={styles.filterDate}
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
          {dateFilter && (
            <button className={styles.clearDate} onClick={() => setDateFilter('')}>✕ Limpiar</button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>📅</span>
          <p>No hay citas con estos filtros</p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Cliente</span>
            <span>Barbero</span>
            <span>Servicios</span>
            <span>Fecha y hora</span>
            <span>Total</span>
            <span>Estado</span>
          </div>
          {filtered.map(apt => (
            <div key={apt.id} className={styles.row}>
              <span className={styles.cell}>{apt.clientId.slice(0, 8)}...</span>
              <span className={styles.cell}>{getBarberName(apt.barberId)}</span>
              <div className={styles.services}>
                {apt.services.map(s => (
                  <span key={s.id} className={styles.serviceTag}>{s.name}</span>
                ))}
              </div>
              <div className={styles.dateCell}>
                <span>{new Date(apt.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className={styles.time}>{apt.timeSlot}</span>
              </div>
              <span className={styles.price}>{apt.totalPrice.toFixed(2)}€</span>
              <div className={styles.statusCell}>
                <select
                  className={styles.statusSelect}
                  value={apt.status}
                  onChange={e => handleStatus(apt.id, e.target.value as Appointment['status'])}
                  style={{ color: STATUS_COLORS[apt.status] }}
                >
                  {(Object.keys(STATUS_LABELS) as Appointment['status'][]).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
