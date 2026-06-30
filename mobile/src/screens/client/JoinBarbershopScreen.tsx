import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { auth, db } from '../../services/firebase';

// Works from ClientNavigator (any stack)
type Props = NativeStackScreenProps<any, 'JoinBarbershop'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const CODE_LENGTH = 6;

export function JoinBarbershopScreen({ navigation }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const inputRefs = useRef<Array<TextInput | null>>(Array(CODE_LENGTH).fill(null));

  const code = digits.join('');

  const handleDigitChange = (text: string, index: number) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned.length === 0) {
      // Backspace: clear current cell and move back
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    // Handle paste of full code
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, CODE_LENGTH).split('');
      const next = Array(CODE_LENGTH).fill('');
      pasted.forEach((ch, i) => { next[i] = ch; });
      setDigits(next);
      const nextFocus = Math.min(pasted.length, CODE_LENGTH - 1);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);

    // Auto-advance to next box
    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else {
      inputRefs.current[index]?.blur();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && digits[index] === '' && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (code.length < CODE_LENGTH) {
      Alert.alert('Código incompleto', 'Introduce los 6 dígitos del código.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Debes estar autenticado.');
      return;
    }

    setLoading(true);
    try {
      const invitationRef = doc(db, 'invitations', code);
      const invitationSnap = await getDoc(invitationRef);

      if (!invitationSnap.exists()) {
        Alert.alert('Código inválido', 'Código inválido o expirado.');
        setLoading(false);
        return;
      }

      const invitation = invitationSnap.data();

      // Check if already used
      if (invitation.used) {
        Alert.alert('Código ya utilizado', 'Este código ya ha sido utilizado.');
        setLoading(false);
        return;
      }

      // Check expiry
      const expiresAt = new Date(invitation.expiresAt);
      if (new Date() > expiresAt) {
        Alert.alert('Código expirado', 'Código inválido o expirado.');
        setLoading(false);
        return;
      }

      // Mark invitation as used
      await updateDoc(invitationRef, {
        used: true,
        usedBy: user.uid,
        usedAt: new Date().toISOString(),
      });

      // Update user doc — role change will trigger useAuth realtime listener
      // which will navigate automatically to BarberNavigator
      await updateDoc(doc(db, 'users', user.uid), {
        barbershopId: invitation.barbershopId,
        role: 'barber',
      });

      setSuccess(true);
    } catch (err) {
      console.error('[JoinBarbershopScreen] Error joining barbershop:', err);
      Alert.alert('Error', 'Ocurrió un error. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>¡Bienvenido al equipo!</Text>
        <Text style={styles.successSub}>
          Tu cuenta ha sido actualizada. La app te redirigirá automáticamente a tu panel de barbero.
        </Text>
        <ActivityIndicator color={GOLD} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>✂</Text>
        </View>

        <Text style={styles.title}>Unirse a una barbería</Text>
        <Text style={styles.subtitle}>
          Introduce el código de 6 dígitos que te proporcionó el propietario de la barbería.
        </Text>

        {/* 6-digit code input */}
        <View style={styles.codeRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputRefs.current[i] = ref; }}
              style={[
                styles.digitBox,
                focusedIndex === i && styles.digitBoxFocused,
                digit !== '' && styles.digitBoxFilled,
              ]}
              value={digit}
              onChangeText={(text) => handleDigitChange(text, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(-1)}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              selectTextOnFocus
              caretHidden
              autoFocus={i === 0}
            />
          ))}
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitBtn, (loading || code.length < CODE_LENGTH) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || code.length < CODE_LENGTH}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={BG} />
          ) : (
            <Text style={styles.submitBtnText}>Unirme a la barbería</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          El código expira 24 horas después de ser generado.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 16,
  },

  // Icon
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: GOLD + '60',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 36,
    color: GOLD,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
    marginBottom: 8,
  },

  // Code boxes
  codeRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 16,
  },
  digitBox: {
    width: 46,
    height: 58,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: BORDER,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
    color: TEXT,
  },
  digitBoxFocused: {
    borderColor: GOLD,
    backgroundColor: '#1A1A1A',
  },
  digitBoxFilled: {
    borderColor: GOLD + '80',
  },

  // Submit
  submitBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    color: BG,
    fontWeight: '800',
    fontSize: 16,
  },

  hint: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    marginTop: 4,
  },

  // Success state
  successContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  successIcon: {
    fontSize: 64,
    color: GOLD,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
  },
});
