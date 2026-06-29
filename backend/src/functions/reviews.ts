import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getExpoPushToken, sendPushNotification } from '../utils/push'
import { storeNotification } from '../utils/notificationStore'

if (!admin.apps.length) admin.initializeApp()

const REGION = 'europe-west1'

// New review → notify barber
export const onReviewCreatedPush = onDocumentCreated(
  { document: 'barbershops/{barbershopId}/reviews/{reviewId}', region: REGION },
  async (event) => {
    const review = event.data?.data()
    if (!review) return

    const barberId = review.barberId as string | undefined
    if (!barberId) return

    const token = await getExpoPushToken(barberId)
    if (!token) return

    const clientName = (review.clientName as string) || 'Un cliente'
    const rating = review.rating as number
    const stars = '⭐'.repeat(rating)

    const barberTitle = 'Nueva reseña'
    const barberBody = `${clientName} te ha dejado una reseña ${stars}`
    const pushData = { barbershopId: event.params.barbershopId, reviewId: event.params.reviewId, type: 'new_review' }

    await sendPushNotification(token, barberTitle, barberBody, pushData)
    await storeNotification(barberId, { title: barberTitle, body: barberBody, type: 'review', data: pushData })

    // Also notify the shop owner
    const shopSnap = await admin.firestore().collection('barbershops').doc(event.params.barbershopId).get()
    const ownerId = shopSnap.data()?.ownerId as string | undefined
    if (ownerId && ownerId !== barberId) {
      const ownerToken = await getExpoPushToken(ownerId)
      const ownerTitle = 'Nueva reseña en tu barbería'
      const ownerBody = `${clientName} ha dejado una reseña de ${rating} estrellas`
      if (ownerToken) {
        await sendPushNotification(ownerToken, ownerTitle, ownerBody, pushData)
      }
      await storeNotification(ownerId, { title: ownerTitle, body: ownerBody, type: 'review', data: pushData })
    }
  },
)
