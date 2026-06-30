import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import ExcelJS from 'exceljs'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const REGION = 'europe-west1'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodStart(period: 'week' | 'month'): Date {
  const now = new Date()
  const days = period === 'week' ? 7 : 30
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

function fmtDate(ts: admin.firestore.Timestamp): string {
  return ts.toDate().toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function buildFilename(period: 'week' | 'month'): string {
  const today = new Date().toISOString().slice(0, 10)
  const label = period === 'week' ? 'Semanal' : 'Mensual'
  return `BarberFlow_Reporte_${label}_${today}.xlsx`
}

function applyHeaderStyle(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC9A84C' },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
}

function autoWidthColumns(sheet: ExcelJS.Worksheet): void {
  sheet.columns.forEach((col) => {
    let maxLen = 10
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0
      if (len > maxLen) maxLen = len
    })
    col.width = Math.min(maxLen + 4, 50)
  })
}

async function getBarberName(barberId: string): Promise<string> {
  const snap = await db.collection('users').doc(barberId).get()
  if (!snap.exists) return 'Desconocido'
  const data = snap.data()
  return data?.displayName ?? data?.name ?? 'Desconocido'
}

// ─── Cloud Function ──────────────────────────────────────────────────────────

export const generateReport = onCall(
  { region: REGION },
  async (request) => {
    // ── Auth check ─────────────────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Debes iniciar sesión para generar reportes.',
      )
    }

    const { barbershopId, period } = request.data as {
      barbershopId?: string
      period?: string
    }

    if (!barbershopId || !period || !['week', 'month'].includes(period)) {
      throw new HttpsError(
        'invalid-argument',
        'Se requiere barbershopId y period ("week" | "month").',
      )
    }

    // ── Authorization: caller must be the shop owner or a developer ──
    const callerUid = request.auth.uid
    const userDoc = await db.collection('users').doc(callerUid).get()

    if (!userDoc.exists) {
      throw new HttpsError(
        'permission-denied',
        'No tienes permisos para generar este reporte.',
      )
    }

    const userData = userDoc.data()!
    const role = userData.role as string | undefined
    const isDeveloper = role === 'developer'
    const isOwner =
      role === 'owner' && userData.barbershopId === barbershopId

    if (!isDeveloper && !isOwner) {
      throw new HttpsError(
        'permission-denied',
        'No tienes permisos para generar este reporte.',
      )
    }

    const validPeriod = period as 'week' | 'month'
    const periodStart = getPeriodStart(validPeriod)

    // ── Fetch appointments ────────────────────────────────────────────────
    const appointmentsSnap = await db
      .collection('appointments')
      .where('barbershopId', '==', barbershopId)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .orderBy('date', 'asc')
      .get()

    // ── Fetch sales ───────────────────────────────────────────────────────
    const salesSnap = await db
      .collection('sales')
      .where('barbershopId', '==', barbershopId)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .orderBy('date', 'asc')
      .get()

    // ── Resolve barber names (batch unique IDs from both collections) ────
    const barberIds = new Set<string>()
    appointmentsSnap.docs.forEach((doc) => {
      const data = doc.data()
      if (data.barberId) barberIds.add(data.barberId)
    })
    salesSnap.docs.forEach((doc) => {
      const data = doc.data()
      if (data.barberId) barberIds.add(data.barberId)
    })

    const barberNameMap = new Map<string, string>()
    for (const id of barberIds) {
      barberNameMap.set(id, await getBarberName(id))
    }

    const bName = (uid: string) => barberNameMap.get(uid) ?? 'Desconocido'

    // ── Pre-compute per-barber aggregations ──────────────────────────────
    interface ServiceAgg { count: number; revenue: number }
    interface ProductAgg { count: number; revenue: number }
    interface BarberAgg {
      completedCount: number
      serviceRevenue: number
      productRevenue: number
      services: Record<string, ServiceAgg>
      products: Record<string, ProductAgg>
      avgTicket: number
    }

    const barberAgg = new Map<string, BarberAgg>()
    const ensureBarber = (uid: string) => {
      if (!barberAgg.has(uid)) {
        barberAgg.set(uid, {
          completedCount: 0, serviceRevenue: 0, productRevenue: 0,
          services: {}, products: {}, avgTicket: 0,
        })
      }
      return barberAgg.get(uid)!
    }

    // Aggregate appointments
    appointmentsSnap.docs.forEach((doc) => {
      const d = doc.data()
      if (d.status !== 'completed' || !d.barberId) return
      const agg = ensureBarber(d.barberId)
      agg.completedCount++
      agg.serviceRevenue += d.totalPrice ?? 0
      if (Array.isArray(d.services)) {
        d.services.forEach((s: { name: string; price: number }) => {
          if (!agg.services[s.name]) agg.services[s.name] = { count: 0, revenue: 0 }
          agg.services[s.name].count++
          agg.services[s.name].revenue += s.price ?? 0
        })
      }
    })

    // Aggregate sales (products)
    salesSnap.docs.forEach((doc) => {
      const d = doc.data()
      if (!d.barberId) return
      const agg = ensureBarber(d.barberId)
      if (Array.isArray(d.items)) {
        d.items.forEach((item: { type: string; name: string; price: number; quantity: number }) => {
          if (item.type === 'product') {
            if (!agg.products[item.name]) agg.products[item.name] = { count: 0, revenue: 0 }
            agg.products[item.name].count += item.quantity
            agg.products[item.name].revenue += item.price * item.quantity
            agg.productRevenue += item.price * item.quantity
          }
        })
      }
    })

    // Compute avg ticket
    barberAgg.forEach((agg) => {
      agg.avgTicket = agg.completedCount > 0 ? agg.serviceRevenue / agg.completedCount : 0
    })

    // ── Build workbook ────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'BarberFlow'
    workbook.created = new Date()

    const addSheetTitle = (ws: ExcelJS.Worksheet, text: string, colCount: number) => {
      const lastCol = String.fromCharCode(64 + colCount)
      ws.mergeCells(`A1:${lastCol}1`)
      const cell = ws.getCell('A1')
      cell.value = text
      cell.font = { bold: true, size: 14, color: { argb: 'FFC9A84C' } }
      cell.alignment = { horizontal: 'center' }
      ws.addRow([])
    }

    const applyZebraRow = (row: ExcelJS.Row, idx: number) => {
      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
        })
      }
    }

    const periodLabel = validPeriod === 'week' ? 'Semanal' : 'Mensual'

    // ── Sheet 1: Resumen General ─────────────────────────────────────────
    const ws1 = workbook.addWorksheet('Resumen General')
    addSheetTitle(ws1, `Reporte ${periodLabel}`, 9)

    const h1 = ws1.addRow(['Barbero', 'Citas completadas', 'Canceladas', 'Pendientes',
      'Ingresos servicios (€)', 'Ingresos productos (€)', 'Ingresos total (€)',
      'Ticket medio (€)', 'Servicio top'])
    applyHeaderStyle(h1)

    let idx1 = 0
    for (const [uid, agg] of barberAgg) {
      const allApps = appointmentsSnap.docs.filter(d => d.data().barberId === uid)
      const cancelled = allApps.filter(d => d.data().status === 'cancelled').length
      const pending = allApps.filter(d => ['pending', 'confirmed'].includes(d.data().status)).length
      const topSvc = Object.entries(agg.services).sort((a, b) => b[1].count - a[1].count)[0]?.[0] ?? '—'

      const row = ws1.addRow([
        bName(uid), agg.completedCount, cancelled, pending,
        agg.serviceRevenue, agg.productRevenue,
        agg.serviceRevenue + agg.productRevenue,
        Number(agg.avgTicket.toFixed(2)), topSvc,
      ])
      row.getCell(5).numFmt = '#,##0.00 "€"'
      row.getCell(6).numFmt = '#,##0.00 "€"'
      row.getCell(7).numFmt = '#,##0.00 "€"'
      row.getCell(8).numFmt = '#,##0.00 "€"'
      applyZebraRow(row, idx1++)
    }
    autoWidthColumns(ws1)

    // ── Sheet 2: Desglose por Barbero ────────────────────────────────────
    const ws2 = workbook.addWorksheet('Desglose por Barbero')
    addSheetTitle(ws2, 'Desglose por Barbero', 8)

    const h2 = ws2.addRow(['Barbero', 'Citas completadas', 'Ingresos servicios (€)',
      'Ingresos productos (€)', 'Ingresos total (€)',
      'Desglose de servicios', 'Ticket medio (€)', 'Productos vendidos'])
    applyHeaderStyle(h2)

    let idx2 = 0
    for (const [uid, agg] of barberAgg) {
      const svcBreakdown = Object.entries(agg.services)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, s]) => `${name}: ${s.count}`)
        .join(', ') || '—'
      const totalProducts = Object.values(agg.products).reduce((s, p) => s + p.count, 0)

      const row = ws2.addRow([
        bName(uid), agg.completedCount, agg.serviceRevenue, agg.productRevenue,
        agg.serviceRevenue + agg.productRevenue, svcBreakdown,
        Number(agg.avgTicket.toFixed(2)), totalProducts,
      ])
      row.getCell(3).numFmt = '#,##0.00 "€"'
      row.getCell(4).numFmt = '#,##0.00 "€"'
      row.getCell(5).numFmt = '#,##0.00 "€"'
      row.getCell(7).numFmt = '#,##0.00 "€"'
      applyZebraRow(row, idx2++)
    }
    autoWidthColumns(ws2)

    // ── Sheet 3: Servicios por Barbero ───────────────────────────────────
    const ws3 = workbook.addWorksheet('Servicios por Barbero')
    addSheetTitle(ws3, 'Servicios por Barbero', 4)

    const h3 = ws3.addRow(['Barbero', 'Servicio', 'Cantidad', 'Ingresos (€)'])
    applyHeaderStyle(h3)

    let idx3 = 0
    for (const [uid, agg] of barberAgg) {
      for (const [svcName, svc] of Object.entries(agg.services).sort((a, b) => b[1].count - a[1].count)) {
        const row = ws3.addRow([bName(uid), svcName, svc.count, svc.revenue])
        row.getCell(4).numFmt = '#,##0.00 "€"'
        applyZebraRow(row, idx3++)
      }
    }
    autoWidthColumns(ws3)

    // ── Sheet 4: Productos Vendidos por Barbero ──────────────────────────
    const ws4 = workbook.addWorksheet('Productos por Barbero')
    addSheetTitle(ws4, 'Productos Vendidos por Barbero', 4)

    const h4 = ws4.addRow(['Barbero', 'Producto', 'Cantidad', 'Ingresos (€)'])
    applyHeaderStyle(h4)

    let idx4 = 0
    for (const [uid, agg] of barberAgg) {
      for (const [prodName, prod] of Object.entries(agg.products).sort((a, b) => b[1].revenue - a[1].revenue)) {
        const row = ws4.addRow([bName(uid), prodName, prod.count, prod.revenue])
        row.getCell(4).numFmt = '#,##0.00 "€"'
        applyZebraRow(row, idx4++)
      }
    }
    if (idx4 === 0) ws4.addRow(['Sin ventas de productos en este periodo', '', '', ''])
    autoWidthColumns(ws4)

    // ── Sheet 5: Citas Detalladas ────────────────────────────────────────
    const ws5 = workbook.addWorksheet('Citas Detalladas')
    addSheetTitle(ws5, 'Citas Detalladas', 6)

    const h5 = ws5.addRow(['Fecha', 'Barbero', 'Cliente', 'Servicios', 'Total (€)', 'Estado'])
    applyHeaderStyle(h5)

    const statusLabels: Record<string, string> = {
      pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada',
      cancelled: 'Cancelada', no_show: 'No asistió',
    }

    let idx5 = 0
    appointmentsSnap.docs.forEach((doc) => {
      const d = doc.data()
      const services = Array.isArray(d.services)
        ? d.services.map((s: { name: string }) => s.name).join(', ')
        : ''

      const row = ws5.addRow([
        fmtDate(d.date),
        bName(d.barberId ?? ''),
        d.clientName ?? '',
        services,
        d.totalPrice ?? 0,
        statusLabels[d.status] ?? d.status ?? '',
      ])
      row.getCell(5).numFmt = '#,##0.00 "€"'
      applyZebraRow(row, idx5++)
    })
    autoWidthColumns(ws5)

    // ── Serialize to base64 ───────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer()
    const base64 = Buffer.from(buffer as ArrayBuffer).toString('base64')
    const filename = buildFilename(validPeriod)

    return { base64, filename }
  },
)

