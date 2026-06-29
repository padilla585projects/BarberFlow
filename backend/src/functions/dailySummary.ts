import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as admin from 'firebase-admin'
import { getExpoPushToken, sendPushNotification } from '../utils/push'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const REGION = 'europe-west1'

/**
 * Scheduled function that runs daily at 21:00 Europe/Madrid and sends
 * each barbershop owner a push notification summarising the day's activity:
 * total appointments (completed / cancelled), appointment revenue,
 * POS sales count and revenue.
 */
export const sendDailySummary = onSchedule(
  {
    schedule: '0 21 * * *',
    timeZone: 'Europe/Madrid',
    region: REGION,
  },
  async () => {
    // Get today's date range
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    const startTs = admin.firestore.Timestamp.fromDate(startOfDay)
    const endTs = admin.firestore.Timestamp.fromDate(endOfDay)

    // Get all barbershops
    const shopsSnap = await db.collection('barbershops').get()

    for (const shopDoc of shopsSnap.docs) {
      const shopData = shopDoc.data()
      const ownerId = shopData.ownerId as string | undefined
      if (!ownerId) continue

      const token = await getExpoPushToken(ownerId)
      if (!token) continue

      try {
        // Count today's appointments
        const aptsSnap = await db
          .collection('appointments')
          .where('barbershopId', '==', shopDoc.id)
          .where('date', '>=', startTs)
          .where('date', '<', endTs)
          .get()

        const totalAppointments = aptsSnap.size
        const completed = aptsSnap.docs.filter(d => d.data().status === 'completed').length
        const cancelled = aptsSnap.docs.filter(d => d.data().status === 'cancelled').length

        // Calculate revenue from completed appointments
        const appointmentRevenue = aptsSnap.docs
          .filter(d => d.data().status === 'completed')
          .reduce((sum, d) => sum + (d.data().totalPrice || 0), 0)

        // Count today's POS sales
        const salesSnap = await db
          .collection('sales')
          .where('barbershopId', '==', shopDoc.id)
          .where('date', '>=', startTs)
          .where('date', '<', endTs)
          .get()

        const salesRevenue = salesSnap.docs.reduce((sum, d) => sum + (d.data().totalAmount || 0), 0)
        const totalRevenue = appointmentRevenue + salesRevenue

        // Build the message
        const shopName = shopData.name || 'Tu barbería'
        let body = `📊 ${shopName} hoy:\n`
        body += `✂️ ${totalAppointments} citas`
        if (completed > 0) body += ` (${completed} completadas)`
        if (cancelled > 0) body += ` · ${cancelled} canceladas`
        body += `\n💰 ${totalRevenue.toFixed(2)}€ facturado`
        if (salesSnap.size > 0) body += ` (${salesSnap.size} ventas POS)`

        await sendPushNotification(
          token,
          'Resumen del día',
          body,
          { barbershopId: shopDoc.id, type: 'daily_summary' },
        )

        console.log(`[DailySummary] Sent summary for shop ${shopDoc.id}`)
      } catch (err) {
        console.error(`[DailySummary] Error for shop ${shopDoc.id}:`, err)
        // Continue with next shop — don't let one failure stop the batch
      }
    }
  },
)
