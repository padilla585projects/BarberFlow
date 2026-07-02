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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

type OrderStatus = 'pending' | 'paid' | 'cancelled';
type PaymentMethod = 'cash' | 'bizum' | 'paypal';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  items: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid';
  barbershopId: string;
  createdAt: any;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  cancelled: 'Cancelado',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: '#F59E0B',
  paid: '#10B981',
  cancelled: '#EF4444',
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  bizum: 'Bizum',
  paypal: 'PayPal',
};

export function OrderHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList>>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(
        collection(db, 'orders'),
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      setOrders(data);
    } catch (err) {
      console.error('[OrderHistoryScreen] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{'🛍️'} Mis pedidos</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{'🛍️'}</Text>
            <Text style={styles.emptyTitle}>Sin pedidos aún</Text>
            <Text style={styles.emptySub}>Cuando realices un pedido aparecerá aquí</Text>
          </View>
        }
        renderItem={({ item }) => {
          const rawDate = item.createdAt?.toDate?.();
          const dateStr = rawDate
            ? rawDate.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'Fecha desconocida';
          const orderId = item.id.slice(-8).toUpperCase();
          const status: OrderStatus =
            item.status in STATUS_COLOR ? (item.status as OrderStatus) : 'pending';
          const method: PaymentMethod =
            item.paymentMethod in PAYMENT_LABEL
              ? (item.paymentMethod as PaymentMethod)
              : 'cash';
          const statusColor = STATUS_COLOR[status] ?? MUTED;
          const statusLabel = STATUS_LABEL[status] ?? item.status;

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.orderId}>#{orderId}</Text>
                <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.badgeText, { color: statusColor }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardDate}>{dateStr}</Text>

              <View style={styles.divider} />

              {item.items && item.items.map((it, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {it.name}
                  </Text>
                  <Text style={styles.itemQty}>x{it.quantity}</Text>
                  <Text style={styles.itemPrice}>{(it.price * it.quantity).toFixed(2)} €</Text>
                </View>
              ))}

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{item.totalPrice?.toFixed(2)} €</Text>
              </View>

              <Text style={styles.paymentMethod}>
                Pago: {PAYMENT_LABEL[method] ?? method}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 30, color: GOLD, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT },

  // List
  list: { padding: 16, gap: 12, flexGrow: 1 },

  // Empty
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center' },

  // Card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 14, fontWeight: '800', color: GOLD, letterSpacing: 0.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 13, color: MUTED },

  // Divider
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 4 },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { flex: 1, fontSize: 14, color: TEXT },
  itemQty: { fontSize: 13, color: MUTED },
  itemPrice: { fontSize: 14, color: TEXT, fontWeight: '600' },

  // Total
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: TEXT },
  totalValue: { fontSize: 16, fontWeight: '800', color: GOLD },

  // Payment
  paymentMethod: { fontSize: 12, color: MUTED },
});
