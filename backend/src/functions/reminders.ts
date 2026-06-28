import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as admin from 'firebase-admin'
import { getExpoPushToken, sendPushNotification } from '../utils/push'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const REGION = 'europe-west1'

/**
 * Scheduled function that runs every hour and sends push notification
 * reminders ~24 hours before each appointment.
 *
 * Window: appointments whose `date` falls between 23 and 25 hours from now.
 * Only appointments with status 'pending' or 'confirmed' are considered.
 * Each appointment is marked with `reminderSent: true` after notification
 * so duplicates are avoided.
 */
export const sendAppointmentReminders = onSchedule(
  {
    schedule: 'every 1 hours',
    region: REGION,
    timeoutSeconds: 120,
  },
  async () => {
    const now = Date.now()
    const from = new Date(now + 23 * 60 * 60 * 1000) // 23 h from now
    const to = new Date(now + 25 * 60 * 60 * 1000)   // 25 h from now

    const fromTs = admin.firestore.Timestamp.fromDate(from)
    const toTs = admin.firestore.Timestamp.fromDate(to)

    const snap = await db
      .collection('appointments')
      .where('date', '>=', fromTs)
      .where('date', '<=', toTs)
      .where('status', 'in', ['pending', 'confirmed'])
      .get()

    if (snap.empty) {
      console.log('[Reminders] No appointments in the 24h window.')
      return
    }

    console.log(`[Reminders] Found ${snap.size} appointment(s) to check.`)

    for (const doc of snap.docs) {
      try {
        const apt = doc.data()

        // Skip if reminder already sent
        if (apt.reminderSent === true) continue

        const clientId = apt.clientId as string
        const barberId = apt.barberId as string | undefined
        const clientName = (apt.clientName as string) || 'Un cliente'
        const barberName = (apt.barberName as string) || 'tu barbero'
        const timeSlot = apt.timeSlot as string

        // Notify client
        const clientToken = await getExpoPushToken(clientId)
        if (clientToken) {
          await sendPushNotification(
            clientToken,
            'Recordatorio de cita',
            `Recordatorio: Tu cita es mañana a las ${timeSlot} con ${barberName}`,
            { appointmentId: doc.id, type: 'appointment_reminder' },
          )
        }

        // Notify barber
        if (barberId) {
          const barberToken = await getExpoPushToken(barberId)
          if (barberToken) {
            await sendPushNotification(
              barberToken,
              'Recordatorio de cita',
              `Recordatorio: Tienes una cita mañana a las ${timeSlot} con ${clientName}`,
              { appointmentId: doc.id, type: 'appointment_reminder' },
            )
          }
        }

        // Mark reminder as sent
        await doc.ref.update({ reminderSent: true })
        console.log(`[Reminders] Sent reminder for appointment ${doc.id}`)
      } catch (err) {
        console.error(`[Reminders] Error processing appointment ${doc.id}:`, err)
        // Continue with next appointment — don't let one failure stop the batch
      }
    }
  },
)
