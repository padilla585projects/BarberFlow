import { useEffect, useState } from 'react'
import { getAllBarbershops } from '../../services/barbershops'
import { getUsersByBarbershop } from '../../services/users'
import { getAppointmentsByBarbershop } from '../../services/appointments'
import { getSalesByBarbershop } from '../../services/sales'
import { useAuth } from '../../contexts/AuthContext'
import { Barbershop, User, Appointment, Sale } from '../../types'
import styles from './FinancePage.module.css'

type Period = 'today' | 'week' | 'month' | 'year'

function getPeriodRange(period: Period): { from: Date; to: Date } {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)
  const from = new Date(now)
  from.setHours(0, 0, 0, 0)

  if (period === 'week') {
    const day = now.getDay() || 7
    from.setDate(now.getDate() - day + 1)
  } else if (period === 'month') {
    from.setDate(1)
  } else if (period === 'year') {
    from.setMonth(0, 1)
  }
  // 'today' keeps from as start of day
  return { from, to }
}

function inRange(date: Date, from: Date, to: Date) {
  return date >= from && date <= to
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  year: 'Este año',
}

interface BarberEarning {
  barber: User
  revenue: number
  tips: number
  commission: number
}

interface Transaction {
  id: string
  type: 'cita' | 'service' | 'product'
  name: string
  barberName: string
  amount: number
  date: Date
}

