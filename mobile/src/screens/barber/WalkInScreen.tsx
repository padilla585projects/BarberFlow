import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from '../../services/firebase';
import app from '../../services/firebase';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../../contexts/AuthContext';
import type { BarberStackParamList } from '../../navigation/BarberNavigator';
import type { Service } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const SLOT_GRID_MINUTES = 30;

const SPANISH_DAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const SPANISH_MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const DAY_INDEX_TO_KEY: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

interface DayWindow {
  openMin: number;
  closeMin: number;
  breakStartMin: number | null;
  breakEndMin: number | null;
}

interface BusySlot {
  startMin: number;
  endMin: number;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today plus the next 6 days — a walk-in is almost always right now. */
function buildDateRange(): Date[] {
  const out: Date[] = [];
  const now = new Date();
  for (let i = 0; i <= 6; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(0, 0, 0, 0);
    out.push(d);
  }
  return out;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Register someone who turned up without an appointment.
 *
 * The grid here is only a convenience for picking a time — the server decides
 * whether the slot is really free, and refuses if it is not. Nothing shown on
 * this screen is trusted by `bookAppointment`.
 */
export function WalkInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BarberStackParamList>>();
  const { activeBarbershopId } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [shopHours, setShopHours] = useState<
    Record<string, { open?: boolean; from?: string; to?: string }>
  >({});
  const [schedule, setSchedule] = useState<{
    weeklyHours?: Record<string, any>;
    daysOff?: string[];
  } | null>(null);
  const [busy, setBusy] = useState<BusySlot[]>([]);

  const dates = useMemo(buildDateRange, []);
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');

  /* ── Shop catalogue and the barber's own schedule ───────────────────── */

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!activeBarbershopId || !user) {
        setLoading(false);
        return;
      }
      try {
        const [shopSnap, schedSnap] = await Promise.all([
          getDoc(doc(db, 'barbershops', activeBarbershopId)),
          getDoc(doc(db, 'users', user.uid, 'schedule', 'config')),
        ]);

        if (shopSnap.exists()) {
          const data = shopSnap.data();
          setServices(
            ((data.services as any[]) ?? []).map((s: any) => ({
              id: s.id ?? '',
              name: s.name ?? '',
              price: s.price ?? 0,
              duration: s.duration ?? 30,
            })),
          );
          setShopHours((data.openingHours as Record<string, any>) ?? {});
        }
        setSchedule(schedSnap.exists() ? (schedSnap.data() as any) : null);
      } catch (err) {
        console.error('[WalkInScreen] Error loading config:', err);
        Alert.alert('Error', 'No se pudo cargar la información de la barbería.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeBarbershopId]);

  /* ── What is already booked that day ────────────────────────────────── */

  const refreshDay = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || !activeBarbershopId) return;

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      const snap = await getDocs(
        query(
          collection(db, 'appointments'),
          where('barbershopId', '==', activeBarbershopId),
          where('barberId', '==', user.uid),
          where('date', '>=', Timestamp.fromDate(dayStart)),
          where('date', '<=', Timestamp.fromDate(dayEnd)),
        ),
      );

      setBusy(
        snap.docs
          .filter((d) => d.data().status !== 'cancelled')
          .map((d) => {
            const data = d.data();
            const svc = (data.services as { duration?: number }[] | undefined) ?? [];
            const dur = svc.length > 0
              ? svc.reduce((sum, x) => sum + (x.duration ?? 30), 0)
              : 60;
            const startMin = timeToMinutes(data.timeSlot as string);
            return { startMin, endMin: startMin + dur };
          }),
      );
    } catch (err) {
      console.error('[WalkInScreen] Error fetching agenda:', err);
    }
  }, [activeBarbershopId, selectedDate]);

  useEffect(() => {
    refreshDay();
  }, [refreshDay]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate, selectedServices]);

  /* ── Derived ────────────────────────────────────────────────────────── */

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

  /** Barber's own schedule wins; the shop's opening hours are the fallback. */
  const windowFor = useCallback(
    (date: Date): DayWindow | null => {
      const dayKey = DAY_INDEX_TO_KEY[date.getDay()];

      if (schedule) {
        if ((schedule.daysOff ?? []).includes(formatDateKey(date))) return null;
        const day = schedule.weeklyHours?.[dayKey];
        if (day) {
          if (!day.active) return null;
          return {
            openMin: timeToMinutes(day.start),
            closeMin: timeToMinutes(day.end),
            breakStartMin: day.breakStart ? timeToMinutes(day.breakStart) : null,
            breakEndMin: day.breakEnd ? timeToMinutes(day.breakEnd) : null,
          };
        }
      }

      const shopDay = shopHours[dayKey];
      if (!shopDay?.open || !shopDay.from || !shopDay.to) return null;
      return {
        openMin: timeToMinutes(shopDay.from),
        closeMin: timeToMinutes(shopDay.to),
        breakStartMin: null,
        breakEndMin: null,
      };
    },
    [schedule, shopHours],
  );

  const dayWindow = useMemo(() => windowFor(selectedDate), [windowFor, selectedDate]);

  const slots = useMemo(() => {
    if (!dayWindow || totalDuration <= 0) return [];

    const now = new Date();
    const isToday = isSameDay(selectedDate, now);
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const out: { time: string; available: boolean }[] = [];
    for (
      let m = dayWindow.openMin;
      m + totalDuration <= dayWindow.closeMin;
      m += SLOT_GRID_MINUTES
    ) {
      const end = m + totalDuration;
      const overlapsBreak =
        dayWindow.breakStartMin !== null &&
        dayWindow.breakEndMin !== null &&
        m < dayWindow.breakEndMin &&
        end > dayWindow.breakStartMin;
      const overlapsBooked = busy.some((b) => m < b.endMin && end > b.startMin);
      const inThePast = isToday && end <= nowMin;

      out.push({
        time: minutesToTime(m),
        available: !overlapsBreak && !overlapsBooked && !inThePast,
      });
    }
    return out;
  }, [dayWindow, totalDuration, busy, selectedDate]);

  const toggleService = (id: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSubmit =
    !!activeBarbershopId && selectedServices.size > 0 && !!selectedSlot && !submitting;

  /* ── Create ─────────────────────────────────────────────────────────── */

  const handleCreate = async () => {
    const user = auth.currentUser;
    if (!user || !activeBarbershopId || !selectedSlot) return;

    try {
      setSubmitting(true);

      const bookFn = httpsCallable<Record<string, unknown>, { appointmentId: string }>(
        getFunctions(app, 'europe-west1'),
        'bookAppointment',
      );

      await bookFn({
        barbershopId: activeBarbershopId,
        barberId: user.uid,
        date: formatDateKey(selectedDate),
        timeSlot: selectedSlot,
        serviceIds: selectedServicesList.map((s) => s.id),
        paymentMethod: 'cash',
        isWalkIn: true,
        clientName: clientName.trim(),
      });

      const name = clientName.trim();
      Alert.alert(
        'Cita añadida',
        `${name || 'El cliente'} queda registrado a las ${selectedSlot}. El hueco ya no está disponible.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      const code = (err as { code?: string })?.code;
      const message = (err as { message?: string })?.message;

      if (code === 'functions/already-exists') {
        Alert.alert('Hueco ocupado', message ?? 'Ese hueco acaba de ocuparse. Elige otra hora.');
        setSelectedSlot(null);
        refreshDay();
        return;
      }
      if (code === 'functions/invalid-argument' || code === 'functions/permission-denied') {
        Alert.alert('No se pudo añadir', message ?? 'Revisa los datos de la cita.');
        return;
      }

      console.error('[WalkInScreen] Error creating walk-in:', err);
      Alert.alert('Error', 'No se pudo añadir la cita. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  if (!activeBarbershopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Sin barbería asociada</Text>
        <Text style={styles.emptySub}>
          No se encontró una barbería vinculada a tu cuenta
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>
          Registra a alguien que ha entrado sin cita. El hueco deja de estar
          disponible para reservas al instante.
        </Text>

        <Text style={styles.sectionTitle}>Día</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.row}>
            {dates.map((d) => {
              const active = isSameDay(d, selectedDate);
              const closed = !windowFor(d);
              return (
                <TouchableOpacity
                  key={d.toISOString()}
                  style={[
                    styles.dateChip,
                    active && styles.dateChipActive,
                    closed && styles.chipDisabled,
                  ]}
                  onPress={() => setSelectedDate(d)}
                  disabled={closed}
                >
                  <Text style={[styles.dateDay, active && styles.chipTextActive]}>
                    {SPANISH_DAYS_SHORT[d.getDay()]}
                  </Text>
                  <Text style={[styles.dateNum, active && styles.chipTextActive]}>
                    {d.getDate()}
                  </Text>
                  <Text style={[styles.dateMonth, active && styles.chipTextActive]}>
                    {SPANISH_MONTHS[d.getMonth()]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <Text style={styles.sectionTitle}>Servicios</Text>
        {services.length === 0 ? (
          <Text style={styles.emptySub}>
            La barbería no tiene servicios configurados.
          </Text>
        ) : (
          services.map((s) => {
            const active = selectedServices.has(s.id);
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.serviceRow, active && styles.serviceRowActive]}
                onPress={() => toggleService(s.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{s.name}</Text>
                  <Text style={styles.serviceMeta}>{s.duration} min</Text>
                </View>
                <Text style={[styles.servicePrice, active && { color: GOLD }]}>
                  {s.price.toFixed(2)} €
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <Text style={styles.sectionTitle}>Hora</Text>
        {selectedServices.size === 0 ? (
          <Text style={styles.emptySub}>Elige primero al menos un servicio.</Text>
        ) : !dayWindow ? (
          <Text style={styles.emptySub}>No trabajas ese día.</Text>
        ) : slots.length === 0 ? (
          <Text style={styles.emptySub}>
            Los servicios elegidos no caben en el horario de ese día.
          </Text>
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
                  onPress={() => slot.available && setSelectedSlot(slot.time)}
                  disabled={!slot.available}
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

        <Text style={styles.sectionTitle}>Nombre del cliente</Text>
        <TextInput
          style={styles.input}
          value={clientName}
          onChangeText={setClientName}
          placeholder="Opcional — para reconocerlo en la agenda"
          placeholderTextColor={MUTED}
          maxLength={60}
        />

        {selectedServices.size > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryLine}>
              {totalDuration} min · {totalPrice.toFixed(2)} €
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleCreate}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.submitText}>Añadir a mi agenda</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: 20, paddingBottom: 48 },
  intro: { fontSize: 14, color: MUTED, lineHeight: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginTop: 22, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },

  dateChip: {
    width: 60, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
  },
  dateChipActive: { backgroundColor: GOLD, borderColor: GOLD },
  chipDisabled: { opacity: 0.3 },
  dateDay: { fontSize: 11, color: MUTED, textTransform: 'uppercase' },
  dateNum: { fontSize: 18, fontWeight: '700', color: TEXT },
  dateMonth: { fontSize: 11, color: MUTED },
  chipTextActive: { color: '#000' },

  serviceRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, marginBottom: 8,
  },
  serviceRowActive: { borderColor: GOLD },
  serviceName: { fontSize: 15, fontWeight: '600', color: TEXT },
  serviceMeta: { fontSize: 12, color: MUTED, marginTop: 2 },
  servicePrice: { fontSize: 15, fontWeight: '700', color: TEXT },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
  },
  slotSelected: { borderColor: GOLD, backgroundColor: GOLD },
  slotDisabled: { opacity: 0.35 },
  slotText: { fontSize: 15, fontWeight: '600', color: TEXT },
  slotTextSelected: { color: '#000' },
  slotTextDisabled: { color: MUTED },

  input: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: TEXT,
  },

  summary: {
    marginTop: 22, padding: 14, borderRadius: 12,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
  },
  summaryLine: { fontSize: 15, fontWeight: '700', color: GOLD, textAlign: 'center' },

  submitBtn: {
    marginTop: 24, backgroundColor: GOLD, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#000' },

  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 6 },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },
});
