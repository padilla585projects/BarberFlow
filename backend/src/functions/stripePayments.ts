import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import Stripe from 'stripe'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const REGION = 'europe-west1'
const SECRETS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY secret is not set')
  return new Stripe(key, { typescript: true })
}

/**
 * Crea un PaymentIntent REAL de Stripe para un pedido ya existente en Firestore.
 * El importe se calcula siempre server-side a partir del pedido guardado
 * (nunca se confía en un importe enviado por el cliente).
 *
 * Usage: llamar desde el móvil con httpsCallable('createPaymentIntent', { orderId })
 * Devuelve: { clientSecret, paymentIntentId }
 */
export const createPaymentIntent = onCall(
  { region: REGION, secrets: SECRETS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión para pagar.')
    }

    const { orderId } = request.data as { orderId?: string }
    if (!orderId) {
      throw new HttpsError('invalid-argument', 'Falta orderId.')
    }

    const orderRef = db.collection('orders').doc(orderId)
    const orderSnap = await orderRef.get()
    if (!orderSnap.exists) {
      throw new HttpsError('not-found', 'Pedido no encontrado.')
    }
    const order = orderSnap.data()!

    // El pedido solo lo puede pagar el cliente que lo creó
    if (order.clientId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Este pedido no te pertenece.')
    }

    if (order.paymentStatus === 'paid') {
      throw new HttpsError('failed-precondition', 'Este pedido ya está pagado.')
    }

    const barbershopSnap = await db.collection('barbershops').doc(order.barbershopId).get()
    const barbershop = barbershopSnap.data()
    const stripeConfig = barbershop?.paymentMethods?.stripe
    if (!stripeConfig?.enabled) {
      throw new HttpsError('failed-precondition', 'Esta barbería no tiene Stripe activado.')
    }
    const connectAccountId: string | undefined = stripeConfig.connectAccountId
    if (!connectAccountId || !stripeConfig.chargesEnabled) {
      throw new HttpsError(
        'failed-precondition',
        'La barbería no ha completado la conexión con Stripe todavía.',
      )
    }

    const amount = Math.round((order.totalAmount as number) * 100) // céntimos
    if (!amount || amount <= 0) {
      throw new HttpsError('invalid-argument', 'Importe del pedido inválido.')
    }

    const stripe = getStripe()
    // Comisión de plataforma (0 = todo el importe va a la barbería). Ajustar
    // aquí si en el futuro BarberFlow cobra un % por venta.
    const PLATFORM_FEE_PERCENT = 0
    const applicationFeeAmount = Math.round(amount * (PLATFORM_FEE_PERCENT / 100))

    // Reutilizar el PaymentIntent si ya existe uno abierto para este pedido
    // (evita crear cargos duplicados si el cliente reintenta)
    const existingId = order.stripePaymentIntentId as string | undefined
    if (existingId) {
      const existing = await stripe.paymentIntents.retrieve(existingId)
      if (existing.status !== 'succeeded' && existing.status !== 'canceled') {
        // Actualizamos el importe por si el pedido cambió (gift card, etc.)
        const updated = await stripe.paymentIntents.update(existingId, { amount })
        return { clientSecret: updated.client_secret, paymentIntentId: updated.id }
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      payment_method_types: ['card', 'bizum'],
      // Destination charge: el cargo se crea en la cuenta de la plataforma
      // pero los fondos (menos la comisión, si la hay) se transfieren
      // automáticamente a la cuenta Stripe Connect de la barbería.
      transfer_data: { destination: connectAccountId },
      ...(applicationFeeAmount > 0 ? { application_fee_amount: applicationFeeAmount } : {}),
      metadata: {
        orderId,
        barbershopId: order.barbershopId,
        clientId: order.clientId,
      },
      description: `BarberFlow · Pedido ${orderId.slice(-8).toUpperCase()}`,
    })

    await orderRef.update({
      stripePaymentIntentId: paymentIntent.id,
      paymentStatus: 'processing',
    })

    return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id }
  },
)

/**
 * Webhook de Stripe. Es la ÚNICA fuente de verdad sobre si un pago se ha
 * cobrado de verdad — el cliente NUNCA puede marcar un pedido como pagado
 * por sí mismo para los pagos con Stripe.
 *
 * Configurar en el Dashboard de Stripe: URL de esta función,
 * eventos: payment_intent.succeeded, payment_intent.payment_failed
 */
export const stripeWebhook = onRequest(
  { region: REGION, secrets: SECRETS },
  async (req, res) => {
    const sig = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!sig || !webhookSecret) {
      res.status(400).send('Missing signature or webhook secret')
      return
    }

    let event: Stripe.Event
    try {
      const stripe = getStripe()
      // req.rawBody está disponible en Cloud Functions gen2 (Express bajo el capó)
      event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret)
    } catch (err: any) {
      console.error('[stripeWebhook] Signature verification failed:', err.message)
      res.status(400).send(`Webhook Error: ${err.message}`)
      return
    }

    try {
      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.orderId
        if (orderId) {
          await db.collection('orders').doc(orderId).update({
            paymentStatus: 'paid',
            paidAt: admin.firestore.Timestamp.now(),
          })
          console.log(`[stripeWebhook] Order ${orderId} marked as paid`)
        }
      } else if (event.type === 'payment_intent.payment_failed') {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.orderId
        if (orderId) {
          await db.collection('orders').doc(orderId).update({
            paymentStatus: 'failed',
          })
        }
      } else if (event.type === 'account.updated') {
        // Cuenta Stripe Connect de una barbería completó (o cambió) su
        // verificación — sincronizamos chargesEnabled en Firestore.
        const account = event.data.object as Stripe.Account
        const barbershopId = account.metadata?.barbershopId
        if (barbershopId) {
          await db.collection('barbershops').doc(barbershopId).set(
            {
              paymentMethods: {
                stripe: { chargesEnabled: !!account.charges_enabled },
              },
            },
            { merge: true },
          )
          console.log(
            `[stripeWebhook] Barbershop ${barbershopId} chargesEnabled=${account.charges_enabled}`,
          )
        }
      }
      res.status(200).json({ received: true })
    } catch (err: any) {
      console.error('[stripeWebhook] Error processing event:', err.message)
      res.status(500).send('Internal error')
    }
  },
)
