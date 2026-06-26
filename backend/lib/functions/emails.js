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
exports.onAppointmentStatusChanged = exports.onAppointmentCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const email_1 = require("../utils/email");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const REGION = 'europe-west1';
const SECRETS = ['RESEND_API_KEY'];
// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getUser(uid) {
    const snap = await db.collection('users').doc(uid).get();
    return snap.exists ? snap.data() : null;
}
async function getBarbershopName(id) {
    var _a, _b;
    const snap = await db.collection('barbershops').doc(id).get();
    return snap.exists ? ((_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'BarberFlow') : 'BarberFlow';
}
function fmtDate(ts) {
    return ts.toDate().toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}
// ─── onCreate: nueva cita → email de confirmación ────────────────────────────
exports.onAppointmentCreated = (0, firestore_1.onDocumentCreated)({ document: 'appointments/{appointmentId}', region: REGION, secrets: SECRETS }, async (event) => {
    var _a, _b;
    const apt = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!apt)
        return;
    const [client, barber, barbershopName] = await Promise.all([
        getUser(apt.clientId),
        getUser(apt.barberId),
        getBarbershopName(apt.barbershopId),
    ]);
    if (!(client === null || client === void 0 ? void 0 : client.email))
        return;
    const html = (0, email_1.tplAppointmentConfirmed)({
        clientName: client.displayName,
        barberName: (_b = barber === null || barber === void 0 ? void 0 : barber.displayName) !== null && _b !== void 0 ? _b : 'tu barbero',
        barbershopName,
        services: apt.services.map(s => s.name),
        date: fmtDate(apt.date),
        timeSlot: apt.timeSlot,
        totalPrice: apt.totalPrice,
    });
    await (0, email_1.sendEmail)(client.email, `✅ Cita confirmada — ${barbershopName}`, html);
});
// ─── onUpdate: cambio de estado → notificar cancelación ──────────────────────
exports.onAppointmentStatusChanged = (0, firestore_1.onDocumentUpdated)({ document: 'appointments/{appointmentId}', region: REGION, secrets: SECRETS }, async (event) => {
    var _a, _b, _c;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (before.status === after.status)
        return;
    const [client, barber, barbershopName] = await Promise.all([
        getUser(after.clientId),
        getUser(after.barberId),
        getBarbershopName(after.barbershopId),
    ]);
    if (!(client === null || client === void 0 ? void 0 : client.email))
        return;
    if (after.status === 'cancelled') {
        const html = (0, email_1.tplAppointmentCancelled)({
            clientName: client.displayName,
            barberName: (_c = barber === null || barber === void 0 ? void 0 : barber.displayName) !== null && _c !== void 0 ? _c : 'tu barbero',
            barbershopName,
            date: fmtDate(after.date),
            timeSlot: after.timeSlot,
        });
        await (0, email_1.sendEmail)(client.email, `❌ Cita cancelada — ${barbershopName}`, html);
    }
});
//# sourceMappingURL=emails.js.map