import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getExpoPushToken, sendPushNotification } from '../utils/push'
import { storeNotification } from '../utils/notificationStore'

if (!admin.apps.length) admin.initializeApp()

const REGION = 'europe-west1'

function fmtTime(ts: admin.firestore.Timestamp): string {
  return ts.toDate().toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// New appointment → notify barber
export const onAppointmentCreatedPush = onDocumentCreated(
  { document: 'appointments/{appointmentId}', region: REGION },
  async (event) => {
    const apt = event.data?.data()
    if (!apt) return

    const barberId = apt.barberId as string | undefined
    if (!barberId) return

    const token = await getExpoPushToken(barberId)
    if (!token) return

    const clientName = (apt.clientName as string) || 'Un cliente'
    const timeSlot = apt.timeSlot as string
    const date = fmtTime(apt.date as admin.firestore.Timestamp)

    const title = 'Nueva cita'
    const body = `${clientName} ha reservado para ${date} a las ${timeSlot}`
    const pushData = { appointmentId: event.params.appointmentId, type: 'new_appointment' }

    await sendPushNotification(token, title, body, pushData)
    await storeNotification(barberId, { title, body, type: 'appointment', data: pushData })
  },
)

// Status change → notify relevant party
export const onAppointmentStatusChangedPush = onDocumentUpdated(
  { document: 'appointments/{appointmentId}', region: REGION },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!before || !after) return
    if (before.status === after.status) return

    const newStatus = after.status as string
    const clientId = after.clientId as string
    const barberId = after.barberId as string | undefined
    const barbershopName = (after.barbershopName as string) || 'tu barbería'
    const timeSlot = after.timeSlot as string
    const date = fmtTime(after.date as admin.firestore.Timestamp)

    if (newStatus === 'confirmed') {
      // Barber confirmed → notify client
      const token = await getExpoPushToken(clientId)
      const title = 'Cita confirmada'
      const body = `Tu cita en ${barbershopName} el ${date} a las ${timeSlot} ha sido confirmada`
      const pushData = { appointmentId: event.params.appointmentId, type: 'appointment_confirmed' }
      if (token) {
        await sendPushNotification(token, title, body, pushData)
      }
      await storeNotification(clientId, { title, body, type: 'appointment', data: pushData })
    } else if (newStatus === 'cancelled') {
      // Could be cancelled by client or barber — notify the other party
      // We notify both: the barber if client cancelled, the client if barber cancelled
      if (barberId) {
        const barberToken = await getExpoPushToken(barberId)
        const clientName = (after.clientName as string) || 'Un cliente'
        const barberTitle = 'Cita cancelada'
        const barberBody = `${clientName} ha cancelado la cita del ${date} a las ${timeSlot}`
        const barberPushData = { appointmentId: event.params.appointmentId, type: 'appointment_cancelled' }
        if (barberToken) {
          await sendPushNotification(barberToken, barberTitle, barberBody, barberPushData)
        }
        await storeNotification(barberId, { title: barberTitle, body: barberBody, type: 'appointment', data: barberPushData })
      }
      const clientToken = await getExpoPushToken(clientId)
      const clientTitle = 'Cita cancelada'
      const clientBody = `Tu cita en ${barbershopName} el ${date} a las ${timeSlot} ha sido cancelada`
      const clientPushData = { appointmentId: event.params.appointmentId, type: 'appointment_cancelled' }
      if (clientToken) {
        await sendPushNotification(clientToken, clientTitle, clientBody, clientPushData)
      }
      await storeNotification(clientId, { title: clientTitle, body: clientBody, type: 'appointment', data: clientPushData })
    } else if (newStatus === 'completed') {
      // Notify client that the appointment is marked as completed
      const token = await getExpoPushToken(clientId)
      const title = 'Cita completada'
      const body = `Tu cita en ${barbershopName} ha sido marcada como completada. ¡Gracias!`
      const pushData = { appointmentId: event.params.appointmentId, type: 'appointment_completed' }
      if (token) {
        await sendPushNotification(token, title, body, pushData)
      }
      await storeNotification(clientId, { title, body, type: 'appointment', data: pushData })
    }
  },
)
