import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Accept navigation from either Owner or Client navigator
type Props = NativeStackScreenProps<any, 'CreateBarbershop'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const ERROR   = '#EF4444';

const DEFAULT_OPENING_HOURS = {
  monday:    { open: '09:00', close: '20:00', closed: false },
  tuesday:   { open: '09:00', close: '20:00', closed: false },
  wednesday: { open: '09:00', close: '20:00', closed: false },
  thursday:  { open: '09:00', close: '20:00', closed: false },
  friday:    { open: '09:00', close: '20:00', closed: false },
  saturday:  { open: '09:00', close: '14:00', closed: false },
  sunday:    { open: '09:00', close: '14:00', closed: true  },
};

export function CreateBarbershopScreen({ navigation }: Props) {
  const [nombre, setNombre]      = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono]   = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading]    = useState(false);
  const [success, setSuccess]    = useState(false);
  const [errors, setErrors]      = useState<Record<string, string>>({});

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!nombre.trim())    newErrors.nombre    = 'El nombre es obligatorio';
    if (!direccion.trim()) newErrors.direccion = 'La dirección es obligatoria';
    if (!telefono.trim())  newErrors.telefono  = 'El teléfono es obligatorio';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showSuccessAnimation = () => {
    setSuccess(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After role update to 'owner', the useAuth realtime listener
      // will detect the change and RootNavigator will auto-redirect
      // to OwnerNavigator. No manual navigation needed.
      // Small delay so the user sees the success animation.
      setTimeout(() => {
        try { navigation.navigate('Dashboard'); } catch { /* will auto-redirect */ }
      }, 1800);
    });
  };

  const handleCreate = async () => {
    if (!validate()) return;
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      // Create the barbershop document
      const barbershopRef = await addDoc(collection(db, 'barbershops'), {
        name:         nombre.trim(),
        address:      direccion.trim(),
        phone:        telefono.trim(),
        description:  descripcion.trim(),
        ownerId:      user.uid,
        openingHours: DEFAULT_OPENING_HOURS,
        createdAt:    serverTimestamp(),
        rating:       0,
        reviewCount:  0,
      });

      // Update the user doc with barbershopId and role
      await updateDoc(doc(db, 'users', user.uid), {
        barbershopId: barbershopRef.id,
        role:         'owner',
      });

      showSuccessAnimation();
    } catch (err) {
      console.error('[CreateBarbershopScreen] Error:', err);
      setErrors({ general: 'No se pudo crear la barbería. Inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Animated.View
          style={[
            styles.successCard,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Text style={styles.successEmoji}>✂️</Text>
          <Text style={styles.successTitle}>¡Barbería creada!</Text>
          <Text style={styles.successSub}>Tu barbería ya está lista.</Text>
          <View style={styles.successDot}>
            <ActivityIndicator size="small" color={GOLD} />
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titleBadge}>Nuevo negocio</Text>
          <Text style={styles.title}>Crea tu barbería</Text>
          <Text style={styles.subtitle}>
            Completa los datos para empezar a gestionar tu negocio desde la app.
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Form */}
        <View style={styles.form}>
          <Field
            label="Nombre de la barbería"
            value={nombre}
            onChangeText={(t) => { setNombre(t); setErrors((e) => ({ ...e, nombre: '' })); }}
            placeholder="Ej. Barbería El Clásico"
            error={errors.nombre}
            required
          />
          <Field
            label="Dirección"
            value={direccion}
            onChangeText={(t) => { setDireccion(t); setErrors((e) => ({ ...e, direccion: '' })); }}
            placeholder="Calle, número, ciudad"
            error={errors.direccion}
            required
          />
          <Field
            label="Teléfono"
            value={telefono}
            onChangeText={(t) => { setTelefono(t); setErrors((e) => ({ ...e, telefono: '' })); }}
            placeholder="+34 600 000 000"
            keyboardType="phone-pad"
            error={errors.telefono}
            required
          />
          <Field
            label="Descripción"
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Cuéntanos sobre tu barbería (opcional)"
            multiline
            numberOfLines={3}
          />

          {errors.general ? (
            <Text style={styles.errorGeneral}>{errors.general}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={BG} />
            ) : (
              <Text style={styles.btnText}>Crear barbería</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info note */}
        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <Text style={styles.infoText}>
            Podrás editar el horario, servicios y toda la configuración desde el panel de ajustes.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  required,
  multiline,
  numberOfLines,
  keyboardType = 'default',
}: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>
        {label}
        {required && <Text style={fieldStyles.required}> *</Text>}
      </Text>
      <TextInput
        style={[
          fieldStyles.input,
          multiline && fieldStyles.multiline,
          focused && fieldStyles.inputFocused,
          !!error && fieldStyles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    gap: 24,
  },
  header: {
    gap: 8,
    paddingTop: 12,
  },
  titleBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
  },
  form: {
    gap: 16,
  },
  errorGeneral: {
    fontSize: 13,
    color: ERROR,
    backgroundColor: '#1F0000',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    borderRadius: 10,
    padding: 12,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
    color: BG,
    letterSpacing: 0.3,
  },
  infoCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoEmoji: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: MUTED,
    lineHeight: 19,
  },
  // Success screen
  successContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: SURFACE,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 40,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 320,
  },
  successEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: GOLD,
  },
  successSub: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
  },
  successDot: {
    marginTop: 16,
  },
});

const fieldStyles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
    letterSpacing: 0.2,
  },
  required: {
    color: GOLD,
  },
  input: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: TEXT,
  },
  inputFocused: {
    borderColor: GOLD,
  },
  inputError: {
    borderColor: ERROR,
  },
  multiline: {
    minHeight: 90,
    paddingTop: 14,
  },
  error: {
    fontSize: 12,
    color: ERROR,
    marginTop: 2,
  },
});
