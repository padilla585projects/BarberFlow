import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import Stripe from 'stripe'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const REGION = 'europe-west1'
const SECRETS = ['STRIPE_SECRET_KEY']

// URL de retorno tras completar/abandonar el onboarding de Stripe.
// Página estática simple en el hosting web-admin ya existente.
const RETURN_BASE_URL = 'https://barberflow-2026.web.app/stripe-connect'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY secret is not set')
  return new Stripe(key, { typescript: true })
}

async function assertOwner(barbershopId: string, uid: string) {
  const snap = await db.collection('barbershops').doc(barbershopId).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Barbería no encontrada.')
  const data = snap.data()!
  if (data.ownerId !== uid) {
    throw new HttpsError('permission-denied', 'No eres el dueño de esta barbería.')
  }
  return data
}

/**
 * Crea (si no existe) una cuenta Stripe Express para la barbería y devuelve
 * un Account Link de onboarding. El dueño abre esa URL en el navegador,
 * completa el registro/KYC directamente con Stripe, y el dinero de las
 * compras de sus clientes entrará en ESA cuenta (no en la de BarberFlow).
 */
export const createConnectAccountLink = onCall(
  { region: REGION, secrets: SECRETS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
    }
    const { barbershopId } = request.data as { barbershopId?: string }
    if (!barbershopId) throw new HttpsError('invalid-argument', 'Falta barbershopId.')

    const barbershop = await assertOwner(barbershopId, request.auth.uid)
    const stripe = getStripe()

    let accountId: string | undefined = barbershop.paymentMethods?.stripe?.connectAccountId

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        email: barbershop.ownerEmail || request.auth.token.email || undefined,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { barbershopId },
      })
      accountId = account.id

      await db.collection('barbershops').doc(barbershopId).set(
        {
          paymentMethods: {
            stripe: {
              connectAccountId: accountId,
              chargesEnabled: false,
              enabled: false,
            },
          },
        },
        { merge: true },
      )
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${RETURN_BASE_URL}/refresh`,
      return_url: `${RETURN_BASE_URL}/done`,
      type: 'account_onboarding',
    })

    return { url: accountLink.url, accountId }
  },
)

/**
 * Consulta directamente a Stripe el estado de la cuenta conectada y
 * sincroniza Firestore. Sirve de respaldo por si el webhook account.updated
 * no está configurado todavía o no ha llegado aún.
 */
export const checkStripeConnectStatus = onCall(
  { region: REGION, secrets: SECRETS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
    }
    const { barbershopId } = request.data as { barbershopId?: string }
    if (!barbershopId) throw new HttpsError('invalid-argument', 'Falta barbershopId.')

    const barbershop = await assertOwner(barbershopId, request.auth.uid)
    const accountId = barbershop.paymentMethods?.stripe?.connectAccountId
    if (!accountId) {
      return { connected: false, chargesEnabled: false };
    }

    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(accountId)

    await db.collection('barbershops').doc(barbershopId).set(
      {
        paymentMethods: {
          stripe: {
            chargesEnabled: !!account.charges_enabled,
          },
        },
      },
      { merge: true },
    )

    return { connected: true, chargesEnabled: !!account.charges_enabled }
  },
)