export default function FinancePage() {
  const { user } = useAuth()
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [barbers, setBarbers] = useState<User[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const [users, apps, salesData] = await Promise.all([
      getUsersByBarbershop(shopId),
      getAppointmentsByBarbershop(shopId),
      getSalesByBarbershop(shopId),
    ])
    setBarbers(users.filter(u => u.role === 'barber' || u.role === 'owner'))
    setAppointments(apps)
    setSales(salesData)
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const allShops = await getAllBarbershops()
      const shops = user?.role === 'developer'
        ? allShops
        : allShops.filter(s => s.ownerId === user?.uid)
      setBarbershops(shops)
      const shopId = user?.barbershopId ?? shops[0]?.id ?? ''
      setSelectedShop(shopId)
      await load(shopId)
    }
    init()
  }, [])

  const { from, to } = getPeriodRange(period)

  // Filtered data for selected period
  const filteredApps = appointments.filter(a =>
    a.status === 'completed' && inRange(new Date(a.date), from, to)
  )
  const filteredSales = sales.filter(s => inRange(new Date(s.date), from, to))

  // KPIs
  const appointmentRevenue = filteredApps.reduce((s, a) => s + a.totalPrice, 0)
  const salesRevenue = filteredSales.reduce((s, v) => s + v.totalAmount, 0)
  const totalRevenue = appointmentRevenue + salesRevenue
  const totalTips = filteredSales.reduce((s, v) => s + ((v as any).tipAmount ?? 0), 0)
  // Commission: 10% of appointment revenue as example
  const commissionRate = 0.10
  const totalCommissions = appointmentRevenue * commissionRate
  const netProfit = totalRevenue - totalCommissions

  // Revenue breakdown: services vs products
  const serviceRevenue = appointmentRevenue +
    filteredSales.reduce((s, v) => s + v.items.filter(i => i.type === 'service').reduce((a, i) => a + i.price * i.quantity, 0), 0)
  const productRevenue = filteredSales.reduce((s, v) =>
    s + v.items.filter(i => i.type === 'product').reduce((a, i) => a + i.price * i.quantity, 0), 0)
  const maxRevenue = Math.max(serviceRevenue, productRevenue, 1)

  // Per-barber earnings
  const barberEarnings: BarberEarning[] = barbers.map(barber => {
    const barberApps = filteredApps.filter(a => a.barberId === barber.uid)
    const barberSales = filteredSales.filter(s => s.barberId === barber.uid)
    const revenue = barberApps.reduce((s, a) => s + a.totalPrice, 0) +
      barberSales.reduce((s, v) => s + v.totalAmount, 0)
    const tips = barberSales.reduce((s, v) => s + ((v as any).tipAmount ?? 0), 0)
    const commission = barberApps.reduce((s, a) => s + a.totalPrice, 0) * commissionRate
    return { barber, revenue, tips, commission }
  }).sort((a, b) => b.revenue - a.revenue)

  // Recent transactions (last 20)
  const getBarberName = (id: string) => barbers.find(b => b.uid === id)?.displayName ?? id.slice(0, 8)

  const transactions: Transaction[] = [
    ...filteredApps.map(a => ({
      id: a.id,
      type: 'cita' as const,
      name: a.services.map(s => s.name).join(', ') || 'Cita',
      barberName: getBarberName(a.barberId),
      amount: a.totalPrice,
      date: new Date(a.date),
    })),
    ...filteredSales.flatMap(s =>
      s.items.map((item, i) => ({
        id: `${s.id}-${i}`,
        type: item.type === 'product' ? 'product' as const : 'service' as const,
        name: item.name,
        barberName: getBarberName(s.barberId),
        amount: item.price * item.quantity,
        date: new Date(s.date),
      }))
    ),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 20)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Finanzas</h1>
          <p className={styles.sub}>{barbershops.find(b => b.id === selectedShop)?.name}</p>
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

      {/* Period selector */}
      <div className={styles.periodBar}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            className={`${styles.periodBtn} ${period === p ? styles.periodActive : ''}`}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span className={styles.kpiIcon}>💰</span>
              <span className={styles.kpiVal}>{totalRevenue.toFixed(2)}€</span>
              <span className={styles.kpiLabel}>Total Ingresos</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiIcon}>🪙</span>
              <span className={styles.kpiVal}>{totalTips.toFixed(2)}€</span>
              <span className={styles.kpiLabel}>Propinas</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiIcon}>📊</span>
              <span className={styles.kpiVal}>{totalCommissions.toFixed(2)}€</span>
              <span className={styles.kpiLabel}>Comisiones</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiIcon}>✅</span>
              <span className={styles.kpiVal}>{netProfit.toFixed(2)}€</span>
              <span className={styles.kpiLabel}>Beneficio neto</span>
            </div>
          </div>

          {/* Revenue breakdown */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Desglose de ingresos</h3>
            <div className={styles.breakdown}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Servicios</span>
                <div className={styles.breakdownBarWrap}>
                  <div
                    className={`${styles.breakdownBar} ${styles.breakdownBarServices}`}
                    style={{ width: `${(serviceRevenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className={styles.breakdownAmount}>{serviceRevenue.toFixed(2)}€</span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>Productos</span>
                <div className={styles.breakdownBarWrap}>
                  <div
                    className={`${styles.breakdownBar} ${styles.breakdownBarProducts}`}
                    style={{ width: `${(productRevenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className={styles.breakdownAmount}>{productRevenue.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          {/* Two-column: barber table + transactions */}
          <div className={styles.columns}>
            {/* Per-barber earnings */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Ganancias por barbero</h3>
              {barberEarnings.length === 0 ? (
                <div className={styles.empty}><span>👤</span><p>Sin barberos</p></div>
              ) : (
                <div className={styles.table}>
                  <div className={styles.tableHead}>
                    <span>Barbero</span>
                    <span>Ingresos</span>
                    <span>Propinas</span>
                    <span>Comisión</span>
                  </div>
                  {barberEarnings.map(r => (
                    <div key={r.barber.uid} className={styles.row}>
                      <div className={styles.barberCell}>
                        {r.barber.photoURL
                          ? <img src={r.barber.photoURL} className={styles.rowAvatar} alt="" />
                          : <div className={styles.rowAvatarFallback}>{r.barber.displayName[0]}</div>
                        }
                        <span>{r.barber.displayName}</span>
                      </div>
                      <span className={`${styles.cell} ${styles.bold}`}>{r.revenue.toFixed(2)}€</span>
                      <span className={`${styles.cell} ${styles.gold}`}>{r.tips.toFixed(2)}€</span>
                      <span className={`${styles.cell} ${styles.muted}`}>{r.commission.toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent transactions */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Últimas transacciones</h3>
              {transactions.length === 0 ? (
                <div className={styles.empty}><span>💶</span><p>Sin transacciones</p></div>
              ) : (
                <div className={styles.txList}>
                  {transactions.map(tx => (
                    <div key={tx.id} className={styles.txItem}>
                      <div className={styles.txInfo}>
                        <span className={`${styles.txType} ${
                          tx.type === 'cita' ? styles.txTypeCita :
                          tx.type === 'product' ? styles.txTypeProduct :
                          styles.txTypeService
                        }`}>
                          {tx.type === 'cita' ? 'Cita' : tx.type === 'product' ? 'Producto' : 'Servicio'}
                        </span>
                        <span className={styles.txName}>{tx.name}</span>
                        <span className={styles.txMeta}>
                          {tx.barberName} · {tx.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          {' '}
                          {tx.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className={styles.txAmount}>{tx.amount.toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
