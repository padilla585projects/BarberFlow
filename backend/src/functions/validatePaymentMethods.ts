import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

const REGION = 'europe-west1'

/**
 * Guardar el PayPal de cobro de una barbería.
 *
 * Era `onRequest` mientras la app la llamaba con `httpsCallable`, que son dos
 * protocolos distintos: el callable envía el cuerpo envuelto en `{data: {...}}`
 * y esta función leía `req.body.barbershopId` directamente, así que siempre
 * salía por el 400 de "Missing barbershopId or email". Nunca llegó a guardar
 * nada. Como `onCall`, el cuerpo y la identidad del llamante los da el runtime.
 *
 * OJO — esto NO verifica la cuenta contra PayPal. Solo comprueba el formato del
 * email y que quien llama sea el dueño de la barbería. Verificarla de verdad
 * requiere el SDK de PayPal con client ID/secret y un cobro de prueba.
 */
export const validatePayPalEmail = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  }

  const { barbershopId, email } = (request.data ?? {}) as {
    barbershopId?: string
    email?: string
  }

  if (!barbershopId || !email) {
    throw new HttpsError('invalid-argument', 'Falta la barbería o el email.')
  }

  const trimmed = email.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new HttpsError('invalid-argument', 'El email no tiene un formato válido.')
  }

  const db = admin.firestore()
  const shopSnap = await db.collection('barbershops').doc(barbershopId).get()
  if (!shopSnap.exists) {
    throw new HttpsError('not-found', 'Barbería no encontrada.')
  }

  if (shopSnap.data()!.ownerId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'No eres el dueño de esta barbería.')
  }

  await db.collection('barbershops').doc(barbershopId).update({
    'paymentMethods.paypal': {
      enabled: true,
      email: trimmed,
      lastValidated: admin.firestore.Timestamp.now(),
    },
  })

  return { valid: true, message: 'Email de PayPal guardado.' }
})
