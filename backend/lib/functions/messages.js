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
exports.onMessageCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const push_1 = require("../utils/push");
if (!admin.apps.length)
    admin.initializeApp();
const REGION = 'europe-west1';
/**
 * When a new message is created in barbershops/{shopId}/messages/{msgId},
 * send push notifications to the appropriate recipients.
 */
exports.onMessageCreated = (0, firestore_1.onDocumentCreated)({ document: 'barbershops/{shopId}/messages/{msgId}', region: REGION }, async (event) => {
    var _a, _b, _c, _d;
    const message = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!message)
        return;
    const senderRole = message.senderRole;
    const senderName = message.senderName || 'Alguien';
    const text = message.text || '';
    const recipientId = message.recipientId;
    const shopId = event.params.shopId;
    const preview = text.length > 80 ? text.slice(0, 80) + '...' : text;
    const pushData = { type: 'new_message', barbershopId: shopId };
    if (senderRole === 'owner') {
        if (recipientId === 'all') {
            // Broadcast: notify all barbers
            const shopSnap = await admin.firestore().collection('barbershops').doc(shopId).get();
            const barberUids = (_c = (_b = shopSnap.data()) === null || _b === void 0 ? void 0 : _b.barbers) !== null && _c !== void 0 ? _c : [];
            const promises = barberUids.map(async (uid) => {
                const token = await (0, push_1.getExpoPushToken)(uid);
                if (token) {
                    await (0, push_1.sendPushNotification)(token, `${senderName} (a todos)`, preview, pushData);
                }
            });
            await Promise.all(promises);
        }
        else {
            // Direct message to specific barber
            const token = await (0, push_1.getExpoPushToken)(recipientId);
            if (token) {
                await (0, push_1.sendPushNotification)(token, `Mensaje de ${senderName}`, preview, pushData);
            }
        }
    }
    else if (senderRole === 'barber') {
        // Barber sent message: notify the owner
        const shopSnap = await admin.firestore().collection('barbershops').doc(shopId).get();
        const ownerId = (_d = shopSnap.data()) === null || _d === void 0 ? void 0 : _d.ownerId;
        if (ownerId) {
            const token = await (0, push_1.getExpoPushToken)(ownerId);
            if (token) {
                await (0, push_1.sendPushNotification)(token, `Mensaje de ${senderName}`, preview, pushData);
            }
        }
    }
});
//# sourceMappingURL=messages.js.map