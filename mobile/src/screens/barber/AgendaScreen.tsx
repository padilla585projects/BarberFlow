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
import { signOut } from '../../services/auth';
import type { Appointment } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

export function AgendaScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fetchAgenda = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(
        collection(db, 'appointments'),
        where('barberId', '==', user.uid),
        where('date', '>=', today),
        orderBy('date'),
      );
      const snap = await getDocs(q);
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)));
    } catch (err) {
      console.error('[AgendaScreen] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAgenda();
  }, []);

  const updateStatus = async (id: string, status: Appointment['status']) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgenda();
  };

  const STATUS_COLOR: Record<Appointment['status'], string> = {
    pending: '#F59E0B',
    confirmed: '#10B981',
    completed: '#6B7280',
    cancelled: '#EF4444',
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
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.heading}>Mi agenda</Text>
              <Text style={styles.sub}>
                {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>
            <TouchableOpacity onPress={signOut}>
              <Text style={styles.logoutBtn}>Salir</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗓️</Text>
            <Text style={styles.emptyTitle}>Sin citas hoy</Text>
            <Text style={styles.emptySub}>No tienes citas programadas para hoy</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTime}>
              <Text style={styles.cardTimeText}>{item.timeSlot}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardClient}>{(item as any).clientName ?? 'Cliente'}</Text>
              <Text style={styles.cardEmail}>{(item as any).clientEmail ?? ''}</Text>
              <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                  {item.status === 'pending' ? 'Pendiente' :
                   item.status === 'confirmed' ? 'Confirmada' :
                   item.status === 'completed' ? 'Completada' : 'Cancelada'}
                </Text>
              </View>
            </View>
            {item.status === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => updateStatus(item.id, 'confirmed')}
                >
                  <Text style={styles.actionBtnText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => updateStatus(item.id, 'cancelled')}
                >
                  <Text style={styles.actionBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {item.status === 'confirmed' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}
                onPress={() => updateStatus(item.id, 'completed')}
              >
                <Text style={styles.actionBtnText}>✓✓</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  list: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: TEXT },
  sub: { fontSize: 14, color: MUTED, marginTop: 2 },
  logoutBtn: { fontSize: 14, color: '#EF4444', fontWeight: '600', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  cardTime: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: GOLD + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTimeText: { fontSize: 14, fontWeight: '800', color: GOLD },
  cardInfo: { flex: 1, gap: 3 },
  cardClient: { fontSize: 15, fontWeight: '700', color: TEXT },
  cardEmail: { fontSize: 12, color: MUTED },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginTop: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
