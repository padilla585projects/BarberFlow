"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.createPaymentIntent = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const REGION = 'europe-west1';
const SECRETS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key)
        throw new Error('STRIPE_SECRET_KEY secret is not set');
    return new stripe_1.default(key, { typescript: true });
}
/**
 * Crea un PaymentIntent REAL de Stripe para un pedido ya existente en Firestore.
 * El importe se calcula siempre server-side a partir del pedido guardado
 * (nunca se confía en un importe enviado por el cliente).
 *
 * Usage: llamar desde el móvil con httpsCallable('createPaymentIntent', { orderId })
 * Devuelve: { clientSecret, paymentIntentId }
 */
exports.createPaymentIntent = (0, https_1.onCall)({ region: REGION, secrets: SECRETS }, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión para pagar.');
    }
    const { orderId } = request.data;
    if (!orderId) {
        throw new https_1.HttpsError('invalid-argument', 'Falta orderId.');
    }
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Pedido no encontrado.');
    }
    const order = orderSnap.data();
    // El pedido solo lo puede pagar el cliente que lo creó
    if (order.clientId !== request.auth.uid) {
        throw new https_1.HttpsError('permission-denied', 'Este pedido no te pertenece.');
    }
    if (order.paymentStatus === 'paid') {
        throw new https_1.HttpsError('failed-precondition', 'Este pedido ya está pagado.');
    }
    const barbershopSnap = await db.collection('barbershops').doc(order.barbershopId).get();
    const barbershop = barbershopSnap.data();
    const stripeConfig = (_a = barbershop === null || barbershop === void 0 ? void 0 : barbershop.paymentMethods) === null || _a === void 0 ? void 0 : _a.stripe;
    if (!(stripeConfig === null || stripeConfig === void 0 ? void 0 : stripeConfig.enabled)) {
        throw new https_1.HttpsError('failed-precondition', 'Esta barbería no tiene Stripe activado.');
    }
    const connectAccountId = stripeConfig.connectAccountId;
    if (!connectAccountId || !stripeConfig.chargesEnabled) {
        throw new https_1.HttpsError('failed-precondition', 'La barbería no ha completado la conexión con Stripe todavía.');
    }
    const amount = Math.round(order.totalAmount * 100); // céntimos
    if (!amount || amount <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Importe del pedido inválido.');
    }
    const stripe = getStripe();
    // Comisión de plataforma (0 = todo el importe va a la barbería). Ajustar
    // aquí si en el futuro BarberFlow cobra un % por venta.
    const PLATFORM_FEE_PERCENT = 0;
    const applicationFeeAmount = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
    // Reutilizar el PaymentIntent si ya existe uno abierto para este pedido
    // (evita crear cargos duplicados si el cliente reintenta)
    const existingId = order.stripePaymentIntentId;
    if (existingId) {
        const existing = await stripe.paymentIntents.retrieve(existingId);
        if (existing.status !== 'succeeded' && existing.status !== 'canceled') {
            // Actualizamos el importe por si el pedido cambió (gift card, etc.)
            const updated = await stripe.paymentIntents.update(existingId, { amount });
            return { clientSecret: updated.client_secret, paymentIntentId: updated.id };
        }
    }
    const paymentIntent = await stripe.paymentIntents.create(Object.assign(Object.assign({ amount, currency: 'eur', payment_method_types: ['card', 'bizum'], 
        // Destination charge: el cargo se crea en la cuenta de la plataforma
        // pero los fondos (menos la comisión, si la hay) se transfieren
        // automáticamente a la cuenta Stripe Connect de la barbería.
        transfer_data: { destination: connectAccountId } }, (applicationFeeAmount > 0 ? { application_fee_amount: applicationFeeAmount } : {})), { metadata: {
            orderId,
            barbershopId: order.barbershopId,
            clientId: order.clientId,
        }, description: `BarberFlow · Pedido ${orderId.slice(-8).toUpperCase()}` }));
    await orderRef.update({
        stripePaymentIntentId: paymentIntent.id,
        paymentStatus: 'processing',
    });
    return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
});
/**
 * Webhook de Stripe. Es la ÚNICA fuente de verdad sobre si un pago se ha
 * cobrado de verdad — el cliente NUNCA puede marcar un pedido como pagado
 * por sí mismo para los pagos con Stripe.
 *
 * Configurar en el Dashboard de Stripe: URL de esta función,
 * eventos: payment_intent.succeeded, payment_intent.payment_failed
 */
exports.stripeWebhook = (0, https_1.onRequest)({ region: REGION, secrets: SECRETS }, async (req, res) => {
    var _a, _b, _c;
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !webhookSecret) {
        res.status(400).send('Missing signature or webhook secret');
        return;
    }
    let event;
    try {
        const stripe = getStripe();
        // req.rawBody está disponible en Cloud Functions gen2 (Express bajo el capó)
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
        console.error('[stripeWebhook] Signature verification failed:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    try {
        if (event.type === 'payment_intent.succeeded') {
            const pi = event.data.object;
            const orderId = (_a = pi.metadata) === null || _a === void 0 ? void 0 : _a.orderId;
            if (orderId) {
                await db.collection('orders').doc(orderId).update({
                    paymentStatus: 'paid',
                    paidAt: admin.firestore.Timestamp.now(),
                });
                console.log(`[stripeWebhook] Order ${orderId} marked as paid`);
            }
        }
        else if (event.type === 'payment_intent.payment_failed') {
            const pi = event.data.object;
            const orderId = (_b = pi.metadata) === null || _b === void 0 ? void 0 : _b.orderId;
            if (orderId) {
                await db.collection('orders').doc(orderId).update({
                    paymentStatus: 'failed',
                });
            }
        }
        else if (event.type === 'account.updated') {
            // Cuenta Stripe Connect de una barbería completó (o cambió) su
            // verificación — sincronizamos chargesEnabled en Firestore.
            const account = event.data.object;
            const barbershopId = (_c = account.metadata) === null || _c === void 0 ? void 0 : _c.barbershopId;
            if (barbershopId) {
                await db.collection('barbershops').doc(barbershopId).set({
                    paymentMethods: {
                        stripe: { chargesEnabled: !!account.charges_enabled },
                    },
                }, { merge: true });
                console.log(`[stripeWebhook] Barbershop ${barbershopId} chargesEnabled=${account.charges_enabled}`);
            }
        }
        res.status(200).json({ received: true });
    }
    catch (err) {
        console.error('[stripeWebhook] Error processing event:', err.message);
        res.status(500).send('Internal error');
    }
});
//# sourceMappingURL=stripePayments.js.map