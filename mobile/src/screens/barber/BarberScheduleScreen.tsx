import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../../services/firebase';
import {
  saveSchedule,
  subscribeToSchedule,
  validateSchedule,
  type ScheduleData,
  type WeeklyHours,
  type DaySchedule,
} from '../../services/scheduleService';
import { BARBER_COLORS, BARBER_SPACING } from '../../theme/barberTheme';

/* ─── design tokens ─── */
const BG      = BARBER_COLORS.bgPrimary;
const SURFACE = BARBER_COLORS.bgSecondary;
const GOLD    = BARBER_COLORS.primary;
const TEXT    = BARBER_COLORS.text;
const MUTED   = BARBER_COLORS.textTertiary;
const BORDER  = '#282828';
const DANGER  = BARBER_COLORS.error;

/* ─── types ─── */
type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

/* ─── constants ─── */
const DAYS: { key: DayKey; label: string }[] = [
  { key: 'monday',    label: 'Lunes' },
  { key: 'tuesday',   label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday',  label: 'Jueves' },
  { key: 'friday',    label: 'Viernes' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
];

const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '30']) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${m}`);
  }
}

const DEFAULT_DAY: DaySchedule = {
  active: false,
  start: '09:00',
  end: '20:00',
  breakStart: null,
  breakEnd: null,
};

function buildDefaultWeekly(): WeeklyHours {
  return {
    monday:    { active: true,  start: '09:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    tuesday:   { active: true,  start: '09:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    wednesday: { active: true,  start: '09:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    thursday:  { active: true,  start: '09:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    friday:    { active: true,  start: '09:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    saturday:  { active: true,  start: '10:00', end: '14:00', breakStart: null,    breakEnd: null },
    sunday:    { active: false, start: null,     end: null,     breakStart: null,    breakEnd: null },
  };
}

/* ─── helpers ─── */
function formatDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ─── component ─── */
export function BarberScheduleScreen() {
  const navigation = useNavigation();
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(buildDefaultWeekly());
  const [daysOff, setDaysOff] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date());

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<{
    day: DayKey;
    field: 'start' | 'end' | 'breakStart' | 'breakEnd';
  } | null>(null);
  const [timePickerValue, setTimePickerValue] = useState(new Date());

  /* ─── load schedule ─── */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToSchedule(
      user.uid,
      (data) => {
        if (data) {
          if (data.weeklyHours) setWeeklyHours(data.weeklyHours);
          if (data.daysOff) setDaysOff(data.daysOff);
        }
        setLoading(false);
      },
      (error) => {
        console.error('[BarberScheduleScreen] listener error:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  /* ─── save schedule ─── */
  const handleSaveSchedule = async () => {
    const user = auth.currentUser;
    if (!user) return;

    // Validate schedule data
    const scheduleData: ScheduleData = { weeklyHours, daysOff };
    const validationErrors = validateSchedule(scheduleData);

    if (validationErrors.length > 0) {
      Alert.alert('Errores de validación', validationErrors.join('\n'));
      return;
    }

    setSaving(true);
    try {
      await saveSchedule(user.uid, scheduleData);
      Alert.alert('Guardado', 'Tu horario se ha actualizado correctamente.');
    } catch (err) {
      console.error('[BarberScheduleScreen] save error:', err);
      const errorMsg = err instanceof Error ? err.message : 'No se pudo guardar el horario. Inténtalo de nuevo.';
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  /* ─── day toggle ─── */
  const toggleDay = (day: DayKey) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        active: !prev[day].active,
        start: !prev[day].active ? (prev[day].start ?? '09:00') : prev[day].start,
        end: !prev[day].active ? (prev[day].end ?? '20:00') : prev[day].end,
      },
    }));
  };

  /* ─── time picker helpers ─── */
  const openTimePicker = (day: DayKey, field: 'start' | 'end' | 'breakStart' | 'breakEnd') => {
    const current = weeklyHours[day][field];
    const date = new Date();
    if (current) {
      const [h, m] = current.split(':').map(Number);
      date.setHours(h, m, 0, 0);
    } else {
      date.setHours(field.includes('break') ? 14 : 9, 0, 0, 0);
    }
    setTimePickerValue(date);
    setTimePickerTarget({ day, field });
    setShowTimePicker(true);
  };

  const onTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (!selectedDate || !timePickerTarget) return;

    // Work on a copy to avoid mutating the picker's internal Date object
    const rawMinutes = selectedDate.getMinutes();
    let roundedHours = selectedDate.getHours();
    let roundedMinutes: number;

    if (rawMinutes < 15) {
      roundedMinutes = 0;
    } else if (rawMinutes < 45) {
      roundedMinutes = 30;
    } else {
      roundedMinutes = 0;
      roundedHours += 1;
    }

    const rounded = new Date(selectedDate);
    rounded.setHours(roundedHours, roundedMinutes, 0, 0);

    const timeStr = `${String(roundedHours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;

    setWeeklyHours((prev) => ({
      ...prev,
      [timePickerTarget.day]: {
        ...prev[timePickerTarget.day],
        [timePickerTarget.field]: timeStr,
      },
    }));

    if (Platform.OS === 'ios') {
      setTimePickerValue(rounded);
    }
  };

  const confirmTimePicker = () => {
    setShowTimePicker(false);
    setTimePickerTarget(null);
  };

  /* ─── break toggle ─── */
  const toggleBreak = (day: DayKey) => {
    const current = weeklyHours[day];
    if (current.breakStart !== null) {
      // Remove break
      setWeeklyHours((prev) => ({
        ...prev,
        [day]: { ...prev[day], breakStart: null, breakEnd: null },
      }));
    } else {
      // Add break with defaults
      setWeeklyHours((prev) => ({
        ...prev,
        [day]: { ...prev[day], breakStart: '14:00', breakEnd: '15:00' },
      }));
    }
  };

  /* ─── days off ─── */
  const onDatePickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (!selectedDate) return;

    setDatePickerValue(selectedDate);

    if (Platform.OS === 'android') {
      addDayOff(selectedDate);
    }
  };

  const addDayOff = (date: Date) => {
    const dateStr = toDateStr(date);
    if (daysOff.includes(dateStr)) {
      Alert.alert('Duplicado', 'Esta fecha ya está en tu lista de días libres.');
      return;
    }
    setDaysOff((prev) => [...prev, dateStr].sort());
  };

  const confirmDatePicker = () => {
    setShowDatePicker(false);
    addDayOff(datePickerValue);
  };

  const removeDayOff = (dateStr: string) => {
    setDaysOff((prev) => prev.filter((d) => d !== dateStr));
  };

  /* ─── loading state ─── */
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  /* ─── render ─── */
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Templates button ── */}
        <TouchableOpacity
          style={styles.templatesBtn}
          onPress={() => (navigation as any).navigate('ScheduleTemplates')}
        >
          <Text style={styles.templatesBtnText}>{'📋'} Plantillas</Text>
        </TouchableOpacity>

        {/* ── Section: Weekly Hours ── */}
        <Text style={styles.sectionTitle}>Horario semanal</Text>
        <Text style={styles.sectionSub}>
          Configura tu horario de trabajo para cada día de la semana
        </Text>

        {DAYS.map(({ key, label }) => {
          const day = weeklyHours[key];
          return (
            <View key={key} style={styles.dayCard}>
              {/* Day header with toggle */}
              <View style={styles.dayHeader}>
                <View style={styles.dayLabelContainer}>
                  <Text style={[styles.dayLabel, !day.active && styles.dayLabelInactive]}>
                    {label}
                  </Text>
                  {day.active && day.start && day.end && (
                    <Text style={styles.dayPreview}>
                      {day.start} — {day.end}
                      {day.breakStart && day.breakEnd ? ` (Descanso: ${day.breakStart}-${day.breakEnd})` : ''}
                    </Text>
                  )}
                </View>
                <Switch
                  value={day.active}
                  onValueChange={() => toggleDay(key)}
                  trackColor={{ false: BORDER, true: GOLD + '60' }}
                  thumbColor={day.active ? GOLD : MUTED}
                />
              </View>

              {day.active && (
                <View style={styles.dayBody}>
                  {/* Working hours row */}
                  <View style={styles.timeGroup}>
                    <Text style={styles.timeGroupLabel}>Horario de trabajo</Text>
                    <View style={styles.timeRow}>
                      <View style={styles.timeInputGroup}>
                        <Text style={styles.timeInputLabel}>Entrada</Text>
                        <TouchableOpacity
                          style={styles.timePill}
                          onPress={() => openTimePicker(key, 'start')}
                        >
                          <Text style={styles.timePillText}>{day.start ?? '--:--'}</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.timeSeparator}>—</Text>

                      <View style={styles.timeInputGroup}>
                        <Text style={styles.timeInputLabel}>Salida</Text>
                        <TouchableOpacity
                          style={styles.timePill}
                          onPress={() => openTimePicker(key, 'end')}
                        >
                          <Text style={styles.timePillText}>{day.end ?? '--:--'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Break toggle + times */}
                  <TouchableOpacity
                    style={styles.breakToggle}
                    onPress={() => toggleBreak(key)}
                  >
                    <Text style={styles.breakToggleText}>
                      {day.breakStart !== null ? '— Quitar descanso' : '+ Agregar descanso'}
                    </Text>
                  </TouchableOpacity>

                  {day.breakStart !== null && (
                    <View style={styles.timeGroup}>
                      <Text style={styles.timeGroupLabel}>Descanso</Text>
                      <View style={styles.timeRow}>
                        <View style={styles.timeInputGroup}>
                          <Text style={styles.timeInputLabel}>Desde</Text>
                          <TouchableOpacity
                            style={styles.timePill}
                            onPress={() => openTimePicker(key, 'breakStart')}
                          >
                            <Text style={styles.timePillText}>{day.breakStart}</Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.timeSeparator}>—</Text>

                        <View style={styles.timeInputGroup}>
                          <Text style={styles.timeInputLabel}>Hasta</Text>
                          <TouchableOpacity
                            style={styles.timePill}
                            onPress={() => openTimePicker(key, 'breakEnd')}
                          >
                            <Text style={styles.timePillText}>{day.breakEnd ?? '--:--'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* ── Section: Days Off ── */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>Días libres</Text>
        <Text style={styles.sectionSub}>
          Agrega vacaciones, festivos u otros días que no trabajarás
        </Text>

        <TouchableOpacity
          style={styles.addDayOffBtn}
          onPress={() => {
            setDatePickerValue(new Date());
            setShowDatePicker(true);
          }}
        >
          <Text style={styles.addDayOffText}>+ Agregar día libre</Text>
        </TouchableOpacity>

        {daysOff.length > 0 ? (
          <View style={styles.daysOffList}>
            {daysOff.map((dateStr) => (
              <View key={dateStr} style={styles.dayOffItem}>
                <Text style={styles.dayOffDate}>{formatDateStr(dateStr)}</Text>
                <TouchableOpacity onPress={() => removeDayOff(dateStr)}>
                  <Text style={styles.dayOffRemove}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDaysOff}>No tienes días libres programados</Text>
        )}

        {/* Spacer for save button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Save button ── */}
      <View style={styles.saveContainer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSaveSchedule}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={BG} />
          ) : (
            <Text style={styles.saveBtnText}>Guardar horario</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Time Picker Modal ── */}
      {showTimePicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>
              {timePickerTarget
                ? `${DAYS.find((d) => d.key === timePickerTarget.day)?.label} — ${
                    timePickerTarget.field === 'start'
                      ? 'Hora de entrada'
                      : timePickerTarget.field === 'end'
                      ? 'Hora de salida'
                      : timePickerTarget.field === 'breakStart'
                      ? 'Inicio descanso'
                      : 'Fin descanso'
                  }`
                : 'Seleccionar hora'}
            </Text>
            <DateTimePicker
              value={timePickerValue}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minuteInterval={30}
              onChange={onTimeChange}
              themeVariant="dark"
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.pickerDone} onPress={confirmTimePicker}>
                <Text style={styles.pickerDoneText}>Aceptar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── Date Picker Modal ── */}
      {showDatePicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Seleccionar día libre</Text>
            <DateTimePicker
              value={datePickerValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={onDatePickerChange}
              themeVariant="dark"
            />
            {Platform.OS === 'ios' && (
              <View style={styles.pickerActions}>
                <TouchableOpacity
                  style={styles.pickerCancel}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.pickerCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerDone} onPress={confirmDatePicker}>
                  <Text style={styles.pickerDoneText}>Agregar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

/* ─── styles ─── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  content: { padding: BARBER_SPACING.lg, gap: BARBER_SPACING.md },

  /* templates button */
  templatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD + '40',
    paddingHorizontal: BARBER_SPACING.md,
    paddingVertical: BARBER_SPACING.sm,
    gap: BARBER_SPACING.sm,
  },
  templatesBtnText: { fontSize: 14, fontWeight: '700', color: GOLD },

  /* section */
  sectionTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginTop: BARBER_SPACING.md },
  sectionSub: { fontSize: 13, color: MUTED, marginBottom: BARBER_SPACING.sm },
  sectionDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: BARBER_SPACING.md,
  },

  /* day card */
  dayCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: BARBER_SPACING.lg,
    paddingVertical: BARBER_SPACING.md,
  },
  dayLabelContainer: {
    flex: 1,
  },
  dayLabel: { fontSize: 16, fontWeight: '700', color: TEXT },
  dayLabelInactive: { color: MUTED },
  dayPreview: { fontSize: 12, color: GOLD, fontWeight: '600', marginTop: BARBER_SPACING.xs },
  dayBody: {
    paddingHorizontal: BARBER_SPACING.lg,
    paddingBottom: BARBER_SPACING.md,
    gap: BARBER_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: BARBER_SPACING.md,
  },

  /* time group */
  timeGroup: {
    gap: BARBER_SPACING.sm,
  },
  timeGroupLabel: { fontSize: 12, color: MUTED, fontWeight: '600', textTransform: 'uppercase' },

  /* time row */
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BARBER_SPACING.md,
  },
  timeInputGroup: {
    flex: 1,
    gap: BARBER_SPACING.xs,
  },
  timeInputLabel: { fontSize: 12, color: MUTED, fontWeight: '600' },
  timePill: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: BARBER_SPACING.md,
    paddingVertical: BARBER_SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  timePillText: { fontSize: 16, fontWeight: '700', color: GOLD, textAlign: 'center' },
  timeSeparator: { fontSize: 16, color: MUTED, fontWeight: '600', marginBottom: 0 },

  /* break toggle */
  breakToggle: {
    alignSelf: 'flex-start',
    paddingVertical: BARBER_SPACING.sm,
    paddingHorizontal: BARBER_SPACING.sm,
  },
  breakToggleText: { fontSize: 13, color: GOLD, fontWeight: '600' },

  /* days off */
  addDayOffBtn: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD + '40',
    borderStyle: 'dashed',
    paddingVertical: BARBER_SPACING.lg,
    alignItems: 'center',
    marginTop: BARBER_SPACING.md,
  },
  addDayOffText: { fontSize: 15, fontWeight: '700', color: GOLD },
  daysOffList: { gap: BARBER_SPACING.sm, marginTop: BARBER_SPACING.md },
  dayOffItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: BARBER_SPACING.lg,
    paddingVertical: BARBER_SPACING.md,
  },
  dayOffDate: { fontSize: 15, fontWeight: '600', color: TEXT },
  dayOffRemove: { fontSize: 13, fontWeight: '600', color: DANGER },
  noDaysOff: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    paddingVertical: BARBER_SPACING.lg,
  },

  /* save button */
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: BARBER_SPACING.lg,
    paddingBottom: 32,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: BARBER_SPACING.lg,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: BG },

  /* picker overlay */
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: BARBER_SPACING.xl,
    paddingBottom: 40,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    marginBottom: BARBER_SPACING.md,
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: BARBER_SPACING.md,
  },
  pickerDone: {
    alignSelf: 'center',
    marginTop: BARBER_SPACING.md,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: BARBER_SPACING.md,
  },
  pickerDoneText: { fontSize: 15, fontWeight: '700', color: BG },
  pickerCancel: {
    alignSelf: 'center',
    marginTop: BARBER_SPACING.md,
    paddingHorizontal: 32,
    paddingVertical: BARBER_SPACING.md,
  },
  pickerCancelText: { fontSize: 15, fontWeight: '600', color: MUTED },
});
