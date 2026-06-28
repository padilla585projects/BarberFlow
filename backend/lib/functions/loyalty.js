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
exports.onAppointmentCompletedLoyalty = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const push_1 = require("../utils/push");
if (!admin.apps.length)
    admin.initializeApp();
const REGION = 'europe-west1';
const db = admin.firestore();
exports.onAppointmentCompletedLoyalty = (0, firestore_1.onDocumentUpdated)({ document: 'appointments/{appointmentId}', region: REGION }, async (event) => {
    var _a, _b;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    // Only fire on the transition to 'completed'
    if (before.status === 'completed' || after.status !== 'completed')
        return;
    // Skip if points were already awarded (idempotency guard)
    if (after.loyaltyPointsAwarded)
        return;
    const appointmentId = event.params.appointmentId;
    const barbershopId = after.barbershopId;
    const clientId = after.clientId;
    const totalPrice = after.totalPrice;
    if (!barbershopId || !clientId || !totalPrice)
        return;
    // Fetch the barbershop's loyalty config
    const shopSnap = await db.collection('barbershops').doc(barbershopId).get();
    const shopData = shopSnap.data();
    if (!shopData)
        return;
    const loyaltyConfig = shopData.loyaltyConfig;
    if (!(loyaltyConfig === null || loyaltyConfig === void 0 ? void 0 : loyaltyConfig.enabled) || !loyaltyConfig.pointsPerEuro)
        return;
    const points = Math.floor(totalPrice * loyaltyConfig.pointsPerEuro);
    if (points <= 0)
        return;
    const batch = db.batch();
    // Increment the client's loyalty points
    const userRef = db.collection('users').doc(clientId);
    batch.update(userRef, {
        loyaltyPoints: admin.firestore.FieldValue.increment(points),
    });
    // Create a points history entry
    const historyRef = userRef.collection('pointsHistory').doc();
    batch.set(historyRef, {
        type: 'earned',
        points,
        description: 'Cita completada',
        date: admin.firestore.FieldValue.serverTimestamp(),
        appointmentId,
    });
    // Mark the appointment so points aren't awarded twice
    const aptRef = db.collection('appointments').doc(appointmentId);
    batch.update(aptRef, { loyaltyPointsAwarded: true });
    await batch.commit();
    // Send push notification to the client
    const token = await (0, push_1.getExpoPushToken)(clientId);
    if (token) {
        await (0, push_1.sendPushNotification)(token, 'Puntos de fidelidad', `🎉 Has ganado ${points} puntos de fidelidad`, { appointmentId, type: 'loyalty_points_earned' });
    }
});
//# sourceMappingURL=loyalty.js.map