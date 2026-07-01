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
exports.onReviewCreatedPush = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const push_1 = require("../utils/push");
const notificationStore_1 = require("../utils/notificationStore");
if (!admin.apps.length)
    admin.initializeApp();
const REGION = 'europe-west1';
// New review → update rating aggregates + notify barber
exports.onReviewCreatedPush = (0, firestore_1.onDocumentCreated)({ document: 'barbershops/{barbershopId}/reviews/{reviewId}', region: REGION }, async (event) => {
    var _a, _b;
    const review = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!review)
        return;
    const rating = review.rating;
    const barbershopId = event.params.barbershopId;
    // Update barbershop rating aggregates (using admin SDK — bypasses security rules)
    await admin.firestore().doc(`barbershops/${barbershopId}`).update({
        totalRatings: admin.firestore.FieldValue.increment(1),
        ratingSum: admin.firestore.FieldValue.increment(rating),
    });
    const barberId = review.barberId;
    if (!barberId)
        return;
    const token = await (0, push_1.getExpoPushToken)(barberId);
    const clientName = review.clientName || 'Un cliente';
    const stars = '⭐'.repeat(rating);
    const barberTitle = 'Nueva reseña';
    const barberBody = `${clientName} te ha dejado una reseña ${stars}`;
    const pushData = { barbershopId, reviewId: event.params.reviewId, type: 'new_review' };
    if (token) {
        await (0, push_1.sendPushNotification)(token, barberTitle, barberBody, pushData);
    }
    await (0, notificationStore_1.storeNotification)(barberId, { title: barberTitle, body: barberBody, type: 'review', data: pushData });
    // Also notify the shop owner
    const shopSnap = await admin.firestore().collection('barbershops').doc(event.params.barbershopId).get();
    const ownerId = (_b = shopSnap.data()) === null || _b === void 0 ? void 0 : _b.ownerId;
    if (ownerId && ownerId !== barberId) {
        const ownerToken = await (0, push_1.getExpoPushToken)(ownerId);
        const ownerTitle = 'Nueva reseña en tu barbería';
        const ownerBody = `${clientName} ha dejado una reseña de ${rating} estrellas`;
        if (ownerToken) {
            await (0, push_1.sendPushNotification)(ownerToken, ownerTitle, ownerBody, pushData);
        }
        await (0, notificationStore_1.storeNotification)(ownerId, { title: ownerTitle, body: ownerBody, type: 'review', data: pushData });
    }
});
//# sourceMappingURL=reviews.js.map