import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getExpoPushToken, sendPushNotification } from '../utils/push'

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

    await sendPushNotification(
      token,
      'Nueva cita',
      `${clientName} ha reservado para ${date} a las ${timeSlot}`,
      { appointmentId: event.params.appointmentId, type: 'new_appointment' },
    )
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
      if (token) {
        await sendPushNotification(
          token,
          'Cita confirmada',
          `Tu cita en ${barbershopName} el ${date} a las ${timeSlot} ha sido confirmada`,
          { appointmentId: event.params.appointmentId, type: 'appointment_confirmed' },
        )
      }
    } else if (newStatus === 'cancelled') {
      // Could be cancelled by client or barber — notify the other party
      // We notify both: the barber if client cancelled, the client if barber cancelled
      if (barberId) {
        const barberToken = await getExpoPushToken(barberId)
        if (barberToken) {
          const clientName = (after.clientName as string) || 'Un cliente'
          await sendPushNotification(
            barberToken,
            'Cita cancelada',
            `${clientName} ha cancelado la cita del ${date} a las ${timeSlot}`,
            { appointmentId: event.params.appointmentId, type: 'appointment_cancelled' },
          )
        }
      }
      const clientToken = await getExpoPushToken(clientId)
      if (clientToken) {
        await sendPushNotification(
          clientToken,
          'Cita cancelada',
          `Tu cita en ${barbershopName} el ${date} a las ${timeSlot} ha sido cancelada`,
          { appointmentId: event.params.appointmentId, type: 'appointment_cancelled' },
        )
      }
    } else if (newStatus === 'completed') {
      // Notify client that the appointment is marked as completed
      const token = await getExpoPushToken(clientId)
      if (token) {
        await sendPushNotification(
          token,
          'Cita completada',
          `Tu cita en ${barbershopName} ha sido marcada como completada. ¡Gracias!`,
          { appointmentId: event.params.appointmentId, type: 'appointment_completed' },
        )
      }
    }
  },
)
