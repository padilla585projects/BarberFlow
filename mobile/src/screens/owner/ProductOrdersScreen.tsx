import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  increment,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';
import type { PaymentMethod, PaymentStatus } from '../../types';

type Props = NativeStackScreenProps<OwnerStackParamList, 'ProductOrders'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

type OrderStatus = 'reserved' | 'ready' | 'picked_up' | 'cancelled';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface ProductOrder {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  items: OrderItem[];
  totalPrice: number;
  notes: string;
  status: OrderStatus;
  createdAt: Date;
  barbershopId: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
}

type FilterTab = 'all' | OrderStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'reserved', label: 'Reservados' },
  { key: 'ready', label: 'Listos' },
  { key: 'picked_up', label: 'Recogidos' },
  { key: 'cancelled', label: 'Cancelados' },
];

const STATUS_CONFIG: Record<OrderStatus, { color: string; label: string }> = {
  reserved:  { color: '#F59E0B', label: 'Reservado' },
  ready:     { color: '#3B82F6', label: 'Listo para recoger' },
  picked_up: { color: '#10B981', label: 'Recogido' },
  cancelled: { color: '#EF4444', label: 'Cancelado' },
};

export function ProductOrdersScreen({ navigation: _navigation }: Props) {
  const { activeBarbershopId } = useAuthContext();
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!activeBarbershopId) return;
    try {
      const q = query(
        collection(db, `barbershops/${activeBarbershopId}/productOrders`),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);

      const fetched: ProductOrder[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          clientId: data.clientId ?? '',
          clientName: data.clientName ?? 'Cliente',
          clientEmail: data.clientEmail ?? '',
          items: data.items ?? [],
          totalPrice: data.totalPrice ?? 0,
          notes: data.notes ?? '',
          status: data.status ?? 'reserved',
          createdAt: data.createdAt?.toDate?.() ?? new Date(0),
          barbershopId: data.barbershopId ?? activeBarbershopId,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentStatus,
        };
      });

      setOrders(fetched);
    } catch (err) {
      console.error('[ProductOrdersScreen] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeBarbershopId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const updateOrderStatus = async (order: ProductOrder, newStatus: OrderStatus) => {
    if (!activeBarbershopId) return;
    try {
      setUpdatingId(order.id);

      const orderRef = doc(db, `barbershops/${activeBarbershopId}/productOrders`, order.id);
      await updateDoc(orderRef, { status: newStatus });

      // Decrement stock when marking as picked_up
      if (newStatus === 'picked_up') {
        for (const item of order.items) {
          if (item.productId) {
            const productRef = doc(db, 'products', item.productId);
            await updateDoc(productRef, {
              stock: increment(-item.quantity),
            });
          }
        }
      }

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)),
      );
    } catch (err) {
      console.error('[ProductOrdersScreen] Update error:', err);
      Alert.alert('Error', 'No se pudo actualizar el pedido.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkReady = (order: ProductOrder) => {
    Alert.alert('Marcar como listo', 'El cliente sera notificado de que su pedido esta listo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => updateOrderStatus(order, 'ready') },
    ]);
  };

  const handleMarkPickedUp = (order: ProductOrder) => {
    Alert.alert(
      'Marcar como recogido',
      'Se descontara el stock de los productos. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => updateOrderStatus(order, 'picked_up') },
      ],
    );
  };

  const handleCancel = (order: ProductOrder) => {
    Alert.alert('Cancelar pedido', 'Esta seguro de que quiere cancelar este pedido?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancelar pedido',
        style: 'destructive',
        onPress: () => updateOrderStatus(order, 'cancelled'),
      },
    ]);
  };

  const filtered = activeTab === 'all' ? orders : orders.filter((o) => o.status === activeTab);

  const formatDate = (d: Date) => {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  const renderOrder = ({ item: order }: { item: ProductOrder }) => {
    const cfg = STATUS_CONFIG[order.status];
    const isUpdating = updatingId === order.id;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNumber}>Pedido #{order.id.substring(0, 6).toUpperCase()}</Text>
            <Text style={styles.clientName}>{order.clientName}</Text>
            <Text style={styles.clientEmail}>{order.clientEmail}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.color + '22' }]}>
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.itemsContainer}>
          {order.items.map((item, idx) => (
            <View key={`${item.productId}-${idx}`} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.quantity}x {item.name}
              </Text>
              <Text style={styles.itemPrice}>{(item.price * item.quantity).toFixed(2)} EUR</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{order.totalPrice.toFixed(2)} EUR</Text>
        </View>

        {/* Notes */}
        {order.notes ? (
          <Text style={styles.notes}>Nota: {order.notes}</Text>
        ) : null}

        {/* Actions */}
        {isUpdating ? (
          <ActivityIndicator color={GOLD} style={{ marginTop: 12 }} />
        ) : (
          <View style={styles.actionsRow}>
            {order.status === 'reserved' && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                  onPress={() => handleMarkReady(order)}
                >
                  <Text style={styles.actionBtnText}>Marcar como listo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => handleCancel(order)}
                >
                  <Text style={styles.actionBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
            {order.status === 'ready' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => handleMarkPickedUp(order)}
              >
                <Text style={styles.actionBtnText}>Marcar como recogido</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
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
      {/* Filter tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>No hay pedidos</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  listContent: { padding: 16, gap: 12, paddingBottom: 40 },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabActive: {
    backgroundColor: GOLD + '22',
    borderColor: GOLD,
  },
  tabText: { fontSize: 12, color: MUTED, fontWeight: '600' },
  tabTextActive: { color: GOLD },

  // Card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: { fontSize: 15, fontWeight: '800', color: TEXT },
  clientName: { fontSize: 14, fontWeight: '600', color: TEXT, marginTop: 4 },
  clientEmail: { fontSize: 12, color: MUTED, marginTop: 2 },
  orderDate: { fontSize: 11, color: MUTED, marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Items
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: { fontSize: 13, color: TEXT, flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 13, color: MUTED, fontWeight: '600' },

  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: TEXT },
  totalValue: { fontSize: 16, fontWeight: '800', color: GOLD },

  // Notes
  notes: { fontSize: 12, color: MUTED, fontStyle: 'italic', marginTop: 8 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15, color: MUTED, fontWeight: '600' },
});
