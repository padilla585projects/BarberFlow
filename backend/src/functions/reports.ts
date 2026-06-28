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

function fmtTime(ts: admin.firestore.Timestamp): string {
  return ts.toDate().toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit',
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

    // ── Resolve barber names for sales (batch unique IDs) ─────────────────
    const barberIds = new Set<string>()
    salesSnap.docs.forEach((doc) => {
      const data = doc.data()
      if (data.barberId) barberIds.add(data.barberId)
    })

    const barberNameMap = new Map<string, string>()
    for (const id of barberIds) {
      barberNameMap.set(id, await getBarberName(id))
    }

    // ── Build workbook ────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook()

    // Sheet 1: Citas
    const citasSheet = workbook.addWorksheet('Citas')
    citasSheet.columns = [
      { header: 'Fecha', key: 'fecha' },
      { header: 'Hora', key: 'hora' },
      { header: 'Cliente', key: 'cliente' },
      { header: 'Barbero', key: 'barbero' },
      { header: 'Servicios', key: 'servicios' },
      { header: 'Estado', key: 'estado' },
      { header: 'Total (€)', key: 'total' },
    ]

    appointmentsSnap.docs.forEach((doc) => {
      const d = doc.data()
      const services = Array.isArray(d.services)
        ? d.services.map((s: { name: string }) => s.name).join(', ')
        : ''

      citasSheet.addRow({
        fecha: fmtDate(d.date),
        hora: d.timeSlot ?? fmtTime(d.date),
        cliente: d.clientName ?? '',
        barbero: d.barberName ?? '',
        servicios: services,
        estado: d.status ?? '',
        total: d.totalPrice ?? 0,
      })
    })

    applyHeaderStyle(citasSheet.getRow(1))
    autoWidthColumns(citasSheet)

    // Sheet 2: Ventas
    const ventasSheet = workbook.addWorksheet('Ventas')
    ventasSheet.columns = [
      { header: 'Fecha', key: 'fecha' },
      { header: 'Barbero', key: 'barbero' },
      { header: 'Artículos', key: 'articulos' },
      { header: 'Total (€)', key: 'total' },
    ]

    salesSnap.docs.forEach((doc) => {
      const d = doc.data()
      const items = Array.isArray(d.items)
        ? d.items
            .map((i: { name: string; quantity: number }) => `${i.name} x${i.quantity}`)
            .join(', ')
        : ''

      ventasSheet.addRow({
        fecha: fmtDate(d.date),
        barbero: barberNameMap.get(d.barberId) ?? 'Desconocido',
        articulos: items,
        total: d.totalAmount ?? 0,
      })
    })

    applyHeaderStyle(ventasSheet.getRow(1))
    autoWidthColumns(ventasSheet)

    // ── Serialize to base64 ───────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer()
    const base64 = Buffer.from(buffer as ArrayBuffer).toString('base64')
    const filename = buildFilename(validPeriod)

    return { base64, filename }
  },
)
