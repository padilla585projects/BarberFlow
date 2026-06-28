import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

type Props = NativeStackScreenProps<ClientStackParamList, 'Book'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

export function BookScreen({ route, navigation }: Props) {
  const { barbershopId, barbershopName } = route.params;
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
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
      <Text style={styles.sub}>Selecciona el horario para mañana</Text>

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
        style={[styles.confirmBtn, (!selectedSlot || loading) && styles.btnDisabled]}
        onPress={handleBook}
        disabled={!selectedSlot || loading}
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
  sub: { fontSize: 14, color: MUTED },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
