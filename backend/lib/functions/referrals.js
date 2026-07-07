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
exports.onReferralUserCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const push_1 = require("../utils/push");
const notificationStore_1 = require("../utils/notificationStore");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const REGION = 'europe-west1';
exports.onReferralUserCreated = (0, firestore_1.onDocumentCreated)({ document: 'users/{uid}', region: REGION }, async (event) => {
    var _a;
    const userData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!(userData === null || userData === void 0 ? void 0 : userData.referredBy))
        return;
    const newUserId = event.params.uid;
    const referrerId = userData.referredBy;
    const newUserName = userData.displayName || 'Un amigo';
    // Evitar auto-referido
    if (referrerId === newUserId)
        return;
    // Verificar que el referidor existe
    const referrerSnap = await db.doc(`users/${referrerId}`).get();
    if (!referrerSnap.exists)
        return;
    const batch = db.batch();
    // +50 puntos al referidor + incrementar contador
    batch.update(db.doc(`users/${referrerId}`), {
        loyaltyPoints: admin.firestore.FieldValue.increment(50),
        referralCount: admin.firestore.FieldValue.increment(1),
    });
    // +25 puntos de bienvenida al nuevo usuario
    batch.update(db.doc(`users/${newUserId}`), {
        loyaltyPoints: admin.firestore.FieldValue.increment(25),
    });
    // Registro de referido
    batch.set(db.collection('referrals').doc(), {
        referrerId,
        referredId: newUserId,
        referredName: newUserName,
        pointsReferrer: 50,
        pointsReferred: 25,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    // Push + in-app al referidor
    try {
        const pushToken = await (0, push_1.getExpoPushToken)(referrerId);
        if (pushToken) {
            await (0, push_1.sendPushNotification)(pushToken, '🎉 ¡Tienes un referido!', `${newUserName} se ha unido con tu código. +50 puntos de regalo.`, {});
        }
        await (0, notificationStore_1.storeNotification)(referrerId, {
            title: '🎉 ¡Tienes un referido!',
            body: `${newUserName} se ha unido con tu código. +50 puntos de regalo.`,
            type: 'system',
            data: {},
        });
    }
    catch (e) {
        console.error('[onReferralUserCreated] notification error:', e);
    }
});
//# sourceMappingURL=referrals.js.map