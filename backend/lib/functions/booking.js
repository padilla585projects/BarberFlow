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
exports.bookAppointment = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const REGION = 'europe-west1';
/** Slots sit on a 30-minute grid, matching the booking UI. */
const SLOT_GRID_MINUTES = 30;
/** Fallback duration for legacy appointments stored without services. */
const DEFAULT_DURATION_MINUTES = 60;
const DAY_INDEX_TO_KEY = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
};
/* ── Helpers ────────────────────────────────────────────────────────────── */
function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}
function bad(msg) {
    throw new https_1.HttpsError('invalid-argument', msg);
}
function dateKeyOf(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Parse "YYYY-MM-DD" + "HH:MM" into a Date, rejecting anything malformed. */
function parseSlotDate(date, timeSlot) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        bad('Fecha con formato inválido.');
    if (!/^\d{2}:\d{2}$/.test(timeSlot))
        bad('Hora con formato inválido.');
    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi] = timeSlot.split(':').map(Number);
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) {
        bad('Fecha u hora fuera de rango.');
    }
    if (mi % SLOT_GRID_MINUTES !== 0)
        bad('La hora no cae en un hueco válido.');
    const parsed = new Date(y, mo - 1, d, h, mi, 0, 0);
    if (parsed.getFullYear() !== y || parsed.getMonth() !== mo - 1 || parsed.getDate() !== d) {
        bad('Esa fecha no existe.');
    }
    return parsed;
}
/** Sum the durations of an appointment's stored service lines. */
function durationOf(services) {
    if (!services || services.length === 0)
        return DEFAULT_DURATION_MINUTES;
    return services.reduce((sum, s) => { var _a; return sum + ((_a = s.duration) !== null && _a !== void 0 ? _a : 30); }, 0);
}
/**
 * Resolve the barber's working window for a day.
 *
 * The barber's personal schedule wins when they have one; otherwise the shop's
 * opening hours apply. Mirrors the client's `todayHours` logic, but here it is
 * authoritative — the caller only ever proposes a slot.
 */
async function resolveDayWindow(barberId, date, shopOpeningHours) {
    var _a, _b;
    const dayKey = DAY_INDEX_TO_KEY[date.getDay()];
    const schedSnap = await db
        .collection('users')
        .doc(barberId)
        .collection('schedule')
        .doc('config')
        .get();
    if (schedSnap.exists) {
        const sched = schedSnap.data();
        const daysOff = (_a = sched.daysOff) !== null && _a !== void 0 ? _a : [];
        if (daysOff.includes(dateKeyOf(date)))
            return null;
        const day = (_b = sched.weeklyHours) === null || _b === void 0 ? void 0 : _b[dayKey];
        if (day) {
            if (!day.active)
                return null;
            return {
                openMin: timeToMinutes(day.start),
                closeMin: timeToMinutes(day.end),
                breakStartMin: day.breakStart ? timeToMinutes(day.breakStart) : null,
                breakEndMin: day.breakEnd ? timeToMinutes(day.breakEnd) : null,
            };
        }
    }
    const shopDay = shopOpeningHours === null || shopOpeningHours === void 0 ? void 0 : shopOpeningHours[dayKey];
    if (!shopDay || !shopDay.open || !shopDay.from || !shopDay.to)
        return null;
    return {
        openMin: timeToMinutes(shopDay.from),
        closeMin: timeToMinutes(shopDay.to),
        breakStartMin: null,
        breakEndMin: null,
    };
}
/** Reject a slot that falls outside the working window or inside the break. */
function assertSlotFitsWindow(window, startMin, endMin) {
    if (startMin < window.openMin || endMin > window.closeMin) {
        bad('Esa hora queda fuera del horario de ese día.');
    }
    if (window.breakStartMin !== null &&
        window.breakEndMin !== null &&
        startMin < window.breakEndMin &&
        endMin > window.breakStartMin) {
        bad('Esa hora cae en el descanso del barbero.');
    }
}
/* ── The callable ───────────────────────────────────────────────────────── */
/**
 * Create or move an appointment. The only writer of `appointments`.
 *
 * Every figure that matters is decided here, not by the caller: prices and
 * durations come from the shop's own service catalogue and the discount is
 * recomputed from the promo document. A caller proposes a slot; it does not
 * get to say what that slot costs.
 *
 * The overlap check and the write share one Firestore transaction. The Admin
 * SDK can run a *query* inside a transaction — unlike the client SDK — so the
 * appointments the check looked at stay locked until commit. That closes the
 * double-booking race completely, including partial overlaps between different
 * start times, which a deterministic document id cannot catch.
 */
