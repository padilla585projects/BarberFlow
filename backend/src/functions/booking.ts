import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const REGION = 'europe-west1'

/** Slots sit on a 30-minute grid, matching the booking UI. */
const SLOT_GRID_MINUTES = 30

/** Fallback duration for legacy appointments stored without services. */
const DEFAULT_DURATION_MINUTES = 60

const DAY_INDEX_TO_KEY: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

/* ── Types ──────────────────────────────────────────────────────────────── */

interface ServiceLine {
  name: string
  price: number
  duration: number
}

interface DayWindow {
  openMin: number
  closeMin: number
  breakStartMin: number | null
  breakEndMin: number | null
}

interface BookRequest {
  barbershopId?: string
  barberId?: string
  /** "YYYY-MM-DD" in the shop's local calendar. */
  date?: string
  /** "HH:MM" on the 30-minute grid. */
  timeSlot?: string
  serviceIds?: string[]
  promoCode?: string
  paymentMethod?: string
  /** Barber/owner registering someone who walked in without an appointment. */
  isWalkIn?: boolean
  /** Optional display name for a walk-in. */
  clientName?: string
  /**
   * Moving an existing appointment. When set, the shop, barber and services
   * are taken from that appointment — only the new slot comes from the caller.
   */
  rescheduleId?: string
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function bad(msg: string): never {
  throw new HttpsError('invalid-argument', msg)
}

function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** Parse "YYYY-MM-DD" + "HH:MM" into a Date, rejecting anything malformed. */
function parseSlotDate(date: string, timeSlot: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) bad('Fecha con formato inválido.')
  if (!/^\d{2}:\d{2}$/.test(timeSlot)) bad('Hora con formato inválido.')

  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = timeSlot.split(':').map(Number)
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) {
    bad('Fecha u hora fuera de rango.')
  }
  if (mi % SLOT_GRID_MINUTES !== 0) bad('La hora no cae en un hueco válido.')

  const parsed = new Date(y, mo - 1, d, h, mi, 0, 0)
  if (parsed.getFullYear() !== y || parsed.getMonth() !== mo - 1 || parsed.getDate() !== d) {
    bad('Esa fecha no existe.')
  }
  return parsed
}

/** Sum the durations of an appointment's stored service lines. */
function durationOf(services: { duration?: number }[] | undefined): number {
  if (!services || services.length === 0) return DEFAULT_DURATION_MINUTES
  return services.reduce((sum, s) => sum + (s.duration ?? 30), 0)
}

/**
 * Resolve the barber's working window for a day.
 *
 * The barber's personal schedule wins when they have one; otherwise the shop's
 * opening hours apply. Mirrors the client's `todayHours` logic, but here it is
 * authoritative — the caller only ever proposes a slot.
 */
async function resolveDayWindow(
  barberId: string,
  date: Date,
  shopOpeningHours: Record<string, { open?: boolean; from?: string; to?: string }> | undefined,
): Promise<DayWindow | null> {
  const dayKey = DAY_INDEX_TO_KEY[date.getDay()]

  const schedSnap = await db
    .collection('users')
    .doc(barberId)
    .collection('schedule')
    .doc('config')
    .get()

  if (schedSnap.exists) {
    const sched = schedSnap.data()!
    const daysOff = (sched.daysOff as string[] | undefined) ?? []
    if (daysOff.includes(dateKeyOf(date))) return null

    const day = (sched.weeklyHours as Record<string, any> | undefined)?.[dayKey]
    if (day) {
      if (!day.active) return null
      return {
        openMin: timeToMinutes(day.start),
        closeMin: timeToMinutes(day.end),
        breakStartMin: day.breakStart ? timeToMinutes(day.breakStart) : null,
        breakEndMin: day.breakEnd ? timeToMinutes(day.breakEnd) : null,
      }
    }
  }

  const shopDay = shopOpeningHours?.[dayKey]
  if (!shopDay || !shopDay.open || !shopDay.from || !shopDay.to) return null

  return {
    openMin: timeToMinutes(shopDay.from),
    closeMin: timeToMinutes(shopDay.to),
    breakStartMin: null,
    breakEndMin: null,
  }
}

/**
 * Does this user work at that barbershop?
 *
 * The source of truth is the user document, not `barbershops.barbers`. The
 * client's booking screen queries `users where barbershopId == X`, and
 * firestore.rules' isBarberOf()/isOwnerOf() read the same flat fields. The
 * shop's `barbers` array is only maintained by addBarberToShop, so anyone
 * onboarded by another path is missing from it.
 */
function worksAt(user: admin.firestore.DocumentData, barbershopId: string): boolean {
  const role = user.role as string | undefined
  if (role !== 'barber' && role !== 'owner' && role !== 'developer') return false

  if (user.barbershopId === barbershopId || user.activeBarbershopId === barbershopId) {
    return true
  }
  const memberships = (user.memberships as { barbershopId?: string }[] | undefined) ?? []
  return memberships.some((m) => m.barbershopId === barbershopId)
}

