import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getExpoPushToken, sendPushNotification } from '../utils/push'
import { storeNotification } from '../utils/notificationStore'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const REGION = 'europe-west1'

// ── Product review created → aggregate rating on the product doc ──────────
export const onProductReviewCreated = onDocumentCreated(
  { document: 'products/{productId}/reviews/{reviewId}', region: REGION },
  async (event) => {
    const review = event.data?.data()
    if (!review) return

    const productId = event.params.productId
    const rating = review.rating as number
    const barbershopId = review.barbershopId as string | undefined

    // Aggregate rating on product document
    await db.collection('products').doc(productId).update({
      totalRatings: admin.firestore.FieldValue.increment(1),
      ratingSum: admin.firestore.FieldValue.increment(rating),
    })

    // Notify barbershop owner about new product review
    if (!barbershopId) return
    const shopSnap = await db.collection('barbershops').doc(barbershopId).get()
    const ownerId = shopSnap.data()?.ownerId as string | undefined
    if (!ownerId) return

    const clientName = (review.clientName as string) || 'Un cliente'
    const productSnap = await db.collection('products').doc(productId).get()
    const productName = (productSnap.data()?.name as string) || 'un producto'
    const stars = '⭐'.repeat(Math.min(Math.max(rating, 1), 5))

    const title = 'Nueva reseña de producto'
    const body = `${clientName} ha valorado "${productName}" con ${stars}`
    const pushData = { productId, barbershopId, type: 'new_product_review' }

    const token = await getExpoPushToken(ownerId)
    if (token) {
      await sendPushNotification(token, title, body, pushData)
    }
    await storeNotification(ownerId, { title, body, type: 'review', data: pushData })
  },
)

// ── Barbershop review created → update rating aggregates + notify barber ──
export const onReviewCreatedPush = onDocumentCreated(
  { document: 'barbershops/{barbershopId}/reviews/{reviewId}', region: REGION },
  async (event) => {
    const review = event.data?.data()
    if (!review) return

    const rating = review.rating as number
    const barbershopId = event.params.barbershopId

    // Update barbershop rating aggregates (using admin SDK — bypasses security rules)
    await admin.firestore().doc(`barbershops/${barbershopId}`).update({
      totalRatings: admin.firestore.FieldValue.increment(1),
      ratingSum: admin.firestore.FieldValue.increment(rating),
    })

    const barberId = review.barberId as string | undefined
    if (!barberId) return

    const token = await getExpoPushToken(barberId)

    const clientName = (review.clientName as string) || 'Un cliente'
    const stars = '⭐'.repeat(rating)

    const barberTitle = 'Nueva reseña'
    const barberBody = `${clientName} te ha dejado una reseña ${stars}`
    const pushData = { barbershopId, reviewId: event.params.reviewId, type: 'new_review' }

    if (token) {
      await sendPushNotification(token, barberTitle, barberBody, pushData)
    }
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
