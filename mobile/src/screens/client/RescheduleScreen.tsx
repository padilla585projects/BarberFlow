import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

/* ── Design tokens ─────────────────────────────────────────────────────────── */

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

/* ── Types ─────────────────────────────────────────────────────────────────── */

type Props = NativeStackScreenProps<ClientStackParamList, 'Reschedule'>;

interface DayHours {
  open: string;  // "09:00"
  close: string; // "20:00"
}

interface ExistingAppointment {
  timeSlot: string;
  totalDuration: number;
}

interface BarberDaySchedule {
  active: boolean;
  start: string;
  end: string;
  breakStart?: string;
  breakEnd?: string;
}

interface BarberSchedule {
  weeklyHours: Record<string, BarberDaySchedule>;
  daysOff: string[];
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

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

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildDateRange(): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

function barberWorksOnDate(
  date: Date,
  schedule: BarberSchedule,
): { works: false } | { works: true; daySchedule: BarberDaySchedule } {
  const dateStr = formatDateKey(date);
  if (schedule.daysOff?.includes(dateStr)) return { works: false };

  const dayKey = DAY_INDEX_TO_KEY[date.getDay()];
  const daySchedule = schedule.weeklyHours?.[dayKey];
  if (!daySchedule || !daySchedule.active) return { works: false };

  return { works: true, daySchedule };
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function RescheduleScreen({ route, navigation }: Props) {
  const { appointmentId, barberId, barbershopId, totalDuration } = route.params;

  const [barberSchedule, setBarberSchedule] = useState<BarberSchedule | null>(null);
  const [shopOpeningHours, setShopOpeningHours] = useState<Record<string, DayHours | null> | null>(null);
  const [existingAppointments, setExistingAppointments] = useState<ExistingAppointment[]>([]);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dates = useMemo(buildDateRange, []);

  /* ── Initial fetch: barber schedule + shop hours ─────────────────────── */

  useEffect(() => {
    const load = async () => {
      try {
        const [scheduleSnap, shopSnap] = await Promise.all([
          getDoc(doc(db, 'users', barberId, 'schedule', 'config')),
          getDoc(doc(db, 'barbershops', barbershopId)),
        ]);

        if (scheduleSnap.exists()) {
          setBarberSchedule(scheduleSnap.data() as BarberSchedule);
        }

        if (shopSnap.exists()) {
          const shopData = shopSnap.data();
          if (shopData.openingHours) {
            const raw = shopData.openingHours as Record<string, { open: boolean; from?: string; to?: string } | null>;
            const mapped: Record<string, DayHours | null> = {};
            for (const [day, val] of Object.entries(raw)) {
              if (val && val.open && val.from && val.to) {
                mapped[day] = { open: val.from, close: val.to };
              } else {
                mapped[day] = null;
              }
            }
            setShopOpeningHours(mapped);
          }
        }
      } catch (err) {
        console.error('[RescheduleScreen] Error loading data:', err);
        Alert.alert('Error', 'No se pudo cargar la información del barbero.');
      } finally {
        setLoadingInit(false);
      }
    };
    load();
  }, [barberId, barbershopId]);

  /* ── Fetch existing appointments when date changes ───────────────────── */

  useEffect(() => {
    if (!selectedDate) {
      setExistingAppointments([]);
      return;
    }

    const fetchAppointments = async () => {
      setLoadingSlots(true);
      try {
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);

        const q = query(
          collection(db, 'appointments'),
          where('barberId', '==', barberId),
          where('date', '>=', Timestamp.fromDate(dayStart)),
          where('date', '<=', Timestamp.fromDate(dayEnd)),
          where('status', 'in', ['pending', 'confirmed']),
        );
        const snap = await getDocs(q);

        const appts: ExistingAppointment[] = snap.docs
          .filter((d) => d.id !== appointmentId) // exclude current appointment
          .map((d) => {
            const data = d.data();
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
        console.error('[RescheduleScreen] Error fetching appointments:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAppointments();
  }, [selectedDate, barberId, appointmentId]);

  // Reset slot when date changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

  /* ── Derived values ──────────────────────────────────────────────────── */

  const barberUnavailableDates = useMemo(() => {
    const set = new Set<string>();
    if (!barberSchedule) return set;
    for (const d of dates) {
      const result = barberWorksOnDate(d, barberSchedule);
      if (!result.works) set.add(formatDateKey(d));
    }
    return set;
  }, [barberSchedule, dates]);

  const barberDayConfig = useMemo((): BarberDaySchedule | null => {
    if (!selectedDate || !barberSchedule) return null;
    const result = barberWorksOnDate(selectedDate, barberSchedule);
    return result.works ? result.daySchedule : null;
  }, [selectedDate, barberSchedule]);

  const barberDayOff = useMemo(() => {
    if (!selectedDate || !barberSchedule) return false;
    return !barberWorksOnDate(selectedDate, barberSchedule).works;
  }, [selectedDate, barberSchedule]);

  const todayHours = useMemo((): DayHours | null => {
    if (!selectedDate) return null;
    const dayKey = DAY_INDEX_TO_KEY[selectedDate.getDay()];

    if (barberDayConfig) {
      return { open: barberDayConfig.start, close: barberDayConfig.end };
    }
    if (barberDayOff) return null;

    if (!shopOpeningHours) return null;
    return shopOpeningHours[dayKey] ?? null;
  }, [selectedDate, barberDayConfig, barberDayOff, shopOpeningHours]);

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

  /* ── Confirm reschedule ──────────────────────────────────────────────── */

  const handleConfirm = async () => {
    if (!selectedDate || !selectedSlot) return;

    try {
      setSubmitting(true);

      const [hours, minutes] = selectedSlot.split(':').map(Number);
      const newDate = new Date(selectedDate);
      newDate.setHours(hours, minutes, 0, 0);

      await updateDoc(doc(db, 'appointments', appointmentId), {
        date: Timestamp.fromDate(newDate),
        timeSlot: selectedSlot,
      });

      Alert.alert('¡Listo!', 'Cita reprogramada correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('[RescheduleScreen] Error rescheduling:', err);
      Alert.alert('Error', 'No se pudo reprogramar la cita. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ─────────────────────────────────────────────────────────── */

  if (loadingInit) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backIcon}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reprogramar cita</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* ─── Date picker ──────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Selecciona una fecha</Text>
        <FlatList
          data={dates}
          extraData={barberUnavailableDates}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.toISOString()}
          contentContainerStyle={styles.dateListContent}
          renderItem={({ item }) => {
            const dayKey = DAY_INDEX_TO_KEY[item.getDay()];
            const shopClosed = shopOpeningHours ? !shopOpeningHours[dayKey] : false;
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
                onPress={() => { if (!closed) setSelectedDate(item); }}
                disabled={closed}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateDayName, active && styles.dateTextSelected, closed && styles.dateTextClosed]}>
                  {SPANISH_DAYS_SHORT[item.getDay()]}
                </Text>
                <Text style={[styles.dateDayNum, active && styles.dateTextSelected, closed && styles.dateTextClosed]}>
                  {item.getDate()}
                </Text>
                <Text style={[styles.dateMonth, active && styles.dateTextSelected, closed && styles.dateTextClosed]}>
                  {SPANISH_MONTHS[item.getMonth()]}
                </Text>
                {shopClosed && <Text style={styles.closedLabel}>Cerrado</Text>}
                {!shopClosed && barberOff && <Text style={styles.closedLabel}>No trabaja</Text>}
              </TouchableOpacity>
            );
          }}
        />

        {/* ─── Time slots ───────────────────────────────────────────────── */}
        {selectedDate && (
          <>
            <Text style={styles.sectionLabel}>Selecciona una hora</Text>
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
                <Text style={styles.emptyText}>No hay horarios disponibles para este día</Text>
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
                      onPress={() => { if (slot.available) setSelectedSlot(slot.time); }}
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

        {/* ─── Confirm button ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!selectedDate || !selectedSlot || submitting) && styles.btnDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!selectedDate || !selectedSlot || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.confirmBtnText}>
              {selectedSlot
                ? `Confirmar nueva hora · ${selectedSlot}`
                : 'Confirmar nueva hora'}
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: MUTED, marginTop: 12, fontSize: 14 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backIcon: { fontSize: 32, color: TEXT, lineHeight: 36 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT },

  /* Scroll */
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 48, gap: 16 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },

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

  /* Empty */
  emptyBox: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: MUTED, textAlign: 'center' },
});