/** Reject a slot that falls outside the working window or inside the break. */
function assertSlotFitsWindow(window: DayWindow, startMin: number, endMin: number): void {
  if (startMin < window.openMin || endMin > window.closeMin) {
    bad('Esa hora queda fuera del horario de ese día.')
  }
  if (
    window.breakStartMin !== null &&
    window.breakEndMin !== null &&
    startMin < window.breakEndMin &&
    endMin > window.breakStartMin
  ) {
    bad('Esa hora cae en el descanso del barbero.')
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
export const bookAppointment = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')

  const uid = request.auth.uid
  const body = (request.data ?? {}) as BookRequest

  if (!body.date) bad('Falta la fecha.')
  if (!body.timeSlot) bad('Falta la hora.')

  const startDate = parseSlotDate(body.date, body.timeSlot)
  const startMin = timeToMinutes(body.timeSlot)
  const isReschedule = !!body.rescheduleId
  const isWalkIn = body.isWalkIn === true

  /* ── Reschedule: everything but the slot comes from the appointment ─── */

  if (isReschedule) {
    const ref = db.collection('appointments').doc(body.rescheduleId!)
    const snap = await ref.get()
    if (!snap.exists) throw new HttpsError('not-found', 'Esa cita ya no existe.')
    const appt = snap.data()!

    if (appt.status === 'cancelled' || appt.status === 'completed') {
      bad('Esa cita ya no se puede reprogramar.')
    }

    const barbershopId = appt.barbershopId as string
    const barberId = appt.barberId as string

    const shopSnap = await db.collection('barbershops').doc(barbershopId).get()
    if (!shopSnap.exists) throw new HttpsError('not-found', 'Barbería no encontrada.')
    const shop = shopSnap.data()!

    const isOwner = shop.ownerId === uid
    if (appt.clientId !== uid && appt.barberId !== uid && !isOwner) {
      throw new HttpsError('permission-denied', 'No puedes reprogramar esa cita.')
    }
    if (startDate.getTime() < Date.now()) {
      bad('No puedes mover la cita a una hora que ya ha pasado.')
    }

    const totalDuration = durationOf(appt.services as { duration?: number }[] | undefined)
    const window = await resolveDayWindow(barberId, startDate, shop.openingHours)
    if (!window) bad('El barbero no trabaja ese día.')
    assertSlotFitsWindow(window, startMin, startMin + totalDuration)

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
        })
      },
    })

    return { appointmentId: ref.id }
  }

  /* ── New appointment ────────────────────────────────────────────────── */

  const barbershopId = body.barbershopId
  const barberId = body.barberId
  if (!barbershopId) bad('Falta barbershopId.')
  if (!barberId) bad('Falta barberId.')

  const serviceIds = body.serviceIds ?? []
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    bad('Selecciona al menos un servicio.')
  }
  if (serviceIds.length > 10) bad('Demasiados servicios en una sola cita.')

  const shopSnap = await db.collection('barbershops').doc(barbershopId).get()
  if (!shopSnap.exists) throw new HttpsError('not-found', 'Barbería no encontrada.')
  const shop = shopSnap.data()!

  // Prices and durations come from the shop's catalogue, never from the caller.
  const catalogue = ((shop.services as any[]) ?? []).reduce<Record<string, ServiceLine>>(
    (acc, s) => {
      if (s?.id) {
        acc[s.id] = {
          name: s.name ?? '',
          price: Number(s.price) || 0,
          duration: Number(s.duration) || 30,
        }
      }
      return acc
    },
    {},
  )

  const services = serviceIds.map((id) => {
    const svc = catalogue[id]
    if (!svc) bad(`El servicio ${id} no existe en esta barbería.`)
    return svc
  })

  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0)
  const basePrice = services.reduce((sum, s) => sum + s.price, 0)
  if (totalDuration <= 0) bad('Los servicios elegidos no tienen duración.')

  const barberSnap = await db.collection('users').doc(barberId).get()
  if (!barberSnap.exists) bad('Ese barbero no existe.')
  const barber = barberSnap.data()!
  const barberName = (barber.displayName as string) ?? null

  if (!worksAt(barber, barbershopId)) {
    bad('Ese barbero no trabaja en esta barbería.')
  }

  let clientId: string | null = uid
  let clientName: string | null = null
  let clientEmail: string | null = null
  let status = 'pending'

  if (isWalkIn) {
    // Only the barber themselves or the shop owner may register a walk-in.
    const isOwner = shop.ownerId === uid
    if (!isOwner && uid !== barberId) {
      throw new HttpsError(
        'permission-denied',
        'Solo el barbero o el dueño pueden registrar una cita sin reserva.',
      )
    }
    if (!isOwner && !worksAt(barber, barbershopId)) {
      throw new HttpsError('permission-denied', 'No trabajas en esta barbería.')
    }
    // No account behind a walk-in: leaving clientId null keeps it out of every
    // client's history and stops the loyalty trigger crediting points.
    clientId = null
    clientName = (body.clientName ?? '').trim().slice(0, 60) || 'Cliente sin cita'
    // The customer is already in the chair; there is nothing left to confirm.
    status = 'confirmed'
  } else {
    const userSnap = await db.collection('users').doc(uid).get()
    const user = userSnap.data()
    clientName = (user?.displayName as string) ?? 'Cliente'
    clientEmail = (user?.email as string) ?? null
    if (startDate.getTime() < Date.now()) {
      bad('No puedes reservar una hora que ya ha pasado.')
    }
  }

  const window = await resolveDayWindow(barberId, startDate, shop.openingHours)
  if (!window) bad('El barbero no trabaja ese día.')
  assertSlotFitsWindow(window, startMin, startMin + totalDuration)

  /* ── Promo, revalidated against the document ────────────────────────── */

  let promo: { id: string; code: string; type: string; value: number } | null = null
  let discount = 0

  if (body.promoCode && !isWalkIn) {
    const code = body.promoCode.trim().toUpperCase()
    const promoSnap = await db
      .collection('barbershops')
      .doc(barbershopId)
      .collection('promos')
      .where('code', '==', code)
      .limit(1)
      .get()

    if (promoSnap.empty) bad('Código promocional no válido.')

    const promoDoc = promoSnap.docs[0]
    const p = promoDoc.data()

    // The catalogue has used both field names over time; honour either.
    const expiry = (p.expiresAt ?? p.expiryDate) as admin.firestore.Timestamp | undefined
    if (expiry && expiry.toDate().getTime() < Date.now()) bad('Ese código ha caducado.')
    if (p.singleUse === true && (p.currentUses ?? 0) > 0) {
      bad('Ese código ya ha sido utilizado.')
    }
    if (typeof p.maxUses === 'number' && (p.currentUses ?? 0) >= p.maxUses) {
      bad('Ese código ha alcanzado su límite de usos.')
    }

    promo = {
      id: promoDoc.id,
      code: p.code as string,
      type: p.type as string,
      value: Number(p.value) || 0,
    }
    discount =
      promo.type === 'percentage'
        ? Math.round(basePrice * (promo.value / 100) * 100) / 100
        : Math.min(promo.value, basePrice)
  }

  const finalPrice = Math.max(0, Math.round((basePrice - discount) * 100) / 100)

  const ref = db.collection('appointments').doc()
  const promoRef = promo
    ? db.collection('barbershops').doc(barbershopId).collection('promos').doc(promo.id)
    : null

  await runSlotTransaction({
    barbershopId,
    barberId,
    startDate,
    startMin,
    endMin: startMin + totalDuration,
    selfId: ref.id,
    write: (tx) => {
      tx.create(ref, {
        clientId,
        clientName,
        clientEmail,
        barberId,
        barberName,
        barbershopId,
        barbershopName: shop.name ?? null,
        timeSlot: body.timeSlot,
        date: admin.firestore.Timestamp.fromDate(startDate),
        status,
        services,
        totalPrice: finalPrice,
        originalPrice: basePrice,
        paymentMethod: body.paymentMethod ?? 'cash',
        paymentStatus: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: uid,
        ...(isWalkIn ? { isWalkIn: true } : {}),
        ...(promo
          ? { promoCode: promo.code, discount, promoType: promo.type, promoValue: promo.value }
          : {}),
      })
      if (promoRef) {
        tx.update(promoRef, { currentUses: admin.firestore.FieldValue.increment(1) })
      }
    },
  })

  return { appointmentId: ref.id, totalPrice: finalPrice, originalPrice: basePrice, discount }
})

