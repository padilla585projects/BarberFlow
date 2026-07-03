import React, { useEffect, useState } from 'react';
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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

// ── Theme ──────────────────────────────────────────────────────────────────────
const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const ERROR   = '#E53E3E';

type Props = NativeStackScreenProps<ClientStackParamList, 'WorkWithUs'>;

interface Barbershop {
  id: string;
  name: string;
  address?: string;
  photoURL?: string;
}

export function WorkWithUsScreen({ navigation }: Props) {
  const { firebaseUser } = useAuthContext();

  const [barbershops, setBarbershops]           = useState<Barbershop[]>([]);
  const [loadingShops, setLoadingShops]         = useState(true);
  const [selectedShop, setSelectedShop]         = useState<Barbershop | null>(null);
  const [motivationText, setMotivationText]     = useState('');
  const [submitting, setSubmitting]             = useState(false);
  const [submitted, setSubmitted]               = useState(false);

  // ── Fetch barbershops ────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchBarbershops() {
      try {
        const snap = await getDocs(collection(db, 'barbershops'));
        const list: Barbershop[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? '',
          address: d.data().address,
          photoURL: d.data().photoURL,
        }));
        setBarbershops(list);
      } catch (err) {
        console.error('[WorkWithUsScreen] Error fetching barbershops:', err);
        Alert.alert('Error', 'No se pudieron cargar las barberías. Intenta de nuevo.');
      } finally {
        setLoadingShops(false);
      }
    }
    fetchBarbershops();
  }, []);

  // ── Submit application ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!firebaseUser) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar una solicitud.');
      return;
    }
    if (!selectedShop) {
      Alert.alert('Selecciona una barbería', 'Elige la barbería a la que quieres aplicar.');
      return;
    }

    setSubmitting(true);
    try {
      // Check for existing pending/approved application to this barbershop
      const existingQuery = query(
        collection(db, 'barber_applications'),
        where('userId', '==', firebaseUser.uid),
        where('barbershopId', '==', selectedShop.id),
        where('status', 'in', ['pending', 'approved']),
      );
      const existingSnap = await getDocs(existingQuery);

      if (!existingSnap.empty) {
        const existingStatus = existingSnap.docs[0].data().status as string;
        const msg =
          existingStatus === 'approved'
            ? 'Ya tienes una solicitud aprobada en esta barbería.'
            : 'Ya tienes una solicitud pendiente en esta barbería. El propietario la revisará pronto.';
        Alert.alert('Solicitud existente', msg);
        setSubmitting(false);
        return;
      }

      // Create the application document
      await addDoc(collection(db, 'barber_applications'), {
        userId: firebaseUser.uid,
        userName: firebaseUser.displayName ?? null,
        userEmail: firebaseUser.email ?? null,
        userPhoto: firebaseUser.photoURL ?? null,
        barbershopId: selectedShop.id,
        barbershopName: selectedShop.name,
        message: motivationText.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
    } catch (err) {
      console.error('[WorkWithUsScreen] Error submitting application:', err);
      Alert.alert('Error', 'No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✂️</Text>
          <Text style={styles.successTitle}>¡Solicitud enviada!</Text>
          <View style={styles.titleAccent} />
          <Text style={styles.successMsg}>
            Solicitud enviada. El propietario te contactará pronto.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.backBtnText}>Volver al perfil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.title}>Trabaja con nosotros</Text>
            <View style={styles.titleAccent} />
            <Text style={styles.subtitle}>
              Aplica para unirte al equipo de una barbería
            </Text>
          </View>

          {/* ── Barbershop picker ───────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Selecciona una barbería</Text>

            {loadingShops ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={GOLD} />
                <Text style={styles.loadingText}>Cargando barberías...</Text>
              </View>
            ) : barbershops.length === 0 ? (
              <Text style={styles.emptyText}>No hay barberías disponibles.</Text>
            ) : (
              <FlatList
                data={barbershops}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => {
                  const isSelected = selectedShop?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.shopRow, isSelected && styles.shopRowSelected]}
                      onPress={() => setSelectedShop(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleFilled]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <View style={styles.shopInfo}>
                        <Text style={[styles.shopName, isSelected && styles.shopNameSelected]}>
                          {item.name}
                        </Text>
                        {item.address ? (
                          <Text style={styles.shopAddress}>{item.address}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          {/* ── Motivation message ──────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>
              Mensaje de motivación{' '}
              <Text style={styles.optionalLabel}>(opcional)</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Cuéntanos por qué quieres trabajar con nosotros..."
              placeholderTextColor={MUTED}
              value={motivationText}
              onChangeText={(t) => {
                if (t.length <= 300) setMotivationText(t);
              }}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!submitting}
            />
            <Text style={[styles.charCount, motivationText.length >= 280 && styles.charCountWarn]}>
              {motivationText.length}/300
            </Text>
          </View>

          {/* ── Submit ──────────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.submitBtn, (submitting || loadingShops) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting || loadingShops}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitBtnText}>Enviar solicitud</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelLink}
            onPress={() => navigation.goBack()}
            disabled={submitting}
          >
            <Text style={styles.cancelLinkText}>Cancelar</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: 0.5,
    textAlign: 'center',
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
    lineHeight: 20,
  },

  // Card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    gap: 14,
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionalLabel: {
    color: MUTED,
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 12,
  },

  // Loading / empty
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    color: MUTED,
    fontSize: 14,
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Shop list
  separator: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 2,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
    borderRadius: 10,
  },
  shopRowSelected: {
    backgroundColor: GOLD + '12',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: MUTED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleFilled: {
    borderColor: GOLD,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GOLD,
  },
  shopInfo: {
    flex: 1,
    gap: 2,
  },
  shopName: {
    fontSize: 15,
    color: TEXT,
    fontWeight: '500',
  },
  shopNameSelected: {
    color: GOLD,
    fontWeight: '700',
  },
  shopAddress: {
    fontSize: 12,
    color: MUTED,
  },

  // Textarea
  textArea: {
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT,
    minHeight: 110,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: MUTED,
  },
  charCountWarn: {
    color: ERROR,
  },

  // Submit button
  submitBtn: {
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
  btnDisabled: {
    opacity: 0.55,
  },
  submitBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Cancel link
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelLinkText: {
    color: MUTED,
    fontSize: 14,
  },

  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  successIcon: {
    fontSize: 56,
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  successMsg: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
  },
  backBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  backBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
