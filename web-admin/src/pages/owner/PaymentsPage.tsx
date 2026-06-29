import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { getAllBarbershops } from '../../services/barbershops'
import { getUsersByBarbershop } from '../../services/users'
import { useAuth } from '../../contexts/AuthContext'
import { Barbershop, User } from '../../types'
import styles from './PaymentsPage.module.css'

interface Payment {
  id: string
  barberId: string
  period: string
  amount: number
  appointmentCount: number
  paidAt: Date
}

export default function PaymentsPage() {
  const { user } = useAuth()
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [barbers, setBarbers] = useState<User[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [barberFilter, setBarberFilter] = useState('all')

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const [users, paymentsSnap] = await Promise.all([
      getUsersByBarbershop(shopId),
      getDocs(query(
        collection(db, 'barbershops', shopId, 'payments'),
        orderBy('paidAt', 'desc')
      )),
    ])
    setBarbers(users.filter(u => u.role === 'barber' || u.role === 'owner'))
    setPayments(paymentsSnap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        barberId: data.barberId ?? '',
        period: data.period ?? '',
        amount: data.amount ?? 0,
        appointmentCount: data.appointmentCount ?? 0,
        paidAt: data.paidAt instanceof Timestamp ? data.paidAt.toDate() : new Date(data.paidAt),
      }
    }))
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

  const getBarberName = (id: string) => barbers.find(b => b.uid === id)?.displayName ?? id.slice(0, 8)
  const getBarber = (id: string) => barbers.find(b => b.uid === id)

  const filtered = payments.filter(p => barberFilter === 'all' || p.barberId === barberFilter)

  // Summary stats
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const now = new Date()
  const thisMonthPaid = payments
    .filter(p => p.paidAt.getMonth() === now.getMonth() && p.paidAt.getFullYear() === now.getFullYear())
    .reduce((s, p) => s + p.amount, 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Pagos</h1>
          <p className={styles.sub}>
            Historial de pagos a barberos · {barbershops.find(b => b.id === selectedShop)?.name}
          </p>
        </div>
        <div className={styles.headerActions}>
          {user?.role === 'developer' && (
            <select className={styles.shopSelect} value={selectedShop}
              onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}>
              {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{totalPaid.toFixed(2)}€</span>
          <span className={styles.statLabel}>Total pagado</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{thisMonthPaid.toFixed(2)}€</span>
          <span className={styles.statLabel}>Pagado este mes</span>
        </div>
      </div>

      {/* Filter */}
      <div className={styles.filters}>
        <select className={styles.filterSelect} value={barberFilter}
          onChange={e => setBarberFilter(e.target.value)}>
          <option value="all">Todos los barberos</option>
          {barbers.map(b => <option key={b.uid} value={b.uid}>{b.displayName}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>💳</span>
          <p>No hay pagos registrados {barberFilter !== 'all' ? 'para este barbero' : 'todavía'}</p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Barbero</span>
            <span>Periodo</span>
            <span>Importe</span>
            <span>Citas</span>
            <span>Fecha de pago</span>
          </div>
          {filtered.map(p => {
            const barber = getBarber(p.barberId)
            return (
              <div key={p.id} className={styles.row}>
                <div className={styles.barberCell}>
                  {barber?.photoURL
                    ? <img src={barber.photoURL} className={styles.rowAvatar} alt="" />
                    : <div className={styles.rowAvatarFallback}>{(barber?.displayName ?? '?')[0]}</div>
                  }
                  <span>{getBarberName(p.barberId)}</span>
                </div>
                <span className={styles.cell}>{p.period}</span>
                <span className={`${styles.cell} ${styles.bold}`}>{p.amount.toFixed(2)}€</span>
                <span className={styles.cell}>{p.appointmentCount}</span>
                <span className={styles.muted}>
                  {p.paidAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
