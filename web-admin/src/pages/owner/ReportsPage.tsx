import { useEffect, useState } from 'react'
import { getAllBarbershops } from '../../services/barbershops'
import { getUsersByBarbershop } from '../../services/users'
import { getAppointmentsByBarbershop } from '../../services/appointments'
import { useAuth } from '../../contexts/AuthContext'
import { Barbershop, User, Appointment } from '../../types'
import styles from './ReportsPage.module.css'

type Period = 'week' | 'month' | 'quarter' | 'year' | 'custom'

function startOf(period: Period, customFrom?: string, customTo?: string): { from: Date; to: Date } {
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
  } else if (period === 'quarter') {
    from.setMonth(Math.floor(now.getMonth() / 3) * 3, 1)
  } else if (period === 'year') {
    from.setMonth(0, 1)
  } else if (period === 'custom' && customFrom && customTo) {
    return {
      from: new Date(customFrom + 'T00:00:00'),
      to: new Date(customTo + 'T23:59:59'),
    }
  }
  return { from, to }
}

function inRange(date: Date, from: Date, to: Date) {
  return date >= from && date <= to
}

interface BarberRow {
  barber: User
  totalApps: number
  completed: number
  cancelled: number
  pending: number
  revenue: number
  avgTicket: number
  topService: string
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [barbers, setBarbers] = useState<User[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [exporting, setExporting] = useState(false)

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const [users, apps] = await Promise.all([
      getUsersByBarbershop(shopId),
      getAppointmentsByBarbershop(shopId),
    ])
    setBarbers(users.filter(u => u.role === 'barber' || u.role === 'owner'))
    setAppointments(apps)
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

  const { from, to } = startOf(period, customFrom, customTo)

  const filtered = appointments.filter(a => inRange(new Date(a.date), from, to))

  const rows: BarberRow[] = barbers.map(barber => {
    const ba = filtered.filter(a => a.barberId === barber.uid)
    const completed = ba.filter(a => a.status === 'completed')
    const revenue = completed.reduce((s, a) => s + a.totalPrice, 0)
    const avgTicket = completed.length ? revenue / completed.length : 0

    // Servicio más realizado
    const svcCount: Record<string, number> = {}
    completed.forEach(a => a.services.forEach(s => {
      svcCount[s.name] = (svcCount[s.name] ?? 0) + 1
    }))
    const topService = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    return {
      barber,
      totalApps: ba.length,
      completed: completed.length,
      cancelled: ba.filter(a => a.status === 'cancelled').length,
      pending: ba.filter(a => a.status === 'pending' || a.status === 'confirmed').length,
      revenue,
      avgTicket,
      topService,
    }
  }).sort((a, b) => b.revenue - a.revenue)

  const totals = {
    apps: rows.reduce((s, r) => s + r.totalApps, 0),
    completed: rows.reduce((s, r) => s + r.completed, 0),
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      // Importar ExcelJS en tiempo real para no aumentar el bundle
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'BarberFlow'
      wb.created = new Date()

      const ws = wb.addWorksheet('Reporte')
      const shopName = barbershops.find(b => b.id === selectedShop)?.name ?? 'Barbería'
      const periodLabel = { week: 'Semana actual', month: 'Mes actual', quarter: 'Trimestre', year: 'Año', custom: 'Personalizado' }[period]

      // Título
      ws.mergeCells('A1:H1')
      const titleCell = ws.getCell('A1')
      titleCell.value = `${shopName} — ${periodLabel} (${from.toLocaleDateString('es-ES')} – ${to.toLocaleDateString('es-ES')})`
      titleCell.font = { bold: true, size: 14 }
      titleCell.alignment = { horizontal: 'center' }

      ws.addRow([])

      // Cabecera
      const header = ws.addRow(['Barbero', 'Email', 'Total citas', 'Completadas', 'Canceladas', 'Pendientes', 'Ingresos (€)', 'Ticket medio (€)', 'Servicio top'])
      header.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } }
        cell.alignment = { horizontal: 'center' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF444444' } } }
      })

      // Filas de datos
      rows.forEach((r, i) => {
        const row = ws.addRow([
          r.barber.displayName,
          r.barber.email,
          r.totalApps,
          r.completed,
          r.cancelled,
          r.pending,
          r.revenue,
          Number(r.avgTicket.toFixed(2)),
          r.topService,
        ])
        if (i % 2 === 1) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } }
          })
        }
        // Formato moneda
        row.getCell(7).numFmt = '#,##0.00 "€"'
        row.getCell(8).numFmt = '#,##0.00 "€"'
      })

      // Fila total
      ws.addRow([])
      const totalRow = ws.addRow(['TOTAL', '', totals.apps, totals.completed, '', '', totals.revenue, '', ''])
      totalRow.eachCell(cell => { cell.font = { bold: true } })
      totalRow.getCell(7).numFmt = '#,##0.00 "€"'

      // Anchos de columna
      ws.columns = [
        { width: 22 }, { width: 28 }, { width: 13 }, { width: 14 },
        { width: 13 }, { width: 13 }, { width: 16 }, { width: 17 }, { width: 20 },
      ]

      // Descargar
      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `barberflow_reporte_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const PERIOD_LABELS: Record<Period, string> = {
    week: 'Esta semana',
    month: 'Este mes',
    quarter: 'Este trimestre',
    year: 'Este año',
    custom: 'Personalizado',
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Reportes</h1>
          <p className={styles.sub}>{barbershops.find(b => b.id === selectedShop)?.name}</p>
        </div>
        <div className={styles.headerActions}>
          {user?.role === 'developer' && (
            <select className={styles.shopSelect} value={selectedShop}
              onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}>
              {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button className={styles.exportBtn} onClick={exportExcel} disabled={exporting || rows.length === 0}>
            {exporting ? 'Generando...' : '⬇ Exportar Excel'}
          </button>
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
        {period === 'custom' && (
          <div className={styles.customRange}>
            <input type="date" className={styles.dateInput} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span>—</span>
            <input type="date" className={styles.dateInput} value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      {/* Totales globales */}
      <div className={styles.totals}>
        <div className={styles.total}>
          <span className={styles.totalVal}>{totals.apps}</span>
          <span className={styles.totalLabel}>Citas en periodo</span>
        </div>
        <div className={styles.total}>
          <span className={styles.totalVal}>{totals.completed}</span>
          <span className={styles.totalLabel}>Completadas</span>
        </div>
        <div className={styles.total}>
          <span className={styles.totalVal}>
            {totals.apps ? Math.round((totals.completed / totals.apps) * 100) : 0}%
          </span>
          <span className={styles.totalLabel}>Tasa de éxito</span>
        </div>
        <div className={styles.total}>
          <span className={styles.totalVal}>{totals.revenue.toFixed(0)}€</span>
          <span className={styles.totalLabel}>Ingresos totales</span>
        </div>
        <div className={styles.total}>
          <span className={styles.totalVal}>
            {totals.completed ? (totals.revenue / totals.completed).toFixed(2) : '0.00'}€
          </span>
          <span className={styles.totalLabel}>Ticket medio</span>
        </div>
      </div>

      {/* Tabla por barbero */}
      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : rows.length === 0 ? (
        <div className={styles.empty}><span>📊</span><p>Sin datos en este periodo</p></div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Barbero</span>
            <span>Citas</span>
            <span>Completadas</span>
            <span>Canceladas</span>
            <span>Pendientes</span>
            <span>Ingresos</span>
            <span>Ticket medio</span>
            <span>Servicio top</span>
          </div>
          {rows.map(r => (
            <div key={r.barber.uid} className={styles.row}>
              <div className={styles.barberCell}>
                {r.barber.photoURL
                  ? <img src={r.barber.photoURL} className={styles.rowAvatar} alt="" />
                  : <div className={styles.rowAvatarFallback}>{r.barber.displayName[0]}</div>
                }
                <span>{r.barber.displayName}</span>
              </div>
              <span className={styles.cell}>{r.totalApps}</span>
              <span className={`${styles.cell} ${styles.green}`}>{r.completed}</span>
              <span className={`${styles.cell} ${styles.red}`}>{r.cancelled}</span>
              <span className={`${styles.cell} ${styles.yellow}`}>{r.pending}</span>
              <span className={`${styles.cell} ${styles.bold}`}>{r.revenue.toFixed(2)}€</span>
              <span className={styles.cell}>{r.avgTicket.toFixed(2)}€</span>
              <span className={`${styles.cell} ${styles.muted}`}>{r.topService}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
