import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app, { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const GREEN   = '#10B981';

type Period = 'today' | 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  year: 'Este año',
};

interface AppointmentData {
  id: string;
  date: Date;
  totalPrice: number;
  barberId: string;
  clientName: string;
  status: string;
}

interface SaleData {
  id: string;
  date: Date;
  totalAmount: number;
  tipAmount: number;
  items: Array<{ type?: string; name?: string; price?: number }>;
}

interface BarberInfo {
  uid: string;
  displayName: string;
}

interface RecentTransaction {
  id: string;
  type: 'appointment' | 'sale';
  description: string;
  amount: number;
  date: Date;
}

type Props = NativeStackScreenProps<OwnerStackParamList, 'FinanceDashboard'>;

export function FinanceDashboardScreen({ navigation }: Props) {
  const { activeBarbershopId } = useAuthContext();
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [sales, setSales] = useState<SaleData[]>([]);
  const [barbers, setBarbers] = useState<BarberInfo[]>([]);

  const getPeriodStart = useCallback((): Date => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (period) {
      case 'today':
        return start;
      case 'week': {
        const day = start.getDay();
        const diff = day === 0 ? 6 : day - 1; // Monday start
        start.setDate(start.getDate() - diff);
        return start;
      }
      case 'month':
        start.setDate(1);
        return start;
      case 'year':
        start.setMonth(0, 1);
        return start;
      default:
        return start;
    }
  }, [period]);

  const fetchData = useCallback(async () => {
    if (!activeBarbershopId) return;

    try {
      const periodStart = getPeriodStart();

      // 2. Query appointments
      const apptSnap = await getDocs(
        query(
          collection(db, 'appointments'),
          where('barbershopId', '==', activeBarbershopId),
        ),
      );

      const apptRows: AppointmentData[] = [];
      apptSnap.docs.forEach((d) => {
        const data = d.data();
        const date: Date = data.date?.toDate?.() ?? new Date(0);
        if (date >= periodStart) {
          apptRows.push({
            id: d.id,
            date,
            totalPrice: data.totalPrice ?? 0,
            barberId: data.barberId ?? '',
            clientName: data.clientName ?? 'Cliente',
            status: data.status ?? '',
          });
        }
      });
      setAppointments(apptRows);

      // 3. Query sales
      const salesSnap = await getDocs(
        query(
          collection(db, 'sales'),
          where('barbershopId', '==', activeBarbershopId),
        ),
      );

      const saleRows: SaleData[] = [];
      salesSnap.docs.forEach((d) => {
        const data = d.data();
        const date: Date = data.date?.toDate?.() ?? new Date(0);
        if (date >= periodStart) {
          saleRows.push({
            id: d.id,
            date,
            totalAmount: data.totalAmount ?? 0,
            tipAmount: data.tipAmount ?? 0,
            items: data.items ?? [],
          });
        }
      });
      setSales(saleRows);

      // 4. Get barber list
      const shopDoc = await getDoc(doc(db, 'barbershops', activeBarbershopId));
      const barberIds: string[] = shopDoc.data()?.barbers ?? [];

      const barberInfos: BarberInfo[] = [];
      for (const bid of barberIds) {
        try {
          const bQuery = query(collection(db, 'users'), where('uid', '==', bid));
          const bSnap = await getDocs(bQuery);
          if (!bSnap.empty) {
            const bData = bSnap.docs[0].data();
            barberInfos.push({
              uid: bid,
              displayName: bData.displayName ?? 'Barbero',
            });
          }
        } catch {
          // Skip barber if fetch fails
        }
      }
      setBarbers(barberInfos);
    } catch (err) {
      console.error('[FinanceDashboard] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeBarbershopId, getPeriodStart]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // --- Computed values ---

  const completedAppointments = appointments.filter((a) => a.status === 'completed');
  const appointmentRevenue = completedAppointments.reduce((sum, a) => sum + a.totalPrice, 0);
  const salesRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalRevenue = appointmentRevenue + salesRevenue;
  const totalTips = sales.reduce((sum, s) => sum + s.tipAmount, 0);

  // Per-barber breakdown
  const barberBreakdown = barbers.map((barber) => {
    const barberAppts = completedAppointments.filter((a) => a.barberId === barber.uid);
    const barberRevenue = barberAppts.reduce((sum, a) => sum + a.totalPrice, 0);
    const revenuePercent = totalRevenue > 0 ? (barberRevenue / totalRevenue) * 100 : 0;

    return {
      ...barber,
      appointmentCount: barberAppts.length,
      revenue: barberRevenue,
      revenuePercent,
    };
  });

  // Revenue sources
  const productSalesAmount = sales.reduce((sum, s) => {
    const productItems = (s.items ?? []).filter((i) => i.type === 'product');
    return sum + productItems.reduce((pSum, i) => pSum + (i.price ?? 0), 0);
  }, 0);
  const serviceRevenue = appointmentRevenue;
  const servicePercent = totalRevenue > 0 ? (serviceRevenue / totalRevenue) * 100 : 0;
  const productPercent = totalRevenue > 0 ? (productSalesAmount / totalRevenue) * 100 : 0;

  // Recent transactions (last 10)
  const recentTransactions: RecentTransaction[] = [
    ...completedAppointments.map((a) => ({
      id: a.id,
      type: 'appointment' as const,
      description: a.clientName,
      amount: a.totalPrice,
      date: a.date,
    })),
    ...sales.map((s) => ({
      id: s.id,
      type: 'sale' as const,
      description: (s.items ?? []).map((i) => i.name).filter(Boolean).join(', ') || 'Venta',
      amount: s.totalAmount,
      date: s.date,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

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

  const canExport = period !== 'year';

  const handleExport = async () => {
    if (!activeBarbershopId) {
      Alert.alert('Error', 'No se encontró tu barbería');
      return;
    }
    if (!canExport) return;

    try {
      setExporting(true);

      const functions = getFunctions(app, 'europe-west1');
      const generate = httpsCallable<
        { barbershopId: string; period: 'today' | 'week' | 'month' },
        { base64: string; filename: string }
      >(functions, 'generateReport');

      const result = await generate({
        barbershopId: activeBarbershopId,
        period: period as 'today' | 'week' | 'month',
      });
      const { base64, filename } = result.data;

      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Share.share({
        url: fileUri,
        title: filename,
      });
    } catch (err: any) {
      console.error('[FinanceDashboard] Export error:', err);
      Alert.alert('Error', err.message ?? 'No se pudo generar el reporte');
    } finally {
      setExporting(false);
    }
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

      {/* Export to Excel */}
      <TouchableOpacity
        style={[styles.exportBtn, (exporting || !canExport) && styles.exportBtnDisabled]}
        onPress={handleExport}
        disabled={exporting || !canExport}
        activeOpacity={0.85}
      >
        {exporting ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.exportBtnText}>📊 Exportar a Excel</Text>
        )}
      </TouchableOpacity>
      {!canExport && (
        <Text style={styles.exportNote}>Exporta por día, semana o mes</Text>
      )}

      {/* Top KPI cards */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Ingresos</Text>
          <Text style={[styles.kpiValue, { color: GOLD }]}>
            {formatCurrency(totalRevenue)}
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Propinas totales</Text>
          <Text style={styles.kpiValue}>{formatCurrency(totalTips)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Citas completadas</Text>
          <Text style={[styles.kpiValue, { color: GREEN }]}>
            {completedAppointments.length}
          </Text>
        </View>
      </View>

      {/* Per-barber breakdown */}
      <Text style={styles.sectionTitle}>Rendimiento por barbero</Text>
      {barberBreakdown.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No hay barberos registrados.</Text>
        </View>
      ) : (
        barberBreakdown.map((b) => (
          <View key={b.uid} style={styles.barberCard}>
            <View style={styles.barberHeader}>
              <Text style={styles.barberName}>{b.displayName}</Text>
              <Text style={styles.barberAppts}>
                {b.appointmentCount} cita{b.appointmentCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.barberStats}>
              <View style={styles.barberStatItem}>
                <Text style={styles.barberStatLabel}>Ingresos</Text>
                <Text style={styles.barberStatValue}>{formatCurrency(b.revenue)}</Text>
              </View>
            </View>
            {/* Progress bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(b.revenuePercent, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {b.revenuePercent.toFixed(1)}% del total
            </Text>
          </View>
        ))
      )}

      {/* Revenue sources */}
      <Text style={styles.sectionTitle}>Desglose de ingresos</Text>
      <View style={styles.sourceRow}>
        <View style={styles.sourceCard}>
          <Text style={styles.sourceEmoji}>✂️</Text>
          <Text style={styles.sourceTitle}>Servicios</Text>
          <Text style={[styles.sourceAmount, { color: GOLD }]}>
            {formatCurrency(serviceRevenue)}
          </Text>
          <Text style={styles.sourcePercent}>{servicePercent.toFixed(1)}%</Text>
        </View>
        <View style={styles.sourceCard}>
          <Text style={styles.sourceEmoji}>🛍️</Text>
          <Text style={styles.sourceTitle}>Productos</Text>
          <Text style={[styles.sourceAmount, { color: GOLD }]}>
            {formatCurrency(productSalesAmount)}
          </Text>
          <Text style={styles.sourcePercent}>{productPercent.toFixed(1)}%</Text>
        </View>
      </View>

      {/* Recent transactions */}
      <Text style={styles.sectionTitle}>Transacciones recientes</Text>
      {recentTransactions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No hay transacciones en este periodo.
          </Text>
        </View>
      ) : (
        recentTransactions.map((tx) => (
          <View key={tx.id} style={styles.txRow}>
            <View style={styles.txLeft}>
              <Text style={styles.txEmoji}>
                {tx.type === 'appointment' ? '✂️' : '🛍️'}
              </Text>
            </View>
            <View style={styles.txCenter}>
              <Text style={styles.txDesc} numberOfLines={1}>
                {tx.description}
              </Text>
              <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
            </View>
            <Text style={styles.txAmount}>{formatCurrency(tx.amount)}</Text>
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

  // Export button
  exportBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exportBtnDisabled: {
    opacity: 0.5,
  },
  exportBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  exportNote: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
    marginTop: -10,
  },

  // KPI grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '47%',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT,
  },

  // Section title
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
    marginTop: 4,
  },

  // Barber cards
  barberCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 10,
  },
  barberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barberName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
  barberAppts: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },
  barberStats: {
    flexDirection: 'row',
    gap: 12,
  },
  barberStatItem: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  barberStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
  },
  barberStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: BG,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: GOLD,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'right',
  },

  // Revenue sources
  sourceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sourceCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  sourceEmoji: {
    fontSize: 24,
  },
  sourceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
  },
  sourceAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  sourcePercent: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },

  // Empty state
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
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 12,
  },
  txLeft: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txEmoji: {
    fontSize: 16,
  },
  txCenter: {
    flex: 1,
    gap: 2,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT,
  },
  txDate: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
});
