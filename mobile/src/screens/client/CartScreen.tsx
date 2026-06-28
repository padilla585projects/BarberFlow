import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useCart } from '../../contexts/CartContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

type Props = NativeStackScreenProps<ClientStackParamList, 'Cart'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

export function CartScreen({ route, navigation }: Props) {
  const { barbershopId, barbershopName } = route.params;
  const cart = useCart();

  const handleCheckout = () => {
    navigation.navigate('Checkout', { barbershopId, barbershopName });
  };

  if (cart.items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>{'🛒'}</Text>
          <Text style={styles.emptyTitle}>Tu carrito esta vacio</Text>
          <Text style={styles.emptySub}>
            Explora la tienda y agrega productos
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>Ir a la tienda</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cart.items}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const subtotal = item.price * item.quantity;
          return (
            <View style={styles.card}>
              {/* Product image placeholder */}
              <View style={styles.cardThumb}>
                <Text style={styles.cardThumbText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.cardUnitPrice}>
                  {item.price.toFixed(2)} {'€'} / ud.
                </Text>

                {/* Quantity controls */}
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() =>
                      cart.updateQuantity(item.productId, item.quantity - 1)
                    }
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={[
                      styles.qtyBtn,
                      item.quantity >= item.maxStock && styles.qtyBtnDisabled,
                    ]}
                    onPress={() =>
                      cart.updateQuantity(item.productId, item.quantity + 1)
                    }
                    disabled={item.quantity >= item.maxStock}
                  >
                    <Text
                      style={[
                        styles.qtyBtnText,
                        item.quantity >= item.maxStock && styles.qtyBtnTextDisabled,
                      ]}
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cardRight}>
                <Text style={styles.cardSubtotal}>
                  {subtotal.toFixed(2)} {'€'}
                </Text>
                <TouchableOpacity
                  onPress={() => cart.removeItem(item.productId)}
                  style={styles.removeBtn}
                >
                  <Text style={styles.removeBtnText}>{'✕'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {cart.totalPrice.toFixed(2)} {'€'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {cart.totalPrice.toFixed(2)} {'€'}
              </Text>
            </View>
          </View>
        }
      />

      {/* Checkout button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={handleCheckout}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>
            Reservar productos ({cart.totalItems})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  list: { padding: 16, paddingBottom: 100 },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  cardThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#2E4057',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardThumbText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 22,
    fontWeight: '800',
  },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { color: TEXT_C, fontSize: 14, fontWeight: '600' },
  cardUnitPrice: { color: MUTED, fontSize: 12 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: { borderColor: BORDER },
  qtyBtnText: { color: GOLD, fontSize: 16, fontWeight: '700' },
  qtyBtnTextDisabled: { color: MUTED },
  qtyValue: {
    color: TEXT_C,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  cardSubtotal: { color: GOLD, fontSize: 15, fontWeight: '700' },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,68,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: { color: '#FF4444', fontSize: 14, fontWeight: '700' },

  // Summary
  summary: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginTop: 6,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { color: MUTED, fontSize: 14 },
  summaryValue: { color: TEXT_C, fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: BORDER },
  totalLabel: { color: TEXT_C, fontSize: 18, fontWeight: '700' },
  totalValue: { color: GOLD, fontSize: 20, fontWeight: '800' },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 16,
    paddingBottom: 32,
  },
  checkoutBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkoutBtnText: { color: BG, fontSize: 16, fontWeight: '700' },

  // Empty
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { color: TEXT_C, fontSize: 20, fontWeight: '700' },
  emptySub: { color: MUTED, fontSize: 14, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: BG, fontSize: 14, fontWeight: '700' },
});
