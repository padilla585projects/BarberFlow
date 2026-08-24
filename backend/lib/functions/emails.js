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
exports.onOrderStatusChanged = exports.onOrderCreated = exports.onAppointmentStatusChanged = exports.onAppointmentCreated = void 0;
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
    // Walk-in appointments carry no client account.
    if (!uid)
        return null;
    const snap = await db.collection('users').doc(uid).get();
    return snap.exists ? snap.data() : null;
}
async function getBarbershop(id) {
    var _a, _b;
    const snap = await db.collection('barbershops').doc(id).get();
    if (!snap.exists)
        return { name: 'BarberFlow', ownerId: null };
    const data = snap.data();
    return { name: (_a = data.name) !== null && _a !== void 0 ? _a : 'BarberFlow', ownerId: (_b = data.ownerId) !== null && _b !== void 0 ? _b : null };
}
function fmtDate(ts) {
    return ts.toDate().toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}
// ─── onCreate: nueva cita → email al cliente Y al owner ─────────────────────
exports.onAppointmentCreated = (0, firestore_1.onDocumentCreated)({ document: 'appointments/{appointmentId}', region: REGION, secrets: SECRETS }, async (event) => {
    var _a, _b, _c;
    const apt = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!apt)
        return;
    // Walk-ins are registered by the barber for someone already in the shop:
    // there is no client account to email, and the owner gains nothing from a
    // notification about a customer their own barber just served.
    if (apt.isWalkIn)
        return;
    const barbershopId = apt.barbershopId;
    const [client, barber, barbershop] = await Promise.all([
        getUser(apt.clientId),
        getUser(apt.barberId),
        getBarbershop(barbershopId),
    ]);
    const barberName = (_b = barber === null || barber === void 0 ? void 0 : barber.displayName) !== null && _b !== void 0 ? _b : 'tu barbero';
    const services = apt.services.map(s => s.name);
    const date = fmtDate(apt.date);
    const timeSlot = apt.timeSlot;
    const totalPrice = apt.totalPrice;
    // Email to client
    if (client === null || client === void 0 ? void 0 : client.email) {
        const html = (0, email_1.tplAppointmentReceived)({
            clientName: client.displayName,
            barberName,
            barbershopName: barbershop.name,
            services,
            date,
            timeSlot,
            totalPrice,
        });
        await (0, email_1.sendEmail)(client.email, `Cita recibida — ${barbershop.name}`, html);
    }
    // Email to barbershop owner
    if (barbershop.ownerId) {
        const owner = await getUser(barbershop.ownerId);
        if (owner === null || owner === void 0 ? void 0 : owner.email) {
            const ownerHtml = (0, email_1.tplNewAppointmentOwner)({
                ownerName: owner.displayName,
                clientName: (_c = client === null || client === void 0 ? void 0 : client.displayName) !== null && _c !== void 0 ? _c : 'Un cliente',
                barberName,
                barbershopName: barbershop.name,
                services,
                date,
                timeSlot,
                totalPrice,
            });
            await (0, email_1.sendEmail)(owner.email, `Nueva cita recibida — ${barbershop.name}`, ownerHtml);
        }
    }
});
// ─── onUpdate: cambio de estado → notificar al cliente Y al owner ───────────
exports.onAppointmentStatusChanged = (0, firestore_1.onDocumentUpdated)({ document: 'appointments/{appointmentId}', region: REGION, secrets: SECRETS }, async (event) => {
    var _a, _b, _c, _d;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (before.status === after.status)
        return;
    const barbershopId = after.barbershopId;
    const [client, barber, barbershop] = await Promise.all([
        getUser(after.clientId),
        getUser(after.barberId),
        getBarbershop(barbershopId),
    ]);
    const barberName = (_c = barber === null || barber === void 0 ? void 0 : barber.displayName) !== null && _c !== void 0 ? _c : 'tu barbero';
    const date = fmtDate(after.date);
    const timeSlot = after.timeSlot;
    if (after.status === 'confirmed') {
        // Email to client
        if (client === null || client === void 0 ? void 0 : client.email) {
            const html = (0, email_1.tplAppointmentConfirmed)({
                clientName: client.displayName,
                barberName,
                barbershopName: barbershop.name,
                services: after.services.map(s => s.name),
                date,
                timeSlot,
                totalPrice: after.totalPrice,
            });
            await (0, email_1.sendEmail)(client.email, `Cita confirmada — ${barbershop.name}`, html);
        }
    }
    else if (after.status === 'cancelled') {
        // Email to client
        if (client === null || client === void 0 ? void 0 : client.email) {
            const html = (0, email_1.tplAppointmentCancelled)({
                clientName: client.displayName,
                barberName,
                barbershopName: barbershop.name,
                date,
                timeSlot,
            });
            await (0, email_1.sendEmail)(client.email, `Cita cancelada — ${barbershop.name}`, html);
        }
        // Email to owner
        if (barbershop.ownerId) {
            const owner = await getUser(barbershop.ownerId);
            if (owner === null || owner === void 0 ? void 0 : owner.email) {
                const clientName = (_d = client === null || client === void 0 ? void 0 : client.displayName) !== null && _d !== void 0 ? _d : 'Un cliente';
                const ownerHtml = (0, email_1.tplAppointmentCancelled)({
                    clientName,
                    barberName,
                    barbershopName: barbershop.name,
                    date,
                    timeSlot,
                });
                await (0, email_1.sendEmail)(owner.email, `Cita cancelada — ${barbershop.name}`, ownerHtml);
            }
        }
    }
});
// ─── onCreate: nuevo pedido → email al cliente Y al owner ────────────────────
exports.onOrderCreated = (0, firestore_1.onDocumentCreated)({ document: 'orders/{orderId}', region: REGION, secrets: SECRETS }, async (event) => {
    var _a, _b, _c, _d, _e;
    const order = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!order)
        return;
    const orderId = event.data.id;
    const barbershopId = order.barbershopId;
    const barbershop = await getBarbershop(barbershopId);
    const items = (_b = order.items) !== null && _b !== void 0 ? _b : [];
    const totalAmount = ((_d = (_c = order.totalAmount) !== null && _c !== void 0 ? _c : order.originalAmount) !== null && _d !== void 0 ? _d : 0);
    const shippingAddress = (_e = order.shippingAddress) !== null && _e !== void 0 ? _e : null;
    const clientEmail = order.clientEmail;
    const clientName = order.clientName || 'Cliente';
    // Email al cliente
    if (clientEmail) {
        const html = (0, email_1.tplOrderReceived)({
            clientName,
            barbershopName: barbershop.name,
            orderId,
            items,
            totalAmount,
            shippingAddress,
        });
        await (0, email_1.sendEmail)(clientEmail, `Pedido recibido — ${barbershop.name}`, html);
    }
    // Email al owner
    if (barbershop.ownerId) {
        const ownerUser = await getUser(barbershop.ownerId);
        if (ownerUser === null || ownerUser === void 0 ? void 0 : ownerUser.email) {
            const html = (0, email_1.tplNewOrderOwner)({
                ownerName: ownerUser.displayName,
                clientName,
                barbershopName: barbershop.name,
                orderId,
                items,
                totalAmount,
                shippingAddress,
            });
            await (0, email_1.sendEmail)(ownerUser.email, `Nuevo pedido — ${barbershop.name}`, html);
        }
    }
});
// ─── onUpdate: cambio de estado del pedido → email al cliente ────────────────
exports.onOrderStatusChanged = (0, firestore_1.onDocumentUpdated)({ document: 'orders/{orderId}', region: REGION, secrets: SECRETS }, async (event) => {
    var _a, _b, _c, _d, _e, _f;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (before.status === after.status)
        return;
    // Only notify on meaningful forward transitions
    const notifyStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
    if (!notifyStatuses.includes(after.status))
        return;
    const orderId = event.data.after.id;
    const barbershopId = after.barbershopId;
    const barbershop = await getBarbershop(barbershopId);
    const clientEmail = after.clientEmail;
    if (!clientEmail)
        return;
    const clientName = after.clientName || 'Cliente';
    const items = (_c = after.items) !== null && _c !== void 0 ? _c : [];
    const totalAmount = ((_e = (_d = after.totalAmount) !== null && _d !== void 0 ? _d : after.originalAmount) !== null && _e !== void 0 ? _e : 0);
    const shippingAddress = (_f = after.shippingAddress) !== null && _f !== void 0 ? _f : null;
    const statusTitles = {
        processing: 'Pedido en preparación',
        shipped: 'Pedido enviado',
        delivered: after.shippingAddress ? '¡Pedido entregado!' : 'Listo para recoger',
        cancelled: 'Pedido cancelado',
    };
    const html = (0, email_1.tplOrderStatusChanged)({
        clientName,
        barbershopName: barbershop.name,
        orderId,
        status: after.status,
        items,
        totalAmount,
        shippingAddress,
    });
    await (0, email_1.sendEmail)(clientEmail, `${statusTitles[after.status]} — ${barbershop.name}`, html);
});
//# sourceMappingURL=emails.js.map