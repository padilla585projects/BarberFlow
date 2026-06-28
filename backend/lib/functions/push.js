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
exports.onAppointmentStatusChangedPush = exports.onAppointmentCreatedPush = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const push_1 = require("../utils/push");
if (!admin.apps.length)
    admin.initializeApp();
const REGION = 'europe-west1';
function fmtTime(ts) {
    return ts.toDate().toLocaleDateString('es-ES', {
        weekday: 'short', day: 'numeric', month: 'short',
    });
}
// New appointment → notify barber
exports.onAppointmentCreatedPush = (0, firestore_1.onDocumentCreated)({ document: 'appointments/{appointmentId}', region: REGION }, async (event) => {
    var _a;
    const apt = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!apt)
        return;
    const barberId = apt.barberId;
    if (!barberId)
        return;
    const token = await (0, push_1.getExpoPushToken)(barberId);
    if (!token)
        return;
    const clientName = apt.clientName || 'Un cliente';
    const timeSlot = apt.timeSlot;
    const date = fmtTime(apt.date);
    await (0, push_1.sendPushNotification)(token, 'Nueva cita', `${clientName} ha reservado para ${date} a las ${timeSlot}`, { appointmentId: event.params.appointmentId, type: 'new_appointment' });
});
// Status change → notify relevant party
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
    const barbershopName = after.barbershopName || 'tu barbería';
    const timeSlot = after.timeSlot;
    const date = fmtTime(after.date);
    if (newStatus === 'confirmed') {
        // Barber confirmed → notify client
        const token = await (0, push_1.getExpoPushToken)(clientId);
        if (token) {
            await (0, push_1.sendPushNotification)(token, 'Cita confirmada', `Tu cita en ${barbershopName} el ${date} a las ${timeSlot} ha sido confirmada`, { appointmentId: event.params.appointmentId, type: 'appointment_confirmed' });
        }
    }
    else if (newStatus === 'cancelled') {
        // Could be cancelled by client or barber — notify the other party
        // We notify both: the barber if client cancelled, the client if barber cancelled
        if (barberId) {
            const barberToken = await (0, push_1.getExpoPushToken)(barberId);
            if (barberToken) {
                const clientName = after.clientName || 'Un cliente';
                await (0, push_1.sendPushNotification)(barberToken, 'Cita cancelada', `${clientName} ha cancelado la cita del ${date} a las ${timeSlot}`, { appointmentId: event.params.appointmentId, type: 'appointment_cancelled' });
            }
        }
        const clientToken = await (0, push_1.getExpoPushToken)(clientId);
        if (clientToken) {
            await (0, push_1.sendPushNotification)(clientToken, 'Cita cancelada', `Tu cita en ${barbershopName} el ${date} a las ${timeSlot} ha sido cancelada`, { appointmentId: event.params.appointmentId, type: 'appointment_cancelled' });
        }
    }
    else if (newStatus === 'completed') {
        // Notify client that the appointment is marked as completed
        const token = await (0, push_1.getExpoPushToken)(clientId);
        if (token) {
            await (0, push_1.sendPushNotification)(token, 'Cita completada', `Tu cita en ${barbershopName} ha sido marcada como completada. ¡Gracias!`, { appointmentId: event.params.appointmentId, type: 'appointment_completed' });
        }
    }
});
//# sourceMappingURL=push.js.map