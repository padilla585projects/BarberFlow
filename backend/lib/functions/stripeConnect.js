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
exports.checkStripeConnectStatus = exports.createConnectAccountLink = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const REGION = 'europe-west1';
const SECRETS = ['STRIPE_SECRET_KEY'];
// URL de retorno tras completar/abandonar el onboarding de Stripe.
// Página estática simple en el hosting web-admin ya existente.
const RETURN_BASE_URL = 'https://barberflow-2026.web.app/stripe-connect';
function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key)
        throw new Error('STRIPE_SECRET_KEY secret is not set');
    return new stripe_1.default(key, { typescript: true });
}
async function assertOwner(barbershopId, uid) {
    const snap = await db.collection('barbershops').doc(barbershopId).get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Barbería no encontrada.');
    const data = snap.data();
    if (data.ownerId !== uid) {
        throw new https_1.HttpsError('permission-denied', 'No eres el dueño de esta barbería.');
    }
    return data;
}
/**
 * Crea (si no existe) una cuenta Stripe Express para la barbería y devuelve
 * un Account Link de onboarding. El dueño abre esa URL en el navegador,
 * completa el registro/KYC directamente con Stripe, y el dinero de las
 * compras de sus clientes entrará en ESA cuenta (no en la de BarberFlow).
 */
exports.createConnectAccountLink = (0, https_1.onCall)({ region: REGION, secrets: SECRETS }, async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }
    const { barbershopId } = request.data;
    if (!barbershopId)
        throw new https_1.HttpsError('invalid-argument', 'Falta barbershopId.');
    const barbershop = await assertOwner(barbershopId, request.auth.uid);
    const stripe = getStripe();
    let accountId = (_b = (_a = barbershop.paymentMethods) === null || _a === void 0 ? void 0 : _a.stripe) === null || _b === void 0 ? void 0 : _b.connectAccountId;
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
        });
        accountId = account.id;
        await db.collection('barbershops').doc(barbershopId).set({
            paymentMethods: {
                stripe: {
                    connectAccountId: accountId,
                    chargesEnabled: false,
                    enabled: false,
                },
            },
        }, { merge: true });
    }
    const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${RETURN_BASE_URL}/refresh`,
        return_url: `${RETURN_BASE_URL}/done`,
        type: 'account_onboarding',
    });
    return { url: accountLink.url, accountId };
});
/**
 * Consulta directamente a Stripe el estado de la cuenta conectada y
 * sincroniza Firestore. Sirve de respaldo por si el webhook account.updated
 * no está configurado todavía o no ha llegado aún.
 */
exports.checkStripeConnectStatus = (0, https_1.onCall)({ region: REGION, secrets: SECRETS }, async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }
    const { barbershopId } = request.data;
    if (!barbershopId)
        throw new https_1.HttpsError('invalid-argument', 'Falta barbershopId.');
    const barbershop = await assertOwner(barbershopId, request.auth.uid);
    const accountId = (_b = (_a = barbershop.paymentMethods) === null || _a === void 0 ? void 0 : _a.stripe) === null || _b === void 0 ? void 0 : _b.connectAccountId;
    if (!accountId) {
        return { connected: false, chargesEnabled: false };
    }
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    await db.collection('barbershops').doc(barbershopId).set({
        paymentMethods: {
            stripe: {
                chargesEnabled: !!account.charges_enabled,
            },
        },
    }, { merge: true });
    return { connected: true, chargesEnabled: !!account.charges_enabled };
});
//# sourceMappingURL=stripeConnect.js.map