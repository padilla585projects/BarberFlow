import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  increment,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import app from '../../services/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';
import { addAppointmentToCalendar } from '../../utils/calendarHelper';

/* ── Types ─────────────────────────────────────────────────────────────────── */

type PaymentMethod = 'cash' | 'bizum' | 'paypal' | 'bankTransfer';

interface BarbershopPaymentConfig {
  paymentMethods: { cash: boolean; bizum: boolean; paypal: boolean; bankTransfer: boolean };
  bizumPhone?: string;
  paypalUsername?: string;
  bankIBAN?: string;
  bankAccountHolder?: string;
}

type Props = NativeStackScreenProps<ClientStackParamList, 'Book'>;

interface BarberOption {
  uid: string;
  displayName: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutes
}

interface DayHours {
  open: string; // "09:00"
  close: string; // "20:00"
}

type OpeningHours = Record<string, DayHours | null>;

interface ExistingAppointment {
  timeSlot: string;
  totalDuration: number; // minutes
}

interface BarberDaySchedule {
  active: boolean;
  start: string;   // "09:00"
  end: string;     // "20:00"
  breakStart?: string;
  breakEnd?: string;
}

interface BarberSchedule {
  weeklyHours: Record<string, BarberDaySchedule>;
  daysOff: string[]; // ["2026-07-04", ...]
}

/* ── Design tokens ─────────────────────────────────────────────────────────── */

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const SPANISH_DAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const SPANISH_MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/**
 * JS Date.getDay() returns 0=Sunday..6=Saturday.
 * Map to the Firestore openingHours key (english lowercase).
 */
const DAY_INDEX_TO_KEY: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

/** Parse "HH:MM" to total minutes since midnight. */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Format total minutes since midnight to "HH:MM". */
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Build the next 14 calendar days starting from tomorrow. */
function buildDateRange(): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

/** Check whether a candidate slot overlaps with any existing appointment. */
function slotConflicts(
  slotStart: number,
  slotDuration: number,
  existing: ExistingAppointment[],
): boolean {
  const slotEnd = slotStart + slotDuration;
  return existing.some((appt) => {
    const apptStart = timeToMinutes(appt.timeSlot);
    const apptEnd = apptStart + appt.totalDuration;
    return slotStart < apptEnd && slotEnd > apptStart;
  });
}

/**
 * Generate available time slots for a given day.
 * Slots are placed every 30 minutes, but only if the full service duration
 * fits before the shop closes AND doesn't overlap existing appointments
 * or the barber's break time.
 */
function generateSlots(
  hours: DayHours,
  totalDuration: number,
  existing: ExistingAppointment[],
  breakStart?: string,
  breakEnd?: string,
): { time: string; available: boolean }[] {
  const openMin = timeToMinutes(hours.open);
  const closeMin = timeToMinutes(hours.close);
  const breakStartMin = breakStart ? timeToMinutes(breakStart) : null;
  const breakEndMin = breakEnd ? timeToMinutes(breakEnd) : null;
  const slots: { time: string; available: boolean }[] = [];

  for (let m = openMin; m + totalDuration <= closeMin; m += 30) {
    const time = minutesToTime(m);
    const slotEnd = m + totalDuration;

    // Check if the slot overlaps with the barber's break
    const overlapsBreak =
      breakStartMin !== null &&
      breakEndMin !== null &&
      m < breakEndMin &&
      slotEnd > breakStartMin;

    const available = !overlapsBreak && !slotConflicts(m, totalDuration, existing);
    slots.push({ time, available });
  }
  return slots;
}

/** Format a Date as "YYYY-MM-DD" for comparing with daysOff. */
function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Check whether the barber works on a given date according to their schedule.
 * Returns { works: false } if barber is off, or { works: true, daySchedule }
 * with the schedule for that day.
 */
