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
import { Alert } from '../../components/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';

import { auth, db } from '../../services/firebase';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type PaymentMethod = 'cash' | 'bizum' | 'paypal';

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

interface Order {
  id: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  items: OrderItem[];
  totalAmount?: number;
  totalPrice?: number; // legacy field — use totalAmount ?? totalPrice
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'client_confirmed' | 'confirmed' | 'paid';
  barbershopId: string;
  shippingAddress?: ShippingAddress;
  notes?: string;
  reviewedProducts?: string[]; // productIds ya valorados por este cliente en este pedido
  createdAt: any;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:    'Pendiente',
  processing: 'En proceso',
  shipped:    'Enviado',
  delivered:  'Entregado',
  cancelled:  'Cancelado',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending:    '#F59E0B',
  processing: '#60A5FA',
  shipped:    '#A78BFA',
  delivered:  '#10B981',
  cancelled:  '#EF4444',
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  bizum: 'Bizum',
  paypal: 'PayPal',
};

// ── Generador de recibo HTML ───────────────────────────────────────────────

function buildReceiptHtml(order: Order, barbershopName: string) {
  const date = order.createdAt?.toDate?.()
    ? order.createdAt.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Fecha desconocida';

  const itemRows = order.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111">${item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;text-align:center">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;text-align:right">${item.price.toFixed(2)} €</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#111;text-align:right">${(item.price * item.quantity).toFixed(2)} €</td>
    </tr>
  `).join('');

  const addr = order.shippingAddress
    ? `${order.shippingAddress.street}, ${order.shippingAddress.postalCode} ${order.shippingAddress.city}, ${order.shippingAddress.province}`
    : 'Recogida en tienda';

  const PAYMENT: Record<string, string> = { cash: 'Efectivo / En tienda', bizum: 'Bizum', paypal: 'PayPal' };
  const payLabel = PAYMENT[order.paymentMethod] ?? order.paymentMethod;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Recibo #${order.id.slice(-8).toUpperCase()}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; background: #fff; color: #111; padding: 36px 40px; max-width: 600px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #111; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; color: #111; }
    .brand-sub { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 3px; }
    .doc-info { text-align: right; }
    .doc-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; }
    .doc-id { font-size: 20px; font-weight: 800; font-family: monospace; color: #111; letter-spacing: 0.06em; }
    .doc-date { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .meta-box { background: #f9fafb; border-radius: 8px; padding: 14px 16px; }
    .meta-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #9ca3af; margin-bottom: 6px; }
    .meta-name { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 3px; }
    .meta-line { font-size: 12px; color: #374151; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; padding: 8px 12px; border-bottom: 2px solid #111; text-align: left; }
    thead th:not(:first-child) { text-align: right; }
    thead th:nth-child(2) { text-align: center; }
    .total-section { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .total-box { background: #111; color: #fff; border-radius: 8px; padding: 12px 20px; display: flex; gap: 24px; align-items: center; }
    .total-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.55; }
    .total-val { font-size: 22px; font-weight: 900; }
    .info-row { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #6b7280; margin-bottom: 6px; }
    .info-label { font-weight: 700; color: #374151; min-width: 90px; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; line-height: 2; }
    .gold { color: #b08a2e; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">✂ ${barbershopName}</div>
      <div class="brand-sub">Recibo de compra</div>
    </div>
    <div class="doc-info">
      <div class="doc-title">Pedido nº</div>
      <div class="doc-id">#${order.id.slice(-8).toUpperCase()}</div>
      <div class="doc-date">${date}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-box">
      <div class="meta-title">Establecimiento</div>
      <div class="meta-name">${barbershopName}</div>
    </div>
    <div class="meta-box">
      <div class="meta-title">Cliente</div>
      <div class="meta-name">${order.clientName ?? 'Cliente'}</div>
      <div class="meta-line">${order.clientEmail ?? ''}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th style="text-align:center">Cant.</th>
        <th style="text-align:right">P. unit.</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="total-section">
    <div class="total-box">
      <span class="total-label">Total</span>
      <span class="total-val">${(order.totalAmount ?? order.totalPrice ?? 0).toFixed(2)} €</span>
    </div>
  </div>

  <div class="info-row"><span class="info-label">Método de pago</span> ${payLabel}</div>
  <div class="info-row"><span class="info-label">Entrega</span> ${addr}</div>
  ${order.notes ? `<div class="info-row"><span class="info-label">Notas</span> ${order.notes}</div>` : ''}

  <div class="footer">
    Gracias por tu compra en <strong>${barbershopName}</strong><br/>
    Este documento es tu justificante de compra<br/>
    <span class="gold">★ BarberFlow</span>
  </div>
</body>
</html>`;
}

// ── Screen ─────────────────────────────────────────────────────────────────

