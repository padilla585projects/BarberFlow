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
exports.sendAppointmentReminders = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const push_1 = require("../utils/push");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const REGION = 'europe-west1';
/**
 * Scheduled function that runs every hour and sends push notification
 * reminders ~24 hours before each appointment.
 *
 * Window: appointments whose `date` falls between 23 and 25 hours from now.
 * Only appointments with status 'pending' or 'confirmed' are considered.
 * Each appointment is marked with `reminderSent: true` after notification
 * so duplicates are avoided.
 */
exports.sendAppointmentReminders = (0, scheduler_1.onSchedule)({
    schedule: 'every 1 hours',
    region: REGION,
    timeoutSeconds: 120,
}, async () => {
    const now = Date.now();
    const from = new Date(now + 23 * 60 * 60 * 1000); // 23 h from now
    const to = new Date(now + 25 * 60 * 60 * 1000); // 25 h from now
    const fromTs = admin.firestore.Timestamp.fromDate(from);
    const toTs = admin.firestore.Timestamp.fromDate(to);
    const snap = await db
        .collection('appointments')
        .where('date', '>=', fromTs)
        .where('date', '<=', toTs)
        .where('status', 'in', ['pending', 'confirmed'])
        .get();
    if (snap.empty) {
        console.log('[Reminders] No appointments in the 24h window.');
        return;
    }
    console.log(`[Reminders] Found ${snap.size} appointment(s) to check.`);
    for (const doc of snap.docs) {
        try {
            const apt = doc.data();
            // Skip if reminder already sent
            if (apt.reminderSent === true)
                continue;
            const clientId = apt.clientId;
            const barberId = apt.barberId;
            const clientName = apt.clientName || 'Un cliente';
            const barberName = apt.barberName || 'tu barbero';
            const timeSlot = apt.timeSlot;
            // Notify client
            const clientToken = await (0, push_1.getExpoPushToken)(clientId);
            if (clientToken) {
                await (0, push_1.sendPushNotification)(clientToken, 'Recordatorio de cita', `Recordatorio: Tu cita es mañana a las ${timeSlot} con ${barberName}`, { appointmentId: doc.id, type: 'appointment_reminder' });
            }
            // Notify barber
            if (barberId) {
                const barberToken = await (0, push_1.getExpoPushToken)(barberId);
                if (barberToken) {
                    await (0, push_1.sendPushNotification)(barberToken, 'Recordatorio de cita', `Recordatorio: Tienes una cita mañana a las ${timeSlot} con ${clientName}`, { appointmentId: doc.id, type: 'appointment_reminder' });
                }
            }
            // Mark reminder as sent
            await doc.ref.update({ reminderSent: true });
            console.log(`[Reminders] Sent reminder for appointment ${doc.id}`);
        }
        catch (err) {
            console.error(`[Reminders] Error processing appointment ${doc.id}:`, err);
            // Continue with next appointment — don't let one failure stop the batch
        }
    }
});
//# sourceMappingURL=reminders.js.map