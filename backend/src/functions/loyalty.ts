import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getExpoPushToken, sendPushNotification } from '../utils/push'

if (!admin.apps.length) admin.initializeApp()

const REGION = 'europe-west1'
const db = admin.firestore()

export const onAppointmentCompletedLoyalty = onDocumentUpdated(
  { document: 'appointments/{appointmentId}', region: REGION },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!before || !after) return

    // Only fire on the transition to 'completed'
    if (before.status === 'completed' || after.status !== 'completed') return

    // Skip if points were already awarded (idempotency guard)
    if (after.loyaltyPointsAwarded) return

    const appointmentId = event.params.appointmentId
    const barbershopId = after.barbershopId as string | undefined
    const clientId = after.clientId as string | undefined
    const totalPrice = after.totalPrice as number | undefined

    if (!barbershopId || !clientId || !totalPrice) return

    // Fetch the barbershop's loyalty config
    const shopSnap = await db.collection('barbershops').doc(barbershopId).get()
    const shopData = shopSnap.data()
    if (!shopData) return

    const loyaltyConfig = shopData.loyaltyConfig as
      | { enabled?: boolean; pointsPerEuro?: number }
      | undefined

    if (!loyaltyConfig?.enabled || !loyaltyConfig.pointsPerEuro) return

    const points = Math.floor(totalPrice * loyaltyConfig.pointsPerEuro)
    if (points <= 0) return

    const batch = db.batch()

    // Increment the client's loyalty points
    const userRef = db.collection('users').doc(clientId)
    batch.update(userRef, {
      loyaltyPoints: admin.firestore.FieldValue.increment(points),
    })

    // Create a points history entry
    const historyRef = userRef.collection('pointsHistory').doc()
    batch.set(historyRef, {
      type: 'earned',
      points,
      description: 'Cita completada',
      date: admin.firestore.FieldValue.serverTimestamp(),
      appointmentId,
    })

    // Mark the appointment so points aren't awarded twice
    const aptRef = db.collection('appointments').doc(appointmentId)
    batch.update(aptRef, { loyaltyPointsAwarded: true })

    await batch.commit()

    // Send push notification to the client
    const token = await getExpoPushToken(clientId)
    if (token) {
      await sendPushNotification(
        token,
        'Puntos de fidelidad',
        `🎉 Has ganado ${points} puntos de fidelidad`,
        { appointmentId, type: 'loyalty_points_earned' },
      )
    }
  },
)
