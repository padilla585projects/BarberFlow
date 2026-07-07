import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { setPendingReferralCode } from '../../utils/pendingReferral';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation';

// ── Theme ─────────────────────────────────────────────────────────────────────
const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const ERROR   = '#E53E3E';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading]         = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);

  const handleRegister = async () => {
    // Validaciones
    if (!name.trim()) {
      Alert.alert('Campo requerido', 'Escribe tu nombre');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Campo requerido', 'Escribe tu email');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPass) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    // Validar código de referido si se ha introducido
    if (referralCode.trim()) {
      setValidatingCode(true);
      try {
        const q = query(collection(db, 'users'), where('referralCode', '==', referralCode.trim()));
        const snap = await getDocs(q);
        if (snap.empty) {
          Alert.alert('Código inválido', 'El código de invitación no es válido. Compruébalo e inténtalo de nuevo.');
          setValidatingCode(false);
          return;
        }
        // Guardar UID del referidor para que useAuth lo consuma al crear el doc
        setPendingReferralCode(snap.docs[0].id);
      } catch (err) {
        console.error('[RegisterScreen] Error validating referral code:', err);
        Alert.alert('Error', 'No se pudo validar el código. Inténtalo de nuevo.');
        setValidatingCode(false);
        return;
      } finally {
        setValidatingCode(false);
      }
    } else {
      setPendingReferralCode(null);
    }

    try {
      setLoading(true);
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Guardamos el nombre en el perfil de Firebase Auth
      await updateProfile(user, { displayName: name.trim() });
      // useAuth detecta el nuevo usuario y crea el doc en Firestore automáticamente
    } catch (err: any) {
      const code = err?.code ?? '';
      let msg = 'Error al crear la cuenta';
      if (code === 'auth/email-already-in-use') {
        msg = 'Ese email ya está registrado. ¿Quieres iniciar sesión?';
      } else if (code === 'auth/invalid-email') {
        msg = 'El email no es válido';
      } else if (code === 'auth/weak-password') {
        msg = 'La contraseña es demasiado débil (mínimo 6 caracteres)';
      }
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.title}>Crear cuenta</Text>
            <View style={styles.titleAccent} />
            <Text style={styles.subtitle}>Regístrate para reservar citas</Text>
          </View>

          {/* ── Form ────────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor={MUTED}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={MUTED}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña (mínimo 6 caracteres)"
              placeholderTextColor={MUTED}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              placeholderTextColor={MUTED}
              value={confirmPass}
              onChangeText={setConfirmPass}
              secureTextEntry
              autoComplete="new-password"
              editable={!loading}
            />

            <Text style={styles.label}>Código de invitación (opcional)</Text>
            <TextInput
              style={styles.input}
              value={referralCode}
              onChangeText={t => setReferralCode(t.toUpperCase().trim())}
              placeholder="XXXXXXXX"
              placeholderTextColor={MUTED}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              editable={!loading && !validatingCode}
            />

            <TouchableOpacity
              style={[styles.registerBtn, (loading || validatingCode) && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading || validatingCode}
              activeOpacity={0.85}
            >
              {(loading || validatingCode) ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.registerBtnText}>Crear cuenta</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Back to login ───────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.loginLinkText}>
              ¿Ya tienes cuenta?{' '}
              <Text style={styles.loginLinkBold}>Inicia sesión</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
    gap: 28,
  },

  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: 0.5,
  },
  titleAccent: {
    width: 40,
    height: 2.5,
    backgroundColor: GOLD,
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
  },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    gap: 14,
  },
  label: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '600',
    marginBottom: -4,
  },
  input: {
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: TEXT,
  },
  registerBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  registerBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    color: MUTED,
    fontSize: 14,
  },
  loginLinkBold: {
    color: GOLD,
    fontWeight: '700',
  },
});
