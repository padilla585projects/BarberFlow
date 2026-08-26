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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePayPalEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length)
    admin.initializeApp();
const REGION = 'europe-west1';
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
exports.validatePayPalEmail = (0, https_1.onCall)({ region: REGION }, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }
    const { barbershopId, email } = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    if (!barbershopId || !email) {
        throw new https_1.HttpsError('invalid-argument', 'Falta la barbería o el email.');
    }
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        throw new https_1.HttpsError('invalid-argument', 'El email no tiene un formato válido.');
    }
    const db = admin.firestore();
    const shopSnap = await db.collection('barbershops').doc(barbershopId).get();
    if (!shopSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Barbería no encontrada.');
    }
    if (shopSnap.data().ownerId !== request.auth.uid) {
        throw new https_1.HttpsError('permission-denied', 'No eres el dueño de esta barbería.');
    }
    await db.collection('barbershops').doc(barbershopId).update({
        'paymentMethods.paypal': {
            enabled: true,
            email: trimmed,
            lastValidated: admin.firestore.Timestamp.now(),
        },
    });
    return { valid: true, message: 'Email de PayPal guardado.' };
});
//# sourceMappingURL=validatePaymentMethods.js.map