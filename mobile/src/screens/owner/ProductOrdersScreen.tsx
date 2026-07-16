import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';

type Props = NativeStackScreenProps<OwnerStackParamList, 'ProductOrders'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

// ── Status unificado con web-admin y CheckoutScreen ──────────────────────────
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_CONFIG: Record<OrderStatus, { color: string; label: string; emoji: string }> = {
  pending:    { color: '#F59E0B', label: 'Pendiente',   emoji: '⏳' },
  processing: { color: '#3B82F6', label: 'Preparando',  emoji: '🔧' },
  shipped:    { color: '#A78BFA', label: 'Enviado',     emoji: '🚚' },
  delivered:  { color: '#10B981', label: 'Entregado',   emoji: '✅' },
  cancelled:  { color: '#EF4444', label: 'Cancelado',   emoji: '❌' },
};

type FilterTab = 'all' | OrderStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',        label: 'Todos'      },
  { key: 'pending',    label: 'Pendientes' },
  { key: 'processing', label: 'Preparando' },
  { key: 'shipped',    label: 'Enviados'   },
  { key: 'delivered',  label: 'Entregados' },
  { key: 'cancelled',  label: 'Cancelados' },
];

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface ShippingAddress {
  street: string;
  city: string;
  postalCode: string;
  province: string;
  country?: string;
}

interface ProductOrder {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
  status: OrderStatus;
  createdAt: Date;
  barbershopId: string;
  paymentMethod?: string;
  paymentStatus?: string;
  shippingAddress?: ShippingAddress;
}

// ─────────────────────────────────────────────────────────────────────────────

