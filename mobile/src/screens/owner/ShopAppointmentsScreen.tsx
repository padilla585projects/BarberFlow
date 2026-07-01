import React, { useEffect, useState, useCallback } from 'react';
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
import { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { Appointment } from '../../types';

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

export function ShopAppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const { activeBarbershopId } = useAuthContext();

  const fetchAppointments = useCallback(async () => {
    if (!activeBarbershopId) return;

    try {
      const q = query(
        collection(db, 'appointments'),
        where('barbershopId', '==', activeBarbershopId),
        orderBy('date', 'desc'),
      );
      const snap = await getDocs(q);
      setAppointments(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)),
      );
    } catch (err) {
      console.error('[ShopAppointmentsScreen] Error fetching appointments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeBarbershopId]);

  useEffect(() => {
    if (activeBarbershopId) {
      fetchAppointments();
    } else {
      setLoading(false);
    }
  }, [activeBarbershopId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

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

  const filtered = activeTab === 'all'
    ? appointments
    : appointments.filter((a) => a.status === activeTab);

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
        renderItem={({ item }) => (
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
        )}
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
