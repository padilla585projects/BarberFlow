import { Appointment, Sale, User } from '../types'

export interface BarberStats {
  barberId: string
  barberName: string
  totalClients: number
  totalAppointments: number
  completedAppointments: number
  totalEarnings: number
}

export interface ShopStats {
  totalRevenue: number
  totalAppointments: number
  completedAppointments: number
  totalClients: number
  conversionRate: number
  avgOrderValue: number
}

export function calculateBarberStats(
  barberId: string,
  appointments: Appointment[],
  sales: Sale[],
  barbers: User[]
): BarberStats {
  const barber = barbers.find(b => b.uid === barberId)
  const barberAppointments = appointments.filter(a => a.barberId === barberId)
  const barberSales = sales.filter(s => s.barberId === barberId)

  const completedApps = barberAppointments.filter(a => a.status === 'completed')
  const earnings = completedApps.reduce((s, a) => s + a.totalPrice, 0) +
    barberSales.reduce((s, v) => s + v.totalAmount, 0)

  const clientIds = new Set(barberAppointments.map(a => a.clientId))

  return {
    barberId,
    barberName: barber?.displayName || 'Desconocido',
    totalClients: clientIds.size,
    totalAppointments: barberAppointments.length,
    completedAppointments: completedApps.length,
    totalEarnings: earnings,
  }
}

export function calculateShopStats(
  appointments: Appointment[],
  sales: Sale[]
): ShopStats {
  const completedApps = appointments.filter(a => a.status === 'completed')
  const totalRevenue = completedApps.reduce((s, a) => s + a.totalPrice, 0) +
    sales.reduce((s, v) => s + v.totalAmount, 0)

  const clientIds = new Set(appointments.map(a => a.clientId))
  const conversionRate = appointments.length > 0
    ? (completedApps.length / appointments.length) * 100
    : 0

  const avgOrderValue = sales.length > 0
    ? sales.reduce((s, v) => s + v.totalAmount, 0) / sales.length
    : 0

  return {
    totalRevenue,
    totalAppointments: appointments.length,
    completedAppointments: completedApps.length,
    totalClients: clientIds.size,
    conversionRate,
    avgOrderValue,
  }
}

export function getRevenueByDay(
  appointments: Appointment[],
  sales: Sale[],
  days: number = 30
) {
  const dayData: { [key: string]: number } = {}

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const dateStr = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
    dayData[dateStr] = 0
  }

  for (const app of appointments) {
    if (app.status === 'completed') {
      const appDate = new Date(app.date)
      appDate.setHours(0, 0, 0, 0)
      const dateStr = appDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
      if (dateStr in dayData) {
        dayData[dateStr] += app.totalPrice
      }
    }
  }

  for (const sale of sales) {
    const saleDate = new Date(sale.date)
    saleDate.setHours(0, 0, 0, 0)
    const dateStr = saleDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
    if (dateStr in dayData) {
      dayData[dateStr] += sale.totalAmount
    }
  }

  return Object.entries(dayData).map(([date, revenue]) => ({
    date,
    revenue: Number(revenue.toFixed(2)),
  }))
}

export function getAppointmentsByDay(
  appointments: Appointment[],
  days: number = 30
) {
  const dayData: { [key: string]: { completed: number; pending: number; cancelled: number } } = {}

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const dateStr = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
    dayData[dateStr] = { completed: 0, pending: 0, cancelled: 0 }
  }

  for (const app of appointments) {
    const appDate = new Date(app.date)
    appDate.setHours(0, 0, 0, 0)
    const dateStr = appDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
    if (dateStr in dayData) {
      if (app.status === 'completed') {
        dayData[dateStr].completed++
      } else if (app.status === 'pending' || app.status === 'confirmed') {
        dayData[dateStr].pending++
      } else if (app.status === 'cancelled') {
        dayData[dateStr].cancelled++
      }
    }
  }

  return Object.entries(dayData).map(([date, stats]) => ({
    date,
    ...stats,
  }))
}
