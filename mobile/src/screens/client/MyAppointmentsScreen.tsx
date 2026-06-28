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
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
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
};

const STATUS_COLOR: Record<Appointment['status'], string> = {
  pending: '#F59E0B',
  confirmed: '#10B981',
  completed: '#6B7280',
  cancelled: '#EF4444',
};

export function MyAppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAppointments = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(
        collection(db, 'appointments'),
        where('clientId', '==', user.uid),
        orderBy('date', 'desc'),
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
      setAppointments(data);
    } catch (err) {
      console.error('[MyAppointments] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const cancelAppointment = (id: string) => {
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
              await updateDoc(doc(db, 'appointments', id), { status: 'cancelled' });
              setAppointments((prev) =>
                prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a)),
              );
            } catch (err) {
              Alert.alert('Error', 'No se pudo cancelar la cita');
            }
          },
        },
      ],
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
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
                <Text style={styles.cardShop}>{(item as any).barbershopName ?? 'Barbería'}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                    {STATUS_LABEL[item.status]}
                  </Text>
                </View>
              </View>

              {(item as any).barberName && (
                <Text style={styles.cardBarber}>Barbero: {(item as any).barberName}</Text>
              )}
              <Text style={styles.cardDate}>
                {dateStr} · {item.timeSlot}
              </Text>
              {item.totalPrice > 0 && (
                <Text style={styles.cardPrice}>{item.totalPrice.toFixed(2)} €</Text>
              )}
              {(item.status === 'pending' || item.status === 'confirmed') && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => cancelAppointment(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancelar cita</Text>
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
  cardPrice: { fontSize: 14, fontWeight: '600', color: GOLD },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
});
