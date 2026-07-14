import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

type Period = 'today' | 'week' | 'month' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  all: 'Todo',
};

interface AppointmentRow {
  id: string;
  date: Date;
  timeSlot: string;
  clientName: string;
  totalPrice: number;
  commission: number;
  commissionPaid: boolean;
}

/* ------------------------------------------------------------------ */
/*  Revenue Chart (pure RN Views – no external chart library)         */
/* ------------------------------------------------------------------ */

interface ChartBucket {
  label: string;
  revenue: number;
  commission: number;
}

function RevenueChart({ data }: { data: ChartBucket[] }) {
  const maxValue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.title}>Ingresos por periodo</Text>

      <View style={chartStyles.barsWrap}>
        {data.map((bucket, idx) => {
          const revWidth = (bucket.revenue / maxValue) * 100;
          const comWidth = (bucket.commission / maxValue) * 100;

          return (
            <View key={idx} style={chartStyles.row}>
              <Text style={chartStyles.label}>{bucket.label}</Text>

              <View style={chartStyles.barTrack}>
                {/* Revenue (background bar) */}
                <View
                  style={[
                    chartStyles.barRevenue,
                    { width: `${revWidth}%` },
                  ]}
                />
                {/* Commission (overlaid) */}
                <View
                  style={[
                    chartStyles.barCommission,
                    { width: `${comWidth}%` },
                  ]}
                />
              </View>

              <Text style={chartStyles.amount}>
                {bucket.revenue > 0
                  ? bucket.revenue.toLocaleString('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                  : '—'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={chartStyles.legend}>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
          <Text style={chartStyles.legendText}>Ingresos</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: GOLD }]} />
          <Text style={chartStyles.legendText}>Comision</Text>
        </View>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
  barsWrap: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    width: 50,
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
  },
  barTrack: {
    flex: 1,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  barRevenue: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
  },
  barCommission: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: GOLD,
    borderRadius: 6,
  },
  amount: {
    width: 56,
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'right',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
  },
});

/* ------------------------------------------------------------------ */
/*  Data aggregation helper                                           */
/* ------------------------------------------------------------------ */

const DAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function buildChartData(
  filtered: AppointmentRow[],
  period: Period,
  commissionRate: number,
): ChartBucket[] {
  switch (period) {
    case 'today': {
      // 2-hour blocks from 9:00 to 20:00
      const blocks: ChartBucket[] = [];
      for (let h = 9; h < 20; h += 2) {
        blocks.push({ label: `${h}:00`, revenue: 0, commission: 0 });
      }
      filtered.forEach((a) => {
        const hour = a.date.getHours();
        const idx = Math.floor((hour - 9) / 2);
        if (idx >= 0 && idx < blocks.length) {
          blocks[idx].revenue += a.totalPrice;
          blocks[idx].commission += a.commission;
        }
      });
      return blocks;
    }

    case 'week': {
      const buckets: ChartBucket[] = DAY_LABELS.map((l) => ({
        label: l,
        revenue: 0,
        commission: 0,
      }));
      filtered.forEach((a) => {
        // JS getDay(): 0=Sun … 6=Sat → map to Mon=0 … Sun=6
        const jsDay = a.date.getDay();
        const idx = jsDay === 0 ? 6 : jsDay - 1;
        buckets[idx].revenue += a.totalPrice;
        buckets[idx].commission += a.commission;
      });
      return buckets;
    }

    case 'month': {
      const buckets: ChartBucket[] = [
        { label: 'Sem 1', revenue: 0, commission: 0 },
        { label: 'Sem 2', revenue: 0, commission: 0 },
        { label: 'Sem 3', revenue: 0, commission: 0 },
        { label: 'Sem 4', revenue: 0, commission: 0 },
      ];
      filtered.forEach((a) => {
        const weekIdx = Math.min(Math.floor((a.date.getDate() - 1) / 7), 3);
        buckets[weekIdx].revenue += a.totalPrice;
        buckets[weekIdx].commission += a.commission;
      });
      return buckets;
    }

    case 'all':
    default: {
      // Last 6 months (most recent first, then reversed for chart order)
      const now = new Date();
      const buckets: ChartBucket[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
          label: MONTH_NAMES[d.getMonth()],
          revenue: 0,
          commission: 0,
        });
      }
      // Build a set of year-month keys for the last 6 months
      const monthKeys: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`);
      }
      filtered.forEach((a) => {
        const key = `${a.date.getFullYear()}-${a.date.getMonth()}`;
        const idx = monthKeys.indexOf(key);
        if (idx !== -1) {
          buckets[idx].revenue += a.totalPrice;
          buckets[idx].commission += a.commission;
        }
      });
      return buckets;
    }
  }
}

/* ------------------------------------------------------------------ */

type Props = NativeStackScreenProps<OwnerStackParamList, 'BarberEarnings'>;

export function BarberEarningsScreen({ route }: Props) {
  const { activeBarbershopId } = useAuthContext();
  const { barberId, barberName } = route.params;

  const [period, setPeriod] = useState<Period>('month');
  const [commissionRate, setCommissionRate] = useState<number>(50);
  const [commissionInput, setCommissionInput] = useState('50');
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);

  // Fetch the barber's commission rate and barbershopId
  const fetchBarberData = useCallback(async () => {
    try {
      const q = query(collection(db, 'users'), where('uid', '==', barberId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        const rate = data.commissionRate ?? 50;
        setCommissionRate(rate);
        setCommissionInput(String(rate));
      }
    } catch (err) {
      console.error('[BarberEarnings] Error fetching barber data:', err);
    }
  }, [barberId]);

  // Fetch completed appointments for this barber
  const fetchAppointments = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'appointments'),
        where('barberId', '==', barberId),
        where('status', '==', 'completed'),
      );
      const snap = await getDocs(q);

      const rows: AppointmentRow[] = snap.docs.map((d) => {
        const data = d.data();
        const date: Date = data.date?.toDate?.() ?? new Date(0);
        return {
          id: d.id,
          date,
          timeSlot: data.timeSlot ?? '',
          clientName: data.clientName ?? 'Cliente',
          totalPrice: data.totalPrice ?? 0,
          commission: (data.totalPrice ?? 0) * (commissionRate / 100),
          commissionPaid: data.commissionPaid === true,
        };
      });

      // Sort by date descending
      rows.sort((a, b) => b.date.getTime() - a.date.getTime());
      setAppointments(rows);
    } catch (err) {
      console.error('[BarberEarnings] Error fetching appointments:', err);
    }
  }, [barberId, commissionRate]);

  useEffect(() => {
    const init = async () => {
      await fetchBarberData();
      setLoading(false);
    };
    init();
  }, [fetchBarberData]);

  // Refetch appointments when commission rate or period changes
  useEffect(() => {
    if (!loading) {
      fetchAppointments();
    }
  }, [commissionRate, fetchAppointments, loading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBarberData();
    await fetchAppointments();
    setRefreshing(false);
  }, [fetchBarberData, fetchAppointments]);

  // Filter by period
  const getFilteredAppointments = (): AppointmentRow[] => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return appointments.filter((a) => {
      switch (period) {
        case 'today':
          return a.date >= todayStart;
        case 'week':
          return a.date >= weekStart;
        case 'month':
          return a.date >= monthStart;
        case 'all':
        default:
          return true;
      }
    });
  };

  const filtered = getFilteredAppointments();

  const totalRevenue = filtered.reduce((sum, a) => sum + a.totalPrice, 0);
  const totalCommission = filtered.reduce((sum, a) => sum + a.commission, 0);
  const completedCount = filtered.length;
  const averageTicket = completedCount > 0 ? totalRevenue / completedCount : 0;
  const unpaidCommission = filtered
    .filter((a) => !a.commissionPaid)
    .reduce((sum, a) => sum + a.commission, 0);
  const unpaidAppointments = filtered.filter((a) => !a.commissionPaid);

  const chartData = useMemo(
    () => buildChartData(filtered, period, commissionRate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered.length, period, commissionRate],
  );

  // Save commission rate
  const handleSaveCommission = async () => {
    const rate = parseInt(commissionInput, 10);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Alert.alert('Error', 'La comision debe ser un numero entre 0 y 100.');
      return;
    }

    setSaving(true);
    try {
      const q = query(collection(db, 'users'), where('uid', '==', barberId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { commissionRate: rate });
        setCommissionRate(rate);
      }
    } catch (err) {
      console.error('[BarberEarnings] Error saving commission:', err);
      Alert.alert('Error', 'No se pudo guardar la comision.');
    } finally {
      setSaving(false);
    }
  };

  // Pay commissions
  const handlePayCommissions = async () => {
    if (unpaidAppointments.length === 0) {
      Alert.alert('Sin pendientes', 'No hay comisiones pendientes de pago.');
      return;
    }

    Alert.alert(
      'Confirmar pago',
      `Marcar ${formatCurrency(unpaidCommission)} como pagado para ${barberName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: async () => {
            setPaying(true);
            try {
              if (!activeBarbershopId) {
                Alert.alert('Error', 'No se encontro la barberia.');
                return;
              }

              // Create payment record
              await addDoc(collection(db, `barbershops/${activeBarbershopId}/payments`), {
                barberId,
                barberName,
                period: PERIOD_LABELS[period],
                totalAmount: totalRevenue,
                commissionAmount: unpaidCommission,
                appointmentIds: unpaidAppointments.map((a) => a.id),
                paidAt: serverTimestamp(),
              });

              // Mark each appointment as paid
              const batch = writeBatch(db);
              unpaidAppointments.forEach((a) => {
                const ref = doc(db, 'appointments', a.id);
                batch.update(ref, { commissionPaid: true });
              });
              await batch.commit();

              Alert.alert('Pagado', 'Las comisiones han sido marcadas como pagadas.');
              await fetchAppointments();
            } catch (err) {
              console.error('[BarberEarnings] Error paying commissions:', err);
              Alert.alert('Error', 'No se pudo registrar el pago.');
            } finally {
              setPaying(false);
            }
          },
        },
      ],
    );
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={GOLD}
          colors={[GOLD]}
        />
      }
    >
      {/* Period selector */}
      <View style={styles.periodRow}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodChip, period === p && styles.periodChipActive]}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={[
                styles.periodChipText,
                period === p && styles.periodChipTextActive,
              ]}
            >
              {PERIOD_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Earnings summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen de ganancias</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
            <Text style={styles.summaryLabel}>Ingresos</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: GOLD }]}>
              {formatCurrency(totalCommission)}
            </Text>
            <Text style={styles.summaryLabel}>Comision ({commissionRate}%)</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{completedCount}</Text>
            <Text style={styles.summaryLabel}>Citas completadas</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatCurrency(averageTicket)}</Text>
            <Text style={styles.summaryLabel}>Ticket promedio</Text>
          </View>
        </View>
      </View>

      {/* Revenue chart */}
      <RevenueChart data={chartData} />

      {/* Commission settings */}
      <View style={styles.commissionCard}>
        <Text style={styles.sectionTitle}>Comision</Text>
        <View style={styles.commissionRow}>
          <View style={styles.commissionInputWrap}>
            <TextInput
              style={styles.commissionInput}
              value={commissionInput}
              onChangeText={setCommissionInput}
              keyboardType="number-pad"
              maxLength={3}
              placeholderTextColor={MUTED}
            />
            <Text style={styles.commissionPercent}>%</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSaveCommission}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pay button */}
      {unpaidAppointments.length > 0 && (
        <TouchableOpacity
          style={[styles.payBtn, paying && styles.payBtnDisabled]}
          onPress={handlePayCommissions}
          disabled={paying}
        >
          <Text style={styles.payBtnText}>
            {paying
              ? 'Procesando...'
              : `Pagar comisiones: ${formatCurrency(unpaidCommission)}`}
          </Text>
          <Text style={styles.payBtnSub}>
            {unpaidAppointments.length} cita{unpaidAppointments.length !== 1 ? 's' : ''} pendiente{unpaidAppointments.length !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}

      {/* Transaction list */}
      <Text style={styles.sectionTitle}>Transacciones</Text>
      {filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No hay transacciones en este periodo.
          </Text>
        </View>
      ) : (
        filtered.map((item) => (
          <View key={item.id} style={styles.txRow}>
            <View style={styles.txLeft}>
              <Text style={styles.txDate}>
                {formatDate(item.date)} {item.timeSlot}
              </Text>
              <Text style={styles.txClient} numberOfLines={1}>
                {item.clientName}
              </Text>
            </View>
            <View style={styles.txRight}>
              <Text style={styles.txPrice}>{formatCurrency(item.totalPrice)}</Text>
              <Text
                style={[
                  styles.txCommission,
                  item.commissionPaid && styles.txCommissionPaid,
                ]}
              >
                {item.commissionPaid ? 'Pagado' : formatCurrency(item.commission)}
              </Text>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  content: {
    padding: 20,
    gap: 16,
  },

  // Period chips
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  periodChipActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  periodChipTextActive: {
    color: '#000000',
    fontWeight: '700',
  },

  // Summary card
  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 14,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: '46%',
    backgroundColor: BG,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
  },

  // Commission card
  commissionCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  commissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  commissionInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 44,
  },
  commissionInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    padding: 0,
  },
  commissionPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: MUTED,
  },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 20,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },

  // Pay button
  payBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  payBtnDisabled: {
    opacity: 0.5,
  },
  payBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  payBtnSub: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.6)',
  },

  // Section title
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
  },

  // Empty
  emptyBox: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: MUTED,
  },

  // Transaction rows
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  txLeft: {
    flex: 1,
    gap: 2,
  },
  txDate: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },
  txClient: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
  txCommission: {
    fontSize: 12,
    fontWeight: '600',
    color: GOLD,
  },
  txCommissionPaid: {
    color: '#10B981',
  },
});
