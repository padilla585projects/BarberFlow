import { useEffect, useState } from 'react'
import { getAllBarbershops } from '../../services/barbershops'
import { getUsersByBarbershop } from '../../services/users'
import { getAppointmentsByBarbershop } from '../../services/appointments'
import { getSalesByBarbershop } from '../../services/sales'
import { useAuth } from '../../contexts/AuthContext'
import { Barbershop, User, Appointment, Sale } from '../../types'
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
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [exporting, setExporting] = useState(false)

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const [users, apps, shopSales] = await Promise.all([
      getUsersByBarbershop(shopId),
      getAppointmentsByBarbershop(shopId),
      getSalesByBarbershop(shopId),
    ])
    setBarbers(users.filter(u => u.role === 'barber' || u.role === 'owner'))
    setAppointments(apps)
    setSales(shopSales)
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

  // ─── Excel helper: gold header style ────────────────────────────────
  const applyGoldHeader = (row: import('exceljs').Row) => {
    row.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9A84C' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF444444' } } }
    })
  }

  const autoWidth = (ws: import('exceljs').Worksheet) => {
    ws.columns.forEach(col => {
      let maxLen = 10
      col.eachCell?.({ includeEmpty: false }, cell => {
        const len = cell.value ? String(cell.value).length : 0
        if (len > maxLen) maxLen = len
      })
      col.width = Math.min(maxLen + 4, 50)
    })
  }

  const addTitle = (ws: import('exceljs').Worksheet, text: string, colCount: number) => {
    const lastCol = String.fromCharCode(64 + colCount) // A=65
    ws.mergeCells(`A1:${lastCol}1`)
    const titleCell = ws.getCell('A1')
    titleCell.value = text
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFC9A84C' } }
    titleCell.alignment = { horizontal: 'center' }
    ws.addRow([]) // blank row after title
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'BarberFlow'
      wb.created = new Date()

      const shopName = barbershops.find(b => b.id === selectedShop)?.name ?? 'Barbería'
      const periodLabel = { week: 'Semana actual', month: 'Mes actual', quarter: 'Trimestre', year: 'Año', custom: 'Personalizado' }[period]
      const rangeLabel = `${from.toLocaleDateString('es-ES')} – ${to.toLocaleDateString('es-ES')}`

      // Helper to get barber name from uid
      const barberName = (uid: string) => barbers.find(b => b.uid === uid)?.displayName ?? 'Desconocido'

      // Filter sales by period
      const filteredSales = sales.filter(s => inRange(new Date(s.date), from, to))

      // ──────────────────────────────────────────────────────────────────
      // Sheet 1: Resumen General
      // ──────────────────────────────────────────────────────────────────
      const ws1 = wb.addWorksheet('Resumen General')
      addTitle(ws1, `${shopName} — ${periodLabel} (${rangeLabel})`, 9)

      const h1 = ws1.addRow(['Barbero', 'Email', 'Total citas', 'Completadas', 'Canceladas', 'Pendientes', 'Ingresos (€)', 'Ticket medio (€)', 'Servicio top'])
      applyGoldHeader(h1)

      rows.forEach((r, i) => {
        const row = ws1.addRow([
          r.barber.displayName, r.barber.email,
          r.totalApps, r.completed, r.cancelled, r.pending,
          r.revenue, Number(r.avgTicket.toFixed(2)), r.topService,
        ])
        if (i % 2 === 1) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
          })
        }
        row.getCell(7).numFmt = '#,##0.00 "€"'
        row.getCell(8).numFmt = '#,##0.00 "€"'
      })

      ws1.addRow([])
      const totalRow = ws1.addRow(['TOTAL', '', totals.apps, totals.completed, '', '', totals.revenue, '', ''])
      totalRow.eachCell(cell => { cell.font = { bold: true } })
      totalRow.getCell(7).numFmt = '#,##0.00 "€"'
      autoWidth(ws1)

      // ──────────────────────────────────────────────────────────────────
      // Sheet 2: Desglose por Barbero
      // ──────────────────────────────────────────────────────────────────
      const ws2 = wb.addWorksheet('Desglose por Barbero')
      addTitle(ws2, `Desglose por Barbero — ${rangeLabel}`, 8)

      const h2 = ws2.addRow([
        'Barbero', 'Citas completadas', 'Ingresos servicios (€)',
        'Ingresos productos (€)', 'Ingresos total (€)',
        'Desglose de servicios', 'Ticket medio (€)', 'Productos vendidos',
      ])
      applyGoldHeader(h2)

      rows.forEach((r, i) => {
        const completed = filtered.filter(a => a.barberId === r.barber.uid && a.status === 'completed')

        // Service count breakdown
        const svcCount: Record<string, number> = {}
        completed.forEach(a => a.services.forEach(s => {
          svcCount[s.name] = (svcCount[s.name] ?? 0) + 1
        }))
        const svcBreakdown = Object.entries(svcCount)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => `${name}: ${count}`)
          .join(', ') || '—'

        // Product sales for this barber
        const barberSales = filteredSales.filter(s => s.barberId === r.barber.uid)
        const productRevenue = barberSales.reduce((sum, s) =>
          sum + s.items.filter(it => it.type === 'product').reduce((acc, it) => acc + it.price * it.quantity, 0), 0)
        const serviceRevenue = r.revenue // from appointments
        const totalProductCount = barberSales.reduce((sum, s) =>
          sum + s.items.filter(it => it.type === 'product').reduce((acc, it) => acc + it.quantity, 0), 0)

        const row = ws2.addRow([
          r.barber.displayName,
          r.completed,
          serviceRevenue,
          productRevenue,
          serviceRevenue + productRevenue,
          svcBreakdown,
          Number(r.avgTicket.toFixed(2)),
          totalProductCount,
        ])
        if (i % 2 === 1) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
          })
        }
        row.getCell(3).numFmt = '#,##0.00 "€"'
        row.getCell(4).numFmt = '#,##0.00 "€"'
        row.getCell(5).numFmt = '#,##0.00 "€"'
        row.getCell(7).numFmt = '#,##0.00 "€"'
      })
      autoWidth(ws2)

      // ──────────────────────────────────────────────────────────────────
      // Sheet 3: Servicios por Barbero
      // ──────────────────────────────────────────────────────────────────
      const ws3 = wb.addWorksheet('Servicios por Barbero')
      addTitle(ws3, `Servicios por Barbero — ${rangeLabel}`, 4)

      const h3 = ws3.addRow(['Barbero', 'Servicio', 'Cantidad', 'Ingresos (€)'])
      applyGoldHeader(h3)

      let svcRowIdx = 0
      barbers.forEach(barber => {
        const completed = filtered.filter(a => a.barberId === barber.uid && a.status === 'completed')
        const svcMap: Record<string, { count: number; revenue: number }> = {}
        completed.forEach(a => a.services.forEach(s => {
          if (!svcMap[s.name]) svcMap[s.name] = { count: 0, revenue: 0 }
          svcMap[s.name].count += 1
          svcMap[s.name].revenue += s.price
        }))

        Object.entries(svcMap)
          .sort((a, b) => b[1].count - a[1].count)
          .forEach(([name, { count, revenue }]) => {
            const row = ws3.addRow([barber.displayName, name, count, revenue])
            if (svcRowIdx % 2 === 1) {
              row.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
              })
            }
            row.getCell(4).numFmt = '#,##0.00 "€"'
            svcRowIdx++
          })
      })
      autoWidth(ws3)

      // ──────────────────────────────────────────────────────────────────
      // Sheet 4: Productos Vendidos por Barbero
      // ──────────────────────────────────────────────────────────────────
      const ws4 = wb.addWorksheet('Productos por Barbero')
      addTitle(ws4, `Productos Vendidos por Barbero — ${rangeLabel}`, 4)

      const h4 = ws4.addRow(['Barbero', 'Producto', 'Cantidad', 'Ingresos (€)'])
      applyGoldHeader(h4)

      let prodRowIdx = 0
      barbers.forEach(barber => {
        const barberSales = filteredSales.filter(s => s.barberId === barber.uid)
        const prodMap: Record<string, { count: number; revenue: number }> = {}
        barberSales.forEach(s => s.items.forEach(item => {
          if (item.type === 'product') {
            if (!prodMap[item.name]) prodMap[item.name] = { count: 0, revenue: 0 }
            prodMap[item.name].count += item.quantity
            prodMap[item.name].revenue += item.price * item.quantity
          }
        }))

        Object.entries(prodMap)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .forEach(([name, { count, revenue }]) => {
            const row = ws4.addRow([barber.displayName, name, count, revenue])
            if (prodRowIdx % 2 === 1) {
              row.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
              })
            }
            row.getCell(4).numFmt = '#,##0.00 "€"'
            prodRowIdx++
          })
      })

      if (prodRowIdx === 0) {
        ws4.addRow(['Sin ventas de productos en este periodo', '', '', ''])
      }
      autoWidth(ws4)

      // ──────────────────────────────────────────────────────────────────
      // Sheet 5: Citas Detalladas
      // ──────────────────────────────────────────────────────────────────
      const ws5 = wb.addWorksheet('Citas Detalladas')
      addTitle(ws5, `Citas Detalladas — ${rangeLabel}`, 6)

      const h5 = ws5.addRow(['Fecha', 'Barbero', 'Cliente', 'Servicios', 'Total (€)', 'Estado'])
      applyGoldHeader(h5)

      const statusLabels: Record<string, string> = {
        pending: 'Pendiente',
        confirmed: 'Confirmada',
        completed: 'Completada',
        cancelled: 'Cancelada',
        no_show: 'No asistió',
      }

      // Sort by date descending
      const sortedFiltered = [...filtered].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      sortedFiltered.forEach((a, i) => {
        const d = new Date(a.date)
        const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const serviceNames = a.services.map(s => s.name).join(', ')
        // Try to find client name from barbers list (in case client is also a user)
        // Otherwise show clientId abbreviated
        const clientLabel = (a as any).clientName ?? a.clientId?.slice(0, 8) ?? '—'

        const row = ws5.addRow([
          dateStr,
          barberName(a.barberId),
          clientLabel,
          serviceNames,
          a.totalPrice,
          statusLabels[a.status] ?? a.status,
        ])
        if (i % 2 === 1) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
          })
        }
        row.getCell(5).numFmt = '#,##0.00 "€"'
      })
      autoWidth(ws5)

      // ──────────────────────────────────────────────────────────────────
      // Download
      // ──────────────────────────────────────────────────────────────────
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