exports.bookAppointment = (0, https_1.onCall)({ region: REGION }, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const uid = request.auth.uid;
    const body = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    if (!body.date)
        bad('Falta la fecha.');
    if (!body.timeSlot)
        bad('Falta la hora.');
    const startDate = parseSlotDate(body.date, body.timeSlot);
    const startMin = timeToMinutes(body.timeSlot);
    const isReschedule = !!body.rescheduleId;
    const isWalkIn = body.isWalkIn === true;
    /* ── Reschedule: everything but the slot comes from the appointment ─── */
    if (isReschedule) {
        const ref = db.collection('appointments').doc(body.rescheduleId);
        const snap = await ref.get();
        if (!snap.exists)
            throw new https_1.HttpsError('not-found', 'Esa cita ya no existe.');
        const appt = snap.data();
        if (appt.status === 'cancelled' || appt.status === 'completed') {
            bad('Esa cita ya no se puede reprogramar.');
        }
        const barbershopId = appt.barbershopId;
        const barberId = appt.barberId;
        const shopSnap = await db.collection('barbershops').doc(barbershopId).get();
        if (!shopSnap.exists)
            throw new https_1.HttpsError('not-found', 'Barbería no encontrada.');
        const shop = shopSnap.data();
        const isOwner = shop.ownerId === uid;
        if (appt.clientId !== uid && appt.barberId !== uid && !isOwner) {
            throw new https_1.HttpsError('permission-denied', 'No puedes reprogramar esa cita.');
        }
        if (startDate.getTime() < Date.now()) {
            bad('No puedes mover la cita a una hora que ya ha pasado.');
        }
        const totalDuration = durationOf(appt.services);
        const window = await resolveDayWindow(barberId, startDate, shop.openingHours);
        if (!window)
            bad('El barbero no trabaja ese día.');
        assertSlotFitsWindow(window, startMin, startMin + totalDuration);
        await runSlotTransaction({
            barbershopId,
            barberId,
            startDate,
            startMin,
            endMin: startMin + totalDuration,
            selfId: ref.id,
            write: (tx) => {
                tx.update(ref, {
                    date: admin.firestore.Timestamp.fromDate(startDate),
                    timeSlot: body.timeSlot,
                });
            },
        });
        return { appointmentId: ref.id };
    }
    /* ── New appointment ────────────────────────────────────────────────── */
    const barbershopId = body.barbershopId;
    const barberId = body.barberId;
    if (!barbershopId)
        bad('Falta barbershopId.');
    if (!barberId)
        bad('Falta barberId.');
    const serviceIds = (_b = body.serviceIds) !== null && _b !== void 0 ? _b : [];
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        bad('Selecciona al menos un servicio.');
    }
    if (serviceIds.length > 10)
        bad('Demasiados servicios en una sola cita.');
    const shopSnap = await db.collection('barbershops').doc(barbershopId).get();
    if (!shopSnap.exists)
        throw new https_1.HttpsError('not-found', 'Barbería no encontrada.');
    const shop = shopSnap.data();
    // Prices and durations come from the shop's catalogue, never from the caller.
    const catalogue = ((_c = shop.services) !== null && _c !== void 0 ? _c : []).reduce((acc, s) => {
        var _a;
        if (s === null || s === void 0 ? void 0 : s.id) {
            acc[s.id] = {
                name: (_a = s.name) !== null && _a !== void 0 ? _a : '',
                price: Number(s.price) || 0,
                duration: Number(s.duration) || 30,
            };
        }
        return acc;
    }, {});
    const services = serviceIds.map((id) => {
        const svc = catalogue[id];
        if (!svc)
            bad(`El servicio ${id} no existe en esta barbería.`);
        return svc;
    });
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const basePrice = services.reduce((sum, s) => sum + s.price, 0);
    if (totalDuration <= 0)
        bad('Los servicios elegidos no tienen duración.');
    const barbers = (_d = shop.barbers) !== null && _d !== void 0 ? _d : [];
    if (!barbers.includes(barberId))
        bad('Ese barbero no trabaja en esta barbería.');
    const barberSnap = await db.collection('users').doc(barberId).get();
    const barberName = (_f = (_e = barberSnap.data()) === null || _e === void 0 ? void 0 : _e.displayName) !== null && _f !== void 0 ? _f : null;
    let clientId = uid;
    let clientName = null;
    let clientEmail = null;
    let status = 'pending';
    if (isWalkIn) {
        // Only the barber themselves or the shop owner may register a walk-in.
        const isOwner = shop.ownerId === uid;
        if (!isOwner && uid !== barberId) {
            throw new https_1.HttpsError('permission-denied', 'Solo el barbero o el dueño pueden registrar una cita sin reserva.');
        }
        if (!isOwner && !barbers.includes(uid)) {
            throw new https_1.HttpsError('permission-denied', 'No trabajas en esta barbería.');
        }
        // No account behind a walk-in: leaving clientId null keeps it out of every
        // client's history and stops the loyalty trigger crediting points.
        clientId = null;
        clientName = ((_g = body.clientName) !== null && _g !== void 0 ? _g : '').trim().slice(0, 60) || 'Cliente sin cita';
        // The customer is already in the chair; there is nothing left to confirm.
        status = 'confirmed';
    }
    else {
        const userSnap = await db.collection('users').doc(uid).get();
        const user = userSnap.data();
        clientName = (_h = user === null || user === void 0 ? void 0 : user.displayName) !== null && _h !== void 0 ? _h : 'Cliente';
        clientEmail = (_j = user === null || user === void 0 ? void 0 : user.email) !== null && _j !== void 0 ? _j : null;
        if (startDate.getTime() < Date.now()) {
            bad('No puedes reservar una hora que ya ha pasado.');
        }
    }
    const window = await resolveDayWindow(barberId, startDate, shop.openingHours);
    if (!window)
        bad('El barbero no trabaja ese día.');
    assertSlotFitsWindow(window, startMin, startMin + totalDuration);
    /* ── Promo, revalidated against the document ────────────────────────── */
    let promo = null;
    let discount = 0;
    if (body.promoCode && !isWalkIn) {
        const code = body.promoCode.trim().toUpperCase();
        const promoSnap = await db
            .collection('barbershops')
            .doc(barbershopId)
            .collection('promos')
            .where('code', '==', code)
            .limit(1)
            .get();
        if (promoSnap.empty)
            bad('Código promocional no válido.');
        const promoDoc = promoSnap.docs[0];
        const p = promoDoc.data();
        // The catalogue has used both field names over time; honour either.
        const expiry = ((_k = p.expiresAt) !== null && _k !== void 0 ? _k : p.expiryDate);
        if (expiry && expiry.toDate().getTime() < Date.now())
            bad('Ese código ha caducado.');
        if (p.singleUse === true && ((_l = p.currentUses) !== null && _l !== void 0 ? _l : 0) > 0) {
            bad('Ese código ya ha sido utilizado.');
        }
        if (typeof p.maxUses === 'number' && ((_m = p.currentUses) !== null && _m !== void 0 ? _m : 0) >= p.maxUses) {
            bad('Ese código ha alcanzado su límite de usos.');
        }
        promo = {
            id: promoDoc.id,
            code: p.code,
            type: p.type,
            value: Number(p.value) || 0,
        };
        discount =
            promo.type === 'percentage'
                ? Math.round(basePrice * (promo.value / 100) * 100) / 100
                : Math.min(promo.value, basePrice);
    }
    const finalPrice = Math.max(0, Math.round((basePrice - discount) * 100) / 100);
    const ref = db.collection('appointments').doc();
    const promoRef = promo
        ? db.collection('barbershops').doc(barbershopId).collection('promos').doc(promo.id)
        : null;
    await runSlotTransaction({
        barbershopId,
        barberId,
        startDate,
        startMin,
        endMin: startMin + totalDuration,
        selfId: ref.id,
        write: (tx) => {
            var _a, _b;
            tx.create(ref, Object.assign(Object.assign({ clientId,
                clientName,
                clientEmail,
                barberId,
                barberName,
                barbershopId, barbershopName: (_a = shop.name) !== null && _a !== void 0 ? _a : null, timeSlot: body.timeSlot, date: admin.firestore.Timestamp.fromDate(startDate), status,
                services, totalPrice: finalPrice, originalPrice: basePrice, paymentMethod: (_b = body.paymentMethod) !== null && _b !== void 0 ? _b : 'cash', paymentStatus: 'pending', createdAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: uid }, (isWalkIn ? { isWalkIn: true } : {})), (promo
                ? { promoCode: promo.code, discount, promoType: promo.type, promoValue: promo.value }
                : {})));
            if (promoRef) {
                tx.update(promoRef, { currentUses: admin.firestore.FieldValue.increment(1) });
            }
        },
    });
    return { appointmentId: ref.id, totalPrice: finalPrice, originalPrice: basePrice, discount };
});
/**
 * Check the barber's day for an overlap and perform `write` in the same
 * transaction, so nothing can slip into the slot between the two.
 */
async function runSlotTransaction(params) {
    const { barbershopId, barberId, startDate, startMin, endMin, selfId, write } = params;
    const dayStart = new Date(startDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(startDate);
    dayEnd.setHours(23, 59, 59, 999);
    const dayQuery = db
        .collection('appointments')
        .where('barbershopId', '==', barbershopId)
        .where('barberId', '==', barberId)
        .where('date', '>=', admin.firestore.Timestamp.fromDate(dayStart))
        .where('date', '<=', admin.firestore.Timestamp.fromDate(dayEnd));
    await db.runTransaction(async (tx) => {
        const daySnap = await tx.get(dayQuery);
        for (const d of daySnap.docs) {
            if (d.id === selfId)
                continue; // moving an appointment past itself
            const data = d.data();
            if (data.status === 'cancelled')
                continue;
            const otherStart = timeToMinutes(data.timeSlot);
            const otherEnd = otherStart + durationOf(data.services);
            if (startMin < otherEnd && endMin > otherStart) {
                throw new https_1.HttpsError('already-exists', 'Ese hueco acaba de ocuparse. Elige otra hora.');
            }
        }
        write(tx);
    });
}
//# sourceMappingURL=booking.js.map