/**
 * Check the barber's day for an overlap and perform `write` in the same
 * transaction, so nothing can slip into the slot between the two.
 */
async function runSlotTransaction(params: {
  barbershopId: string
  barberId: string
  startDate: Date
  startMin: number
  endMin: number
  selfId: string
  write: (tx: admin.firestore.Transaction) => void
}): Promise<void> {
  const { barbershopId, barberId, startDate, startMin, endMin, selfId, write } = params

  const dayStart = new Date(startDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(startDate)
  dayEnd.setHours(23, 59, 59, 999)

  const dayQuery = db
    .collection('appointments')
    .where('barbershopId', '==', barbershopId)
    .where('barberId', '==', barberId)
    .where('date', '>=', admin.firestore.Timestamp.fromDate(dayStart))
    .where('date', '<=', admin.firestore.Timestamp.fromDate(dayEnd))

  await db.runTransaction(async (tx) => {
    const daySnap = await tx.get(dayQuery)

    for (const d of daySnap.docs) {
      if (d.id === selfId) continue // moving an appointment past itself
      const data = d.data()
      if (data.status === 'cancelled') continue

      const otherStart = timeToMinutes(data.timeSlot as string)
      const otherEnd = otherStart + durationOf(data.services as { duration?: number }[] | undefined)

      if (startMin < otherEnd && endMin > otherStart) {
        throw new HttpsError('already-exists', 'Ese hueco acaba de ocuparse. Elige otra hora.')
      }
    }

    write(tx)
  })
}
