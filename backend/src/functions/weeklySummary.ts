import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as admin from 'firebase-admin'
import { getExpoPushToken, sendPushNotification } from '../utils/push'
import { storeNotification } from '../utils/notificationStore'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const REGION = 'europe-west1'

/**
 * Returns the Monday 00:00 and Sunday 23:59:59.999 for the week containing
 * the given date (ISO weeks: Monday-based).
 */
function getWeekRange(refDate: Date): { start: Date; end: Date } {
  const d = new Date(refDate)
  const day = d.getDay() // 0=Sun … 6=Sat
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToMonday)
  const sundayEnd = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
  return { start: monday, end: sundayEnd }
}

/**
 * Scheduled function that runs every Sunday at 20:00 Europe/Madrid and sends
 * each barbershop owner a push notification summarising the week's activity:
 * appointments (total, completed, cancelled, no-show), revenue, tips,
 * POS sales, and comparison with the previous week.
 */
export const sendWeeklySummary = onSchedule(
  {
    schedule: '0 20 * * 0',
    timeZone: 'Europe/Madrid',
    region: REGION,
  },
  async () => {
    const now = new Date()

    // Current week range (Mon 00:00 – Sun 23:59)
    const thisWeek = getWeekRange(now)
    const thisStart = admin.firestore.Timestamp.fromDate(thisWeek.start)
    const thisEnd = admin.firestore.Timestamp.fromDate(thisWeek.end)

    // Previous week range
    const prevWeekRef = new Date(thisWeek.start.getTime() - 7 * 24 * 60 * 60 * 1000)
    const prevWeek = getWeekRange(prevWeekRef)
    const prevStart = admin.firestore.Timestamp.fromDate(prevWeek.start)
    const prevEnd = admin.firestore.Timestamp.fromDate(prevWeek.end)

    // Get all barbershops
    const shopsSnap = await db.collection('barbershops').get()

    for (const shopDoc of shopsSnap.docs) {
      const shopData = shopDoc.data()
      const ownerId = shopData.ownerId as string | undefined
      if (!ownerId) continue

      const token = await getExpoPushToken(ownerId)
      if (!token) continue

      try {
        // ── This week's appointments ──
        const aptsSnap = await db
          .collection('appointments')
          .where('barbershopId', '==', shopDoc.id)
          .where('date', '>=', thisStart)
          .where('date', '<=', thisEnd)
          .get()

        const total = aptsSnap.size
        const completed = aptsSnap.docs.filter(d => d.data().status === 'completed').length
        const cancelled = aptsSnap.docs.filter(d => d.data().status === 'cancelled').length
        const noShow = aptsSnap.docs.filter(d => d.data().status === 'no_show').length

        const completedDocs = aptsSnap.docs.filter(d => d.data().status === 'completed')
        const appointmentRevenue = completedDocs.reduce(
          (sum, d) => sum + (d.data().totalPrice || 0),
          0,
        )
        const tips = completedDocs.reduce(
          (sum, d) => sum + (d.data().tipAmount || 0),
          0,
        )

        // ── This week's POS sales ──
        const salesSnap = await db
          .collection('sales')
          .where('barbershopId', '==', shopDoc.id)
          .where('date', '>=', thisStart)
          .where('date', '<=', thisEnd)
          .get()

        const salesRevenue = salesSnap.docs.reduce(
          (sum, d) => sum + (d.data().totalAmount || 0),
          0,
        )
        const salesCount = salesSnap.size
        const totalRevenue = appointmentRevenue + salesRevenue + tips

        // ── Previous week's revenue (for comparison) ──
        const prevAptsSnap = await db
          .collection('appointments')
          .where('barbershopId', '==', shopDoc.id)
          .where('date', '>=', prevStart)
          .where('date', '<=', prevEnd)
          .get()

        const prevCompletedDocs = prevAptsSnap.docs.filter(d => d.data().status === 'completed')
        const prevAppointmentRevenue = prevCompletedDocs.reduce(
          (sum, d) => sum + (d.data().totalPrice || 0),
          0,
        )
        const prevTips = prevCompletedDocs.reduce(
          (sum, d) => sum + (d.data().tipAmount || 0),
          0,
        )

        const prevSalesSnap = await db
          .collection('sales')
          .where('barbershopId', '==', shopDoc.id)
          .where('date', '>=', prevStart)
          .where('date', '<=', prevEnd)
          .get()

        const prevSalesRevenue = prevSalesSnap.docs.reduce(
          (sum, d) => sum + (d.data().totalAmount || 0),
          0,
        )
        const prevTotalRevenue = prevAppointmentRevenue + prevSalesRevenue + prevTips

        // Calculate % change
        let changeStr: string
        if (prevTotalRevenue === 0) {
          changeStr = totalRevenue > 0 ? '+100' : '0'
        } else {
          const pct = ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
          changeStr = (pct >= 0 ? '+' : '') + pct.toFixed(0)
        }

        // ── Build the message ──
        const shopName = shopData.name || 'Tu barbería'
        let body = `📊 Resumen semanal - ${shopName}:\n`
        body += `✂️ ${total} citas (${completed} completadas)`
        if (cancelled > 0) body += ` · ${cancelled} canceladas`
        if (noShow > 0) body += ` · ${noShow} no-show`
        body += `\n💰 ${totalRevenue.toFixed(2)}€ facturado (${changeStr}% vs semana anterior)`
        body += `\n💵 ${tips.toFixed(2)}€ en propinas`
        body += `\n🛒 ${salesCount} ventas POS (${salesRevenue.toFixed(2)}€)`

        const title = 'Resumen semanal'
        const pushData = { barbershopId: shopDoc.id, type: 'weekly_summary' }

        await sendPushNotification(token, title, body, pushData)
        await storeNotification(ownerId, { title, body, type: 'summary', data: pushData })

        console.log(`[WeeklySummary] Sent summary for shop ${shopDoc.id}`)
      } catch (err) {
        console.error(`[WeeklySummary] Error for shop ${shopDoc.id}:`, err)
        // Continue with next shop — don't let one failure stop the batch
      }
    }
  },
)
