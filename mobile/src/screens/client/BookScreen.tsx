import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

type Props = NativeStackScreenProps<ClientStackParamList, 'Book'>;

interface BarberOption {
  uid: string;
  displayName: string;
}

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

export function BookScreen({ route, navigation }: Props) {
  const { barbershopId, barbershopName } = route.params;
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<BarberOption | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingBarbers, setLoadingBarbers] = useState(true);

  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('barbershopId', '==', barbershopId),
          where('role', 'in', ['barber', 'owner']),
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({
          uid: d.data().uid ?? d.id,
          displayName: d.data().displayName ?? d.data().email ?? 'Barbero',
        }));
        setBarbers(list);
        if (list.length === 1) setSelectedBarber(list[0]);
      } catch (err) {
        console.error('[BookScreen] Error loading barbers:', err);
      } finally {
        setLoadingBarbers(false);
      }
    };
    fetchBarbers();
  }, [barbershopId]);

  const handleBook = async () => {
    if (!selectedBarber) {
      Alert.alert('Selecciona un barbero', 'Elige el barbero para tu cita.');
      return;
    }
    if (!selectedSlot) {
      Alert.alert('Selecciona un horario', 'Elige el horario de tu cita antes de continuar.');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(parseInt(selectedSlot.split(':')[0]), 0, 0, 0);

      await addDoc(collection(db, 'appointments'), {
        clientId: user.uid,
        clientEmail: user.email,
        clientName: user.displayName,
        barberId: selectedBarber.uid,
        barberName: selectedBarber.displayName,
        barbershopId,
        barbershopName,
        timeSlot: selectedSlot,
        date: tomorrow,
        status: 'pending',
        services: [],
        totalPrice: 0,
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        '¡Cita reservada!',
        `Tu cita para mañana a las ${selectedSlot} ha sido enviada. El barbero la confirmará pronto.`,
        [{ text: 'OK', onPress: () => navigation.navigate('MyAppointments') }],
      );
    } catch (err) {
      console.error('[BookScreen] Error creating appointment:', err);
      Alert.alert('Error', 'No se pudo reservar la cita. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Reservar en {barbershopName}</Text>

      {/* Barber selection */}
      <Text style={styles.sectionLabel}>Elige tu barbero</Text>
      {loadingBarbers ? (
        <ActivityIndicator color={GOLD} style={{ marginVertical: 12 }} />
      ) : barbers.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Esta barbería aún no tiene barberos registrados</Text>
        </View>
      ) : (
        <View style={styles.slotsGrid}>
          {barbers.map((b) => (
            <TouchableOpacity
              key={b.uid}
              style={[styles.barberChip, selectedBarber?.uid === b.uid && styles.chipSelected]}
              onPress={() => setSelectedBarber(b)}
              activeOpacity={0.8}
            >
              <View style={styles.barberAvatar}>
                <Text style={styles.barberAvatarText}>{b.displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text
                style={[styles.barberName, selectedBarber?.uid === b.uid && styles.chipTextSelected]}
                numberOfLines={1}
              >
                {b.displayName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Time slot selection */}
      <Text style={styles.sectionLabel}>Horario para mañana</Text>
      <View style={styles.slotsGrid}>
        {TIME_SLOTS.map((slot) => (
          <TouchableOpacity
            key={slot}
            style={[styles.slot, selectedSlot === slot && styles.slotSelected]}
            onPress={() => setSelectedSlot(slot)}
            activeOpacity={0.8}
          >
            <Text style={[styles.slotText, selectedSlot === slot && styles.slotTextSelected]}>
              {slot}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.confirmBtn, (!selectedBarber || !selectedSlot || loading) && styles.btnDisabled]}
        onPress={handleBook}
        disabled={!selectedBarber || !selectedSlot || loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.confirmBtnText}>Confirmar reserva</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 24, gap: 20 },
  title: { fontSize: 22, fontWeight: '800', color: TEXT },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  barberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    gap: 10,
  },
  chipSelected: { borderColor: GOLD, backgroundColor: GOLD },
  barberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GOLD + '25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barberAvatarText: { color: GOLD, fontSize: 14, fontWeight: '800' },
  barberName: { fontSize: 14, fontWeight: '600', color: TEXT, maxWidth: 120 },
  chipTextSelected: { color: '#000' },
  emptyBox: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: MUTED, textAlign: 'center' },
  slot: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  slotSelected: { borderColor: GOLD, backgroundColor: GOLD },
  slotText: { fontSize: 15, fontWeight: '600', color: TEXT },
  slotTextSelected: { color: '#000' },
  confirmBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
