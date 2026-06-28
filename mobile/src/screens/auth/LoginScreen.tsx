import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { signInWithGoogle } from '../../services/auth';

// ── Theme (matches web-admin dark palette) ────────────────────────────────────
const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const BLUE    = '#4A90D9';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

// ── Barber Logo ───────────────────────────────────────────────────────────────
/**
 * Displays the real BarberFlow brand logo (assets/icon.png) inside a circular
 * gold-bordered frame that matches the dark login theme.
 */
function BarberLogo() {
  return (
    <View style={ll.shadow}>
      <View style={ll.circle}>
        <Image
          source={require('../../../assets/logo-login.png')}
          style={ll.image}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

// ── LoginScreen ───────────────────────────────────────────────────────────────
export function LoginScreen() {
  const [loading, setLoading]     = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      const msg = err?.message ?? 'Error desconocido';
      if (!msg.includes('cancelado')) {
        Alert.alert('Error al iniciar sesión', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa tu email y contraseña');
      return;
    }
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      const code = err?.code ?? '';
      let msg = 'Error al iniciar sesión';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        msg = 'Email o contraseña incorrectos';
      } else if (code === 'auth/invalid-email') {
        msg = 'Email no válido';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Demasiados intentos. Espera un momento';
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
          {/* ── Hero ───────────────────────────────────────────────────────── */}
          <View style={styles.hero}>
            <BarberLogo />
            <Text style={styles.title}>BarberFlow</Text>
            <View style={styles.titleAccent} />
            <Text style={styles.subtitle}>Gestión de barberías profesional</Text>
          </View>

          {/* ── Actions card ───────────────────────────────────────────────── */}
          <View style={styles.card}>

            {/* Google Sign-In */}
            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading && !showEmail ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>Continuar con Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email / Password */}
            {!showEmail ? (
              <TouchableOpacity
                style={styles.emailToggle}
                onPress={() => setShowEmail(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.emailToggleText}>Entrar con email y contraseña</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.emailForm}>
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
                  placeholder="Contraseña"
                  placeholderTextColor={MUTED}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={[styles.emailBtn, loading && styles.btnDisabled]}
                  onPress={handleEmailSignIn}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.emailBtnText}>Entrar</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowEmail(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.disclaimer}>
            Al continuar aceptas los términos de uso de BarberFlow
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Logo StyleSheet ───────────────────────────────────────────────────────────
const ll = StyleSheet.create({
  // Gold glow shadow wrapper (keeps shadow circular on Android)
  shadow: {
    borderRadius: 80,
    elevation: 20,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
  },
  // Circular frame with gold border
  circle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2.5,
    borderColor: GOLD,
    overflow: 'hidden',
    backgroundColor: '#0A0A0A',  // dark fallback while image loads
  },
  // Brand logo image fills the circle
  image: {
    width: 160,
    height: 160,
  },
});

// ── Screen StyleSheet ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },

  // Hero
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 36,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: 1,
    marginTop: 4,
  },
  // Gold accent line under title
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
    letterSpacing: 0.3,
  },

  // Dark surface card wrapping all actions
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    gap: 16,
  },

  // Google button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 15,
    gap: 10,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  googleIcon: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  googleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    color: MUTED,
    fontSize: 13,
  },

  // Email toggle link
  emailToggle: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  emailToggleText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Email form
  emailForm: {
    gap: 12,
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
  // Gold "Entrar" button — premium feel
  emailBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emailBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  cancelText: {
    color: MUTED,
    fontSize: 13,
  },

  disclaimer: {
    fontSize: 11,
    color: '#3A3A3A',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 0.2,
  },
});
