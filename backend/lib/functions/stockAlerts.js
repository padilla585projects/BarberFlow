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
exports.onProductStockRestored = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const push_1 = require("../utils/push");
const notificationStore_1 = require("../utils/notificationStore");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const REGION = 'europe-west1';
/**
 * Se dispara cuando un producto se actualiza.
 * Si el stock pasa de 0 a > 0, notifica a todos los usuarios
 * que habían solicitado aviso y elimina las alertas.
 */
exports.onProductStockRestored = (0, firestore_1.onDocumentUpdated)({ document: 'products/{productId}', region: REGION }, async (event) => {
    var _a, _b, _c;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    // Solo actuar cuando se recupera stock (0 → >0)
    if (before.stock !== 0 || after.stock <= 0)
        return;
    const productId = event.params.productId;
    const productName = (_c = after.name) !== null && _c !== void 0 ? _c : 'Producto';
    // Buscar alertas activas para este producto
    const alertsSnap = await db
        .collection('stockAlerts')
        .where('productId', '==', productId)
        .get();
    if (alertsSnap.empty)
        return;
    console.log(`[stockAlerts] ${alertsSnap.size} alertas para ${productName} (${productId})`);
    const batch = db.batch();
    const notifications = [];
    for (const alertDoc of alertsSnap.docs) {
        const { userId } = alertDoc.data();
        // Eliminar la alerta (ya notificamos)
        batch.delete(alertDoc.ref);
        // Push + in-app al usuario
        notifications.push((async () => {
            var _a;
            try {
                const userSnap = await db.collection('users').doc(userId).get();
                const pushToken = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.expoPushToken;
                if (pushToken) {
                    await (0, push_1.sendPushNotification)(pushToken, '📦 ¡Producto disponible!', `${productName} volvió a estar en stock. ¡Cómpralo antes de que se agote!`, { productId, screen: 'ProductDetail' }, userId, 'promotions');
                }
                await (0, notificationStore_1.storeNotification)(userId, {
                    title: '📦 ¡Producto disponible!',
                    body: `${productName} volvió a estar en stock. ¡Cómpralo antes de que se agote!`,
                    type: 'system',
                    data: { productId },
                });
            }
            catch (e) {
                console.error(`[stockAlerts] Error notificando a ${userId}:`, e);
            }
        })());
    }
    await Promise.all([batch.commit(), ...notifications]);
    console.log(`[stockAlerts] Notificaciones enviadas y alertas eliminadas para ${productName}`);
});
//# sourceMappingURL=stockAlerts.js.map