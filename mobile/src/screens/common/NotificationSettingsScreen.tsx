import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import type { NotificationPreferences } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const DEFAULT_PREFS: NotificationPreferences = {
  appointments: true,
  reminders: true,
  reviews: true,
  loyalty: true,
  messages: true,
  dailySummary: true,
  marketing: true,
};

interface PrefRow {
  key: keyof NotificationPreferences;
  icon: string;
  label: string;
  description: string;
  ownerOnly?: boolean;
}

const PREF_ROWS: PrefRow[] = [
  { key: 'appointments', icon: '\u{1F4C5}', label: 'Citas', description: 'Nuevas citas y cambios de estado' },
  { key: 'reminders',    icon: '⏰',     label: 'Recordatorios', description: 'Recordatorio 24h antes de tu cita' },
  { key: 'reviews',      icon: '⭐',     label: 'Reseñas', description: 'Cuando recibes una nueva reseña' },
  { key: 'loyalty',      icon: '\u{1F389}',  label: 'Puntos de fidelidad', description: 'Cuando ganas puntos' },
  { key: 'messages',     icon: '\u{1F4AC}',  label: 'Mensajes', description: 'Mensajes del equipo' },
  { key: 'dailySummary', icon: '\u{1F4CA}',  label: 'Resumen diario', description: 'Resumen de actividad del día', ownerOnly: true },
  { key: 'marketing',    icon: '\u{1F39F}️', label: 'Promociones', description: 'Ofertas y campañas' },
];

export function NotificationSettingsScreen() {
  const user = auth.currentUser;

  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [userRole, setUserRole] = useState<string>('client');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();
        if (data) {
          if (data.role) setUserRole(data.role);
          if (data.notificationPreferences) {
            setPrefs({ ...DEFAULT_PREFS, ...data.notificationPreferences });
          }
        }
      } catch (err) {
        console.error('[NotificationSettings] Error loading prefs:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const togglePref = async (key: keyof NotificationPreferences, value: boolean) => {
    const prev = prefs[key];
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPreferences: updated,
      });
    } catch (err) {
      console.error('[NotificationSettings] Error saving pref:', err);
      setPrefs({ ...prefs, [key]: prev });
      Alert.alert('Error', 'No se pudo guardar la preferencia.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  const visibleRows = PREF_ROWS.filter(
    (row) => !row.ownerOnly || userRole === 'owner',
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Notificaciones Push</Text>
      <View style={styles.card}>
        {visibleRows.map((row, index) => (
          <View
            key={row.key}
            style={[
              styles.row,
              index < visibleRows.length - 1 && styles.rowBorder,
            ]}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>{row.icon}</Text>
              <View style={styles.rowTextGroup}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowDesc}>{row.description}</Text>
              </View>
            </View>
            <Switch
              value={prefs[row.key]}
              onValueChange={(v) => togglePref(row.key, v)}
              trackColor={{ false: BORDER, true: GOLD }}
              thumbColor={TEXT_C}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  rowIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  rowTextGroup: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_C,
  },
  rowDesc: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
});