export function OrderHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList>>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('clientId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
        setOrders(data);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('[OrderHistoryScreen] Error listening to orders:', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [refreshKey]);

  const onRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  };

  const handleDownloadReceipt = async (order: Order) => {
    setGeneratingPdf(order.id);
    try {
      // Obtenemos el nombre de la barbería
      let shopName = 'BarberFlow';
      try {
        const shopSnap = await getDoc(doc(db, 'barbershops', order.barbershopId));
        if (shopSnap.exists()) shopName = shopSnap.data().name ?? shopName;
      } catch { /* usa nombre por defecto */ }

      const html = buildReceiptHtml(order, shopName);
      const orderId = `#${order.id.slice(-8).toUpperCase()}`;

      // Ofrecemos dos opciones: ver/imprimir (visor PDF nativo del sistema)
      // o compartir (genera fichero y abre el share sheet para enviarlo).
      Alert.alert(
        `Recibo ${orderId}`,
        '¿Qué quieres hacer con el recibo?',
        [
          {
            text: '📄 Ver / Imprimir',
            onPress: async () => {
              try {
                await Print.printAsync({ html });
              } catch (e) {
                console.error('[Receipt] print error:', e);
              }
            },
          },
          {
            text: '↑ Compartir',
            onPress: async () => {
              try {
                const { uri } = await Print.printToFileAsync({ html, base64: false });
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                  await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Recibo ${orderId}`,
                    UTI: 'com.adobe.pdf',
                  });
                } else {
                  Alert.alert('No disponible', 'Compartir no está disponible en este dispositivo.');
                }
              } catch (e) {
                console.error('[Receipt] share error:', e);
              }
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ],
      );
    } catch (err) {
      console.error('[OrderHistoryScreen] Error generating receipt:', err);
      Alert.alert('Error', 'No se pudo generar el recibo. Intenta de nuevo.');
    } finally {
      setGeneratingPdf(null);
    }
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
                <View style={styles.cardTopRight}>
                  <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.badgeText, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.receiptBtn}
                    onPress={() => handleDownloadReceipt(item)}
                    disabled={generatingPdf === item.id}
                    activeOpacity={0.7}
                  >
                    {generatingPdf === item.id ? (
                      <ActivityIndicator size="small" color={GOLD} />
                    ) : (
                      <Text style={styles.receiptBtnText}>{'📄 Recibo'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.cardDate}>{dateStr}</Text>

              <View style={styles.divider} />

              {item.items && item.items.map((it, idx) => {
                const isDelivered = status === 'delivered';
                const alreadyReviewed = item.reviewedProducts?.includes(it.productId) ?? false;
                return (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text style={styles.itemQty}>x{it.quantity}</Text>
                    <Text style={styles.itemPrice}>{(it.price * it.quantity).toFixed(2)} €</Text>
                    {isDelivered && (
                      alreadyReviewed ? (
                        <Text style={styles.reviewedTag}>✓</Text>
                      ) : (
                        <TouchableOpacity
                          style={styles.reviewItemBtn}
                          onPress={() => navigation.navigate('ProductReview', {
                            orderId: item.id,
                            productId: it.productId,
                            productName: it.name,
                            barbershopId: item.barbershopId,
                          })}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.reviewItemBtnText}>⭐</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                );
              })}

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{(item.totalAmount ?? item.totalPrice ?? 0).toFixed(2)} €</Text>
              </View>

              <Text style={styles.paymentMethod}>
                Pago: {PAYMENT_LABEL[method] ?? method}
              </Text>

              {item.shippingAddress && (
                <View style={styles.addrBlock}>
                  <Text style={styles.addrBlockTitle}>📦 Dirección de envío</Text>
                  <Text style={styles.addrBlockText}>{item.shippingAddress.street}</Text>
                  <Text style={styles.addrBlockText}>
                    {item.shippingAddress.postalCode} {item.shippingAddress.city}
                  </Text>
                  <Text style={styles.addrBlockText}>{item.shippingAddress.province}</Text>
                </View>
              )}

              {!item.shippingAddress && (
                <Text style={styles.pickupTag}>🏠 Recogida en tienda</Text>
              )}
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
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId: { fontSize: 14, fontWeight: '800', color: GOLD, letterSpacing: 0.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GOLD + '55',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 36,
    justifyContent: 'center',
  },
  receiptBtnText: { fontSize: 11, fontWeight: '700', color: GOLD },
  cardDate: { fontSize: 13, color: MUTED },

  // Divider
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 4 },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { flex: 1, fontSize: 14, color: TEXT },
  itemQty: { fontSize: 13, color: MUTED },
  itemPrice: { fontSize: 14, color: TEXT, fontWeight: '600' },
  reviewItemBtn: {
    borderWidth: 1,
    borderColor: GOLD + '66',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reviewItemBtnText: { fontSize: 13 },
  reviewedTag: { fontSize: 13, color: '#10B981', fontWeight: '700' },

  // Total
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: TEXT },
  totalValue: { fontSize: 16, fontWeight: '800', color: GOLD },

  // Payment
  paymentMethod: { fontSize: 12, color: MUTED },

  // Address block
  addrBlock: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD + '33',
    padding: 10,
    gap: 2,
    marginTop: 4,
  },
  addrBlockTitle: { fontSize: 11, fontWeight: '700', color: GOLD, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  addrBlockText: { fontSize: 12, color: TEXT },

  pickupTag: { fontSize: 12, color: MUTED, fontStyle: 'italic' },
});
