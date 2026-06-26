import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { sendEmail, tplAppointmentConfirmed, tplAppointmentCancelled } from '../utils/email'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const REGION = 'europe-west1'
const SECRETS = ['RESEND_API_KEY']

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getUser(uid: string) {
  const snap = await db.collection('users').doc(uid).get()
  return snap.exists ? (snap.data() as { email: string; displayName: string }) : null
}

async function getBarbershopName(id: string): Promise<string> {
  const snap = await db.collection('barbershops').doc(id).get()
  return snap.exists ? (snap.data()?.name ?? 'BarberFlow') : 'BarberFlow'
}

function fmtDate(ts: admin.firestore.Timestamp): string {
  return ts.toDate().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

// ─── onCreate: nueva cita → email de confirmación ────────────────────────────
export const onAppointmentCreated = onDocumentCreated(
  { document: 'appointments/{appointmentId}', region: REGION, secrets: SECRETS },
  async (event) => {
    const apt = event.data?.data()
    if (!apt) return

    const [client, barber, barbershopName] = await Promise.all([
      getUser(apt.clientId as string),
      getUser(apt.barberId as string),
      getBarbershopName(apt.barbershopId as string),
    ])

    if (!client?.email) return

    const html = tplAppointmentConfirmed({
      clientName: client.displayName,
      barberName: barber?.displayName ?? 'tu barbero',
      barbershopName,
      services: (apt.services as Array<{ name: string }>).map(s => s.name),
      date: fmtDate(apt.date as admin.firestore.Timestamp),
      timeSlot: apt.timeSlot as string,
      totalPrice: apt.totalPrice as number,
    })

    await sendEmail(client.email, `✅ Cita confirmada — ${barbershopName}`, html)
  }
)

// ─── onUpdate: cambio de estado → notificar cancelación ──────────────────────
export const onAppointmentStatusChanged = onDocumentUpdated(
  { document: 'appointments/{appointmentId}', region: REGION, secrets: SECRETS },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!before || !after) return
    if (before.status === after.status) return

    const [client, barber, barbershopName] = await Promise.all([
      getUser(after.clientId as string),
      getUser(after.barberId as string),
      getBarbershopName(after.barbershopId as string),
    ])

    if (!client?.email) return

    if (after.status === 'cancelled') {
      const html = tplAppointmentCancelled({
        clientName: client.displayName,
        barberName: barber?.displayName ?? 'tu barbero',
        barbershopName,
        date: fmtDate(after.date as admin.firestore.Timestamp),
        timeSlot: after.timeSlot as string,
      })
      await sendEmail(client.email, `❌ Cita cancelada — ${barbershopName}`, html)
    }
  }
)
