import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { signOut } from '../../services/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

type Props = NativeStackScreenProps<ClientStackParamList, 'Profile'>;

// ── Theme ────────────────────────────────────────────────────────────────────
const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const RED     = '#EF4444';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileScreen({ navigation }: Props) {
  const user = auth.currentUser;

  const [displayName, setDisplayName]     = useState(user?.displayName ?? '');
  const [phone, setPhone]                 = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications]     = useState(true);
  const [saving, setSaving]               = useState(false);
  const [loading, setLoading]             = useState(true);

  // ── Load user doc ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();
        if (data) {
          setPhone(data.phone ?? '');
          setNotificationsEnabled(data.notificationsEnabled ?? true);
          setEmailNotifications(data.emailNotifications ?? true);
          if (data.displayName) setDisplayName(data.displayName);
        }
      } catch (err) {
        console.error('[ProfileScreen] Error loading user doc:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // ── Save profile ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName });
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        phone,
      });
      Alert.alert('Guardado', 'Tu perfil se ha actualizado correctamente.');
    } catch (err) {
      console.error('[ProfileScreen] Error saving profile:', err);
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { notificationsEnabled: value });
    } catch (err) {
      console.error('[ProfileScreen] Error updating notifications:', err);
      setNotificationsEnabled(!value);
    }
  };

  const toggleEmailNotifications = async (value: boolean) => {
    setEmailNotifications(value);
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { emailNotifications: value });
    } catch (err) {
      console.error('[ProfileScreen] Error updating email notifications:', err);
      setEmailNotifications(!value);
    }
  };

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesion',
      'Estas seguro de que quieres cerrar sesion?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesion', style: 'destructive', onPress: signOut },
      ],
    );
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta accion es irreversible. Se solicitara la eliminacion de tu cuenta y todos tus datos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar eliminacion',
              'Escribe ELIMINAR para confirmar. Tu cuenta sera marcada para eliminacion y se cerrara la sesion.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Confirmo eliminar',
                  style: 'destructive',
                  onPress: async () => {
                    if (!user) return;
                    try {
                      await updateDoc(doc(db, 'users', user.uid), {
                        accountDeletionRequested: true,
                      });
                      await signOut();
                    } catch (err) {
                      console.error('[ProfileScreen] Error requesting deletion:', err);
                      Alert.alert('Error', 'No se pudo procesar la solicitud.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  const initials = getInitials(displayName || user?.email || '?');
  const email    = user?.email ?? '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Profile header ──────────────────────────────────────────────── */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{displayName || 'Sin nombre'}</Text>
        <Text style={styles.profileEmail}>{email}</Text>
      </View>

      {/* ── Edit profile ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Editar perfil</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Tu nombre"
          placeholderTextColor={MUTED}
        />

        <Text style={styles.label}>Telefono</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+34 600 000 000"
          placeholderTextColor={MUTED}
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={BG} />
          ) : (
            <Text style={styles.saveBtnText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Preferences ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferencias</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Notificaciones push</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: BORDER, true: GOLD + '80' }}
            thumbColor={notificationsEnabled ? GOLD : MUTED}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Notificaciones por email</Text>
          <Switch
            value={emailNotifications}
            onValueChange={toggleEmailNotifications}
            trackColor={{ false: BORDER, true: GOLD + '80' }}
            thumbColor={emailNotifications ? GOLD : MUTED}
          />
        </View>
      </View>

      {/* ── Quick links ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accesos rapidos</Text>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('Loyalty')}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>Mis puntos</Text>
          <Text style={styles.linkArrow}>{'›'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('MyAppointments')}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>Mis citas</Text>
          <Text style={styles.linkArrow}>{'›'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Account ─────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>

        <TouchableOpacity
          style={styles.dangerBtn}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.dangerBtnText}>Cerrar sesion</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dangerOutlineBtn}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <Text style={styles.dangerOutlineBtnText}>Eliminar cuenta</Text>
        </TouchableOpacity>
      </View>

      {/* ── App info ────────────────────────────────────────────────────── */}
      <Text style={styles.version}>BarberFlow v1.0.0</Text>
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },

  // Profile header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 6,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: SURFACE,
    borderWidth: 2,
    borderColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: GOLD,
    fontSize: 28,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT,
  },
  profileEmail: {
    fontSize: 14,
    color: MUTED,
  },

  // Sections
  section: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },

  // Form
  label: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '600',
  },
  input: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT,
  },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: BG,
    fontSize: 15,
    fontWeight: '700',
  },

  // Toggles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 15,
    color: TEXT,
  },

  // Quick links
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 15,
    color: TEXT,
  },
  linkArrow: {
    fontSize: 22,
    color: GOLD,
    opacity: 0.6,
  },

  // Danger buttons
  dangerBtn: {
    backgroundColor: RED,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '700',
  },
  dangerOutlineBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: RED,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerOutlineBtnText: {
    color: RED,
    fontSize: 15,
    fontWeight: '700',
  },

  // Version
  version: {
    textAlign: 'center',
    color: MUTED,
    fontSize: 12,
    marginTop: 12,
    opacity: 0.6,
  },
});
