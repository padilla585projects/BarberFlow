import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { sendEmail, tplAppointmentReceived, tplAppointmentConfirmed, tplAppointmentCancelled, tplNewAppointmentOwner } from '../utils/email'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const REGION = 'europe-west1'
const SECRETS = ['RESEND_API_KEY']

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getUser(uid: string) {
  const snap = await db.collection('users').doc(uid).get()
  return snap.exists ? (snap.data() as { email: string; displayName: string }) : null
}

interface BarbershopInfo { name: string; ownerId: string | null }
async function getBarbershop(id: string): Promise<BarbershopInfo> {
  const snap = await db.collection('barbershops').doc(id).get()
  if (!snap.exists) return { name: 'BarberFlow', ownerId: null }
  const data = snap.data()!
  return { name: (data.name as string) ?? 'BarberFlow', ownerId: (data.ownerId as string) ?? null }
}

function fmtDate(ts: admin.firestore.Timestamp): string {
  return ts.toDate().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

// ─── onCreate: nueva cita → email al cliente Y al owner ─────────────────────
export const onAppointmentCreated = onDocumentCreated(
  { document: 'appointments/{appointmentId}', region: REGION, secrets: SECRETS },
  async (event) => {
    const apt = event.data?.data()
    if (!apt) return

    const barbershopId = apt.barbershopId as string
    const [client, barber, barbershop] = await Promise.all([
      getUser(apt.clientId as string),
      getUser(apt.barberId as string),
      getBarbershop(barbershopId),
    ])

    const barberName = barber?.displayName ?? 'tu barbero'
    const services = (apt.services as Array<{ name: string }>).map(s => s.name)
    const date = fmtDate(apt.date as admin.firestore.Timestamp)
    const timeSlot = apt.timeSlot as string
    const totalPrice = apt.totalPrice as number

    // Email to client
    if (client?.email) {
      const html = tplAppointmentReceived({
        clientName: client.displayName,
        barberName,
        barbershopName: barbershop.name,
        services,
        date,
        timeSlot,
        totalPrice,
      })
      await sendEmail(client.email, `Cita recibida — ${barbershop.name}`, html)
    }

    // Email to barbershop owner
    if (barbershop.ownerId) {
      const owner = await getUser(barbershop.ownerId)
      if (owner?.email) {
        const ownerHtml = tplNewAppointmentOwner({
          ownerName: owner.displayName,
          clientName: client?.displayName ?? 'Un cliente',
          barberName,
          barbershopName: barbershop.name,
          services,
          date,
          timeSlot,
          totalPrice,
        })
        await sendEmail(owner.email, `Nueva cita recibida — ${barbershop.name}`, ownerHtml)
      }
    }
  }
)

// ─── onUpdate: cambio de estado → notificar al cliente Y al owner ───────────
export const onAppointmentStatusChanged = onDocumentUpdated(
  { document: 'appointments/{appointmentId}', region: REGION, secrets: SECRETS },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!before || !after) return
    if (before.status === after.status) return

    const barbershopId = after.barbershopId as string
    const [client, barber, barbershop] = await Promise.all([
      getUser(after.clientId as string),
      getUser(after.barberId as string),
      getBarbershop(barbershopId),
    ])

    const barberName = barber?.displayName ?? 'tu barbero'
    const date = fmtDate(after.date as admin.firestore.Timestamp)
    const timeSlot = after.timeSlot as string

    if (after.status === 'confirmed') {
      // Email to client
      if (client?.email) {
        const html = tplAppointmentConfirmed({
          clientName: client.displayName,
          barberName,
          barbershopName: barbershop.name,
          services: (after.services as Array<{ name: string }>).map(s => s.name),
          date,
          timeSlot,
          totalPrice: after.totalPrice as number,
        })
        await sendEmail(client.email, `Cita confirmada — ${barbershop.name}`, html)
      }
    } else if (after.status === 'cancelled') {
      // Email to client
      if (client?.email) {
        const html = tplAppointmentCancelled({
          clientName: client.displayName,
          barberName,
          barbershopName: barbershop.name,
          date,
          timeSlot,
        })
        await sendEmail(client.email, `Cita cancelada — ${barbershop.name}`, html)
      }

      // Email to owner
      if (barbershop.ownerId) {
        const owner = await getUser(barbershop.ownerId)
        if (owner?.email) {
          const clientName = client?.displayName ?? 'Un cliente'
          const ownerHtml = tplAppointmentCancelled({
            clientName,
            barberName,
            barbershopName: barbershop.name,
            date,
            timeSlot,
          })
          await sendEmail(owner.email, `Cita cancelada — ${barbershop.name}`, ownerHtml)
        }
      }
    }
  }
)
