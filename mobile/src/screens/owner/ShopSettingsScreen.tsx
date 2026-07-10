import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { useLogout } from '../../hooks/useLogout';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';
import type {
  OpeningHours,
  DayHours,
  BookingSettings,
  NotificationSettings,
} from '../../types';

type Props = NativeStackScreenProps<OwnerStackParamList, 'ShopSettings'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C   = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

type DayKey = keyof OpeningHours;

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
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m}`);
  }
}

const ADVANCE_HOURS = [
  { value: 1,  label: '1 hora' },
  { value: 2,  label: '2 horas' },
  { value: 4,  label: '4 horas' },
  { value: 12, label: '12 horas' },
  { value: 24, label: '24 horas' },
  { value: 48, label: '48 horas' },
];

const ADVANCE_DAYS = [
  { value: 7,  label: '7 días' },
  { value: 14, label: '14 días' },
  { value: 30, label: '30 días' },
  { value: 60, label: '60 días' },
  { value: 90, label: '90 días' },
];

const DEFAULT_HOURS: DayHours = { open: true, from: '09:00', to: '20:00' };
const DEFAULT_CLOSED: DayHours = { open: false, from: '09:00', to: '20:00' };

const DEFAULT_OPENING: OpeningHours = {
  monday: { ...DEFAULT_HOURS },
  tuesday: { ...DEFAULT_HOURS },
  wednesday: { ...DEFAULT_HOURS },
  thursday: { ...DEFAULT_HOURS },
  friday: { ...DEFAULT_HOURS },
  saturday: { ...DEFAULT_HOURS },
  sunday: { ...DEFAULT_CLOSED },
};

const DEFAULT_BOOKING: BookingSettings = {
  minAdvanceHours: 2,
  maxAdvanceDays: 30,
  autoConfirm: false,
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  emailNewBooking: true,
  pushNewBooking: true,
};

export function ShopSettingsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { activeBarbershopId } = useAuthContext();
  const { handleLogout } = useLogout();

  // Shop info
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [instagram, setInstagram] = useState('');

  // Opening hours
  const [hours, setHours] = useState<OpeningHours>(DEFAULT_OPENING);

  // Booking settings
  const [booking, setBooking] = useState<BookingSettings>(DEFAULT_BOOKING);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);

  // Payment methods
  const [payBizum, setPayBizum] = useState(false);
  const [payPaypal, setPayPaypal] = useState(false);
  const [bizumPhone, setBizumPhone] = useState('');
  const [paypalUsername, setPaypalUsername] = useState('');

  // Time picker state
  const [pickerVisible, setPickerVisible] = useState<{
    day: DayKey;
    field: 'from' | 'to';
  } | null>(null);

  // Dropdown state
  const [dropdownVisible, setDropdownVisible] = useState<'minAdvance' | 'maxAdvance' | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!activeBarbershopId) return;

    try {
      const shopDoc = await getDoc(doc(db, 'barbershops', activeBarbershopId));
      if (!shopDoc.exists()) return;

      const data = shopDoc.data();
      setName(data.name ?? '');
      setAddress(data.address ?? '');
      setPhone(data.phone ?? '');
      setDescription(data.description ?? '');
      setInstagram(data.instagram ?? '');

      if (data.openingHours) {
        setHours(data.openingHours as OpeningHours);
      }
      if (data.bookingSettings) {
        setBooking(data.bookingSettings as BookingSettings);
      }
      if (data.notificationSettings) {
        setNotifications(data.notificationSettings as NotificationSettings);
      }
      if (data.paymentMethods) {
        const pm = data.paymentMethods as { cash: boolean; bizum: boolean; paypal: boolean };
        setPayBizum(pm.bizum ?? false);
        setPayPaypal(pm.paypal ?? false);
      }
      if (data.bizumPhone) setBizumPhone(data.bizumPhone as string);
      if (data.paypalUsername) setPaypalUsername(data.paypalUsername as string);
    } catch (err) {
      console.error('[ShopSettings] fetch error:', err);
      Alert.alert('Error', 'No se pudieron cargar los ajustes.');
    } finally {
      setLoading(false);
    }
  }, [activeBarbershopId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!activeBarbershopId) return;
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre de la barbería es obligatorio.');
      return;
    }

    setSaving(true);
    try {
      const igHandle = instagram.trim()
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
        .replace(/^@/, '')
        .replace(/\/$/, '');

      await updateDoc(doc(db, 'barbershops', activeBarbershopId), {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        description: description.trim(),
        instagram: igHandle,
        openingHours: hours,
        bookingSettings: booking,
        notificationSettings: notifications,
        paymentMethods: {
          cash: true,
          bizum: payBizum,
          paypal: payPaypal,
        },
        bizumPhone: bizumPhone.trim(),
        paypalUsername: paypalUsername.trim(),
      });
      Alert.alert('Guardado', 'Los ajustes se han actualizado correctamente.');
    } catch (err) {
      console.error('[ShopSettings] save error:', err);
      Alert.alert('Error', 'No se pudieron guardar los ajustes.');
    } finally {
      setSaving(false);
    }
  };


  const updateDay = (day: DayKey, patch: Partial<DayHours>) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  };

  const cycleTime = (day: DayKey, field: 'from' | 'to', direction: 1 | -1) => {
    const current = hours[day][field];
    const idx = TIME_SLOTS.indexOf(current);
    const next = (idx + direction + TIME_SLOTS.length) % TIME_SLOTS.length;
    updateDay(day, { [field]: TIME_SLOTS[next] });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Shop Info ─────────────────────────────── */}
      <Text style={styles.sectionTitle}>Información de la barbería</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nombre de la barbería"
          placeholderTextColor={MUTED}
        />

        <Text style={styles.label}>Dirección</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Dirección"
          placeholderTextColor={MUTED}
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Teléfono"
          placeholderTextColor={MUTED}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción o bio de tu barbería"
          placeholderTextColor={MUTED}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Instagram</Text>
        <View style={igStyles.row}>
          <Text style={igStyles.at}>@</Text>
          <TextInput
            style={[styles.input, igStyles.input]}
            value={instagram}
            onChangeText={setInstagram}
            placeholder="tu_barberia"
            placeholderTextColor={MUTED}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {instagram.trim().length > 0 && (
          <TouchableOpacity
            style={igStyles.preview}
            onPress={() => {
              const handle = instagram.trim()
                .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
                .replace(/^@/, '')
                .replace(/\/$/, '');
              void Linking.openURL(`https://instagram.com/${handle}`);
            }}
            activeOpacity={0.7}
          >
            <Text style={igStyles.previewText}>📸 Ver perfil en Instagram</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Opening Hours ─────────────────────────── */}
      <Text style={styles.sectionTitle}>Horario de apertura</Text>
      <View style={styles.card}>
        {DAYS.map(({ key, label }) => {
          const day = hours[key];
          return (
            <View key={key} style={styles.dayRow}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, !day.open && styles.dayLabelClosed]}>
                  {label}
                </Text>
                <Switch
                  value={day.open}
                  onValueChange={(v) => updateDay(key, { open: v })}
                  trackColor={{ false: BORDER, true: GOLD }}
                  thumbColor={TEXT_C}
                />
              </View>
              {day.open && (
                <View style={styles.timeRow}>
                  <TimeSelector
                    value={day.from}
                    onPrev={() => cycleTime(key, 'from', -1)}
                    onNext={() => cycleTime(key, 'from', 1)}
                    onPress={() =>
                      setPickerVisible(
                        pickerVisible?.day === key && pickerVisible?.field === 'from'
                          ? null
                          : { day: key, field: 'from' },
                      )
                    }
                  />
                  <Text style={styles.timeSep}>—</Text>
                  <TimeSelector
                    value={day.to}
                    onPrev={() => cycleTime(key, 'to', -1)}
                    onNext={() => cycleTime(key, 'to', 1)}
                    onPress={() =>
                      setPickerVisible(
                        pickerVisible?.day === key && pickerVisible?.field === 'to'
                          ? null
                          : { day: key, field: 'to' },
                      )
                    }
                  />
                </View>
              )}
              {pickerVisible?.day === key && day.open && (
                <TimePickerGrid
                  selected={hours[key][pickerVisible.field]}
                  onSelect={(t) => {
                    updateDay(key, { [pickerVisible.field]: t });
                    setPickerVisible(null);
                  }}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* ── Booking Settings ──────────────────────── */}
      <Text style={styles.sectionTitle}>Ajustes de reserva</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Tiempo mínimo de antelación</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() =>
            setDropdownVisible(dropdownVisible === 'minAdvance' ? null : 'minAdvance')
          }
        >
          <Text style={styles.dropdownText}>
            {ADVANCE_HOURS.find((h) => h.value === booking.minAdvanceHours)?.label ?? `${booking.minAdvanceHours}h`}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
        {dropdownVisible === 'minAdvance' && (
          <View style={styles.optionsList}>
            {ADVANCE_HOURS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionItem,
                  booking.minAdvanceHours === opt.value && styles.optionItemActive,
                ]}
                onPress={() => {
                  setBooking((prev) => ({ ...prev, minAdvanceHours: opt.value }));
                  setDropdownVisible(null);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    booking.minAdvanceHours === opt.value && styles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.label, { marginTop: 16 }]}>Máximo días de antelación</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() =>
            setDropdownVisible(dropdownVisible === 'maxAdvance' ? null : 'maxAdvance')
          }
        >
          <Text style={styles.dropdownText}>
            {ADVANCE_DAYS.find((d) => d.value === booking.maxAdvanceDays)?.label ?? `${booking.maxAdvanceDays} días`}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
        {dropdownVisible === 'maxAdvance' && (
          <View style={styles.optionsList}>
            {ADVANCE_DAYS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionItem,
                  booking.maxAdvanceDays === opt.value && styles.optionItemActive,
                ]}
                onPress={() => {
                  setBooking((prev) => ({ ...prev, maxAdvanceDays: opt.value }));
                  setDropdownVisible(null);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    booking.maxAdvanceDays === opt.value && styles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.toggleRow, { marginTop: 16 }]}>
          <Text style={styles.toggleLabel}>Confirmar citas automáticamente</Text>
          <Switch
            value={booking.autoConfirm}
            onValueChange={(v) => setBooking((prev) => ({ ...prev, autoConfirm: v }))}
            trackColor={{ false: BORDER, true: GOLD }}
            thumbColor={TEXT_C}
          />
        </View>
      </View>

      {/* ── Notifications ─────────────────────────── */}
      <Text style={styles.sectionTitle}>Notificaciones</Text>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Email para nuevas reservas</Text>
          <Switch
            value={notifications.emailNewBooking}
            onValueChange={(v) =>
              setNotifications((prev) => ({ ...prev, emailNewBooking: v }))
            }
            trackColor={{ false: BORDER, true: GOLD }}
            thumbColor={TEXT_C}
          />
        </View>
        <View style={[styles.toggleRow, { marginTop: 12 }]}>
          <Text style={styles.toggleLabel}>Push para nuevas reservas</Text>
          <Switch
            value={notifications.pushNewBooking}
            onValueChange={(v) =>
              setNotifications((prev) => ({ ...prev, pushNewBooking: v }))
            }
            trackColor={{ false: BORDER, true: GOLD }}
            thumbColor={TEXT_C}
          />
        </View>
      </View>

      {/* ── Notification Preferences ─────────────── */}
      <Text style={styles.sectionTitle}>Personal</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={npStyles.row}
          onPress={() => (navigation as any).navigate('NotificationSettings')}
          activeOpacity={0.7}
        >
          <Text style={npStyles.icon}>🔔</Text>
          <View style={npStyles.textGroup}>
            <Text style={npStyles.label}>Preferencias de notificación</Text>
            <Text style={npStyles.desc}>Elige qué notificaciones recibir</Text>
          </View>
          <Text style={npStyles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Payment Methods ─────────────────────── */}
      <Text style={styles.sectionTitle}>Métodos de pago</Text>
      <View style={styles.card}>
        {/* Cash — always on */}
        <View style={styles.toggleRow}>
          <Text style={payStyles.methodIcon}>💵</Text>
          <Text style={[styles.toggleLabel, { marginLeft: 8 }]}>Pagar en caja</Text>
          <Switch
            value={true}
            disabled
            trackColor={{ false: BORDER, true: GOLD }}
            thumbColor={TEXT_C}
          />
        </View>
        <Text style={payStyles.methodHint}>Siempre disponible</Text>

        {/* Bizum */}
        <View style={[styles.toggleRow, { marginTop: 16 }]}>
          <Text style={payStyles.methodIcon}>📱</Text>
          <Text style={[styles.toggleLabel, { marginLeft: 8 }]}>Bizum</Text>
          <Switch
            value={payBizum}
            onValueChange={setPayBizum}
            trackColor={{ false: BORDER, true: GOLD }}
            thumbColor={TEXT_C}
          />
        </View>
        {payBizum && (
          <>
            <Text style={styles.label}>Teléfono Bizum</Text>
            <TextInput
              style={styles.input}
              value={bizumPhone}
              onChangeText={setBizumPhone}
              placeholder="612345678"
              placeholderTextColor={MUTED}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </>
        )}

        {/* PayPal */}
        <View style={[styles.toggleRow, { marginTop: 16 }]}>
          <Text style={payStyles.methodIcon}>🅿️</Text>
          <Text style={[styles.toggleLabel, { marginLeft: 8 }]}>PayPal</Text>
          <Switch
            value={payPaypal}
            onValueChange={setPayPaypal}
            trackColor={{ false: BORDER, true: GOLD }}
            thumbColor={TEXT_C}
          />
        </View>
        {payPaypal && (
          <>
            <Text style={styles.label}>Usuario PayPal.me</Text>
            <TextInput
              style={styles.input}
              value={paypalUsername}
              onChangeText={setPaypalUsername}
              placeholder="tu-barberia"
              placeholderTextColor={MUTED}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {paypalUsername.trim() !== '' && (
              <Text style={payStyles.methodHint}>
                paypal.me/{paypalUsername.trim()}
              </Text>
            )}
          </>
        )}
      </View>

      {/* ── Save ──────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={BG} />
        ) : (
          <Text style={styles.saveBtnText}>Guardar cambios</Text>
        )}
      </TouchableOpacity>

      {/* ── Sign Out ──────────────────────────────── */}
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ── Sub-components ──────────────────────────────── */

function TimeSelector({
  value,
  onPrev,
  onNext,
  onPress,
}: {
  value: string;
  onPrev: () => void;
  onNext: () => void;
  onPress: () => void;
}) {
  return (
    <View style={timeStyles.container}>
      <TouchableOpacity onPress={onPrev} style={timeStyles.arrow}>
        <Text style={timeStyles.arrowText}>◀</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPress} style={timeStyles.value}>
        <Text style={timeStyles.valueText}>{value}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onNext} style={timeStyles.arrow}>
        <Text style={timeStyles.arrowText}>▶</Text>
      </TouchableOpacity>
    </View>
  );
}

function TimePickerGrid({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (time: string) => void;
}) {
  return (
    <View style={gridStyles.container}>
      {TIME_SLOTS.map((t) => (
        <TouchableOpacity
          key={t}
          style={[gridStyles.cell, t === selected && gridStyles.cellActive]}
          onPress={() => onSelect(t)}
        >
          <Text style={[gridStyles.cellText, t === selected && gridStyles.cellTextActive]}>
            {t}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ── Styles ──────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  content: { padding: 20, gap: 12 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_C,
    marginTop: 8,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    fontSize: 15,
    color: TEXT_C,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dayRow: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_C,
  },
  dayLabelClosed: {
    color: MUTED,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  timeSep: {
    fontSize: 16,
    color: MUTED,
  },
  dropdown: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 15,
    color: TEXT_C,
  },
  dropdownArrow: {
    fontSize: 10,
    color: MUTED,
  },
  optionsList: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 4,
    overflow: 'hidden',
  },
  optionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  optionItemActive: {
    backgroundColor: GOLD + '22',
  },
  optionText: {
    fontSize: 14,
    color: TEXT_C,
  },
  optionTextActive: {
    color: GOLD,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 15,
    color: TEXT_C,
    flex: 1,
    marginRight: 12,
  },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: BG,
  },
  signOutBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
});

const timeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  arrow: {
    padding: 10,
  },
  arrowText: {
    fontSize: 12,
    color: GOLD,
  },
  value: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_C,
  },
});

const gridStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
    padding: 8,
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cellActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  cellText: {
    fontSize: 12,
    color: MUTED,
  },
  cellTextActive: {
    color: BG,
    fontWeight: '700',
  },
});

const npStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  icon: {
    fontSize: 22,
    marginRight: 12,
  },
  textGroup: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_C,
  },
  desc: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  arrow: {
    fontSize: 22,
    color: GOLD,
    opacity: 0.6,
  },
});

const payStyles = StyleSheet.create({
  methodIcon: {
    fontSize: 20,
  },
  methodHint: {
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
    marginLeft: 36,
  },
});

const igStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  at: {
    fontSize: 15,
    fontWeight: '700',
    color: MUTED,
    marginRight: 4,
    paddingTop: 2,
  },
  input: {
    flex: 1,
  },
  preview: {
    marginTop: 6,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E1306C22',
    borderWidth: 1,
    borderColor: '#E1306C55',
  },
  previewText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E1306C',
  },
});
