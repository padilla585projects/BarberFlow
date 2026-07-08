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
  getDoc,
} from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../services/firebase';
import { signOut } from '../../services/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../../contexts/AuthContext';
import type { BarberStackParamList } from '../../navigation/BarberNavigator';
import type { Appointment } from '../../types';
import { useUnreadCount } from '../common/NotificationsScreen';
import { useBarberTheme, BARBER_COLORS, BARBER_SPACING } from '../../theme/barberTheme';

// Design tokens from theme
const BG      = BARBER_COLORS.bgPrimary;
const SURFACE = BARBER_COLORS.bgSecondary;
const GOLD    = BARBER_COLORS.primary;
const TEXT    = BARBER_COLORS.text;
const MUTED   = BARBER_COLORS.textTertiary;
const BORDER  = '#282828';
const SUCCESS = BARBER_COLORS.success;
const ERROR   = BARBER_COLORS.error;

export function AgendaScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BarberStackParamList>>();
  const { activeBarbershopId } = useAuthContext();
  const unreadCount = useUnreadCount();
  const insets = useSafeAreaInsets();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
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
      async (snap) => {
        const appts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
        setAppointments(appts);
        setLoading(false);
        setRefreshing(false);

        // Resolve client display names (batch, no duplicates)
        const uniqueIds = [...new Set(appts.map((a) => a.clientId).filter(Boolean))];
        const resolved: Record<string, string> = {};
        await Promise.all(
          uniqueIds.map(async (uid) => {
            try {
              const snap = await getDoc(doc(db, 'users', uid));
              if (snap.exists()) {
                resolved[uid] = (snap.data() as any).displayName ?? uid;
              }
            } catch {
              // non-critical — fallback shows clientId
            }
          }),
        );
        setClientNames((prev) => ({ ...prev, ...resolved }));
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
      {/* Header outside FlatList to avoid nested ScrollView touch conflicts */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ position: 'relative' }}>
              <Text style={{ fontSize: 14, color: GOLD, fontWeight: '600' }}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('BugReport')}>
              <Text style={{ fontSize: 14, color: GOLD, fontWeight: '600' }}>{'🐛'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Salir', style: 'destructive', onPress: signOut },
            ])}>
              <Text style={styles.logoutBtn}>Salir</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
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
              {/* Left gold border accent */}
              <View style={styles.cardBorder} />

              {/* Main content */}
              <View style={styles.cardContent}>
                {/* Time + Status Row */}
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTime}>{item.timeSlot}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === 'pending' ? '#FFD70040' :
                          item.status === 'confirmed' ? '#00DD0040' :
                          item.status === 'completed' ? '#6B728040' :
                          item.status === 'no_show' ? '#DC262640' :
                          '#EF444440',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            item.status === 'pending' ? '#FFD700' :
                            item.status === 'confirmed' ? '#00DD00' :
                            item.status === 'completed' ? '#6B7280' :
                            item.status === 'no_show' ? '#DC2626' :
                            '#EF4444',
                        },
                      ]}
                    >
                      {item.status === 'pending' ? 'PENDIENTE' :
                       item.status === 'confirmed' ? 'CONFIRMADA' :
                       item.status === 'completed' ? 'COMPLETADA' :
                       item.status === 'no_show' ? 'NO PRESENTADO' : 'CANCELADA'}
                    </Text>
                  </View>
                </View>

                {/* Client name */}
                <Text style={styles.cardClientName}>
                  {clientNames[item.clientId] ?? (item as any).clientName ?? 'Cliente'}
                </Text>

                {/* Email */}
                {(item as any).clientEmail && (
                  <Text style={styles.cardEmail}>{(item as any).clientEmail}</Text>
                )}

                {/* Services and meta */}
                {item.services && item.services.length > 0 && (
                  <>
                    <Text style={styles.cardServices} numberOfLines={2}>
                      {item.services.map((s) => s.name).join(', ')}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {item.services.reduce((sum, s) => sum + s.duration, 0)} min · {item.totalPrice.toFixed(2)} €
                    </Text>
                  </>
                )}
              </View>

              {/* Action buttons */}
              {item.status === 'pending' && (
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.confirmBtn]}
                    onPress={() => updateStatus(item.id, 'confirmed')}
                  >
                    <Text style={styles.confirmBtnText}>Confirmar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => updateStatus(item.id, 'cancelled')}
                  >
                    <Text style={styles.rejectBtnText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {item.status === 'confirmed' && (
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.completeBtn]}
                    onPress={() => updateStatus(item.id, 'completed')}
                  >
                    <Text style={styles.completeBtnText}>Completada</Text>
                  </TouchableOpacity>
                  {(() => {
                    const apptDate = item.date && (item.date as any).toDate
                      ? (item.date as any).toDate()
                      : new Date(item.date);
                    return apptDate < new Date();
                  })() && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.noShowBtn]}
                      onPress={() => updateStatus(item.id, 'no_show')}
                    >
                      <Text style={styles.noShowBtnText}>No presentado</Text>
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
  list: { paddingHorizontal: BARBER_SPACING.lg, paddingBottom: BARBER_SPACING.lg, gap: BARBER_SPACING.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: BARBER_SPACING.lg,
    paddingTop: BARBER_SPACING.md,
    paddingBottom: BARBER_SPACING.md,
  },
  heading: { fontSize: 26, fontWeight: '800', color: TEXT },
  sub: { fontSize: 14, color: MUTED, marginTop: 2 },
  logoutBtn: { fontSize: 14, color: ERROR, fontWeight: '600', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center' },

  /* Card styling */
  card: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  cardBorder: {
    width: 0, // Border handled by borderLeftWidth
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: BARBER_SPACING.lg,
    paddingVertical: BARBER_SPACING.md,
    gap: BARBER_SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: BARBER_SPACING.md,
    marginBottom: BARBER_SPACING.sm,
  },
  cardTime: {
    fontSize: 20,
    fontWeight: '700',
    color: GOLD,
  },
  statusBadge: {
    paddingHorizontal: BARBER_SPACING.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardClientName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
  cardEmail: {
    fontSize: 12,
    color: MUTED,
  },
  cardServices: {
    fontSize: 12,
    color: GOLD,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 12,
    color: MUTED,
  },

  /* Action buttons */
  actionsContainer: {
    flexDirection: 'row',
    gap: BARBER_SPACING.md,
    paddingHorizontal: BARBER_SPACING.lg,
    paddingVertical: BARBER_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: BARBER_SPACING.md,
  },
  confirmBtn: {
    backgroundColor: SUCCESS,
  },
  confirmBtnText: {
    color: BG,
    fontWeight: '700',
    fontSize: 14,
  },
  rejectBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: ERROR,
  },
  rejectBtnText: {
    color: ERROR,
    fontWeight: '700',
    fontSize: 14,
  },
  completeBtn: {
    backgroundColor: '#6B7280',
  },
  completeBtnText: {
    color: TEXT,
    fontWeight: '700',
    fontSize: 14,
  },
  noShowBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  noShowBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },

  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: ERROR,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
