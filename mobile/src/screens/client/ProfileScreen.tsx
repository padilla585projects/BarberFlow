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
  Image,
  ActionSheetIOS,
  Platform,
  Linking,
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../../services/firebase';
import Constants from 'expo-constants';
import { signOut } from '../../services/auth';
import { useAuthContext } from '../../contexts/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

type Props = NativeStackScreenProps<ClientStackParamList, 'Profile'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const RED     = '#EF4444';

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
  const { role } = useAuthContext();

  const [displayName, setDisplayName]     = useState(user?.displayName ?? '');
  const [phone, setPhone]                 = useState('');
  const [instagram, setInstagram]         = useState('');
  const [photoURL, setPhotoURL]           = useState(user?.photoURL ?? '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications]     = useState(true);
  const [saving, setSaving]               = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();
        if (data) {
          setPhone(data.phone ?? '');
          setInstagram(data.instagram ?? '');
          setNotificationsEnabled(data.notificationsEnabled ?? true);
          setEmailNotifications(data.emailNotifications ?? true);
          if (data.displayName) setDisplayName(data.displayName);
          if (data.photoURL) setPhotoURL(data.photoURL);
        }
      } catch (err) {
        console.error('[ProfileScreen] Error loading user doc:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // ── Photo upload ──────────────────────────────────────────────────────────
  const uploadPhoto = async (uri: string) => {
    if (!user) return;
    setUploadingPhoto(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storagePath = `users/${user.uid}/profile.jpg`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      setPhotoURL(url);
    } catch (err) {
      console.error('[ProfileScreen] Error uploading photo:', err);
      Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Necesitamos acceso a tu cámara para tomar la foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const handleChangePhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Tomar foto', 'Elegir de galería'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) takePhoto();
          if (index === 2) pickFromGallery();
        },
      );
    } else {
      Alert.alert('Cambiar foto de perfil', 'Elige una opción', [
        { text: 'Cancelar', style: 'cancel' },
        { text: '📷 Tomar foto', onPress: takePhoto },
        { text: '🖼️ Elegir de galería', onPress: pickFromGallery },
      ]);
    }
  };

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Normaliza el handle de Instagram (quita @ y URL si pegan el link entero)
      const igHandle = instagram.trim()
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
        .replace(/^@/, '')
        .replace(/\/$/, '');
      await updateProfile(user, { displayName });
      await updateDoc(doc(db, 'users', user.uid), { displayName, phone, instagram: igHandle });
      Alert.alert('Guardado', 'Tu perfil se ha actualizado correctamente.');
    } catch (err) {
      console.error('[ProfileScreen] Error saving profile:', err);
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggles ───────────────────────────────────────────────────────────────
  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { notificationsEnabled: value });
    } catch (err) {
      setNotificationsEnabled(!value);
    }
  };

  const toggleEmailNotifications = async (value: boolean) => {
    setEmailNotifications(value);
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { emailNotifications: value });
    } catch (err) {
      setEmailNotifications(!value);
    }
  };

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
    ]);
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es irreversible. Se solicitará la eliminación de tu cuenta y todos tus datos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar eliminación',
              '¿Estás completamente seguro? Tu cuenta será marcada para eliminación.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sí, eliminar mi cuenta',
                  style: 'destructive',
                  onPress: async () => {
                    if (!user) return;
                    try {
                      await updateDoc(doc(db, 'users', user.uid), {
                        accountDeletionRequested: true,
                      });
                      await signOut();
                    } catch (err) {
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
      {/* ── Profile photo ────────────────────────────────────────────────── */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={handleChangePhoto} activeOpacity={0.8} style={styles.avatarWrapper}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          {uploadingPhoto ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : (
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeText}>📷</Text>
            </View>
          )}
        </TouchableOpacity>
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

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+34 600 000 000"
          placeholderTextColor={MUTED}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Instagram</Text>
        <View style={styles.igRow}>
          <Text style={styles.igAt}>@</Text>
          <TextInput
            style={[styles.input, styles.igInput]}
            value={instagram}
            onChangeText={setInstagram}
            placeholder="tu_usuario"
            placeholderTextColor={MUTED}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {instagram.trim().length > 0 && (
          <TouchableOpacity
            onPress={() => {
              const handle = instagram.replace(/^@/, '').replace(/\/$/, '');
              Linking.openURL(`https://instagram.com/${handle}`);
            }}
            style={styles.igPreview}
          >
            <Text style={styles.igPreviewText}>📸 Ver perfil en Instagram</Text>
          </TouchableOpacity>
        )}

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
        <Text style={styles.sectionTitle}>Accesos rápidos</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Loyalty')} activeOpacity={0.7}>
          <Text style={styles.linkIcon}>⭐</Text>
          <Text style={styles.linkText}>Mis puntos</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('OrderHistory')} activeOpacity={0.7}>
          <Text style={styles.linkIcon}>{'🛍️'}</Text>
          <Text style={styles.linkText}>Mis pedidos</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('MyAppointments')} activeOpacity={0.7}>
          <Text style={styles.linkIcon}>📋</Text>
          <Text style={styles.linkText}>Mis citas</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('NotificationSettings')} activeOpacity={0.7}>
          <Text style={styles.linkIcon}>🔔</Text>
          <Text style={styles.linkText}>Notificaciones</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://barberflow-2026.web.app/privacy.html')} activeOpacity={0.7}>
          <Text style={styles.linkIcon}>📄</Text>
          <Text style={styles.linkText}>Política de privacidad</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://barberflow-2026.web.app/terms.html')} activeOpacity={0.7}>
          <Text style={styles.linkIcon}>📋</Text>
          <Text style={styles.linkText}>Términos de uso</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://barberflow-2026.web.app/legal.html')} activeOpacity={0.7}>
          <Text style={styles.linkIcon}>{'⚖️'}</Text>
          <Text style={styles.linkText}>Aviso legal</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('BugReport')} activeOpacity={0.7}>
          <Text style={styles.linkIcon}>{'🐛'}</Text>
          <Text style={styles.linkText}>Reportar un problema</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Trabaja con nosotros ────────────────────────────────────────── */}
      {role === 'client' && (
        <TouchableOpacity
          style={styles.workWithUsBtn}
          onPress={() => navigation.navigate('WorkWithUs')}
          activeOpacity={0.8}
        >
          <Text style={styles.workWithUsIcon}>✂️</Text>
          <View style={styles.workWithUsTextCol}>
            <Text style={styles.workWithUsTitle}>Trabaja con nosotros</Text>
            <Text style={styles.workWithUsSub}>Aplica para ser barbero</Text>
          </View>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* ── Account ─────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.dangerBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerOutlineBtn} onPress={handleDeleteAccount} activeOpacity={0.7}>
          <Text style={styles.dangerOutlineBtnText}>Eliminar cuenta</Text>
        </TouchableOpacity>
      </View>

      {/* ── Pro options (very discrete) ───────────────────────────────── */}
      <View style={styles.proLinks}>
        <TouchableOpacity onPress={() => navigation.navigate('CreateBarbershop')} activeOpacity={0.7}>
          <Text style={styles.proLinkText}>Registrar mi barbería</Text>
        </TouchableOpacity>
        <Text style={styles.proDot}>·</Text>
        <TouchableOpacity onPress={() => navigation.navigate('JoinBarbershop')} activeOpacity={0.7}>
          <Text style={styles.proLinkText}>Unirme como barbero</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>BarberFlow v{Constants.expoConfig?.version ?? '1.1.0'}</Text>
      <Text style={styles.signature}>Desarrollado por Adrian Padilla</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },

  // Profile header
  profileHeader: { alignItems: 'center', marginBottom: 28, gap: 6 },
  avatarWrapper: { position: 'relative', marginBottom: 8 },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: GOLD,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: SURFACE,
    borderWidth: 3,
    borderColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: GOLD, fontSize: 34, fontWeight: '800' },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BG,
  },
  cameraBadgeText: { fontSize: 14 },
  profileName: { fontSize: 22, fontWeight: '700', color: TEXT },
  profileEmail: { fontSize: 14, color: MUTED },

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
  label: { fontSize: 13, color: MUTED, fontWeight: '600' },
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
  igRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  igAt: {
    color: MUTED,
    fontSize: 18,
    fontWeight: '700',
    paddingBottom: 2,
  },
  igInput: {
    flex: 1,
  },
  igPreview: {
    marginTop: 6,
    paddingVertical: 4,
  },
  igPreviewText: {
    color: '#E1306C',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: BG, fontSize: 15, fontWeight: '700' },

  // Toggles
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 15, color: TEXT },

  // Quick links
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  linkIcon: { fontSize: 18 },
  linkText: { flex: 1, fontSize: 15, color: TEXT },
  linkArrow: { fontSize: 22, color: GOLD, opacity: 0.6 },

  // Danger buttons
  dangerBtn: {
    backgroundColor: RED,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerBtnText: { color: TEXT, fontSize: 15, fontWeight: '700' },
  dangerOutlineBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: RED,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerOutlineBtnText: { color: RED, fontSize: 15, fontWeight: '700' },

  // Pro links (discrete)
  proLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  proLinkText: { fontSize: 12, color: MUTED, opacity: 0.5 },
  proDot: { fontSize: 12, color: MUTED, opacity: 0.3 },

  // Version
  version: { textAlign: 'center', color: MUTED, fontSize: 12, marginTop: 12, opacity: 0.6 },
  signature: { textAlign: 'center', color: MUTED, fontSize: 11, marginTop: 4, opacity: 0.4 },

  // Work with us button
  workWithUsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GOLD + '55',
    padding: 16,
    marginBottom: 0,
    gap: 12,
  },
  workWithUsIcon: {
    fontSize: 24,
  },
  workWithUsTextCol: {
    flex: 1,
    gap: 2,
  },
  workWithUsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  workWithUsSub: {
    fontSize: 12,
    color: MUTED,
  },
});
