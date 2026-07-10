import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Appointment, Sale, User } from '../../types'
import styles from '../../pages/owner/OwnerDashboard.module.css'

interface AnalyticsPageProps {
  appointments: Appointment[]
  sales: Sale[]
  barbers: User[]
}

export default function AnalyticsPage({
  appointments,
  sales,
  barbers,
}: AnalyticsPageProps) {
  const analytics = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      date.setHours(0, 0, 0, 0)
      return date
    })

    const revenueData = last30Days.map(day => {
      const dayApps = appointments.filter(a => {
        const appDate = new Date(a.date)
        appDate.setHours(0, 0, 0, 0)
        return appDate.getTime() === day.getTime() && a.status === 'completed'
      })
      const daySales = sales.filter(s => {
        const saleDate = new Date(s.date)
        saleDate.setHours(0, 0, 0, 0)
        return saleDate.getTime() === day.getTime()
      })
      const revenue = dayApps.reduce((s, a) => s + a.totalPrice, 0) +
        daySales.reduce((s, v) => s + v.totalAmount, 0)
      return {
        date: day.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        ingresos: Number(revenue.toFixed(2)),
      }
    })

    const appointmentData = last30Days.map(day => {
      const dayApps = appointments.filter(a => {
        const appDate = new Date(a.date)
        appDate.setHours(0, 0, 0, 0)
        return appDate.getTime() === day.getTime()
      })
      return {
        date: day.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        completadas: dayApps.filter(a => a.status === 'completed').length,
        pendientes: dayApps.filter(a => a.status === 'pending' || a.status === 'confirmed').length,
        canceladas: dayApps.filter(a => a.status === 'cancelled').length,
      }
    })

    // Ranking de barberos
    const barberStats = barbers.map(b => {
      const completedApps = appointments.filter(a => a.barberId === b.uid && a.status === 'completed')
      const barberSales = sales.filter(s => s.barberId === b.uid)
      const revenue = completedApps.reduce((s, a) => s + a.totalPrice, 0) +
        barberSales.reduce((s, v) => s + v.totalAmount, 0)
      return {
        nombre: b.displayName,
        citas: completedApps.length,
        ingresos: revenue,
      }
    }).sort((a, b) => b.ingresos - a.ingresos)

    // Estadísticas generales
    const completedApps = appointments.filter(a => a.status === 'completed')
    const totalRevenue = completedApps.reduce((s, a) => s + a.totalPrice, 0) +
      sales.reduce((s, v) => s + v.totalAmount, 0)
    const avgOrderValue = sales.length > 0
      ? sales.reduce((s, v) => s + v.totalAmount, 0) / sales.length
      : 0
    const conversionRate = appointments.length > 0
      ? (completedApps.length / appointments.length) * 100
      : 0

    return {
      revenueData,
      appointmentData,
      barberStats,
      stats: {
        totalRevenue,
        totalAppointments: appointments.length,
        completedAppointments: completedApps.length,
        totalSales: sales.length,
        avgOrderValue,
        conversionRate,
      }
    }
  }, [appointments, sales, barbers])

  return (
    <div>
      {/* KPIs */}
      <div className={styles.overviewGrid}>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Ingresos Totales</p>
          <p className={styles.cardValue}>{analytics.stats.totalRevenue.toFixed(0)}€</p>
          <p className={styles.cardSub}>Todas las transacciones</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Citas Completadas</p>
          <p className={styles.cardValue}>{analytics.stats.completedAppointments}</p>
          <p className={styles.cardSub}>De {analytics.stats.totalAppointments} citas</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Tasa de Conversión</p>
          <p className={styles.cardValue}>{analytics.stats.conversionRate.toFixed(1)}%</p>
          <p className={styles.cardSub}>Citas completadas vs total</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Valor Promedio Venta</p>
          <p className={styles.cardValue}>{analytics.stats.avgOrderValue.toFixed(2)}€</p>
          <p className={styles.cardSub}>{analytics.stats.totalSales} ventas registradas</p>
        </div>
      </div>

      {/* Charts */}
      <div className={styles.analyticsGrid}>
        {/* Ingresos */}
        <div className={styles.chartCard}>
          <p className={styles.chartTitle}>Ingresos — Últimos 30 días</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #222' }}
                formatter={(value: any) => [`${value.toFixed(2)}€`, 'Ingresos']}
              />
              <Line type="monotone" dataKey="ingresos" stroke="#c9a84c" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Citas */}
        <div className={styles.chartCard}>
          <p className={styles.chartTitle}>Citas — Últimos 30 días</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.appointmentData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #222' }} />
              <Legend />
              <Bar dataKey="completadas" fill="#4ade80" name="Completadas" radius={[2, 2, 0, 0]} />
              <Bar dataKey="pendientes" fill="#fbbf24" name="Pendientes" radius={[2, 2, 0, 0]} />
              <Bar dataKey="canceladas" fill="#f87171" name="Canceladas" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking de Barberos */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>Ranking de Barberos (Por Ingresos)</p>
        {analytics.barberStats.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No hay datos disponibles</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Posición</th>
                  <th className={styles.th}>Barbero</th>
                  <th className={styles.th}>Citas</th>
                  <th className={styles.th}>Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {analytics.barberStats.map((barber, idx) => (
                  <tr key={barber.nombre} className={styles.tr}>
                    <td className={styles.td}>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '16px',
                        color: idx === 0 ? '#fbbf24' : idx === 1 ? '#d4af37' : idx === 2 ? '#b87333' : '#c9a84c',
                      }}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className={styles.td}>{barber.nombre}</td>
                    <td className={styles.td}>{barber.citas}</td>
                    <td className={styles.td} style={{ fontWeight: 600, color: '#c9a84c' }}>
                      {barber.ingresos.toFixed(2)}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
