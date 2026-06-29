import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getExpoPushToken, sendPushNotification } from '../utils/push'

if (!admin.apps.length) admin.initializeApp()

const REGION = 'europe-west1'

/**
 * When a new message is created in barbershops/{shopId}/messages/{msgId},
 * send push notifications to the appropriate recipients.
 */
export const onMessageCreated = onDocumentCreated(
  { document: 'barbershops/{shopId}/messages/{msgId}', region: REGION },
  async (event) => {
    const message = event.data?.data()
    if (!message) return

    const senderRole = message.senderRole as 'owner' | 'barber'
    const senderName = (message.senderName as string) || 'Alguien'
    const text = (message.text as string) || ''
    const recipientId = message.recipientId as string
    const shopId = event.params.shopId
    const preview = text.length > 80 ? text.slice(0, 80) + '...' : text

    const pushData = { type: 'new_message', barbershopId: shopId }

    if (senderRole === 'owner') {
      if (recipientId === 'all') {
        // Broadcast: notify all barbers
        const shopSnap = await admin.firestore().collection('barbershops').doc(shopId).get()
        const barberUids: string[] = shopSnap.data()?.barbers ?? []

        const promises = barberUids.map(async (uid) => {
          const token = await getExpoPushToken(uid)
          if (token) {
            await sendPushNotification(token, `${senderName} (a todos)`, preview, pushData)
          }
        })
        await Promise.all(promises)
      } else {
        // Direct message to specific barber
        const token = await getExpoPushToken(recipientId)
        if (token) {
          await sendPushNotification(token, `Mensaje de ${senderName}`, preview, pushData)
        }
      }
    } else if (senderRole === 'barber') {
      // Barber sent message: notify the owner
      const shopSnap = await admin.firestore().collection('barbershops').doc(shopId).get()
      const ownerId = shopSnap.data()?.ownerId as string | undefined
      if (ownerId) {
        const token = await getExpoPushToken(ownerId)
        if (token) {
          await sendPushNotification(token, `Mensaje de ${senderName}`, preview, pushData)
        }
      }
    }
  },
)
