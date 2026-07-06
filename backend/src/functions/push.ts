import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getExpoPushToken, sendPushNotification } from '../utils/push'
import { storeNotification } from '../utils/notificationStore'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const REGION = 'europe-west1'

function fmtTime(ts: admin.firestore.Timestamp): string {
  return ts.toDate().toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

async function getOwnerId(barbershopId: string): Promise<string | null> {
  if (!barbershopId) return null
  const snap = await db.collection('barbershops').doc(barbershopId).get()
  return (snap.data()?.ownerId as string) ?? null
}

/** Send push + store in-app notification for a user (skips if no token). */
async function notifyUser(
  uid: string,
  title: string,
  body: string,
  pushData: Record<string, string>,
): Promise<void> {
  const token = await getExpoPushToken(uid)
  if (token) {
    await sendPushNotification(token, title, body, pushData)
  }
  await storeNotification(uid, { title, body, type: 'appointment', data: pushData })
}

// ── Order status change → notify client ──────────────────────────────────

const ORDER_STATUS_MSG: Record<string, { title: string; body: (shopName: string) => string }> = {
  processing: {
    title: '📦 Pedido en preparación',
    body: (shop) => `${shop} está preparando tu pedido`,
  },
  shipped: {
    title: '🚚 Pedido enviado',
    body: (shop) => `Tu pedido de ${shop} está en camino`,
  },
  delivered: {
    title: '✅ Pedido entregado',
    body: (shop) => `Tu pedido de ${shop} ha sido entregado`,
  },
  cancelled: {
    title: '❌ Pedido cancelado',
    body: (shop) => `Tu pedido de ${shop} ha sido cancelado`,
  },
}

export const onOrderStatusChangedPush = onDocumentUpdated(
  { document: 'orders/{orderId}', region: REGION },
  async (event) => {
    const before = event.data?.before.data()
    const after  = event.data?.after.data()
    if (!before || !after) return
    if (before.status === after.status) return

    const newStatus  = after.status as string
    const clientId   = after.clientId as string
    const shopName   = (after.barbershopName as string) || 'la barbería'

    const template = ORDER_STATUS_MSG[newStatus]
    if (!template) return   // no notificamos estados intermedios sin mensaje definido

    const title = template.title
    const body  = template.body(shopName)
    const pushData = { orderId: event.params.orderId, type: 'order_status_changed', status: newStatus }

    const token = await getExpoPushToken(clientId)
    if (token) {
      await sendPushNotification(token, title, body, pushData)
    }
    await storeNotification(clientId, { title, body, type: 'order', data: pushData })
  },
)

// New appointment → notify barber AND owner
export const onAppointmentCreatedPush = onDocumentCreated(
  { document: 'appointments/{appointmentId}', region: REGION },
  async (event) => {
    const apt = event.data?.data()
    if (!apt) return

    const barberId = apt.barberId as string | undefined
    const barbershopId = apt.barbershopId as string | undefined

    const clientName = (apt.clientName as string) || 'Un cliente'
    const timeSlot = apt.timeSlot as string
    const date = fmtTime(apt.date as admin.firestore.Timestamp)

    const title = 'Nueva cita'
    const body = `${clientName} ha reservado para ${date} a las ${timeSlot}`
    const pushData = { appointmentId: event.params.appointmentId, type: 'new_appointment' }

    // Notify assigned barber
    if (barberId) {
      await notifyUser(barberId, title, body, pushData)
    }

    // Notify barbershop owner (skip if owner is the same as the barber)
    if (barbershopId) {
      const ownerId = await getOwnerId(barbershopId)
      if (ownerId && ownerId !== barberId) {
        await notifyUser(ownerId, title, body, pushData)
      }
    }
  },
)

// Status change → notify relevant parties (client, barber, AND owner)
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
    const barbershopId = after.barbershopId as string | undefined
    const barbershopName = (after.barbershopName as string) || 'tu barbería'
    const timeSlot = after.timeSlot as string
    const date = fmtTime(after.date as admin.firestore.Timestamp)
    const clientName = (after.clientName as string) || 'Un cliente'

    const ownerId = barbershopId ? await getOwnerId(barbershopId) : null

    if (newStatus === 'confirmed') {
      // Barber/owner confirmed → notify client
      const title = 'Cita confirmada'
      const body = `Tu cita en ${barbershopName} el ${date} a las ${timeSlot} ha sido confirmada`
      const pushData = { appointmentId: event.params.appointmentId, type: 'appointment_confirmed' }
      await notifyUser(clientId, title, body, pushData)

      // Also notify the owner (if owner didn't do the confirmation themselves)
      if (ownerId && ownerId !== barberId) {
        const ownerTitle = 'Cita confirmada'
        const ownerBody = `La cita de ${clientName} el ${date} a las ${timeSlot} ha sido confirmada`
        await notifyUser(ownerId, ownerTitle, ownerBody, pushData)
      }
    } else if (newStatus === 'cancelled') {
      // Notify barber
      if (barberId) {
        const barberTitle = 'Cita cancelada'
        const barberBody = `${clientName} ha cancelado la cita del ${date} a las ${timeSlot}`
        const barberPushData = { appointmentId: event.params.appointmentId, type: 'appointment_cancelled' }
        await notifyUser(barberId, barberTitle, barberBody, barberPushData)
      }

      // Notify client
      const clientTitle = 'Cita cancelada'
      const clientBody = `Tu cita en ${barbershopName} el ${date} a las ${timeSlot} ha sido cancelada`
      const clientPushData = { appointmentId: event.params.appointmentId, type: 'appointment_cancelled' }
      await notifyUser(clientId, clientTitle, clientBody, clientPushData)

      // Notify owner (if different from barber)
      if (ownerId && ownerId !== barberId) {
        const ownerTitle = 'Cita cancelada'
        const ownerBody = `${clientName} ha cancelado la cita del ${date} a las ${timeSlot}`
        const ownerPushData = { appointmentId: event.params.appointmentId, type: 'appointment_cancelled' }
        await notifyUser(ownerId, ownerTitle, ownerBody, ownerPushData)
      }
    } else if (newStatus === 'completed') {
      // Notify client
      const title = 'Cita completada'
      const body = `Tu cita en ${barbershopName} ha sido marcada como completada. ¡Gracias!`
      const pushData = { appointmentId: event.params.appointmentId, type: 'appointment_completed' }
      await notifyUser(clientId, title, body, pushData)

      // Notify owner (if different from barber)
      if (ownerId && ownerId !== barberId) {
        const ownerTitle = 'Cita completada'
        const ownerBody = `La cita de ${clientName} el ${date} a las ${timeSlot} ha sido completada`
        await notifyUser(ownerId, ownerTitle, ownerBody, pushData)
      }
    }
  },
)
