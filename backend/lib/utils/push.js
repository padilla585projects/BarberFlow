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
exports.getExpoPushToken = getExpoPushToken;
exports.sendPushNotification = sendPushNotification;
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
async function getExpoPushToken(uid) {
    var _a, _b;
    // Walk-in appointments carry no client account, so uid can legitimately be
    // null here. doc(null) throws, so bail out before touching Firestore.
    if (!uid)
        return null;
    const snap = await db.collection('users').doc(uid).get();
    return (_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.expoPushToken) !== null && _b !== void 0 ? _b : null;
}
async function sendPushNotification(token, title, body, data, uid, notificationType) {
    var _a;
    // If uid and notificationType provided, check user preferences
    if (uid && notificationType) {
        const userSnap = await db.collection('users').doc(uid).get();
        const prefs = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.notificationPreferences;
        if (prefs && prefs[notificationType] === false) {
            console.log(`[Push] Skipped: user ${uid} has ${notificationType} disabled`);
            return;
        }
    }
    const message = {
        to: token,
        title,
        body,
        sound: 'default',
        data,
    };
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
    });
    if (!res.ok) {
        console.error('[Push] Failed:', await res.text());
    }
}
//# sourceMappingURL=push.js.map