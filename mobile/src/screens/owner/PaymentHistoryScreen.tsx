import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

interface PaymentRecord {
  id: string;
  barberId: string;
  barberName: string;
  period: string;
  totalAmount: number;
  commissionAmount: number;
  appointmentIds: string[];
  paidAt: Date;
}

type Props = NativeStackScreenProps<OwnerStackParamList, 'PaymentHistory'>;

export function PaymentHistoryScreen({ navigation }: Props) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const user = auth.currentUser;

  const fetchPayments = useCallback(async () => {
    if (!user) return;

    try {
      // Get owner's barbershopId
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const barbershopId = userDoc.data()?.barbershopId;
      if (!barbershopId) return;

      // Query all payments ordered by paidAt descending
      const q = query(
        collection(db, `barbershops/${barbershopId}/payments`),
        orderBy('paidAt', 'desc'),
      );
      const snap = await getDocs(q);

      const records: PaymentRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          barberId: data.barberId ?? '',
          barberName: data.barberName ?? 'Barbero',
          period: data.period ?? '',
          totalAmount: data.totalAmount ?? 0,
          commissionAmount: data.commissionAmount ?? 0,
          appointmentIds: data.appointmentIds ?? [],
          paidAt: data.paidAt?.toDate?.() ?? new Date(0),
        };
      });

      setPayments(records);
    } catch (err) {
      console.error('[PaymentHistory] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayments();
  }, [fetchPayments]);

  // Derive unique barber names for filter
  const barberNames = useMemo(() => {
    const names = new Set<string>();
    payments.forEach((p) => names.add(p.barberName));
    return Array.from(names).sort();
  }, [payments]);

  // Filter payments by selected barber
  const filtered = useMemo(() => {
    if (!selectedBarber) return payments;
    return payments.filter((p) => p.barberName === selectedBarber);
  }, [payments, selectedBarber]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalPaidAllTime = payments.reduce((s, p) => s + p.commissionAmount, 0);
    const thisMonthPayments = payments.filter((p) => p.paidAt >= monthStart);
    const totalPaidThisMonth = thisMonthPayments.reduce(
      (s, p) => s + p.commissionAmount,
      0,
    );
    const paymentsThisMonth = thisMonthPayments.length;

    return { totalPaidAllTime, totalPaidThisMonth, paymentsThisMonth };
  }, [payments]);

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
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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
      {/* Stats card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen de pagos</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: GOLD }]}>
              {formatCurrency(stats.totalPaidAllTime)}
            </Text>
            <Text style={styles.summaryLabel}>Total pagado</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {formatCurrency(stats.totalPaidThisMonth)}
            </Text>
            <Text style={styles.summaryLabel}>Este mes</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats.paymentsThisMonth}</Text>
            <Text style={styles.summaryLabel}>Pagos este mes</Text>
          </View>
        </View>
      </View>

      {/* Barber filter pills */}
      {barberNames.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedBarber === null && styles.filterPillActive,
            ]}
            onPress={() => setSelectedBarber(null)}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedBarber === null && styles.filterPillTextActive,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>
          {barberNames.map((name) => (
            <TouchableOpacity
              key={name}
              style={[
                styles.filterPill,
                selectedBarber === name && styles.filterPillActive,
              ]}
              onPress={() =>
                setSelectedBarber(selectedBarber === name ? null : name)
              }
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedBarber === name && styles.filterPillTextActive,
                ]}
              >
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Payment list */}
      <Text style={styles.sectionTitle}>Historial</Text>

      {filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>💳</Text>
          <Text style={styles.emptyText}>No hay pagos registrados.</Text>
          <Text style={styles.emptySubtext}>
            Los pagos de comisiones apareceran aqui.
          </Text>
        </View>
      ) : (
        filtered.map((item) => (
          <View key={item.id} style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentBarber}>{item.barberName}</Text>
              <Text style={styles.paymentDate}>{formatDate(item.paidAt)}</Text>
            </View>

            <View style={styles.paymentDetails}>
              <View style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>Periodo</Text>
                <Text style={styles.paymentDetailValue}>{item.period}</Text>
              </View>
              <View style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>Ingresos del periodo</Text>
                <Text style={styles.paymentDetailValue}>
                  {formatCurrency(item.totalAmount)}
                </Text>
              </View>
              <View style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>Citas cubiertas</Text>
                <Text style={styles.paymentDetailValue}>
                  {item.appointmentIds.length}
                </Text>
              </View>
            </View>

            <View style={styles.paymentFooter}>
              <Text style={styles.paymentCommissionLabel}>Comision pagada</Text>
              <Text style={styles.paymentCommissionValue}>
                {formatCurrency(item.commissionAmount)}
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
    flex: 1,
    minWidth: '28%',
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

  // Filter pills
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterPillActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  filterPillTextActive: {
    color: '#000000',
    fontWeight: '700',
  },

  // Section title
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
  },

  // Empty state
  emptyBox: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
  emptySubtext: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
  },

  // Payment cards
  paymentCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentBarber: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT,
  },
  paymentDate: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },
  paymentDetails: {
    gap: 6,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentDetailLabel: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '500',
  },
  paymentDetailValue: {
    fontSize: 13,
    color: TEXT,
    fontWeight: '600',
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
  },
  paymentCommissionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
  },
  paymentCommissionValue: {
    fontSize: 20,
    fontWeight: '800',
    color: GOLD,
  },
});
