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
exports.onAppointmentStatusChangedPush = exports.onAppointmentCreatedPush = exports.onOrderStatusChangedPush = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const push_1 = require("../utils/push");
const notificationStore_1 = require("../utils/notificationStore");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const REGION = 'europe-west1';
function fmtTime(ts) {
    return ts.toDate().toLocaleDateString('es-ES', {
        weekday: 'short', day: 'numeric', month: 'short',
    });
}
async function getOwnerId(barbershopId) {
    var _a, _b;
    if (!barbershopId)
        return null;
    const snap = await db.collection('barbershops').doc(barbershopId).get();
    return (_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.ownerId) !== null && _b !== void 0 ? _b : null;
}
/** Send push + store in-app notification for a user (skips if no token). */
async function notifyUser(uid, title, body, pushData) {
    // Walk-in appointments carry no client account.
    if (!uid)
        return;
    const token = await (0, push_1.getExpoPushToken)(uid);
    if (token) {
        await (0, push_1.sendPushNotification)(token, title, body, pushData);
    }
    await (0, notificationStore_1.storeNotification)(uid, { title, body, type: 'appointment', data: pushData });
}
// ── Order status change → notify client ──────────────────────────────────
const ORDER_STATUS_MSG = {
    processing: {
        title: '📦 Pedido en preparación',
        body: (shop) => `${shop} está preparando tu pedido`,
    },
    shipped: {
        title: '🚚 Pedido enviado',
        body: (shop) => `Tu pedido de ${shop} está en camino`,
    },
    delivered: {
        title: '✅ Pedido entregado',
        body: (shop) => `Tu pedido de ${shop} ha sido entregado`,
    },
    cancelled: {
        title: '❌ Pedido cancelado',
        body: (shop) => `Tu pedido de ${shop} ha sido cancelado`,
    },
};
exports.onOrderStatusChangedPush = (0, firestore_1.onDocumentUpdated)({ document: 'orders/{orderId}', region: REGION }, async (event) => {
    var _a, _b;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (before.status === after.status)
        return;
    const newStatus = after.status;
    const clientId = after.clientId;
    const shopName = after.barbershopName || 'la barbería';
    const template = ORDER_STATUS_MSG[newStatus];
    if (!template)
        return; // no notificamos estados intermedios sin mensaje definido
    const title = template.title;
    const body = template.body(shopName);
    const pushData = { orderId: event.params.orderId, type: 'order_status_changed', status: newStatus };
    const token = await (0, push_1.getExpoPushToken)(clientId);
    if (token) {
        await (0, push_1.sendPushNotification)(token, title, body, pushData);
    }
    await (0, notificationStore_1.storeNotification)(clientId, { title, body, type: 'order', data: pushData });
});
// New appointment → notify barber AND owner
exports.onAppointmentCreatedPush = (0, firestore_1.onDocumentCreated)({ document: 'appointments/{appointmentId}', region: REGION }, async (event) => {
    var _a;
    const apt = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!apt)
        return;
    // The barber created this one by hand, standing next to the customer.
    if (apt.isWalkIn)
        return;
    const barberId = apt.barberId;
    const barbershopId = apt.barbershopId;
    const clientName = apt.clientName || 'Un cliente';
    const timeSlot = apt.timeSlot;
    const date = fmtTime(apt.date);
    const title = 'Nueva cita';
    const body = `${clientName} ha reservado para ${date} a las ${timeSlot}`;
    const pushData = { appointmentId: event.params.appointmentId, type: 'new_appointment' };
    // Notify assigned barber
    if (barberId) {
        await notifyUser(barberId, title, body, pushData);
    }
    // Notify barbershop owner (skip if owner is the same as the barber)
    if (barbershopId) {
        const ownerId = await getOwnerId(barbershopId);
        if (ownerId && ownerId !== barberId) {
            await notifyUser(ownerId, title, body, pushData);
        }
    }
});
// Status change → notify relevant parties (client, barber, AND owner)
exports.onAppointmentStatusChangedPush = (0, firestore_1.onDocumentUpdated)({ document: 'appointments/{appointmentId}', region: REGION }, async (event) => {
    var _a, _b;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (before.status === after.status)
        return;
    const newStatus = after.status;
    const clientId = after.clientId;
    const barberId = after.barberId;
    const barbershopId = after.barbershopId;
    const barbershopName = after.barbershopName || 'tu barbería';
    const timeSlot = after.timeSlot;
    const date = fmtTime(after.date);
    const clientName = after.clientName || 'Un cliente';
    const ownerId = barbershopId ? await getOwnerId(barbershopId) : null;
    if (newStatus === 'confirmed') {
        // Barber/owner confirmed → notify client
        const title = 'Cita confirmada';
        const body = `Tu cita en ${barbershopName} el ${date} a las ${timeSlot} ha sido confirmada`;
        const pushData = { appointmentId: event.params.appointmentId, type: 'appointment_confirmed' };
        await notifyUser(clientId, title, body, pushData);
        // Also notify the owner (if owner didn't do the confirmation themselves)
        if (ownerId && ownerId !== barberId) {
            const ownerTitle = 'Cita confirmada';
            const ownerBody = `La cita de ${clientName} el ${date} a las ${timeSlot} ha sido confirmada`;
            await notifyUser(ownerId, ownerTitle, ownerBody, pushData);
        }
    }
    else if (newStatus === 'cancelled') {
        // Notify barber
        if (barberId) {
            const barberTitle = 'Cita cancelada';
            const barberBody = `${clientName} ha cancelado la cita del ${date} a las ${timeSlot}`;
            const barberPushData = { appointmentId: event.params.appointmentId, type: 'appointment_cancelled' };
            await notifyUser(barberId, barberTitle, barberBody, barberPushData);
        }
        // Notify client
        const clientTitle = 'Cita cancelada';
        const clientBody = `Tu cita en ${barbershopName} el ${date} a las ${timeSlot} ha sido cancelada`;
        const clientPushData = { appointmentId: event.params.appointmentId, type: 'appointment_cancelled' };
        await notifyUser(clientId, clientTitle, clientBody, clientPushData);
        // Notify owner (if different from barber)
        if (ownerId && ownerId !== barberId) {
            const ownerTitle = 'Cita cancelada';
            const ownerBody = `${clientName} ha cancelado la cita del ${date} a las ${timeSlot}`;
            const ownerPushData = { appointmentId: event.params.appointmentId, type: 'appointment_cancelled' };
            await notifyUser(ownerId, ownerTitle, ownerBody, ownerPushData);
        }
    }
    else if (newStatus === 'completed') {
        // Notify client
        const title = 'Cita completada';
        const body = `Tu cita en ${barbershopName} ha sido marcada como completada. ¡Gracias!`;
        const pushData = { appointmentId: event.params.appointmentId, type: 'appointment_completed' };
        await notifyUser(clientId, title, body, pushData);
        // Notify owner (if different from barber)
        if (ownerId && ownerId !== barberId) {
            const ownerTitle = 'Cita completada';
            const ownerBody = `La cita de ${clientName} el ${date} a las ${timeSlot} ha sido completada`;
            await notifyUser(ownerId, ownerTitle, ownerBody, pushData);
        }
    }
});
//# sourceMappingURL=push.js.map