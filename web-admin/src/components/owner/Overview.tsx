import { Barbershop, User, Appointment, Sale } from '../../types'
import styles from '../../pages/owner/OwnerDashboard.module.css'

interface OverviewProps {
  barbershop: Barbershop
  barbers: User[]
  appointments: Appointment[]
  sales: Sale[]
}

export default function Overview({
  barbershop,
  barbers,
  appointments,
  sales,
}: OverviewProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayAppointments = appointments.filter(a => {
    const appDate = new Date(a.date)
    appDate.setHours(0, 0, 0, 0)
    return appDate.getTime() === today.getTime()
  })

  const completedToday = todayAppointments.filter(a => a.status === 'completed').length
  const pendingToday = todayAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length

  const salesToday = sales.filter(s => {
    const saleDate = new Date(s.date)
    saleDate.setHours(0, 0, 0, 0)
    return saleDate.getTime() === today.getTime()
  })

  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  const appointmentsThisMonth = appointments.filter(a => {
    const appDate = new Date(a.date)
    return appDate.getMonth() === currentMonth && appDate.getFullYear() === currentYear
  })

  const salesThisMonth = sales.filter(s => {
    const saleDate = new Date(s.date)
    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear
  })

  const revenueToday = todayAppointments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + a.totalPrice, 0) +
    salesToday.reduce((sum, s) => sum + s.totalAmount, 0)

  const revenueThisMonth = appointmentsThisMonth
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + a.totalPrice, 0) +
    salesThisMonth.reduce((sum, s) => sum + s.totalAmount, 0)

  const totalClients = new Set(
    appointments.map(a => a.clientId)
  ).size

  const tipsToday = salesToday.reduce((sum, s) => sum + (s.tipAmount ?? 0), 0)

  return (
    <div>
      <div className={styles.overviewGrid}>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Ingresos Hoy</p>
          <p className={styles.cardValue}>{revenueToday.toFixed(0)}€</p>
          <p className={styles.cardSub}>{completedToday} citas + {salesToday.length} ventas</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Ingresos Este Mes</p>
          <p className={styles.cardValue}>{revenueThisMonth.toFixed(0)}€</p>
          <p className={styles.cardSub}>{appointmentsThisMonth.length} citas + {salesThisMonth.length} ventas</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Citas Hoy</p>
          <p className={styles.cardValue}>{todayAppointments.length}</p>
          <p className={styles.cardSub}>{completedToday} completadas · {pendingToday} pendientes</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Propinas Hoy</p>
          <p className={styles.cardValue}>{tipsToday.toFixed(0)}€</p>
          <p className={styles.cardSub}>De {salesToday.length} ventas</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Total Clientes</p>
          <p className={styles.cardValue}>{totalClients}</p>
          <p className={styles.cardSub}>Clientes únicos</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Barberos Activos</p>
          <p className={styles.cardValue}>{barbers.length}</p>
          <p className={styles.cardSub}>En tu barbería</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Servicios</p>
          <p className={styles.cardValue}>{barbershop.services?.length ?? 0}</p>
          <p className={styles.cardSub}>Ofrecidos</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Citas Pendientes</p>
          <p className={styles.cardValue}>{appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length}</p>
          <p className={styles.cardSub}>Que requieren atención</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>Actividad Reciente</p>
        <div style={{ marginTop: 16 }}>
          {[...appointments, ...sales as any[]].slice(-10)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(item => (
              <div key={item.id} style={{
                padding: '12px 0',
                borderBottom: '1px solid #222',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ color: '#ccc' }}>
                  {'timeSlot' in item ? `Cita - ${item.timeSlot}` : `Venta - ${(item as any).totalAmount?.toFixed(0)}€`}
                </span>
                <span style={{ color: '#666', fontSize: '12px' }}>
                  {new Date(item.date).toLocaleDateString('es-ES')}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
