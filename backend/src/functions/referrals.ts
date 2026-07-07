import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getExpoPushToken, sendPushNotification } from '../utils/push'
import { storeNotification } from '../utils/notificationStore'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const REGION = 'europe-west1'

export const onReferralUserCreated = onDocumentCreated(
  { document: 'users/{uid}', region: REGION },
  async (event) => {
    const userData = event.data?.data()
    if (!userData?.referredBy) return

    const newUserId = event.params.uid
    const referrerId: string = userData.referredBy
    const newUserName: string = userData.displayName || 'Un amigo'

    // Evitar auto-referido
    if (referrerId === newUserId) return

    // Verificar que el referidor existe
    const referrerSnap = await db.doc(`users/${referrerId}`).get()
    if (!referrerSnap.exists) return

    const batch = db.batch()

    // +50 puntos al referidor + incrementar contador
    batch.update(db.doc(`users/${referrerId}`), {
      loyaltyPoints: admin.firestore.FieldValue.increment(50),
      referralCount: admin.firestore.FieldValue.increment(1),
    })

    // +25 puntos de bienvenida al nuevo usuario
    batch.update(db.doc(`users/${newUserId}`), {
      loyaltyPoints: admin.firestore.FieldValue.increment(25),
    })

    // Registro de referido
    batch.set(db.collection('referrals').doc(), {
      referrerId,
      referredId: newUserId,
      referredName: newUserName,
      pointsReferrer: 50,
      pointsReferred: 25,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    await batch.commit()

    // Push + in-app al referidor
    try {
      const pushToken = await getExpoPushToken(referrerId)
      if (pushToken) {
        await sendPushNotification(
          pushToken,
          '🎉 ¡Tienes un referido!',
          `${newUserName} se ha unido con tu código. +50 puntos de regalo.`,
          {},
        )
      }
      await storeNotification(referrerId, {
        title: '🎉 ¡Tienes un referido!',
        body: `${newUserName} se ha unido con tu código. +50 puntos de regalo.`,
        type: 'system',
        data: {},
      })
    } catch (e) {
      console.error('[onReferralUserCreated] notification error:', e)
    }
  },
)