function barberWorksOnDate(
  date: Date,
  schedule: BarberSchedule,
): { works: false } | { works: true; daySchedule: BarberDaySchedule } {
  // Check explicit days off
  const dateStr = formatDateKey(date);
  if (schedule.daysOff?.includes(dateStr)) return { works: false };

  // Check weekly hours
  const dayKey = DAY_INDEX_TO_KEY[date.getDay()];
  const daySchedule = schedule.weeklyHours?.[dayKey];
  if (!daySchedule || !daySchedule.active) return { works: false };

  return { works: true, daySchedule };
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function BookScreen({ route, navigation }: Props) {
  const { barbershopId, barbershopName } = route.params;

  // Data
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(null);
  const [existingAppointments, setExistingAppointments] = useState<ExistingAppointment[]>([]);
  const [barberSchedule, setBarberSchedule] = useState<BarberSchedule | null>(null);

  // Selections
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<BarberOption | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Promo code
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<{
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Payment
  const [paymentConfig, setPaymentConfig] = useState<BarbershopPaymentConfig | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);
  const [paymentModalInfo, setPaymentModalInfo] = useState<{
    method: PaymentMethod;
    amount: number;
    bizumPhone?: string;
    paypalUsername?: string;
    bankIBAN?: string;
    bankAccountHolder?: string;
  } | null>(null);

  // Calendar
  const [pendingCalendarEvent, setPendingCalendarEvent] = useState<{
    title: string;
    startDate: Date;
    durationMinutes: number;
    location: string;
    notes: string;
  } | null>(null);

  // Waitlist
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  // Loading states
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dates = useMemo(buildDateRange, []);

  /**
   * Set of date strings ("YYYY-MM-DD") where the selected barber does NOT work.
   * Used to grey out dates in the picker.
   */
  const barberUnavailableDates = useMemo(() => {
    const set = new Set<string>();
    if (!barberSchedule) return set;
    for (const d of dates) {
      const result = barberWorksOnDate(d, barberSchedule);
      if (!result.works) set.add(formatDateKey(d));
    }
    return set;
  }, [barberSchedule, dates]);

  /* ── Derived values ────────────────────────────────────────────────────── */

  const selectedServicesList = useMemo(
    () => services.filter((s) => selectedServices.has(s.id)),
    [services, selectedServices],
  );

  const totalDuration = useMemo(
    () => selectedServicesList.reduce((sum, s) => sum + s.duration, 0),
    [selectedServicesList],
  );

  const totalPrice = useMemo(
    () => selectedServicesList.reduce((sum, s) => sum + s.price, 0),
    [selectedServicesList],
  );

  const discountAmount = useMemo(() => {
    if (!promoApplied) return 0;
    if (promoApplied.type === 'percentage') {
      return Math.round(totalPrice * promoApplied.value) / 100;
    }
    return Math.min(promoApplied.value, totalPrice);
  }, [promoApplied, totalPrice]);

  const finalPrice = totalPrice - discountAmount;

  const dayKey = useMemo(() => {
    if (!selectedDate) return null;
    return DAY_INDEX_TO_KEY[selectedDate.getDay()];
  }, [selectedDate]);

  /** Whether the selected barber is off on the selected date. */
  const barberDayOff = useMemo(() => {
    if (!selectedDate || !barberSchedule) return false;
    const result = barberWorksOnDate(selectedDate, barberSchedule);
    return !result.works;
  }, [selectedDate, barberSchedule]);

  /** The barber's day schedule for the selected date (if they have one). */
  const barberDayConfig = useMemo((): BarberDaySchedule | null => {
    if (!selectedDate || !barberSchedule) return null;
    const result = barberWorksOnDate(selectedDate, barberSchedule);
    return result.works ? result.daySchedule : null;
  }, [selectedDate, barberSchedule]);

  const todayHours = useMemo((): DayHours | null => {
    if (!dayKey) return null;

    // If the barber has a personal schedule and works this day, use their hours
    if (barberDayConfig) {
      return { open: barberDayConfig.start, close: barberDayConfig.end };
    }
    // If barber has a schedule but is off this day, no hours
    if (barberDayOff) return null;

    // Fallback to barbershop hours
    if (!openingHours) return null;
    return openingHours[dayKey] ?? null;
  }, [openingHours, dayKey, barberDayConfig, barberDayOff]);

  const slots = useMemo(() => {
    if (!todayHours || totalDuration <= 0) return [];
    return generateSlots(
      todayHours,
      totalDuration,
      existingAppointments,
      barberDayConfig?.breakStart,
      barberDayConfig?.breakEnd,
    );
  }, [todayHours, totalDuration, existingAppointments, barberDayConfig]);

  const allSlotsTaken = useMemo(() => {
    if (!todayHours || totalDuration <= 0 || slots.length === 0) return false;
    return slots.every((s) => !s.available);
  }, [todayHours, totalDuration, slots]);

  /* ── Initial data fetch: barbers, services, openingHours ───────────── */

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch barbers
        const barbersSnap = await getDocs(
          query(
            collection(db, 'users'),
            where('barbershopId', '==', barbershopId),
            where('role', 'in', ['barber', 'owner']),
          ),
        );

        // Barbers
        const barberList = barbersSnap.docs.map((d) => ({
          uid: d.data().uid ?? d.id,
          displayName: d.data().displayName ?? d.data().email ?? 'Barbero',
        }));
        setBarbers(barberList);
        if (barberList.length === 1) setSelectedBarber(barberList[0]);
      } catch (err) {
        console.error('[BookScreen] Error loading barbers:', err);
        Alert.alert('Error', 'No se pudo cargar los barberos.');
      } finally {
        setLoadingInit(false);
      }
    };
    load();
  }, [barbershopId]);

  /* ── Real-time services sync ────────────────────────────────────── */

  useEffect(() => {
    if (!barbershopId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'barbershops', barbershopId),
      (snap) => {
        if (snap.exists()) {
          const shopData = snap.data();

          // Services are stored as an array field on the barbershop doc
          const rawServices = (shopData.services as any[]) ?? [];
          const serviceList = rawServices.map((s: any) => ({
            id: s.id ?? '',
            name: s.name ?? '',
            price: s.price ?? 0,
            duration: s.duration ?? 30,
          }));
          setServices(serviceList);

          // Payment methods config
          const pm = shopData.paymentMethods as
            | {
                cash?: { enabled?: boolean };
                bizum?: { enabled?: boolean; phone?: string };
                paypal?: { enabled?: boolean; email?: string };
                bankTransfer?: { enabled?: boolean; iban?: string; accountHolder?: string };
              }
            | undefined;
          setPaymentConfig({
            paymentMethods: {
              cash: pm?.cash?.enabled ?? true, // default true
              bizum: pm?.bizum?.enabled === true,
              paypal: pm?.paypal?.enabled === true,
              bankTransfer: pm?.bankTransfer?.enabled === true,
            },
            bizumPhone: pm?.bizum?.phone ?? undefined,
            paypalUsername: pm?.paypal?.email ?? undefined,
            bankIBAN: pm?.bankTransfer?.iban ?? undefined,
            bankAccountHolder: pm?.bankTransfer?.accountHolder ?? undefined,
          });

          if (shopData.openingHours) {
            // Firestore stores { open: boolean, from: 'HH:MM', to: 'HH:MM' }
            // DayHours expects { open: 'HH:MM', close: 'HH:MM' }
            const raw = shopData.openingHours as Record<string, {open: boolean; from?: string; to?: string} | null>;
            const mapped: OpeningHours = {};
            for (const [day, val] of Object.entries(raw)) {
              if (val && val.open && val.from && val.to) {
                mapped[day] = { open: val.from, close: val.to };
              } else {
                mapped[day] = null;
              }
            }
            setOpeningHours(mapped);
          }
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [barbershopId]);

  /* ── Fetch barber's personal schedule when barber changes ─────────── */

  useEffect(() => {
    if (!selectedBarber) {
      setBarberSchedule(null);
      return;
    }

    try {
      const unsubscribe = onSnapshot(
        doc(db, 'users', selectedBarber.uid, 'schedule', 'config'),
        (snap) => {
          if (snap.exists()) {
            setBarberSchedule(snap.data() as BarberSchedule);
          } else {
            setBarberSchedule(null);
          }
        }
      );

      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error('[BookScreen] Error setting up barber schedule listener:', err);
      setBarberSchedule(null);
    }
  }, [selectedBarber?.uid]);

  /* ── Fetch existing appointments when barber+date change ───────────── */

  useEffect(() => {
    if (!selectedBarber || !selectedDate) {
      setExistingAppointments([]);
      return;
    }

    const fetchAppointments = async () => {
      setLoadingSlots(true);
      try {
        // Build day boundaries (start of day to end of day)
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);

        const q = query(
          collection(db, 'appointments'),
          where('barbershopId', '==', barbershopId),
          where('barberId', '==', selectedBarber.uid),
          where('date', '>=', Timestamp.fromDate(dayStart)),
          where('date', '<=', Timestamp.fromDate(dayEnd)),
        );
        const snap = await getDocs(q);

        const appts: ExistingAppointment[] = snap.docs
          .filter((d) => {
            const status = d.data().status;
            return status !== 'cancelled';
          })
          .map((d) => {
            const data = d.data();
            // Calculate total duration from services array, fallback to 60 min
            const svcArray = data.services as { duration?: number }[] | undefined;
            const dur = svcArray && svcArray.length > 0
              ? svcArray.reduce((sum: number, s: { duration?: number }) => sum + (s.duration ?? 30), 0)
              : 60;
            return {
              timeSlot: data.timeSlot as string,
              totalDuration: dur,
            };
          });

        setExistingAppointments(appts);
      } catch (err) {
        console.error('[BookScreen] Error fetching appointments:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAppointments();
  }, [selectedBarber, selectedDate, barbershopId]);

  // Reset slot when date, barber, or services change
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate, selectedBarber, selectedServices]);

  // Deselect date if the new barber doesn't work on the currently selected date
  useEffect(() => {
    if (!selectedDate || !barberSchedule) return;
    const result = barberWorksOnDate(selectedDate, barberSchedule);
    if (!result.works) {
      setSelectedDate(null);
    }
  }, [barberSchedule]); // intentionally only react to schedule changes

  /* ── Service toggle ────────────────────────────────────────────────────── */

  const toggleService = useCallback((serviceId: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  }, []);

  /* ── Promo code validation ──────────────────────────────────────────── */

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;

    setPromoError('');
    setPromoLoading(true);
    try {
      const promoSnap = await getDocs(
        query(
          collection(db, 'barbershops', barbershopId, 'promos'),
          where('code', '==', code),
        ),
      );

      if (promoSnap.empty) {
        setPromoError('Codigo no valido.');
        setPromoApplied(null);
        setPromoLoading(false);
        return;
      }

      const promoDoc = promoSnap.docs[0];
      const data = promoDoc.data();

      if (!data.active) {
        setPromoError('Este código ya no está activo.');
        setPromoApplied(null);
        setPromoLoading(false);
        return;
      }

      const expiry = data.expiryDate?.toDate?.();
      if (expiry && expiry < new Date()) {
        setPromoError('Este código ha expirado.');
        setPromoApplied(null);
        setPromoLoading(false);
        return;
      }

      if (data.maxUses > 0 && (data.currentUses ?? 0) >= data.maxUses) {
        setPromoError('Este código ha alcanzado el límite de usos.');
        setPromoApplied(null);
        setPromoLoading(false);
        return;
      }

      // Validate single-use loyalty promos: must belong to this client and be unused
      if (data.singleUse) {
        const uid = auth.currentUser?.uid;
        if (data.linkedClientId && data.linkedClientId !== uid) {
          setPromoError('Este código no es válido para tu cuenta.');
          setPromoApplied(null);
          setPromoLoading(false);
          return;
        }
        if ((data.currentUses ?? 0) > 0) {
          setPromoError('Este código de puntos ya ha sido utilizado.');
          setPromoApplied(null);
          setPromoLoading(false);
          return;
        }
      }

      setPromoApplied({
        id: promoDoc.id,
        code: data.code,
        type: data.type,
        value: data.value,
      });
      setPromoError('');
    } catch (err) {
      console.error('[BookScreen] Error validating promo:', err);
      setPromoError('Error al validar el código.');
      setPromoApplied(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoInput('');
    setPromoError('');
  };

  /* ── Submit booking ────────────────────────────────────────────────────── */

  const handleBook = async () => {
    if (!selectedBarber) {
      Alert.alert('Selecciona un barbero', 'Elige el barbero para tu cita.');
      return;
    }
    if (selectedServices.size === 0) {
      Alert.alert('Selecciona servicios', 'Elige al menos un servicio.');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Selecciona una fecha', 'Elige el día de tu cita.');
      return;
    }
    if (!selectedSlot) {
      Alert.alert('Selecciona un horario', 'Elige la hora de tu cita.');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      setSubmitting(true);

      // Build the date+time for the appointment
      const [hours, minutes] = selectedSlot.split(':').map(Number);
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(hours, minutes, 0, 0);

      const servicesPayload = selectedServicesList.map((s) => ({
        name: s.name,
        price: s.price,
        duration: s.duration,
      }));

      // The server owns the booking: it re-reads prices from the shop's own
      // catalogue, revalidates the promo, and checks the slot inside the same
      // transaction that writes the appointment. We only propose a slot.
      const bookFn = httpsCallable<
        Record<string, unknown>,
        { appointmentId: string }
      >(getFunctions(app, 'europe-west1'), 'bookAppointment');

      const { data: booking } = await bookFn({
        barbershopId,
        barberId: selectedBarber.uid,
        date: formatDateKey(selectedDate),
        timeSlot: selectedSlot,
        serviceIds: selectedServicesList.map((s) => s.id),
        promoCode: promoApplied?.code,
        paymentMethod: selectedPayment,
      });

      setCreatedAppointmentId(booking.appointmentId);

      // Build calendar event info for this appointment
      const calEvent = {
        title: `Cita en ${barbershopName}`,
        startDate: appointmentDate,
        durationMinutes: totalDuration,
        location: barbershopName,
        notes: [
          `Barbero: ${selectedBarber.displayName}`,
          `Servicios: ${servicesPayload.map((s) => s.name).join(', ')}`,
          `Precio: ${finalPrice.toFixed(2)} €`,
        ].join('\n'),
      };
      setPendingCalendarEvent(calEvent);

      if (selectedPayment === 'bizum' || selectedPayment === 'paypal' || selectedPayment === 'bankTransfer') {
        setPaymentModalInfo({
          method: selectedPayment,
          amount: finalPrice,
          bizumPhone: paymentConfig?.bizumPhone,
          paypalUsername: paymentConfig?.paypalUsername,
          bankIBAN: paymentConfig?.bankIBAN,
          bankAccountHolder: paymentConfig?.bankAccountHolder,
        });
        setShowPaymentModal(true);
      } else {
        const dateLabel = `${selectedDate.getDate()} ${SPANISH_MONTHS[selectedDate.getMonth()]}`;
        Alert.alert(
          '¡Cita reservada! 🎉',
          `Tu cita el ${dateLabel} a las ${selectedSlot} ha sido enviada. El barbero la confirmará pronto.`,
          [
            {
              text: '📅 Guardar en calendario',
              onPress: async () => {
                await addAppointmentToCalendar(calEvent);
                navigation.navigate('MyAppointments');
              },
            },
            {
              text: 'Continuar',
              style: 'cancel',
              onPress: () => navigation.navigate('MyAppointments'),
            },
          ],
        );
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      const message = (err as { message?: string })?.message;

      // The slot went while the form was open, or the server rejected the
      // proposal (price changed, barber stopped working that day...). Either
      // way the grid on screen is stale, so refresh it.
      if (code === 'functions/already-exists') {
        Alert.alert('Hueco ocupado', message ?? 'Ese hueco acaba de ocuparse. Elige otra hora.');
        setSelectedSlot(null);
        return;
      }
      if (code === 'functions/invalid-argument' || code === 'functions/permission-denied') {
        Alert.alert('No se pudo reservar', message ?? 'Revisa los datos de la cita.');
        setSelectedSlot(null);
        return;
      }

      console.error('[BookScreen] Error creating appointment:', err);
      Alert.alert('Error', 'No se pudo reservar la cita. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Join waitlist ──────────────────────────────────────────────────── */

  const handleJoinWaitlist = async () => {
    if (!selectedBarber || selectedServices.size === 0 || !selectedDate) {
      Alert.alert('Completa la selección', 'Elige barbero, servicios y fecha para unirte a la lista de espera.');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      setJoiningWaitlist(true);

      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(12, 0, 0, 0);

      const servicesPayload = selectedServicesList.map((s) => ({
        name: s.name,
        price: s.price,
        duration: s.duration,
      }));

      await addDoc(collection(db, 'barbershops', barbershopId, 'waitlist'), {
        clientId: user.uid,
        clientName: user.displayName ?? 'Cliente',
        clientEmail: user.email ?? '',
        barberId: selectedBarber.uid,
        barberName: selectedBarber.displayName,
        date: Timestamp.fromDate(appointmentDate),
        services: servicesPayload,
        totalPrice: finalPrice,
        createdAt: serverTimestamp(),
        status: 'waiting',
      });

      const dateLabel = `${selectedDate.getDate()} ${SPANISH_MONTHS[selectedDate.getMonth()]}`;
      Alert.alert(
        'Lista de espera',
        `Te has unido a la lista de espera para el ${dateLabel}. Te avisaremos si se libera un hueco.`,
        [{ text: 'OK' }],
      );
    } catch (err) {
      console.error('[BookScreen] Error joining waitlist:', err);
      Alert.alert('Error', 'No se pudo unir a la lista de espera. Intenta de nuevo.');
    } finally {
      setJoiningWaitlist(false);
    }
  };

  /* ── Render helpers ────────────────────────────────────────────────────── */

  const canConfirm =
    !!selectedBarber &&
    selectedServices.size > 0 &&
    !!selectedDate &&
    !!selectedSlot &&
    !submitting;

  if (loadingInit) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Reservar en {barbershopName}</Text>

      {/* ─── 1. Barber selection ──────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Elige tu barbero</Text>
      {barbers.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Esta barbería aún no tiene barberos registrados
          </Text>
        </View>
      ) : (
        <View style={styles.chipRow}>
          {barbers.map((b) => {
            const active = selectedBarber?.uid === b.uid;
            return (
              <TouchableOpacity
                key={b.uid}
                style={[styles.barberChip, active && styles.chipSelected]}
                onPress={() => setSelectedBarber(b)}
                activeOpacity={0.8}
              >
                <View style={[styles.barberAvatar, active && styles.avatarSelected]}>
                  <Text style={[styles.barberAvatarText, active && styles.avatarTextSelected]}>
                    {b.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[styles.barberName, active && styles.chipTextSelected]}
                  numberOfLines={1}
                >
                  {b.displayName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ─── 2. Service selection ─────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Servicios</Text>
      {services.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No hay servicios disponibles</Text>
        </View>
      ) : (
        <View style={styles.servicesList}>
          {services.map((svc) => {
            const checked = selectedServices.has(svc.id);
            return (
              <TouchableOpacity
                key={svc.id}
                style={[styles.serviceRow, checked && styles.serviceRowSelected]}
                onPress={() => toggleService(svc.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Text style={styles.checkmark}>{'✓'}</Text>}
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={[styles.serviceName, checked && styles.serviceNameSelected]}>
                    {svc.name}
                  </Text>
                  <Text style={styles.serviceMeta}>
                    {svc.duration} min
                  </Text>
                </View>
                <Text style={[styles.servicePrice, checked && styles.servicePriceSelected]}>
                  {svc.price.toFixed(2)} €
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ─── Duration + price summary ─────────────────────────────────── */}
      {selectedServices.size > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {totalDuration} min · {selectedServicesList.length}{' '}
            {selectedServicesList.length === 1 ? 'servicio' : 'servicios'}
          </Text>
          <Text style={styles.summaryPrice}>{totalPrice.toFixed(2)} €</Text>
        </View>
      )}

      {/* ─── 3. Date picker (horizontal scroll) ──────────────────────── */}
      <Text style={styles.sectionLabel}>Fecha</Text>
      {!openingHours ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Horarios no disponibles</Text>
        </View>
      ) : (
        <FlatList
          data={dates}
          extraData={barberUnavailableDates}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.toISOString()}
          contentContainerStyle={styles.dateListContent}
          renderItem={({ item }) => {
            const key = DAY_INDEX_TO_KEY[item.getDay()];
            const shopHours = openingHours[key];
            const shopClosed = !shopHours;
            const barberOff = barberUnavailableDates.has(formatDateKey(item));
            const closed = shopClosed || barberOff;
            const active = selectedDate?.toDateString() === item.toDateString();

            return (
              <TouchableOpacity
                style={[
                  styles.dateCard,
                  active && styles.dateCardSelected,
                  closed && styles.dateCardClosed,
                ]}
                onPress={() => {
                  if (!closed) setSelectedDate(item);
                }}
                disabled={closed}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dateDayName,
                    active && styles.dateTextSelected,
                    closed && styles.dateTextClosed,
                  ]}
                >
                  {SPANISH_DAYS_SHORT[item.getDay()]}
                </Text>
                <Text
                  style={[
                    styles.dateDayNum,
                    active && styles.dateTextSelected,
                    closed && styles.dateTextClosed,
                  ]}
                >
                  {item.getDate()}
                </Text>
                <Text
                  style={[
                    styles.dateMonth,
                    active && styles.dateTextSelected,
                    closed && styles.dateTextClosed,
                  ]}
                >
                  {SPANISH_MONTHS[item.getMonth()]}
                </Text>
                {shopClosed && <Text style={styles.closedLabel}>Cerrado</Text>}
                {!shopClosed && barberOff && (
                  <Text style={styles.closedLabel}>No trabaja</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ─── 4. Time slots ────────────────────────────────────────────── */}
      {selectedDate && selectedServices.size > 0 && (
        <>
          <Text style={styles.sectionLabel}>Horario</Text>
          {loadingSlots ? (
            <ActivityIndicator color={GOLD} style={{ marginVertical: 16 }} />
          ) : barberDayOff ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Este barbero no trabaja este día</Text>
            </View>
          ) : !todayHours ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>La barbería está cerrada este día</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No hay horarios disponibles para la duración seleccionada
              </Text>
            </View>
          ) : allSlotsTaken ? (
            <View style={styles.waitlistBox}>
              <Text style={styles.waitlistTitle}>Sin disponibilidad</Text>
              <Text style={styles.waitlistDesc}>
                Todos los horarios estan ocupados para este dia y barbero.
              </Text>
              <TouchableOpacity
                style={[styles.waitlistBtn, joiningWaitlist && { opacity: 0.6 }]}
                onPress={handleJoinWaitlist}
                disabled={joiningWaitlist}
                activeOpacity={0.85}
              >
                {joiningWaitlist ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.waitlistBtnText}>Unirse a lista de espera</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((slot) => {
                const active = selectedSlot === slot.time;
                return (
                  <TouchableOpacity
                    key={slot.time}
                    style={[
                      styles.slot,
                      active && styles.slotSelected,
                      !slot.available && styles.slotDisabled,
                    ]}
                    onPress={() => {
                      if (slot.available) setSelectedSlot(slot.time);
                    }}
                    disabled={!slot.available}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        active && styles.slotTextSelected,
                        !slot.available && styles.slotTextDisabled,
                      ]}
                    >
                      {slot.time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* ─── 5. Promo code ─────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.promoToggle}
        onPress={() => setPromoExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <Text style={styles.promoToggleText}>
          {promoExpanded ? '▾' : '▸'} ¿Tienes un código promocional?
        </Text>
      </TouchableOpacity>

      {promoExpanded && (
        <View style={styles.promoSection}>
          {promoApplied ? (
            <View style={styles.promoApplied}>
              <View style={styles.promoAppliedLeft}>
                <Text style={styles.promoCheckmark}>{'✓'}</Text>
                <View>
                  <Text style={styles.promoAppliedCode}>{promoApplied.code}</Text>
                  <Text style={styles.promoAppliedDiscount}>
                    -{promoApplied.type === 'percentage'
                      ? `${promoApplied.value}%`
                      : `${promoApplied.value.toFixed(2)} EUR`}
                    {' '}({discountAmount.toFixed(2)} EUR)
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleRemovePromo}>
                <Text style={styles.promoRemove}>Quitar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promoInputRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="Codigo"
                placeholderTextColor={MUTED}
                value={promoInput}
                onChangeText={(t) => {
                  setPromoInput(t.toUpperCase());
                  setPromoError('');
                }}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.promoApplyBtn, promoLoading && { opacity: 0.6 }]}
                onPress={handleApplyPromo}
                disabled={promoLoading}
              >
                {promoLoading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.promoApplyBtnText}>Aplicar</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          {!!promoError && <Text style={styles.promoErrorText}>{promoError}</Text>}
        </View>
      )}

      {/* ─── Discount summary ──────────────────────────────────────────── */}
      {promoApplied && totalPrice > 0 && (
        <View style={styles.discountSummary}>
          <View style={styles.discountRow}>
            <Text style={styles.discountLabel}>Subtotal</Text>
            <Text style={styles.discountValue}>{totalPrice.toFixed(2)} EUR</Text>
          </View>
          <View style={styles.discountRow}>
            <Text style={[styles.discountLabel, { color: '#10B981' }]}>Descuento ({promoApplied.code})</Text>
            <Text style={[styles.discountValue, { color: '#10B981' }]}>-{discountAmount.toFixed(2)} EUR</Text>
          </View>
          <View style={[styles.discountRow, { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8 }]}>
            <Text style={[styles.discountLabel, { color: GOLD, fontWeight: '800' }]}>Total</Text>
            <Text style={[styles.discountValue, { color: GOLD, fontSize: 18, fontWeight: '800' }]}>{finalPrice.toFixed(2)} EUR</Text>
          </View>
        </View>
      )}

      {/* ─── 6. Payment method ──────────────────────────────────────── */}
      {selectedSlot && paymentConfig && (
        <>
          <Text style={styles.sectionLabel}>Método de pago</Text>
          <View style={styles.paymentList}>
            {paymentConfig.paymentMethods.cash && (
              <TouchableOpacity
                style={[
                  styles.paymentCard,
                  selectedPayment === 'cash' && styles.paymentCardSelected,
                ]}
                onPress={() => setSelectedPayment('cash')}
                activeOpacity={0.8}
              >
                <View style={styles.paymentCardHeader}>
                  <Text style={styles.paymentIcon}>{'💵'}</Text>
                  <View style={styles.paymentCardInfo}>
                    <Text
                      style={[
                        styles.paymentCardTitle,
                        selectedPayment === 'cash' && styles.paymentCardTitleSelected,
                      ]}
                    >
                      Pagar en caja
                    </Text>
                    <Text style={styles.paymentCardDesc}>
                      Paga en efectivo o tarjeta en el local
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.paymentRadio,
                      selectedPayment === 'cash' && styles.paymentRadioSelected,
                    ]}
                  >
                    {selectedPayment === 'cash' && <View style={styles.paymentRadioDot} />}
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {paymentConfig.paymentMethods.bizum && (
              <TouchableOpacity
                style={[
                  styles.paymentCard,
                  selectedPayment === 'bizum' && styles.paymentCardSelected,
                ]}
                onPress={() => setSelectedPayment('bizum')}
                activeOpacity={0.8}
              >
                <View style={styles.paymentCardHeader}>
                  <Text style={styles.paymentIcon}>{'📱'}</Text>
                  <View style={styles.paymentCardInfo}>
                    <Text
                      style={[
                        styles.paymentCardTitle,
                        selectedPayment === 'bizum' && styles.paymentCardTitleSelected,
                      ]}
                    >
                      Bizum
                    </Text>
                    <Text style={styles.paymentCardDesc}>
                      Envia un Bizum al {paymentConfig.bizumPhone ?? ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.paymentRadio,
                      selectedPayment === 'bizum' && styles.paymentRadioSelected,
                    ]}
                  >
                    {selectedPayment === 'bizum' && <View style={styles.paymentRadioDot} />}
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {paymentConfig.paymentMethods.paypal && (
              <TouchableOpacity
                style={[
                  styles.paymentCard,
                  selectedPayment === 'paypal' && styles.paymentCardSelected,
                ]}
                onPress={() => setSelectedPayment('paypal')}
                activeOpacity={0.8}
              >
                <View style={styles.paymentCardHeader}>
                  <Text style={styles.paymentIcon}>{'🅿️'}</Text>
                  <View style={styles.paymentCardInfo}>
                    <Text
                      style={[
                        styles.paymentCardTitle,
                        selectedPayment === 'paypal' && styles.paymentCardTitleSelected,
                      ]}
                    >
                      PayPal
                    </Text>
                    <Text style={styles.paymentCardDesc}>Paga por PayPal</Text>
                  </View>
                  <View
                    style={[
                      styles.paymentRadio,
                      selectedPayment === 'paypal' && styles.paymentRadioSelected,
                    ]}
                  >
                    {selectedPayment === 'paypal' && <View style={styles.paymentRadioDot} />}
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {paymentConfig.paymentMethods.bankTransfer && (
              <TouchableOpacity
                style={[
                  styles.paymentCard,
                  selectedPayment === 'bankTransfer' && styles.paymentCardSelected,
                ]}
                onPress={() => setSelectedPayment('bankTransfer')}
                activeOpacity={0.8}
              >
                <View style={styles.paymentCardHeader}>
                  <Text style={styles.paymentIcon}>{'🏦'}</Text>
                  <View style={styles.paymentCardInfo}>
                    <Text
                      style={[
                        styles.paymentCardTitle,
                        selectedPayment === 'bankTransfer' && styles.paymentCardTitleSelected,
                      ]}
                    >
                      Transferencia Bancaria
                    </Text>
                    <Text style={styles.paymentCardDesc}>
                      Transfera a: {paymentConfig.bankIBAN ?? 'IBAN no configurado'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.paymentRadio,
                      selectedPayment === 'bankTransfer' && styles.paymentRadioSelected,
                    ]}
                  >
                    {selectedPayment === 'bankTransfer' && <View style={styles.paymentRadioDot} />}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* ─── 7. Confirm button ────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.confirmBtn, !canConfirm && styles.btnDisabled]}
        onPress={handleBook}
        disabled={!canConfirm}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.confirmBtnText}>
            {finalPrice > 0
              ? `Confirmar reserva · ${finalPrice.toFixed(2)} EUR`
              : 'Confirmar reserva'}
          </Text>
        )}
      </TouchableOpacity>

      {/* ─── Payment instructions modal ───────────────────────────────── */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPaymentModal(false);
          navigation.navigate('MyAppointments');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalCheckmark}>{'✓'}</Text>
            <Text style={styles.modalTitle}>Cita reservada</Text>

            {paymentModalInfo?.method === 'bizum' && (
              <>
                <Text style={styles.modalDesc}>
                  Envia {paymentModalInfo.amount.toFixed(2)}{'€'} al numero
                </Text>
                <Text style={styles.modalHighlight}>
                  {paymentModalInfo.bizumPhone ?? ''}
                </Text>
                <Text style={styles.modalSubDesc}>mediante Bizum</Text>
                {!!createdAppointmentId && (
                  <View style={styles.modalRefBox}>
                    <Text style={styles.modalRefLabel}>Pon este número como concepto</Text>
                    <Text style={styles.modalRefValue}>
                      {createdAppointmentId.slice(-8).toUpperCase()}
                    </Text>
                  </View>
                )}
              </>
            )}

            {paymentModalInfo?.method === 'bankTransfer' && (
              <>
                <Text style={styles.modalDesc}>
                  Transfera {paymentModalInfo.amount.toFixed(2)}{'€'} a:
                </Text>
                <Text style={styles.modalHighlight}>
                  {paymentModalInfo.bankIBAN ?? ''}
                </Text>
                <Text style={styles.modalSubDesc}>
                  Titular: {paymentModalInfo.bankAccountHolder ?? ''}
                </Text>
                {!!createdAppointmentId && (
                  <View style={styles.modalRefBox}>
                    <Text style={styles.modalRefLabel}>Pon este número como concepto</Text>
                    <Text style={styles.modalRefValue}>
                      {createdAppointmentId.slice(-8).toUpperCase()}
                    </Text>
                  </View>
                )}
              </>
            )}

            {paymentModalInfo?.method === 'paypal' && (
              <>
                <Text style={styles.modalDesc}>
                  Paga {paymentModalInfo.amount.toFixed(2)}{'€'} por PayPal
                </Text>
                <TouchableOpacity
                  style={styles.modalPaypalBtn}
                  onPress={() => {
                    const url = `https://paypal.me/${paymentModalInfo.paypalUsername ?? ''}/${paymentModalInfo.amount.toFixed(2)}`;
                    Linking.openURL(url);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalPaypalBtnText}>Abrir PayPal</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={async () => {
                if (createdAppointmentId) {
                  try {
                    await updateDoc(doc(db, 'appointments', createdAppointmentId), {
                      paymentStatus: 'client_confirmed',
                    });
                  } catch (e) {
                    console.error('[BookScreen] Error updating payment status:', e);
                  }
                }
                setShowPaymentModal(false);
                if (pendingCalendarEvent) {
                  Alert.alert(
                    '¿Guardar en calendario?',
                    'Añade tu cita al calendario para no olvidarla.',
                    [
                      {
                        text: '📅 Guardar',
                        onPress: async () => {
                          await addAppointmentToCalendar(pendingCalendarEvent);
                          navigation.navigate('MyAppointments');
                        },
                      },
                      {
                        text: 'Ahora no',
                        style: 'cancel',
                        onPress: () => navigation.navigate('MyAppointments'),
                      },
                    ],
                  );
                } else {
                  navigation.navigate('MyAppointments');
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalConfirmBtnText}>Ya he pagado</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowPaymentModal(false);
                navigation.navigate('MyAppointments');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSkipText}>Pagare mas tarde</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 48, gap: 16 },
  loadingText: { color: MUTED, marginTop: 12, fontSize: 14 },

  title: { fontSize: 22, fontWeight: '800', color: TEXT },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },

  /* Barber chips */
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  barberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    gap: 10,
  },
  chipSelected: { borderColor: GOLD, backgroundColor: GOLD },
  barberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GOLD + '25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSelected: { backgroundColor: 'rgba(0,0,0,0.15)' },
  barberAvatarText: { color: GOLD, fontSize: 14, fontWeight: '800' },
  avatarTextSelected: { color: '#000' },
  barberName: { fontSize: 14, fontWeight: '600', color: TEXT, maxWidth: 120 },
  chipTextSelected: { color: '#000' },

  /* Services */
  servicesList: { gap: 8 },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  serviceRowSelected: { borderColor: GOLD },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: MUTED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  checkmark: { color: '#000', fontSize: 13, fontWeight: '800' },
  serviceInfo: { flex: 1, gap: 2 },
  serviceName: { fontSize: 15, fontWeight: '600', color: TEXT },
  serviceNameSelected: { color: TEXT },
  serviceMeta: { fontSize: 12, color: MUTED },
  servicePrice: { fontSize: 15, fontWeight: '700', color: MUTED },
  servicePriceSelected: { color: GOLD },

  /* Summary bar */
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: GOLD + '15',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: GOLD + '30',
  },
  summaryText: { fontSize: 13, fontWeight: '600', color: GOLD },
  summaryPrice: { fontSize: 16, fontWeight: '800', color: GOLD },

  /* Date picker */
  dateListContent: { gap: 10, paddingVertical: 4 },
  dateCard: {
    width: 64,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    alignItems: 'center',
    gap: 2,
  },
  dateCardSelected: { borderColor: GOLD, backgroundColor: GOLD },
  dateCardClosed: { opacity: 0.4 },
  dateDayName: { fontSize: 12, fontWeight: '600', color: MUTED, textTransform: 'uppercase' },
  dateDayNum: { fontSize: 20, fontWeight: '800', color: TEXT },
  dateMonth: { fontSize: 11, fontWeight: '600', color: MUTED },
  dateTextSelected: { color: '#000' },
  dateTextClosed: { color: MUTED },
  closedLabel: { fontSize: 9, fontWeight: '700', color: MUTED, marginTop: 2 },

  /* Time slots */
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  slotSelected: { borderColor: GOLD, backgroundColor: GOLD },
  slotDisabled: { opacity: 0.35 },
  slotText: { fontSize: 15, fontWeight: '600', color: TEXT },
  slotTextSelected: { color: '#000' },
  slotTextDisabled: { color: MUTED },

  /* Confirm */
  confirmBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

  /* Shared */
  emptyBox: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: MUTED, textAlign: 'center' },

  /* Promo code */
  promoToggle: { paddingVertical: 4 },
  promoToggleText: { fontSize: 14, fontWeight: '600', color: GOLD },
  promoSection: { gap: 8 },
  promoInputRow: { flexDirection: 'row', gap: 10 },
  promoInput: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 1,
  },
  promoApplyBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoApplyBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  promoErrorText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10B981' + '15',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981' + '30',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  promoAppliedLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  promoCheckmark: { fontSize: 18, color: '#10B981', fontWeight: '800' },
  promoAppliedCode: { fontSize: 15, fontWeight: '800', color: TEXT },
  promoAppliedDiscount: { fontSize: 12, fontWeight: '600', color: '#10B981' },
  promoRemove: { fontSize: 13, fontWeight: '700', color: '#EF4444' },

  /* Discount summary */
  discountSummary: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 6,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountLabel: { fontSize: 13, fontWeight: '600', color: MUTED },
  discountValue: { fontSize: 14, fontWeight: '700', color: TEXT },

  /* Waitlist */
  waitlistBox: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOLD + '30',
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  waitlistTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  waitlistDesc: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 18 },
  waitlistBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  waitlistBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },

  /* Payment method */
  paymentList: { gap: 10 },
  paymentCard: {
    flexDirection: 'column',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 16,
  },
  paymentCardSelected: { borderColor: GOLD },
  paymentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIcon: { fontSize: 24 },
  paymentCardInfo: { flex: 1, gap: 2 },
  paymentCardTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  paymentCardTitleSelected: { color: GOLD },
  paymentCardDesc: { fontSize: 12, color: MUTED },
  paymentRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: MUTED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentRadioSelected: { borderColor: GOLD },
  paymentRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GOLD,
  },

  /* Payment modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 360,
  },
  modalCheckmark: {
    fontSize: 40,
    color: '#4CAF50',
    width: 72,
    height: 72,
    lineHeight: 72,
    textAlign: 'center',
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#4CAF50',
    overflow: 'hidden',
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: TEXT },
  modalDesc: { fontSize: 15, color: MUTED, textAlign: 'center', lineHeight: 22 },
  modalHighlight: {
    fontSize: 24,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 1,
    marginVertical: 4,
  },
  modalSubDesc: { fontSize: 13, color: MUTED },
  modalRefBox: {
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD + '55',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center' as const,
    marginTop: 6,
    gap: 2,
  },
  modalRefLabel: { fontSize: 11, color: MUTED, fontWeight: '600' as const },
  modalRefValue: { fontSize: 18, fontWeight: '800' as const, color: GOLD, letterSpacing: 2 },
  modalPaypalBtn: {
    backgroundColor: '#0070BA',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  modalPaypalBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  modalConfirmBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  modalConfirmBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  modalSkipText: { color: MUTED, fontSize: 13, fontWeight: '600', marginTop: 4 },
});
