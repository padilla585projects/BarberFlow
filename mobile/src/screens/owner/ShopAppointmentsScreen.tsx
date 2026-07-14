import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { Appointment } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';

type Props = NativeStackScreenProps<OwnerStackParamList, 'ShopAppointments'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const STATUS_COLOR: Record<Appointment['status'], string> = {
  pending: '#F59E0B',
  confirmed: '#10B981',
  completed: '#6B7280',
  cancelled: '#EF4444',
  no_show: '#DC2626',
};

const STATUS_LABEL: Record<Appointment['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No presentado',
};

type FilterTab = 'all' | Appointment['status'];

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'cancelled', label: 'Canceladas' },
  { key: 'no_show', label: 'No presentados' },
];

export function ShopAppointmentsScreen({ route }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const { activeBarbershopId } = useAuthContext();

  // Aplicar filtro inicial recibido por params
  useEffect(() => {
    const f = route.params?.initialFilter;
    if (f === 'pending') setActiveTab('pending');
    // 'today' y 'all' usan la tab 'all' pero 'today' filtra por fecha
  }, []);

  useEffect(() => {
    if (!activeBarbershopId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'appointments'),
      where('barbershopId', '==', activeBarbershopId),
      orderBy('date', 'desc'),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)));
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error('[ShopAppointmentsScreen] Error listening to appointments:', err);
        setLoading(false);
        setRefreshing(false);
      },
    );

    return unsub;
  }, [activeBarbershopId]);

  // onSnapshot keeps data live; pull-to-refresh just resets the spinner
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const updateStatus = async (id: string, status: Appointment['status']) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );

      // Marcar como leídas las notificaciones relacionadas con esta cita
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          const notifQuery = query(
            collection(db, 'users', uid, 'notifications'),
            where('read', '==', false),
            where('data.appointmentId', '==', id),
          );
          const notifSnap = await getDocs(notifQuery);
          if (!notifSnap.empty) {
            const batch = writeBatch(db);
            notifSnap.docs.forEach((d) => {
              batch.update(d.ref, { read: true });
            });
            await batch.commit();
          }
        } catch {
          // No crítico si falla — la notificación se puede marcar manualmente
        }
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const isToday = (date: any): boolean => {
    if (!date) return false;
    const d = date.toDate ? date.toDate() : new Date(date);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const filtered = (() => {
    const initialFilter = route.params?.initialFilter;
    let list = appointments;
    // Si el filtro inicial era 'today' y estamos en la tab 'all', filtrar por hoy
    if (initialFilter === 'today' && activeTab === 'all') {
      list = list.filter((a) => isToday(a.date));
    }
    if (activeTab !== 'all') {
      list = list.filter((a) => a.status === activeTab);
    }
    return list;
  })();

  const formatDate = (date: any): string => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  if (!activeBarbershopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Sin barberia asociada</Text>
        <Text style={styles.emptySub}>No se encontro una barberia vinculada a tu cuenta</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
        }
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            <Text style={styles.heading}>Citas de la barberia</Text>
            <Text style={styles.sub}>
              {appointments.length} cita{appointments.length !== 1 ? 's' : ''} en total
            </Text>

            <View style={styles.tabsRow}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tab, isActive && styles.tabActive]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin citas</Text>
            <Text style={styles.emptySub}>
              No hay citas {activeTab !== 'all' ? STATUS_LABEL[activeTab as Appointment['status']].toLowerCase() + 's' : 'registradas'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          return (
            <View style={styles.card}>
              <View style={styles.cardTime}>
                <Text style={styles.cardTimeText}>{item.timeSlot}</Text>
                <Text style={styles.cardDateText}>{formatDate(item.date)}</Text>
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cardClient}>
                  {(item as any).clientName ?? 'Cliente'}
                </Text>
                <Text style={styles.cardBarber}>
                  Barbero: {(item as any).barberName ?? 'Sin asignar'}
                </Text>
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
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: STATUS_COLOR[item.status] + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: STATUS_COLOR[item.status] },
                      ]}
                    >
                      {STATUS_LABEL[item.status]}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
    paddingHorizontal: 32,
  },
  list: { padding: 16, gap: 12 },
  headerWrapper: { marginBottom: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: TEXT },
  sub: { fontSize: 14, color: MUTED, marginTop: 2 },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabActive: {
    backgroundColor: GOLD + '20',
    borderColor: GOLD,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  tabTextActive: {
    color: GOLD,
  },
  empty: { alignItems: 'center', paddingTop: 64, gap: 12 },
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
  cardDateText: { fontSize: 10, fontWeight: '600', color: MUTED, marginTop: 2 },
  cardInfo: { flex: 1, gap: 3 },
  cardClient: { fontSize: 15, fontWeight: '700', color: TEXT },
  cardBarber: { fontSize: 12, color: MUTED },
  cardServices: { fontSize: 12, color: GOLD, fontWeight: '600' },
  cardMeta: { fontSize: 11, color: MUTED },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
