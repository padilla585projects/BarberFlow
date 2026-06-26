import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { getAllBarbershops, getBarbershopById } from '../services/barbershops'
import { getUsersByBarbershop } from '../services/users'
import { getAppointmentsByBarbershop } from '../services/appointments'
import { getSalesByBarbershop } from '../services/sales'
import { getProductsByBarbershop } from '../services/inventory'
import { Appointment, Sale, User } from '../types'
import styles from './DashboardPage.module.css'

// Agrupa por día los últimos N días
function last14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    d.setHours(0, 0, 0, 0)
    return d
  })
}

function fmtDay(d: Date) {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [shopName, setShopName] = useState('')
  const [barbers, setBarbers] = useState<User[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [lowStock, setLowStock] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        let shopId = user?.barbershopId ?? ''
        if (!shopId) {
          const shops = await getAllBarbershops()
          shopId = shops[0]?.id ?? ''
        }
        if (!shopId) { setLoading(false); return }

        const [shop, users, apps, salesData, products] = await Promise.all([
          getBarbershopById(shopId),
          getUsersByBarbershop(shopId),
          getAppointmentsByBarbershop(shopId),
          getSalesByBarbershop(shopId),
          getProductsByBarbershop(shopId),
        ])

        setShopName(shop?.name ?? '')
        setBarbers(users.filter(u => u.role === 'barber' || u.role === 'owner'))
        setAppointments(apps)
        setSales(salesData)
        setLowStock(products.filter(p => p.stock <= 3).length)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [user])

  const today = new Date()
  const todayApps = appointments.filter(a => sameDay(new Date(a.date), today))
  const pendingApps = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')
  const completedApps = appointments.filter(a => a.status === 'completed')
  const totalRevenue = completedApps.reduce((s, a) => s + a.totalPrice, 0)
    + sales.reduce((s, v) => s + v.totalAmount, 0)
  const todayRevenue = todayApps.filter(a => a.status === 'completed').reduce((s, a) => s + a.totalPrice, 0)
    + sales.filter(s => sameDay(new Date(s.date), today)).reduce((s, v) => s + v.totalAmount, 0)

  // Gráfica de ingresos últimos 14 días
  const revenueData = last14Days().map(day => {
    const dayApps = appointments.filter(a => sameDay(new Date(a.date), day) && a.status === 'completed')
    const daySales = sales.filter(s => sameDay(new Date(s.date), day))
    const total = dayApps.reduce((s, a) => s + a.totalPrice, 0) + daySales.reduce((s, v) => s + v.totalAmount, 0)
    return { day: fmtDay(day), ingresos: Number(total.toFixed(2)) }
  })

  // Gráfica de citas por estado últimos 14 días
  const appsData = last14Days().map(day => {
    const da = appointments.filter(a => sameDay(new Date(a.date), day))
    return {
      day: fmtDay(day),
      completadas: da.filter(a => a.status === 'completed').length,
      pendientes: da.filter(a => a.status === 'pending' || a.status === 'confirmed').length,
      canceladas: da.filter(a => a.status === 'cancelled').length,
    }
  })

  // Ranking de barberos por ingresos
  const barberRanking = barbers.map(b => {
    const bApps = completedApps.filter(a => a.barberId === b.uid)
    const bSales = sales.filter(s => s.barberId === b.uid)
    const revenue = bApps.reduce((s, a) => s + a.totalPrice, 0) + bSales.reduce((s, v) => s + v.totalAmount, 0)
    return { ...b, revenue, completedApps: bApps.length }
  }).sort((a, b) => b.revenue - a.revenue)

  // Próximas citas (pendientes / confirmadas ordenadas por fecha)
  const upcoming = [...pendingApps]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  const getBarberName = (id: string) => barbers.find(b => b.uid === id)?.displayName ?? '—'

  const roleLabel: Record<string, string> = {
    barber: 'Barbero', owner: 'Dueño', developer: 'Developer',
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: <strong>{p.value}{p.dataKey === 'ingresos' ? '€' : ''}</strong>
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.topBar}>
        <div>
          <h1>Bienvenido, {user?.displayName?.split(' ')[0]}</h1>
          <p className={styles.sub}>
            {roleLabel[user?.role ?? '']} · {shopName} · {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando datos...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span className={styles.kpiIcon}>📅</span>
              <div>
                <span className={styles.kpiValue}>{todayApps.length}</span>
                <span className={styles.kpiLabel}>Citas hoy</span>
              </div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiIcon}>⏳</span>
              <div>
                <span className={styles.kpiValue}>{pendingApps.length}</span>
                <span className={styles.kpiLabel}>Pendientes</span>
              </div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiIcon}>💶</span>
              <div>
                <span className={styles.kpiValue}>{todayRevenue.toFixed(0)}€</span>
                <span className={styles.kpiLabel}>Ingresos hoy</span>
              </div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiIcon}>📊</span>
              <div>
                <span className={styles.kpiValue}>{totalRevenue.toFixed(0)}€</span>
                <span className={styles.kpiLabel}>Total acumulado</span>
              </div>
            </div>
            <div className={`${styles.kpi} ${lowStock > 0 ? styles.kpiWarn : ''}`}>
              <span className={styles.kpiIcon}>📦</span>
              <div>
                <span className={styles.kpiValue}>{lowStock}</span>
                <span className={styles.kpiLabel}>Stock bajo</span>
              </div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiIcon}>✂️</span>
              <div>
                <span className={styles.kpiValue}>{barbers.length}</span>
                <span className={styles.kpiLabel}>Barberos</span>
              </div>
            </div>
          </div>

          {/* Gráficas */}
          <div className={styles.charts}>
            {/* Ingresos 14 días */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Ingresos — últimos 14 días</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} interval={1} />
                  <YAxis tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}€`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#fff" strokeWidth={2} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 4, fill: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Citas 14 días */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Citas — últimos 14 días</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={appsData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} interval={1} />
                  <YAxis tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="completadas" name="Completadas" fill="#4ade80" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="pendientes" name="Pendientes" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="canceladas" name="Canceladas" fill="#f87171" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className={styles.legend}>
                <span className={styles.legendItem}><span style={{ background: '#4ade80' }} />Completadas</span>
                <span className={styles.legendItem}><span style={{ background: '#fbbf24' }} />Pendientes</span>
                <span className={styles.legendItem}><span style={{ background: '#f87171' }} />Canceladas</span>
              </div>
            </div>
          </div>

          {/* Bottom: Ranking + Próximas citas */}
          <div className={styles.bottom}>
            {/* Ranking barberos */}
            <div className={styles.rankCard}>
              <h3 className={styles.rankTitle}>Ranking barberos</h3>
              {barberRanking.length === 0 ? (
                <p className={styles.empty}>Sin datos todavía</p>
              ) : (
                <div className={styles.rankList}>
                  {barberRanking.map((b, i) => (
                    <div key={b.uid} className={styles.rankRow}>
                      <span className={`${styles.rankNum} ${i === 0 ? styles.rankGold : i === 1 ? styles.rankSilver : i === 2 ? styles.rankBronze : ''}`}>
                        {i + 1}
                      </span>
                      {b.photoURL
                        ? <img src={b.photoURL} className={styles.rankAvatar} alt="" />
                        : <div className={styles.rankAvatarFallback}>{b.displayName[0]}</div>
                      }
                      <div className={styles.rankInfo}>
                        <span className={styles.rankName}>{b.displayName}</span>
                        <span className={styles.rankSub}>{b.completedApps} citas completadas</span>
                      </div>
                      <span className={styles.rankRevenue}>{b.revenue.toFixed(0)}€</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Próximas citas */}
            <div className={styles.upcomingCard}>
              <h3 className={styles.rankTitle}>Próximas citas</h3>
              {upcoming.length === 0 ? (
                <p className={styles.empty}>No hay citas pendientes</p>
              ) : (
                <div className={styles.upcomingList}>
                  {upcoming.map(a => (
                    <div key={a.id} className={styles.upcomingRow}>
                      <div className={styles.upcomingDate}>
                        <span className={styles.upcomingDay}>
                          {new Date(a.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className={styles.upcomingTime}>{a.timeSlot}</span>
                      </div>
                      <div className={styles.upcomingInfo}>
                        <span className={styles.upcomingBarber}>{getBarberName(a.barberId)}</span>
                        <span className={styles.upcomingServices}>
                          {a.services.map(s => s.name).join(', ')}
                        </span>
                      </div>
                      <span className={`${styles.upcomingStatus} ${a.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending}`}>
                        {a.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                      </span>
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
