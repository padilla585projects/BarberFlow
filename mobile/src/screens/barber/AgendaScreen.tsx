import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { signOut } from '../../services/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../../contexts/AuthContext';
import type { BarberStackParamList } from '../../navigation/BarberNavigator';
import type { Appointment } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

export function AgendaScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BarberStackParamList>>();
  const { activeBarbershopId } = useAuthContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // today used for display in the header
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !activeBarbershopId) {
      setLoading(false);
      return;
    }

    // Re-compute start-of-today so the listener always uses the current day
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'appointments'),
      where('barberId', '==', user.uid),
      where('barbershopId', '==', activeBarbershopId),
      where('date', '>=', startOfToday),
      orderBy('date'),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)));
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error('[AgendaScreen] Error:', err);
        Alert.alert(
          'Error al cargar citas',
          'No se pudo cargar la agenda. Revisa tu conexión y vuelve a intentarlo.',
          [{ text: 'OK' }],
        );
        setLoading(false);
        setRefreshing(false);
      },
    );

    return unsub;
  }, [activeBarbershopId]);

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

  // onSnapshot keeps data live; pull-to-refresh just resets the spinner
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const STATUS_COLOR: Record<Appointment['status'], string> = {
    pending: '#F59E0B',
    confirmed: '#10B981',
    completed: '#6B7280',
    cancelled: '#EF4444',
    no_show: '#DC2626',
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: '60%' }}>
              <View style={{ flexDirection: 'row', gap: 16, paddingRight: 8 }}>
                <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
                  <Text style={{ fontSize: 14, color: GOLD, fontWeight: '600' }}>🕐 Horario</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Payments')}>
                  <Text style={{ fontSize: 14, color: GOLD, fontWeight: '600' }}>💳</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Portfolio')}>
                  <Text style={{ fontSize: 14, color: GOLD, fontWeight: '600' }}>📸</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Stats')}>
                  <Text style={{ fontSize: 14, color: GOLD, fontWeight: '600' }}>📊 Stats</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
                  <Text style={{ fontSize: 14, color: GOLD, fontWeight: '600' }}>💬</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('BugReport')}>
                  <Text style={{ fontSize: 14, color: GOLD, fontWeight: '600' }}>{'🐛'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('Cerrar sesion', 'Seguro que quieres salir?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Salir', style: 'destructive', onPress: signOut },
                ])}>
                  <Text style={styles.logoutBtn}>Salir</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗓️</Text>
            <Text style={styles.emptyTitle}>Sin citas hoy</Text>
            <Text style={styles.emptySub}>No tienes citas programadas para hoy</Text>
          </View>
        }
        renderItem={({ item }) => {
          return (
          <View style={styles.card}>
            <View style={styles.cardTime}>
              <Text style={styles.cardTimeText}>{item.timeSlot}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardClient}>{(item as any).clientName ?? 'Cliente'}</Text>
              <Text style={styles.cardEmail}>{(item as any).clientEmail ?? ''}</Text>
              {item.services && item.services.length > 0 && (
                <Text style={styles.cardServices} numberOfLines={2}>
                  {item.services.map((s) => s.name).join(', ')}
                </Text>
              )}
              {item.services && item.services.length > 0 && (
                <Text style={styles.cardMeta}>
                  {item.services.reduce((sum, s) => sum + s.duration, 0)} min · {item.totalPrice.toFixed(2)} €
                </Text>
              )}
              <View style={styles.badgesRow}>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                    {item.status === 'pending' ? 'Pendiente' :
                     item.status === 'confirmed' ? 'Confirmada' :
                     item.status === 'completed' ? 'Completada' :
                     item.status === 'no_show' ? 'No presentado' : 'Cancelada'}
                  </Text>
                </View>
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
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}
                  onPress={() => updateStatus(item.id, 'completed')}
                >
                  <Text style={styles.actionBtnText}>✓✓</Text>
                </TouchableOpacity>
                {(() => {
                  const apptDate = item.date && (item.date as any).toDate
                    ? (item.date as any).toDate()
                    : new Date(item.date);
                  return apptDate < new Date();
                })() && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
                    onPress={() => updateStatus(item.id, 'no_show')}
                  >
                    <Text style={styles.actionBtnText}>NS</Text>
                  </TouchableOpacity>
                )}
              </View>
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
  cardServices: { fontSize: 12, color: GOLD, fontWeight: '600' },
  cardMeta: { fontSize: 11, color: MUTED },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginTop: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
