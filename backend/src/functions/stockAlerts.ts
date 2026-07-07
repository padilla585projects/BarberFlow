import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { sendPushNotification } from '../utils/push'
import { storeNotification } from '../utils/notificationStore'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const REGION = 'europe-west1'

/**
 * Se dispara cuando un producto se actualiza.
 * Si el stock pasa de 0 a > 0, notifica a todos los usuarios
 * que habían solicitado aviso y elimina las alertas.
 */
export const onProductStockRestored = onDocumentUpdated(
  { document: 'products/{productId}', region: REGION },
  async (event) => {
    const before = event.data?.before.data()
    const after  = event.data?.after.data()

    if (!before || !after) return

    // Solo actuar cuando se recupera stock (0 → >0)
    if (before.stock !== 0 || after.stock <= 0) return

    const productId   = event.params.productId
    const productName = after.name ?? 'Producto'

    // Buscar alertas activas para este producto
    const alertsSnap = await db
      .collection('stockAlerts')
      .where('productId', '==', productId)
      .get()

    if (alertsSnap.empty) return

    console.log(`[stockAlerts] ${alertsSnap.size} alertas para ${productName} (${productId})`)

    const batch = db.batch()
    const notifications: Promise<void>[] = []

    for (const alertDoc of alertsSnap.docs) {
      const { userId } = alertDoc.data() as { userId: string; productId: string }

      // Eliminar la alerta (ya notificamos)
      batch.delete(alertDoc.ref)

      // Push + in-app al usuario
      notifications.push(
        (async () => {
          try {
            const userSnap = await db.collection('users').doc(userId).get()
            const pushToken = userSnap.data()?.expoPushToken
            if (pushToken) {
              await sendPushNotification(
                pushToken,
                '📦 ¡Producto disponible!',
                `${productName} volvió a estar en stock. ¡Cómpralo antes de que se agote!`,
                { productId, screen: 'ProductDetail' },
                userId,
                'promotions',
              )
            }
            await storeNotification(userId, {
              title: '📦 ¡Producto disponible!',
              body: `${productName} volvió a estar en stock. ¡Cómpralo antes de que se agote!`,
              type: 'system',
              data: { productId },
            })
          } catch (e) {
            console.error(`[stockAlerts] Error notificando a ${userId}:`, e)
          }
        })(),
      )
    }

    await Promise.all([batch.commit(), ...notifications])
    console.log(`[stockAlerts] Notificaciones enviadas y alertas eliminadas para ${productName}`)
  },
)
