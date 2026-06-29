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
exports.sendDailySummary = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const push_1 = require("../utils/push");
const notificationStore_1 = require("../utils/notificationStore");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const REGION = 'europe-west1';
/**
 * Scheduled function that runs daily at 21:00 Europe/Madrid and sends
 * each barbershop owner a push notification summarising the day's activity:
 * total appointments (completed / cancelled), appointment revenue,
 * POS sales count and revenue.
 */
exports.sendDailySummary = (0, scheduler_1.onSchedule)({
    schedule: '0 21 * * *',
    timeZone: 'Europe/Madrid',
    region: REGION,
}, async () => {
    // Get today's date range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const startTs = admin.firestore.Timestamp.fromDate(startOfDay);
    const endTs = admin.firestore.Timestamp.fromDate(endOfDay);
    // Get all barbershops
    const shopsSnap = await db.collection('barbershops').get();
    for (const shopDoc of shopsSnap.docs) {
        const shopData = shopDoc.data();
        const ownerId = shopData.ownerId;
        if (!ownerId)
            continue;
        const token = await (0, push_1.getExpoPushToken)(ownerId);
        if (!token)
            continue;
        try {
            // Count today's appointments
            const aptsSnap = await db
                .collection('appointments')
                .where('barbershopId', '==', shopDoc.id)
                .where('date', '>=', startTs)
                .where('date', '<', endTs)
                .get();
            const totalAppointments = aptsSnap.size;
            const completed = aptsSnap.docs.filter(d => d.data().status === 'completed').length;
            const cancelled = aptsSnap.docs.filter(d => d.data().status === 'cancelled').length;
            // Calculate revenue from completed appointments
            const completedDocs = aptsSnap.docs.filter(d => d.data().status === 'completed');
            const appointmentRevenue = completedDocs
                .reduce((sum, d) => sum + (d.data().totalPrice || 0), 0);
            // Calculate tips from completed appointments
            const tips = completedDocs
                .reduce((sum, d) => sum + (d.data().tipAmount || 0), 0);
            // Count today's POS sales
            const salesSnap = await db
                .collection('sales')
                .where('barbershopId', '==', shopDoc.id)
                .where('date', '>=', startTs)
                .where('date', '<', endTs)
                .get();
            const salesRevenue = salesSnap.docs.reduce((sum, d) => sum + (d.data().totalAmount || 0), 0);
            const totalRevenue = appointmentRevenue + salesRevenue + tips;
            // Build the message
            const shopName = shopData.name || 'Tu barbería';
            let body = `📊 ${shopName} hoy:\n`;
            body += `✂️ ${totalAppointments} citas`;
            if (completed > 0)
                body += ` (${completed} completadas)`;
            if (cancelled > 0)
                body += ` · ${cancelled} canceladas`;
            body += `\n💰 ${totalRevenue.toFixed(2)}€ facturado`;
            if (tips > 0)
                body += `\n💵 ${tips.toFixed(2)}€ en propinas`;
            if (salesSnap.size > 0)
                body += `\n🛒 ${salesSnap.size} ventas POS (${salesRevenue.toFixed(2)}€)`;
            const title = 'Resumen del día';
            const pushData = { barbershopId: shopDoc.id, type: 'daily_summary' };
            await (0, push_1.sendPushNotification)(token, title, body, pushData);
            await (0, notificationStore_1.storeNotification)(ownerId, { title, body, type: 'summary', data: pushData });
            console.log(`[DailySummary] Sent summary for shop ${shopDoc.id}`);
        }
        catch (err) {
            console.error(`[DailySummary] Error for shop ${shopDoc.id}:`, err);
            // Continue with next shop — don't let one failure stop the batch
        }
    }
});
//# sourceMappingURL=dailySummary.js.map