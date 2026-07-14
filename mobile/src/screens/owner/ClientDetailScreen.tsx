import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';

/* ── theme tokens ────────────────────────────────────── */
const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const RED     = '#E74C3C';
const GREEN   = '#27AE60';

/* ── types ───────────────────────────────────────────── */
type Props = NativeStackScreenProps<OwnerStackParamList, 'ClientDetail'>;

interface ClientProfile {
  displayName: string;
  email: string;
  phone?: string;
  photoURL?: string;
}

interface AppointmentRow {
  id: string;
  date: Date;
  timeSlot: string;
  barberName: string;
  services: { name: string; price: number }[];
  totalPrice: number;
  status: string;
}

interface SaleRow {
  id: string;
  date: Date;
  items: { name: string; price: number; quantity: number; type: string }[];
  totalAmount: number;
}

/* ── helpers ─────────────────────────────────────────── */
const toDate = (date: any): Date => {
  if (!date) return new Date(0);
  return date.toDate ? date.toDate() : new Date(date);
};

const formatDate = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatCurrency = (amount: number): string =>
  `${amount.toFixed(2)} €`;

const statusLabel = (s: string): string => {
  switch (s) {
    case 'completed':  return 'Completada';
    case 'confirmed':  return 'Confirmada';
    case 'pending':    return 'Pendiente';
    case 'cancelled':  return 'Cancelada';
    default:           return s;
  }
};

const statusColor = (s: string): string => {
  switch (s) {
    case 'completed':  return GREEN;
    case 'confirmed':  return GOLD;
    case 'pending':    return MUTED;
    case 'cancelled':  return RED;
    default:           return MUTED;
  }
};