// ─── Barber-specific Report ──────────────────────────────────────────────────

export const generateBarberReport = onCall(
  { region: REGION },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Debes iniciar sesión para generar reportes.',
      )
    }

    const { barbershopId, period, barberId } = request.data as {
      barbershopId?: string
      period?: string
      barberId?: string
    }

    if (!barbershopId || !period || !['week', 'month'].includes(period) || !barberId) {
      throw new HttpsError(
        'invalid-argument',
        'Se requiere barbershopId, barberId y period ("week" | "month").',
      )
    }

    // Authorization: caller must be the barber themselves, the shop owner, or a developer
    const callerUid = request.auth.uid
    const callerDoc = await db.collection('users').doc(callerUid).get()

    if (!callerDoc.exists) {
      throw new HttpsError('permission-denied', 'No tienes permisos.')
    }

    const callerData = callerDoc.data()!
    const callerRole = callerData.role as string | undefined
    const isSelf = callerUid === barberId
    const isDeveloper = callerRole === 'developer'
    const isOwner = callerRole === 'owner' && callerData.barbershopId === barbershopId

    if (!isSelf && !isDeveloper && !isOwner) {
      throw new HttpsError('permission-denied', 'No tienes permisos para este reporte.')
    }

    const validPeriod = period as 'week' | 'month'
    const periodStart = getPeriodStart(validPeriod)
    const barberName = await getBarberName(barberId)

    // Fetch appointments for this barber
    const appointmentsSnap = await db
      .collection('appointments')
      .where('barberId', '==', barberId)
      .where('barbershopId', '==', barbershopId)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .orderBy('date', 'asc')
      .get()

    // Fetch sales for this barber
    const salesSnap = await db
      .collection('sales')
      .where('barberId', '==', barberId)
      .where('barbershopId', '==', barbershopId)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .orderBy('date', 'asc')
      .get()

    // Aggregate services
    interface SvcAgg { count: number; revenue: number }
    interface ProdAgg { quantity: number; revenue: number }
    const servicesMap: Record<string, SvcAgg> = {}
    const productsMap: Record<string, ProdAgg> = {}

    let completedCount = 0
    let cancelledCount = 0
    let noShowCount = 0
    let serviceRevenue = 0
    let productRevenue = 0

    appointmentsSnap.docs.forEach((doc) => {
      const d = doc.data()
      if (d.status === 'completed') {
        completedCount++
        serviceRevenue += d.totalPrice ?? 0
        if (Array.isArray(d.services)) {
          d.services.forEach((s: { name: string; price: number }) => {
            if (!servicesMap[s.name]) servicesMap[s.name] = { count: 0, revenue: 0 }
            servicesMap[s.name].count++
            servicesMap[s.name].revenue += s.price ?? 0
          })
        }
      } else if (d.status === 'cancelled') {
        cancelledCount++
      } else if (d.status === 'no_show') {
        noShowCount++
      }
    })

    salesSnap.docs.forEach((doc) => {
      const d = doc.data()
      if (Array.isArray(d.items)) {
        d.items.forEach((item: { type: string; name: string; price: number; quantity: number }) => {
          if (item.type === 'product') {
            const qty = item.quantity ?? 1
            const total = (item.price ?? 0) * qty
            productRevenue += total
            if (!productsMap[item.name]) productsMap[item.name] = { quantity: 0, revenue: 0 }
            productsMap[item.name].quantity += qty
            productsMap[item.name].revenue += total
          }
        })
      }
    })

    const totalRevenue = serviceRevenue + productRevenue
    const avgTicket = completedCount > 0 ? serviceRevenue / completedCount : 0

    // Build workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'BarberFlow'
    workbook.created = new Date()

    const periodLabel = validPeriod === 'week' ? 'Semanal' : 'Mensual'

    const addSheetTitle = (ws: ExcelJS.Worksheet, text: string, colCount: number) => {
      const lastCol = String.fromCharCode(64 + colCount)
      ws.mergeCells(`A1:${lastCol}1`)
      const cell = ws.getCell('A1')
      cell.value = text
      cell.font = { bold: true, size: 14, color: { argb: 'FFC9A84C' } }
      cell.alignment = { horizontal: 'center' }
      ws.addRow([])
    }

    const applyZebraRow = (row: ExcelJS.Row, idx: number) => {
      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
        })
      }
    }

    // ── Sheet 1: Resumen ─────────────────────────────────────────────────
    const ws1 = workbook.addWorksheet('Resumen')
    addSheetTitle(ws1, `Reporte ${periodLabel} — ${barberName}`, 2)

    const summaryData: [string, string | number][] = [
      ['Barbero', barberName],
      ['Periodo', validPeriod === 'week' ? 'Última semana' : 'Último mes'],
      ['', ''],
      ['Total de citas', appointmentsSnap.size],
      ['Completadas', completedCount],
      ['Canceladas', cancelledCount],
      ['No asistió', noShowCount],
      ['', ''],
      ['Ingresos por servicios', `${serviceRevenue.toFixed(2)} €`],
      ['Ingresos por productos', `${productRevenue.toFixed(2)} €`],
      ['Ingresos totales', `${totalRevenue.toFixed(2)} €`],
      ['Ticket medio', `${avgTicket.toFixed(2)} €`],
    ]

    summaryData.forEach(([label, value]) => {
      const row = ws1.addRow([label, value])
      if (label) {
        row.getCell(1).font = { bold: true }
      }
    })
    autoWidthColumns(ws1)

    // ── Sheet 2: Servicios ───────────────────────────────────────────────
    const ws2 = workbook.addWorksheet('Servicios')
    addSheetTitle(ws2, 'Servicios Realizados', 3)

    const h2 = ws2.addRow(['Servicio', 'Cantidad', 'Ingresos (€)'])
    applyHeaderStyle(h2)

    const sortedServices = Object.entries(servicesMap).sort((a, b) => b[1].count - a[1].count)
    let idx2 = 0
    sortedServices.forEach(([name, svc]) => {
      const row = ws2.addRow([name, svc.count, svc.revenue])
      row.getCell(3).numFmt = '#,##0.00 "€"'
      applyZebraRow(row, idx2++)
    })
    if (sortedServices.length === 0) {
      ws2.addRow(['Sin servicios en este periodo', '', ''])
    }
    autoWidthColumns(ws2)

    // ── Sheet 3: Productos ───────────────────────────────────────────────
    const ws3 = workbook.addWorksheet('Productos')
    addSheetTitle(ws3, 'Productos Vendidos', 3)

    const h3 = ws3.addRow(['Producto', 'Cantidad', 'Ingresos (€)'])
    applyHeaderStyle(h3)

    const sortedProducts = Object.entries(productsMap).sort((a, b) => b[1].revenue - a[1].revenue)
    let idx3 = 0
    sortedProducts.forEach(([name, prod]) => {
      const row = ws3.addRow([name, prod.quantity, prod.revenue])
      row.getCell(3).numFmt = '#,##0.00 "€"'
      applyZebraRow(row, idx3++)
    })
    if (sortedProducts.length === 0) {
      ws3.addRow(['Sin ventas de productos en este periodo', '', ''])
    }
    autoWidthColumns(ws3)

    // ── Sheet 4: Citas Detalladas ────────────────────────────────────────
    const ws4 = workbook.addWorksheet('Citas Detalladas')
    addSheetTitle(ws4, 'Detalle de Citas', 5)

    const h4 = ws4.addRow(['Fecha', 'Cliente', 'Servicios', 'Total (€)', 'Estado'])
    applyHeaderStyle(h4)

    const statusLabelsBarber: Record<string, string> = {
      pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada',
      cancelled: 'Cancelada', no_show: 'No asistió',
    }

    let idx4 = 0
    appointmentsSnap.docs.forEach((doc) => {
      const d = doc.data()
      const services = Array.isArray(d.services)
        ? d.services.map((s: { name: string }) => s.name).join(', ')
        : ''

      const row = ws4.addRow([
        fmtDate(d.date),
        d.clientName ?? '',
        services,
        d.totalPrice ?? 0,
        statusLabelsBarber[d.status] ?? d.status ?? '',
      ])
      row.getCell(4).numFmt = '#,##0.00 "€"'
      applyZebraRow(row, idx4++)
    })
    autoWidthColumns(ws4)

    // Serialize
    const buffer = await workbook.xlsx.writeBuffer()
    const base64 = Buffer.from(buffer as ArrayBuffer).toString('base64')
    const today = new Date().toISOString().slice(0, 10)
    const filename = `BarberFlow_MiReporte_${periodLabel}_${today}.xlsx`

    return { base64, filename }
  },
)
