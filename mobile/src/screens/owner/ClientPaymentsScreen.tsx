import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { PaymentMethod, PaymentStatus } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const PAYMENT_METHOD_ICON: Record<PaymentMethod, string> = {
  cash: '💵',
  bizum: '📱',
  paypal: '🅿️',
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'En caja',
  bizum: 'Bizum',
  paypal: 'PayPal',
};

type MainTab = 'appointments' | 'orders';

interface PaymentItem {
  id: string;
  collectionPath: string; // firestore doc path for updates
  clientName: string;
  amount: number;
  detail: string; // date/time or items summary
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}

export function ClientPaymentsScreen() {
  const { activeBarbershopId } = useAuthContext();
  const [mainTab, setMainTab] = useState<MainTab>('appointments');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointmentItems, setAppointmentItems] = useState<PaymentItem[]>([]);
  const [orderItems, setOrderItems] = useState<PaymentItem[]>([]);
  const [paidExpanded, setPaidExpanded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const formatDateTime = (date: any, timeSlot?: string): string => {
    if (!date) return timeSlot ?? '';
    const d = date.toDate ? date.toDate() : new Date(date);
    const dateStr = d.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return timeSlot ? `${dateStr} · ${timeSlot}` : dateStr;
  };

  const fetchData = useCallback(async () => {
    if (!activeBarbershopId) return;
    try {
      const [apptSnap, orderSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'appointments'),
            where('barbershopId', '==', activeBarbershopId),
            orderBy('date', 'desc'),
          ),
        ),
        getDocs(
          query(
            collection(db, `barbershops/${activeBarbershopId}/productOrders`),
            orderBy('createdAt', 'desc'),
          ),
        ),
      ]);

      const appts: PaymentItem[] = apptSnap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          collectionPath: `appointments/${d.id}`,
          clientName: data.clientName ?? 'Cliente',
          amount: data.totalPrice ?? 0,
          detail: formatDateTime(data.date, data.timeSlot),
          paymentMethod: (data.paymentMethod ?? 'cash') as PaymentMethod,
          paymentStatus: (data.paymentStatus ?? 'pending') as PaymentStatus,
        };
      });

      const orders: PaymentItem[] = orderSnap.docs.map((d) => {
        const data: any = d.data();
        const items = data.items ?? [];
        const summary = items
          .map((it: any) => `${it.quantity}x ${it.name}`)
          .join(', ');
        return {
          id: d.id,
          collectionPath: `barbershops/${activeBarbershopId}/productOrders/${d.id}`,
          clientName: data.clientName ?? 'Cliente',
          amount: data.totalPrice ?? 0,
          detail: summary || 'Pedido de productos',
          paymentMethod: (data.paymentMethod ?? 'cash') as PaymentMethod,
          paymentStatus: (data.paymentStatus ?? 'pending') as PaymentStatus,
        };
      });

      setAppointmentItems(appts);
      setOrderItems(orders);
    } catch (err) {
      console.error('[ClientPaymentsScreen] Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeBarbershopId]);

  useEffect(() => {
    if (activeBarbershopId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [activeBarbershopId, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const updatePaymentStatus = async (item: PaymentItem, paymentStatus: PaymentStatus) => {
    try {
      setBusyId(item.id);
      await updateDoc(doc(db, item.collectionPath), { paymentStatus });
      const updater = (prev: PaymentItem[]) =>
        prev.map((i) => (i.id === item.id ? { ...i, paymentStatus } : i));
      setAppointmentItems(updater);
      setOrderItems(updater);
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el estado de pago');
    } finally {
      setBusyId(null);
    }
  };

  const items = mainTab === 'appointments' ? appointmentItems : orderItems;

  const pendingConfirm = items.filter((i) => i.paymentStatus === 'client_confirmed');
  const unpaid = items.filter(
    (i) => i.paymentStatus === 'pending' || !i.paymentStatus,
  );
  const paid = items.filter(
    (i) => i.paymentStatus === 'paid' || i.paymentStatus === 'confirmed',
  );

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
        <Text style={styles.emptyTitle}>Sin barbería asociada</Text>
        <Text style={styles.emptySub}>No se encontró una barbería vinculada a tu cuenta</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
        }
      >
        <Text style={styles.heading}>Cobros de clientes</Text>
        <Text style={styles.sub}>
          Confirma pagos por Bizum, PayPal o gestiona los cobros en caja
        </Text>

        {/* Segmented tabs */}
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segment, mainTab === 'appointments' && styles.segmentActive]}
            onPress={() => setMainTab('appointments')}
          >
            <Text
              style={[
                styles.segmentText,
                mainTab === 'appointments' && styles.segmentTextActive,
              ]}
            >
              Citas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, mainTab === 'orders' && styles.segmentActive]}
            onPress={() => setMainTab('orders')}
          >
            <Text
              style={[styles.segmentText, mainTab === 'orders' && styles.segmentTextActive]}
            >
              Pedidos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pendientes de confirmar */}
        <SectionHeader title="⚠️ Pendientes de confirmar" count={pendingConfirm.length} />
        {pendingConfirm.length === 0 ? (
          <EmptySection text="No hay pagos pendientes de confirmar" />
        ) : (
          pendingConfirm.map((item) => (
            <View key={item.id} style={styles.row}>
              <RowInfo item={item} mainTab={mainTab} />
              {busyId === item.id ? (
                <ActivityIndicator color={GOLD} />
              ) : (
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    style={[styles.rowBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => updatePaymentStatus(item, 'paid')}
                  >
                    <Text style={styles.rowBtnText}>✅ Confirmar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rowBtn, { backgroundColor: '#EF4444' }]}
                    onPress={() => updatePaymentStatus(item, 'pending')}
                  >
                    <Text style={styles.rowBtnText}>❌ Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}

        {/* Sin cobrar */}
        <SectionHeader title="🔴 Sin cobrar" count={unpaid.length} />
        {unpaid.length === 0 ? (
          <EmptySection text="Todo está cobrado" />
        ) : (
          unpaid.map((item) => (
            <View key={item.id} style={styles.row}>
              <RowInfo item={item} mainTab={mainTab} />
              {item.paymentMethod === 'cash' && (
                busyId === item.id ? (
                  <ActivityIndicator color={GOLD} />
                ) : (
                  <TouchableOpacity
                    style={[styles.rowBtn, { backgroundColor: GOLD }]}
                    onPress={() => updatePaymentStatus(item, 'paid')}
                  >
                    <Text style={[styles.rowBtnText, { color: '#000' }]}>
                      💵 Marcar cobrado
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          ))
        )}

        {/* Cobrados (collapsible) */}
        <TouchableOpacity
          style={styles.collapsibleHeader}
          onPress={() => setPaidExpanded((v) => !v)}
          activeOpacity={0.7}
        >
          <SectionHeader title="✅ Cobrados" count={paid.length} noMargin />
          <Text style={styles.chevron}>{paidExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {paidExpanded && (
          paid.length === 0 ? (
            <EmptySection text="Aún no hay cobros registrados" />
          ) : (
            paid.map((item) => (
              <View key={item.id} style={styles.row}>
                <RowInfo item={item} mainTab={mainTab} />
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({
  title,
  count,
  noMargin,
}: {
  title: string;
  count: number;
  noMargin?: boolean;
}) {
  return (
    <View style={[styles.sectionHeader, noMargin && { marginTop: 0 }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <View style={styles.emptySection}>
      <Text style={styles.emptySectionText}>{text}</Text>
    </View>
  );
}

function RowInfo({ item, mainTab }: { item: PaymentItem; mainTab: MainTab }) {
  return (
    <View style={styles.rowInfo}>
      <Text style={styles.rowClient}>{item.clientName}</Text>
      <Text style={styles.rowDetail} numberOfLines={2}>
        {item.detail}
      </Text>
      <View style={styles.rowMetaRow}>
        <Text style={styles.rowMethod}>
          {PAYMENT_METHOD_ICON[item.paymentMethod]} {PAYMENT_METHOD_LABEL[item.paymentMethod]}
        </Text>
        <Text style={styles.rowAmount}>{item.amount.toFixed(2)} €</Text>
      </View>
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 26, fontWeight: '800', color: TEXT },
  sub: { fontSize: 14, color: MUTED, marginTop: 2, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center' },

  segmentRow: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 4,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: GOLD + '20',
  },
  segmentText: { fontSize: 14, fontWeight: '700', color: MUTED },
  segmentTextActive: { color: GOLD },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: TEXT },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chevron: { color: MUTED, fontSize: 12, marginTop: 20, marginBottom: 10 },

  emptySection: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    alignItems: 'center',
  },
  emptySectionText: { fontSize: 13, color: MUTED },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 10,
    marginBottom: 10,
  },
  rowInfo: { flex: 1, gap: 4 },
  rowClient: { fontSize: 14, fontWeight: '700', color: TEXT },
  rowDetail: { fontSize: 12, color: MUTED },
  rowMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  rowMethod: { fontSize: 12, color: GOLD, fontWeight: '600' },
  rowAmount: { fontSize: 14, color: TEXT, fontWeight: '800' },
  rowActions: { flexDirection: 'column', gap: 8 },
  rowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  rowBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
