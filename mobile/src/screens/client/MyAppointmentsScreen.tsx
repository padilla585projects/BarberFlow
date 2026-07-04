import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';
import type { Appointment } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const STATUS_LABEL: Record<Appointment['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No presentado',
};

const STATUS_COLOR: Record<Appointment['status'], string> = {
  pending: '#F59E0B',
  confirmed: '#10B981',
  completed: '#6B7280',
  cancelled: '#EF4444',
  no_show: '#DC2626',
};

export function MyAppointmentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList>>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'appointments'),
      where('clientId', '==', user.uid),
      orderBy('date', 'desc'),
    );

    // Real-time listener: status changes (confirmed, cancelled) appear instantly
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)));
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error('[MyAppointments] Error:', err);
        setLoading(false);
        setRefreshing(false);
      },
    );

    return unsub;
  }, []);

  const cancelAppointment = (item: Appointment & { promoCode?: string }) => {
    Alert.alert(
      'Cancelar cita',
      '¿Seguro que quieres cancelar esta cita?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'appointments', item.id), { status: 'cancelled' });

              // Restore promo usage if a promo code was applied
              if (item.promoCode && item.barbershopId) {
                try {
                  const promoQ = query(
                    collection(db, 'barbershops', item.barbershopId, 'promos'),
                    where('code', '==', item.promoCode),
                  );
                  const promoSnap = await getDocs(promoQ);
                  if (!promoSnap.empty) {
                    await updateDoc(promoSnap.docs[0].ref, {
                      currentUses: increment(-1),
                    });
                  }
                } catch {
                  // Non-critical: log but don't block the cancellation flow
                  console.warn('[MyAppointments] Could not restore promo usage');
                }
              }

              setAppointments((prev) =>
                prev.map((a) => (a.id === item.id ? { ...a, status: 'cancelled' as const } : a)),
              );
            } catch (err) {
              Alert.alert('Error', 'No se pudo cancelar la cita');
            }
          },
        },
      ],
    );
  };

  // onSnapshot keeps data live; pull-to-refresh just resets the spinner
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        ListHeaderComponent={<Text style={styles.heading}>Mis citas</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>Sin citas</Text>
            <Text style={styles.emptySub}>Cuando reserves una cita aparecerá aquí</Text>
          </View>
        }
        renderItem={({ item }) => {
          const date = item.date instanceof Date ? item.date : (item.date as any)?.toDate?.() ?? new Date();
          const dateStr = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardShop}>{item.barbershopName ?? 'Barbería'}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                    {STATUS_LABEL[item.status]}
                  </Text>
                </View>
              </View>

              {item.barberName && (
                <Text style={styles.cardBarber}>Barbero: {item.barberName}</Text>
              )}
              <Text style={styles.cardDate}>
                {dateStr} · {item.timeSlot}
              </Text>
              {item.services && item.services.length > 0 && (
                <Text style={styles.cardServices} numberOfLines={2}>
                  {item.services.map((s) => s.name).join(', ')}
                </Text>
              )}
              {item.services && item.services.length > 0 && (
                <Text style={styles.cardDuration}>
                  {item.services.reduce((sum, s) => sum + s.duration, 0)} min
                </Text>
              )}
              {item.totalPrice > 0 && (
                <Text style={styles.cardPrice}>{item.totalPrice.toFixed(2)} €</Text>
              )}
              {(item.status === 'pending' || item.status === 'confirmed') && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: GOLD }]}
                  onPress={() => navigation.navigate('Reschedule', {
                    appointmentId: item.id,
                    barberId: item.barberId,
                    barbershopId: item.barbershopId,
                    totalDuration: item.services?.reduce((s, sv) => s + sv.duration, 0) ?? 30,
                  })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.actionBtnText, { color: '#000' }]}>✎ Reprogramar</Text>
                </TouchableOpacity>
              )}
              {(item.status === 'pending' || item.status === 'confirmed') && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => cancelAppointment(item as Appointment & { promoCode?: string })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancelar cita</Text>
                </TouchableOpacity>
              )}
              {item.status === 'completed' && !item.reviewed && (
                <TouchableOpacity
                  style={styles.reviewBtn}
                  onPress={() =>
                    navigation.navigate('Review', {
                      appointmentId: item.id,
                      barberName: item.barberName ?? 'Barbero',
                      barbershopId: item.barbershopId,
                      barberId: item.barberId,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.reviewBtnText}>⭐ Valorar</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  list: { padding: 16, gap: 12 },
  heading: { fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 8 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center' },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardShop: { fontSize: 15, fontWeight: '700', color: TEXT },
  cardBarber: { fontSize: 13, color: GOLD, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 13, color: MUTED },
  cardServices: { fontSize: 12, color: GOLD, fontWeight: '600' },
  cardDuration: { fontSize: 11, color: MUTED },
  cardPrice: { fontSize: 14, fontWeight: '600', color: GOLD },
  actionBtn: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  reviewBtn: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    backgroundColor: GOLD + '15',
  },
  reviewBtnText: { color: GOLD, fontSize: 13, fontWeight: '700' },
});
