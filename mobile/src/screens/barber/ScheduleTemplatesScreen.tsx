import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';

/* ─── design tokens ─── */
const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const DANGER  = '#EF4444';

/* ─── types ─── */
type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

interface DayConfig {
  enabled: boolean;
  start: string;
  end: string;
  breakStart?: string;
  breakEnd?: string;
}

type ScheduleMap = Record<DayKey, DayConfig>;

interface ScheduleTemplate {
  id: string;
  name: string;
  schedule: ScheduleMap;
  createdAt: any;
}

/* ─── constants ─── */
const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'monday',    label: 'Lunes',     short: 'L' },
  { key: 'tuesday',   label: 'Martes',    short: 'M' },
  { key: 'wednesday', label: 'Miércoles', short: 'X' },
  { key: 'thursday',  label: 'Jueves',    short: 'J' },
  { key: 'friday',    label: 'Viernes',   short: 'V' },
  { key: 'saturday',  label: 'Sábado',    short: 'S' },
  { key: 'sunday',    label: 'Domingo',   short: 'D' },
];

const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 23; h++) {
  for (const m of ['00', '30']) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${m}`);
  }
}

const DEFAULT_DAY_CONFIG: DayConfig = {
  enabled: false,
  start: '09:00',
  end: '20:00',
};

function buildDefaultSchedule(): ScheduleMap {
  return {
    monday:    { enabled: true,  start: '09:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    tuesday:   { enabled: true,  start: '09:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    wednesday: { enabled: true,  start: '09:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    thursday:  { enabled: true,  start: '09:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    friday:    { enabled: true,  start: '09:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    saturday:  { enabled: true,  start: '10:00', end: '14:00' },
    sunday:    { enabled: false, start: '09:00', end: '14:00' },
  };
}

/* ─── helpers ─── */
function buildSummary(schedule: ScheduleMap): string {
  const groups: { days: string[]; range: string }[] = [];

  for (const { key, short } of DAYS) {
    const day = schedule[key];
    if (!day.enabled) continue;
    const range = `${day.start}-${day.end}`;
    const last = groups[groups.length - 1];
    if (last && last.range === range) {
      last.days.push(short);
    } else {
      groups.push({ days: [short], range });
    }
  }

  if (groups.length === 0) return 'Sin días activos';

  return groups
    .map((g) => {
      const label =
        g.days.length === 1
          ? g.days[0]
          : `${g.days[0]}-${g.days[g.days.length - 1]}`;
      return `${label}: ${g.range}`;
    })
    .join(', ');
}

/* ─── component ─── */
export function ScheduleTemplatesScreen({ navigation }: any) {
  const { activeBarbershopId } = useAuthContext();
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSchedule, setFormSchedule] = useState<ScheduleMap>(buildDefaultSchedule());
  const [savingForm, setSavingForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Time picker state
  const [timePicker, setTimePicker] = useState<{
    day: DayKey;
    field: 'start' | 'end' | 'breakStart' | 'breakEnd';
  } | null>(null);

  /* ─── load templates ─── */
  const loadTemplates = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const colRef = collection(db, 'users', user.uid, 'scheduleTemplates');
      const snap = await getDocs(colRef);
      const items: ScheduleTemplate[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as ScheduleTemplate);
      });
      items.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      setTemplates(items);
    } catch (err) {
      console.error('[ScheduleTemplates] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  /* ─── save template ─── */
  const saveTemplate = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const name = formName.trim();
    if (!name) {
      Alert.alert('Error', 'Ingresa un nombre para la plantilla.');
      return;
    }

    setSavingForm(true);
    try {
      const docId = editingId ?? `tpl_${Date.now()}`;
      const ref = doc(db, 'users', user.uid, 'scheduleTemplates', docId);
      await setDoc(ref, {
        name,
        schedule: formSchedule,
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      setFormName('');
      setFormSchedule(buildDefaultSchedule());
      setEditingId(null);
      await loadTemplates();
      Alert.alert('Guardado', 'Plantilla guardada correctamente.');
    } catch (err) {
      console.error('[ScheduleTemplates] save error:', err);
      Alert.alert('Error', 'No se pudo guardar la plantilla.');
    } finally {
      setSavingForm(false);
    }
  };

  /* ─── delete template ─── */
  const deleteTemplate = (tpl: ScheduleTemplate) => {
    Alert.alert(
      'Eliminar plantilla',
      `¿Seguro que deseas eliminar "${tpl.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
              await deleteDoc(
                doc(db, 'users', user.uid, 'scheduleTemplates', tpl.id)
              );
              await loadTemplates();
            } catch (err) {
              console.error('[ScheduleTemplates] delete error:', err);
              Alert.alert('Error', 'No se pudo eliminar la plantilla.');
            }
          },
        },
      ]
    );
  };

  /* ─── apply template ─── */
  const applyTemplate = (tpl: ScheduleTemplate) => {
    Alert.alert(
      'Aplicar plantilla',
      `¿Aplicar "${tpl.name}" a tu horario actual? Esto reemplazará tu configuración de horario semanal.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aplicar',
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;

            setApplying(tpl.id);
            try {
              if (!activeBarbershopId) {
                Alert.alert('Error', 'No se encontró tu barbería asociada.');
                setApplying(null);
                return;
              }

              // Convert template schedule to the barberSchedules format
              const weeklyHours: Record<string, any> = {};
              for (const dayKey of Object.keys(tpl.schedule) as DayKey[]) {
                const dayConf = tpl.schedule[dayKey];
                weeklyHours[dayKey] = {
                  active: dayConf.enabled,
                  start: dayConf.enabled ? dayConf.start : null,
                  end: dayConf.enabled ? dayConf.end : null,
                  breakStart: dayConf.breakStart ?? null,
                  breakEnd: dayConf.breakEnd ?? null,
                };
              }

              // Update barberSchedules
              const schedRef = doc(
                db,
                'barbershops',
                activeBarbershopId,
                'barberSchedules',
                user.uid
              );
              await setDoc(schedRef, { weeklyHours }, { merge: true });

              // Also update the user's own schedule config
              const userSchedRef = doc(
                db,
                'users',
                user.uid,
                'schedule',
                'config'
              );
              await setDoc(userSchedRef, { weeklyHours }, { merge: true });

              Alert.alert(
                'Aplicado',
                `La plantilla "${tpl.name}" se aplicó correctamente a tu horario.`
              );
            } catch (err) {
              console.error('[ScheduleTemplates] apply error:', err);
              Alert.alert('Error', 'No se pudo aplicar la plantilla.');
            } finally {
              setApplying(null);
            }
          },
        },
      ]
    );
  };

  /* ─── form helpers ─── */
  const toggleFormDay = (day: DayKey) => {
    setFormSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      },
    }));
  };

  const toggleFormBreak = (day: DayKey) => {
    setFormSchedule((prev) => {
      const current = prev[day];
      if (current.breakStart) {
        const { breakStart, breakEnd, ...rest } = current;
        return { ...prev, [day]: rest };
      }
      return {
        ...prev,
        [day]: { ...current, breakStart: '14:00', breakEnd: '15:00' },
      };
    });
  };

  const setFormTime = (day: DayKey, field: string, value: string) => {
    setFormSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const openEditForm = (tpl: ScheduleTemplate) => {
    setFormName(tpl.name);
    setFormSchedule(tpl.schedule);
    setEditingId(tpl.id);
    setShowForm(true);
  };

  /* ─── loading ─── */
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  /* ─── time picker overlay ─── */
  const renderTimePicker = () => {
    if (!timePicker) return null;
    const { day, field } = timePicker;
    const currentValue = (formSchedule[day] as any)[field] ?? '09:00';

    return (
      <View style={styles.pickerOverlay}>
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setTimePicker(null)}
        />
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>
            {DAYS.find((d) => d.key === day)?.label} —{' '}
            {field === 'start'
              ? 'Hora de entrada'
              : field === 'end'
              ? 'Hora de salida'
              : field === 'breakStart'
              ? 'Inicio descanso'
              : 'Fin descanso'}
          </Text>
          <ScrollView
            style={styles.timeSlotScroll}
            contentContainerStyle={styles.timeSlotGrid}
            showsVerticalScrollIndicator={false}
          >
            {TIME_SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[
                  styles.timeChip,
                  slot === currentValue && styles.timeChipSelected,
                ]}
                onPress={() => {
                  setFormTime(day, field, slot);
                  setTimePicker(null);
                }}
              >
                <Text
                  style={[
                    styles.timeChipText,
                    slot === currentValue && styles.timeChipTextSelected,
                  ]}
                >
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.pickerCloseBtn}
            onPress={() => setTimePicker(null)}
          >
            <Text style={styles.pickerCloseBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* ─── form ─── */
  if (showForm) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>
            {editingId ? 'Editar plantilla' : 'Nueva plantilla'}
          </Text>

          {/* Name input */}
          <TextInput
            style={styles.nameInput}
            placeholder="Nombre de la plantilla"
            placeholderTextColor={MUTED}
            value={formName}
            onChangeText={setFormName}
          />

          {/* Day-by-day config */}
          {DAYS.map(({ key, label }) => {
            const dayConf = formSchedule[key];
            return (
              <View key={key} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Text
                    style={[
                      styles.dayLabel,
                      !dayConf.enabled && styles.dayLabelInactive,
                    ]}
                  >
                    {label}
                  </Text>
                  <Switch
                    value={dayConf.enabled}
                    onValueChange={() => toggleFormDay(key)}
                    trackColor={{ false: BORDER, true: GOLD + '60' }}
                    thumbColor={dayConf.enabled ? GOLD : MUTED}
                  />
                </View>

                {dayConf.enabled && (
                  <View style={styles.dayBody}>
                    {/* Working hours */}
                    <View style={styles.timeRow}>
                      <Text style={styles.timeLabel}>Entrada</Text>
                      <TouchableOpacity
                        style={styles.timePill}
                        onPress={() =>
                          setTimePicker({ day: key, field: 'start' })
                        }
                      >
                        <Text style={styles.timePillText}>
                          {dayConf.start}
                        </Text>
                      </TouchableOpacity>

                      <Text style={styles.timeSep}>—</Text>

                      <Text style={styles.timeLabel}>Salida</Text>
                      <TouchableOpacity
                        style={styles.timePill}
                        onPress={() =>
                          setTimePicker({ day: key, field: 'end' })
                        }
                      >
                        <Text style={styles.timePillText}>{dayConf.end}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Break */}
                    <TouchableOpacity
                      style={styles.breakToggle}
                      onPress={() => toggleFormBreak(key)}
                    >
                      <Text style={styles.breakToggleText}>
                        {dayConf.breakStart
                          ? 'Quitar descanso'
                          : '+ Agregar descanso'}
                      </Text>
                    </TouchableOpacity>

                    {dayConf.breakStart && (
                      <View style={styles.timeRow}>
                        <Text style={styles.timeLabel}>Desde</Text>
                        <TouchableOpacity
                          style={styles.timePill}
                          onPress={() =>
                            setTimePicker({ day: key, field: 'breakStart' })
                          }
                        >
                          <Text style={styles.timePillText}>
                            {dayConf.breakStart}
                          </Text>
                        </TouchableOpacity>

                        <Text style={styles.timeSep}>—</Text>

                        <Text style={styles.timeLabel}>Hasta</Text>
                        <TouchableOpacity
                          style={styles.timePill}
                          onPress={() =>
                            setTimePicker({ day: key, field: 'breakEnd' })
                          }
                        >
                          <Text style={styles.timePillText}>
                            {dayConf.breakEnd ?? '--:--'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Form action buttons */}
        <View style={styles.formActions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setShowForm(false);
              setFormName('');
              setFormSchedule(buildDefaultSchedule());
              setEditingId(null);
            }}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, savingForm && styles.saveBtnDisabled]}
            onPress={saveTemplate}
            disabled={savingForm}
          >
            {savingForm ? (
              <ActivityIndicator size="small" color={BG} />
            ) : (
              <Text style={styles.saveBtnText}>
                {editingId ? 'Actualizar' : 'Guardar'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {renderTimePicker()}
      </View>
    );
  }

  /* ─── template list ─── */
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Mis plantillas</Text>
        <Text style={styles.sectionSub}>
          Guarda y aplica configuraciones de horario semanal
        </Text>

        {/* Create button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => {
            setFormName('');
            setFormSchedule(buildDefaultSchedule());
            setEditingId(null);
            setShowForm(true);
          }}
        >
          <Text style={styles.createBtnText}>+ Crear plantilla</Text>
        </TouchableOpacity>

        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin plantillas</Text>
            <Text style={styles.emptyText}>
              Crea tu primera plantilla de horario para aplicarla
              r{'á'}pidamente cuando lo necesites.
            </Text>
          </View>
        ) : (
          templates.map((tpl) => (
            <View key={tpl.id} style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <Text style={styles.templateName}>{tpl.name}</Text>
                <TouchableOpacity onPress={() => openEditForm(tpl)}>
                  <Text style={styles.editLink}>Editar</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.templateSummary}>
                {buildSummary(tpl.schedule)}
              </Text>

              {/* Day dots */}
              <View style={styles.dayDots}>
                {DAYS.map(({ key, short }) => (
                  <View
                    key={key}
                    style={[
                      styles.dayDot,
                      tpl.schedule[key]?.enabled && styles.dayDotActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayDotText,
                        tpl.schedule[key]?.enabled && styles.dayDotTextActive,
                      ]}
                    >
                      {short}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Action buttons */}
              <View style={styles.templateActions}>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteTemplate(tpl)}
                >
                  <Text style={styles.deleteBtnText}>Eliminar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.applyBtn,
                    applying === tpl.id && styles.applyBtnDisabled,
                  ]}
                  onPress={() => applyTemplate(tpl)}
                  disabled={applying === tpl.id}
                >
                  {applying === tpl.id ? (
                    <ActivityIndicator size="small" color={BG} />
                  ) : (
                    <Text style={styles.applyBtnText}>Aplicar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  content: { padding: 16, gap: 12 },

  /* section */
  sectionTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  sectionSub: { fontSize: 13, color: MUTED, marginBottom: 4 },

  /* create button */
  createBtn: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD + '40',
    borderStyle: 'dashed',
    paddingVertical: 16,
    alignItems: 'center',
  },
  createBtnText: { fontSize: 15, fontWeight: '700', color: GOLD },

  /* empty state */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  emptyText: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 19,
  },

  /* template card */
  templateCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 10,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateName: { fontSize: 16, fontWeight: '700', color: TEXT, flex: 1 },
  editLink: { fontSize: 13, fontWeight: '600', color: GOLD },
  templateSummary: { fontSize: 13, color: MUTED, lineHeight: 18 },

  /* day dots */
  dayDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDotActive: {
    backgroundColor: GOLD + '20',
    borderColor: GOLD,
  },
  dayDotText: { fontSize: 11, fontWeight: '700', color: MUTED },
  dayDotTextActive: { color: GOLD },

  /* template actions */
  templateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DANGER + '40',
  },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: DANGER },
  applyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: GOLD,
  },
  applyBtnDisabled: { opacity: 0.6 },
  applyBtnText: { fontSize: 13, fontWeight: '700', color: BG },

  /* form */
  nameInput: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
    color: TEXT,
  },

  /* day card */
  dayCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dayLabel: { fontSize: 16, fontWeight: '700', color: TEXT },
  dayLabelInactive: { color: MUTED },
  dayBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
  },

  /* time row */
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: { fontSize: 13, color: MUTED, fontWeight: '600' },
  timePill: {
    backgroundColor: BG,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timePillText: { fontSize: 15, fontWeight: '700', color: GOLD },
  timeSep: { fontSize: 14, color: MUTED },

  /* break toggle */
  breakToggle: { alignSelf: 'flex-start' },
  breakToggleText: { fontSize: 13, color: GOLD, fontWeight: '600' },

  /* form actions */
  formActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: MUTED },
  saveBtn: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: BG },

  /* time picker overlay */
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  pickerContainer: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    marginBottom: 16,
  },
  timeSlotScroll: {
    maxHeight: 280,
  },
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 8,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    minWidth: 70,
    alignItems: 'center',
  },
  timeChipSelected: {
    backgroundColor: GOLD + '20',
    borderColor: GOLD,
  },
  timeChipText: { fontSize: 14, fontWeight: '600', color: MUTED },
  timeChipTextSelected: { color: GOLD },
  pickerCloseBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  pickerCloseBtnText: { fontSize: 15, fontWeight: '600', color: MUTED },
});