/* ── component ───────────────────────────────────────── */
export function ClientDetailScreen({ route, navigation }: Props) {
  const { activeBarbershopId } = useAuthContext();
  const { clientId, clientName } = route.params;

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ── active tab for history sections ─────────────── */
  const [activeTab, setActiveTab] = useState<'appointments' | 'sales'>('appointments');

  /* ── fetch all data ──────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!activeBarbershopId) { setLoading(false); return; }

    try {

      // Fetch client profile from users collection
      const clientSnap = await getDoc(doc(db, 'users', clientId));
      if (clientSnap.exists()) {
        const data = clientSnap.data() as any;
        setProfile({
          displayName: data.displayName || clientName,
          email: data.email || '',
          phone: data.phone || data.phoneNumber || '',
          photoURL: data.photoURL || '',
        });
      } else {
        setProfile({
          displayName: clientName,
          email: '',
        });
      }

      // Fetch appointments for this client at this barbershop
      const apptQuery = query(
        collection(db, 'appointments'),
        where('barbershopId', '==', activeBarbershopId),
        where('clientId', '==', clientId),
        orderBy('date', 'desc'),
      );
      const apptSnap = await getDocs(apptQuery);

      const apptRows: AppointmentRow[] = apptSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          date: toDate(data.date),
          timeSlot: data.timeSlot || '',
          barberName: data.barberName || 'Sin asignar',
          services: (data.services || []).map((s: any) => ({
            name: s.name || '',
            price: Number(s.price) || 0,
          })),
          totalPrice: Number(data.totalPrice) || 0,
          status: data.status || 'pending',
        };
      });
      setAppointments(apptRows);

      // Fetch sales for this client
      const salesQuery = query(
        collection(db, 'sales'),
        where('barbershopId', '==', activeBarbershopId),
        where('clientId', '==', clientId),
      );
      const salesSnap = await getDocs(salesQuery);
      const salesRows: SaleRow[] = salesSnap.docs
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            date: toDate(data.date),
            items: (data.items || []).map((i: any) => ({
              name: i.name || '',
              price: Number(i.price) || 0,
              quantity: Number(i.quantity) || 1,
              type: i.type || 'product',
            })),
            totalAmount: Number(data.totalAmount) || 0,
          };
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      setSales(salesRows);

      // Fetch notes
      const notesSnap = await getDoc(
        doc(db, 'barbershops', activeBarbershopId, 'clientNotes', clientId),
      );
      if (notesSnap.exists()) {
        const n = (notesSnap.data() as any).notes || '';
        setNotes(n);
        setSavedNotes(n);
      }
    } catch (err) {
      console.error('[ClientDetailScreen] Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId, clientName, activeBarbershopId]);

  useEffect(() => {
    navigation.setOptions({ title: clientName });
    fetchData();
  }, [fetchData, navigation, clientName]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  /* ── save notes ──────────────────────────────────── */
  const handleSaveNotes = async () => {
    if (!activeBarbershopId || notes === savedNotes) return;
    setSavingNotes(true);
    try {
      await setDoc(
        doc(db, 'barbershops', activeBarbershopId, 'clientNotes', clientId),
        { notes, updatedAt: new Date() },
        { merge: true },
      );
      setSavedNotes(notes);
      Alert.alert('Guardado', 'Notas actualizadas correctamente.');
    } catch (err) {
      console.error('[ClientDetailScreen] Error saving notes:', err);
      Alert.alert('Error', 'No se pudieron guardar las notas.');
    } finally {
      setSavingNotes(false);
    }
  };

  /* ── computed stats ──────────────────────────────── */
  const completedAppts = appointments.filter((a) => a.status === 'completed');
  const totalVisits = completedAppts.length;
  const totalSpent =
    completedAppts.reduce((s, a) => s + a.totalPrice, 0) +
    sales.reduce((s, sl) => s + sl.totalAmount, 0);
  const avgTicket = totalVisits > 0
    ? completedAppts.reduce((s, a) => s + a.totalPrice, 0) / totalVisits
    : 0;
  const lastVisit = appointments.length > 0 ? appointments[0].date : null;

  // Favorite barber
  const barberCounts = new Map<string, number>();
  completedAppts.forEach((a) => {
    barberCounts.set(a.barberName, (barberCounts.get(a.barberName) || 0) + 1);
  });
  let favoriteBarber = '---';
  let maxBarberCount = 0;
  barberCounts.forEach((count, name) => {
    if (count > maxBarberCount) {
      maxBarberCount = count;
      favoriteBarber = name;
    }
  });

  // Most booked service
  const serviceCounts = new Map<string, number>();
  completedAppts.forEach((a) => {
    a.services.forEach((s) => {
      serviceCounts.set(s.name, (serviceCounts.get(s.name) || 0) + 1);
    });
  });
  let topService = '---';
  let maxServiceCount = 0;
  serviceCounts.forEach((count, name) => {
    if (count > maxServiceCount) {
      maxServiceCount = count;
      topService = name;
    }
  });

  /* ── loading ─────────────────────────────────────── */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  /* ── main render ─────────────────────────────────── */
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GOLD}
            colors={[GOLD]}
          />
        }
      >
        {/* ── Header ─────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {(profile?.displayName || clientName).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.headerName}>
            {profile?.displayName || clientName}
          </Text>
          {profile?.email ? (
            <Text style={styles.headerSub}>{profile.email}</Text>
          ) : null}
          {profile?.phone ? (
            <Text style={styles.headerSub}>{profile.phone}</Text>
          ) : null}
        </View>

        {/* ── Stats grid ─────────────────────────── */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{totalVisits}</Text>
            <Text style={styles.statBoxLabel}>Visitas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{formatCurrency(totalSpent)}</Text>
            <Text style={styles.statBoxLabel}>Total gastado</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{formatCurrency(avgTicket)}</Text>
            <Text style={styles.statBoxLabel}>Ticket medio</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>
              {lastVisit ? formatDate(lastVisit) : '---'}
            </Text>
            <Text style={styles.statBoxLabel}>Ultima visita</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue} numberOfLines={1}>
              {favoriteBarber}
            </Text>
            <Text style={styles.statBoxLabel}>Barbero favorito</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue} numberOfLines={1}>
              {topService}
            </Text>
            <Text style={styles.statBoxLabel}>Servicio favorito</Text>
          </View>
        </View>

        {/* ── Tab switcher ───────────────────────── */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'appointments' && styles.tabActive]}
            onPress={() => setActiveTab('appointments')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'appointments' && styles.tabTextActive,
              ]}
            >
              Citas ({appointments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
            onPress={() => setActiveTab('sales')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'sales' && styles.tabTextActive,
              ]}
            >
              Ventas ({sales.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Appointments list ──────────────────── */}
        {activeTab === 'appointments' && (
          <View style={styles.section}>
            {appointments.length === 0 ? (
              <Text style={styles.emptyText}>Sin citas registradas</Text>
            ) : (
              appointments.map((appt) => (
                <View key={appt.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyDate}>
                      {formatDate(appt.date)} - {appt.timeSlot}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor(appt.status) + '22' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: statusColor(appt.status) },
                        ]}
                      >
                        {statusLabel(appt.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.historyBarber}>
                    Barbero: {appt.barberName}
                  </Text>

                  {appt.services.map((s, idx) => (
                    <View key={idx} style={styles.serviceRow}>
                      <Text style={styles.serviceName}>{s.name}</Text>
                      <Text style={styles.servicePrice}>
                        {formatCurrency(s.price)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(appt.totalPrice)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Sales list ─────────────────────────── */}
        {activeTab === 'sales' && (
          <View style={styles.section}>
            {sales.length === 0 ? (
              <Text style={styles.emptyText}>Sin ventas registradas</Text>
            ) : (
              sales.map((sale) => (
                <View key={sale.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyDate}>
                      {formatDate(sale.date)}
                    </Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(sale.totalAmount)}
                    </Text>
                  </View>

                  {sale.items.map((item, idx) => (
                    <View key={idx} style={styles.serviceRow}>
                      <Text style={styles.serviceName}>
                        {item.name}
                        {item.quantity > 1 ? ` x${item.quantity}` : ''}
                      </Text>
                      <Text style={styles.servicePrice}>
                        {formatCurrency(item.price * item.quantity)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Notes ──────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Agregar notas sobre este cliente..."
            placeholderTextColor={MUTED}
            multiline
            textAlignVertical="top"
          />
          {notes !== savedNotes && (
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? (
                <ActivityIndicator size="small" color={BG} />
              ) : (
                <Text style={styles.saveBtnText}>Guardar notas</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ── styles ──────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { paddingBottom: 32 },

  /* header */
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    color: BG,
    fontSize: 34,
    fontWeight: '700',
  },
  headerName: {
    color: TEXT_C,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSub: {
    color: MUTED,
    fontSize: 14,
    marginBottom: 2,
  },

  /* stats grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  statBox: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  statBoxValue: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    color: GOLD,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  statBoxLabel: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BORDER,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    color: MUTED,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },

  /* tabs */
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: GOLD,
  },
  tabText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: BG,
  },

  /* sections */
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: TEXT_C,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },

  /* history cards */
  historyCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    color: TEXT_C,
    fontSize: 14,
    fontWeight: '600',
  },
  historyBarber: {
    color: MUTED,
    fontSize: 13,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  serviceName: {
    color: TEXT_C,
    fontSize: 13,
    flex: 1,
  },
  servicePrice: {
    color: MUTED,
    fontSize: 13,
    marginLeft: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  totalValue: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '700',
  },

  /* notes */
  notesInput: {
    backgroundColor: SURFACE,
    color: TEXT_C,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
  },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: BG,
    fontSize: 15,
    fontWeight: '700',
  },

  /* empty */
  emptyText: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