export function ProductOrdersScreen({ navigation: _navigation }: Props) {
  const { activeBarbershopId } = useAuthContext();
  const [orders, setOrders]       = useState<ProductOrder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);

  // ── Real-time listener on the shared `orders` collection ─────────────────
  useEffect(() => {
    if (!activeBarbershopId) return;

    setLoading(true);

    const q = query(
      collection(db, 'orders'),
      where('barbershopId', '==', activeBarbershopId),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      const fetched: ProductOrder[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id:              d.id,
          clientId:        data.clientId        ?? '',
          clientName:      data.clientName      ?? 'Cliente',
          clientEmail:     data.clientEmail     ?? '',
          items:           data.items           ?? [],
          // web-admin usa totalAmount; checkout legacy puede usar totalPrice
          totalAmount:     data.totalAmount     ?? data.totalPrice ?? 0,
          notes:           data.notes           ?? '',
          status:          (data.status as OrderStatus) ?? 'pending',
          createdAt:       data.createdAt?.toDate?.() ?? new Date(0),
          barbershopId:    data.barbershopId    ?? activeBarbershopId,
          paymentMethod:   data.paymentMethod,
          paymentStatus:   data.paymentStatus,
          shippingAddress: data.shippingAddress,
        };
      });

      setOrders(fetched);
      setLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.error('[ProductOrdersScreen] Listener error:', err);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsub();
  }, [activeBarbershopId]);

  const onRefresh = () => setRefreshing(true); // el listener recarga solo

  // ── Status transitions ───────────────────────────────────────────────────
  const changeStatus = async (order: ProductOrder, newStatus: OrderStatus) => {
    try {
      setUpdatingId(order.id);
      await updateDoc(doc(db, 'orders', order.id), { status: newStatus });
      // El listener onSnapshot actualizará el estado local automáticamente
    } catch (err) {
      console.error('[ProductOrdersScreen] Update error:', err);
      Alert.alert('Error', 'No se pudo actualizar el pedido.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirm = (order: ProductOrder) =>
    Alert.alert('Confirmar pedido', '¿Empezar a preparar este pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => changeStatus(order, 'processing') },
    ]);

  const handleShip = (order: ProductOrder) =>
    Alert.alert('Marcar como enviado', 'El cliente recibirá una notificación.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Marcar enviado', onPress: () => changeStatus(order, 'shipped') },
    ]);

  const handleReady = (order: ProductOrder) =>
    Alert.alert('Listo para recoger', 'El cliente recibirá una notificación.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => changeStatus(order, 'delivered') },
    ]);

  const handleDelivered = (order: ProductOrder) =>
    Alert.alert('Marcar como entregado', '¿Confirmar entrega al cliente?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => changeStatus(order, 'delivered') },
    ]);

  const handleCancel = (order: ProductOrder) =>
    Alert.alert('Cancelar pedido', '¿Seguro que quieres cancelar este pedido?', [
      { text: 'No', style: 'cancel' },
      { text: 'Cancelar pedido', style: 'destructive', onPress: () => changeStatus(order, 'cancelled') },
    ]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatDate = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const isDelivery = (order: ProductOrder) => !!order.shippingAddress?.street;

  const filtered = activeTab === 'all'
    ? orders
    : orders.filter((o) => o.status === activeTab);

  // ── Action buttons per status ─────────────────────────────────────────────
  const renderActions = (order: ProductOrder) => {
    if (updatingId === order.id) return <ActivityIndicator color={GOLD} style={{ marginTop: 12 }} />;

    const delivery = isDelivery(order);

    switch (order.status) {
      case 'pending':
        return (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]} onPress={() => handleConfirm(order)}>
              <Text style={styles.actionBtnText}>✓ Confirmar pedido</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleCancel(order)}>
              <Text style={styles.actionBtnText}>✕ Cancelar</Text>
            </TouchableOpacity>
          </View>
        );
      case 'processing':
        return (
          <View style={styles.actionsRow}>
            {delivery ? (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#A78BFA' }]} onPress={() => handleShip(order)}>
                <Text style={styles.actionBtnText}>🚚 Marcar enviado</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => handleReady(order)}>
                <Text style={styles.actionBtnText}>✅ Listo para recoger</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleCancel(order)}>
              <Text style={styles.actionBtnText}>✕ Cancelar</Text>
            </TouchableOpacity>
          </View>
        );
      case 'shipped':
        return (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981', flex: 1 }]} onPress={() => handleDelivered(order)}>
              <Text style={styles.actionBtnText}>✅ Marcar entregado</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  // ── Card ─────────────────────────────────────────────────────────────────
  const renderOrder = ({ item: order }: { item: ProductOrder }) => {
    const cfg  = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
    const open = expanded === order.id;

    return (
      <View style={styles.card}>
        {/* Header — siempre visible */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpanded(open ? null : order.id)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.headerTop}>
              <Text style={styles.orderNumber}>#{order.id.slice(-6).toUpperCase()}</Text>
              <View style={[styles.badge, { backgroundColor: cfg.color + '22' }]}>
                <Text style={[styles.badgeText, { color: cfg.color }]}>
                  {cfg.emoji} {cfg.label}
                </Text>
              </View>
            </View>
            <Text style={styles.clientName}>{order.clientName}</Text>
            <Text style={styles.clientEmail}>{order.clientEmail}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
              {isDelivery(order)
                ? <Text style={styles.metaTag}>📦 Envío</Text>
                : <Text style={styles.metaTag}>🏠 Recogida</Text>
              }
              {order.paymentMethod && (
                <Text style={styles.metaTag}>
                  {order.paymentMethod === 'cash' ? '💵 Efectivo'
                    : order.paymentMethod === 'bizum' ? '📱 Bizum'
                    : '💻 PayPal'}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.toggleCol}>
            <Text style={styles.totalValue}>{order.totalAmount.toFixed(2)} €</Text>
            <Text style={styles.toggle}>{open ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {/* Detalle expandible */}
        {open && (
          <View style={styles.cardBody}>
            {/* Items */}
            <View style={styles.itemsContainer}>
              {order.items.map((item, idx) => (
                <View key={`${item.productId}-${idx}`} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.quantity}× {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>{(item.price * item.quantity).toFixed(2)} €</Text>
                </View>
              ))}
            </View>

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValueLg}>{order.totalAmount.toFixed(2)} €</Text>
            </View>

            {/* Dirección de envío */}
            {isDelivery(order) && order.shippingAddress && (
              <View style={styles.addressBlock}>
                <Text style={styles.addressTitle}>📦 Dirección de envío</Text>
                <Text style={styles.addressLine}>{order.shippingAddress.street}</Text>
                <Text style={styles.addressLine}>
                  {order.shippingAddress.postalCode} {order.shippingAddress.city}
                </Text>
                <Text style={styles.addressLine}>
                  {order.shippingAddress.province}
                  {order.shippingAddress.country ? `, ${order.shippingAddress.country}` : ''}
                </Text>
              </View>
            )}

            {/* Notas */}
            {!!order.notes && (
              <Text style={styles.notes}>📝 {order.notes}</Text>
            )}

            {/* Botones de acción */}
            {renderActions(order)}
          </View>
        )}
      </View>
    );
  };

  // ── Stats header ─────────────────────────────────────────────────────────
  const pendingCount    = orders.filter(o => o.status === 'pending').length;
  const processingCount = orders.filter(o => o.status === 'processing').length;

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Stats rápidas */}
      {(pendingCount > 0 || processingCount > 0) && (
        <View style={styles.alertBanner}>
          {pendingCount > 0 && (
            <Text style={styles.alertText}>⏳ {pendingCount} pendiente{pendingCount > 1 ? 's' : ''} sin confirmar</Text>
          )}
          {processingCount > 0 && (
            <Text style={styles.alertText}>🔧 {processingCount} en preparación</Text>
          )}
        </View>
      )}

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map((tab) => {
          const count = tab.key === 'all' ? orders.length : orders.filter(o => o.status === tab.key).length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab.key && { color: GOLD }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
            <Text style={styles.emptyText}>
              {activeTab === 'all' ? 'No hay pedidos aún' : `No hay pedidos ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()}`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },

  // Alert banner
  alertBanner: {
    backgroundColor: '#F59E0B22',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B44',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 2,
  },
  alertText: { fontSize: 13, color: '#F59E0B', fontWeight: '600' },

  // Tabs
  tabsScroll: { flexGrow: 0 },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 5,
  },
  tabActive:     { backgroundColor: GOLD + '22', borderColor: GOLD },
  tabText:       { fontSize: 12, color: MUTED, fontWeight: '600' },
  tabTextActive: { color: GOLD },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive:  { backgroundColor: GOLD + '33' },
  tabBadgeText:    { fontSize: 10, color: MUTED, fontWeight: '700' },

  listContent: { padding: 12, gap: 10, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderNumber:  { fontSize: 15, fontWeight: '800', color: TEXT },
  clientName:   { fontSize: 14, fontWeight: '600', color: TEXT, marginTop: 2 },
  clientEmail:  { fontSize: 12, color: MUTED, marginTop: 1 },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  orderDate:    { fontSize: 11, color: MUTED },
  metaTag:      { fontSize: 11, color: MUTED },

  toggleCol:    { alignItems: 'flex-end', gap: 8 },
  totalValue:   { fontSize: 15, fontWeight: '800', color: GOLD },
  toggle:       { fontSize: 10, color: MUTED },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Card body
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 14,
    gap: 10,
  },

  // Items
  itemsContainer: { gap: 6 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName:  { fontSize: 13, color: TEXT, flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 13, color: MUTED, fontWeight: '600' },

  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  totalLabel:   { fontSize: 14, fontWeight: '700', color: TEXT },
  totalValueLg: { fontSize: 17, fontWeight: '800', color: GOLD },

  // Address
  addressBlock: {
    backgroundColor: BG,
    borderRadius: 10,
    padding: 12,
    gap: 2,
  },
  addressTitle: { fontSize: 12, fontWeight: '700', color: TEXT, marginBottom: 4 },
  addressLine:  { fontSize: 12, color: MUTED },

  // Notes
  notes: { fontSize: 12, color: MUTED, fontStyle: 'italic' },

  // Actions
  actionsRow:     { flexDirection: 'row', gap: 8, paddingTop: 4 },
  actionBtn:      { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  actionBtnText:  { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyEmoji:     { fontSize: 48 },
  emptyText:      { fontSize: 15, color: MUTED, fontWeight: '600', textAlign: 'center' },
});
