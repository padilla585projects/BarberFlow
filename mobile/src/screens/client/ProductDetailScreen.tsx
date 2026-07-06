import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { useCart } from '../../contexts/CartContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';
import type { Product } from '../../types';

type Props = NativeStackScreenProps<ClientStackParamList, 'ProductDetail'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const SCREEN_WIDTH = Dimensions.get('window').width;

const PLACEHOLDER_COLORS = [
  '#8B4513', '#2E4057', '#5D3A6A', '#2D6A4F',
  '#7B2D26', '#1B4332', '#3A506B', '#6B4226',
];

function getPlaceholderColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}

const CATEGORY_EMOJIS: Record<string, string> = {
  Styling: '💇',
  Barba: '🧔',
  Cabello: '💈',
  Afeitado: '🪒',
  Perfume: '🧴',
  Accesorios: '✂️',
};
const DEFAULT_EMOJI = '📦';

function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJIS[category] ?? DEFAULT_EMOJI;
}

export function ProductDetailScreen({ route, navigation }: Props) {
  const { barbershopId, product: productJson } = route.params;
  const product: Product = useMemo(() => JSON.parse(productJson), [productJson]);
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);

  const isOutOfStock = product.stock === 0;

  const increment = () => {
    if (quantity < product.stock) setQuantity((q) => q + 1);
  };

  const decrement = () => {
    if (quantity > 1) setQuantity((q) => q - 1);
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      cart.addItem(
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.photoURL,
          maxStock: product.stock,
        },
        barbershopId,
      );
    }
    Alert.alert('Agregado', `${product.name} x${quantity} agregado al carrito.`);
  };

  const handleReserveNow = () => {
    // Add to cart then navigate to checkout
    for (let i = 0; i < quantity; i++) {
      cart.addItem(
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.photoURL,
          maxStock: product.stock,
        },
        barbershopId,
      );
    }
    // Navigate needs barbershopName - get from navigation state
    const parentRoute = navigation.getState().routes.find(
      (r) => r.name === 'Shop',
    );
    const barbershopName =
      (parentRoute?.params as { barbershopName?: string } | undefined)?.barbershopName ??
      'Barberia';
    navigation.navigate('Checkout', { barbershopId, barbershopName });
  };

  const stockColor =
    product.stock === 0
      ? '#FF4444'
      : product.stock < 5
      ? '#E8913A'
      : '#4CAF50';

  const stockLabel =
    product.stock === 0
      ? 'Agotado'
      : product.stock < 5
      ? `Pocas unidades (${product.stock})`
      : `En stock (${product.stock})`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Product image */}
      {product.photoURL ? (
        <Image
          source={{ uri: product.photoURL }}
          style={styles.imageWrap}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.imageWrap,
            styles.imageFallback,
            { backgroundColor: getPlaceholderColor(product.name) },
          ]}
        >
          <Text style={styles.imageFallbackEmoji}>
            {getCategoryEmoji(product.category)}
          </Text>
          <Text style={styles.imageFallbackLabel}>Sin imagen</Text>
        </View>
      )}

      {/* Product info */}
      <View style={styles.infoSection}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productPrice}>
          {product.price.toFixed(2)} {'€'}
        </Text>

        {/* Stock status */}
        <View style={styles.stockRow}>
          <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
          <Text style={[styles.stockLabel, { color: stockColor }]}>
            {stockLabel}
          </Text>
        </View>

        {/* Rating */}
        {(product.totalRatings ?? 0) > 0 && (
          <View style={styles.ratingRow}>
            {[1,2,3,4,5].map((s) => {
              const avg = (product.ratingSum ?? 0) / product.totalRatings!;
              return (
                <Text key={s} style={[styles.ratingStar, { opacity: s <= Math.round(avg) ? 1 : 0.25 }]}>
                  ⭐
                </Text>
              );
            })}
            <Text style={styles.ratingValue}>
              {((product.ratingSum ?? 0) / product.totalRatings!).toFixed(1)}
            </Text>
            <Text style={styles.ratingCount}>
              ({product.totalRatings} {product.totalRatings === 1 ? 'valoración' : 'valoraciones'})
            </Text>
          </View>
        )}

        {/* Category badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{product.category}</Text>
        </View>
      </View>

      {/* Description */}
      {!!product.description && (
        <View style={styles.descSection}>
          <Text style={styles.descTitle}>Descripcion</Text>
          <Text style={styles.descText}>{product.description}</Text>
        </View>
      )}

      {/* Quantity selector */}
      {!isOutOfStock && (
        <View style={styles.quantitySection}>
          <Text style={styles.quantityLabel}>Cantidad</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
              onPress={decrement}
              disabled={quantity <= 1}
            >
              <Text
                style={[
                  styles.qtyBtnText,
                  quantity <= 1 && styles.qtyBtnTextDisabled,
                ]}
              >
                -
              </Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity
              style={[
                styles.qtyBtn,
                quantity >= product.stock && styles.qtyBtnDisabled,
              ]}
              onPress={increment}
              disabled={quantity >= product.stock}
            >
              <Text
                style={[
                  styles.qtyBtnText,
                  quantity >= product.stock && styles.qtyBtnTextDisabled,
                ]}
              >
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.addCartBtn, isOutOfStock && styles.btnDisabled]}
          onPress={handleAddToCart}
          disabled={isOutOfStock}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.addCartBtnText,
              isOutOfStock && styles.btnTextDisabled,
            ]}
          >
            {isOutOfStock ? 'Producto agotado' : 'Anadir al carrito'}
          </Text>
        </TouchableOpacity>

        {!isOutOfStock && (
          <TouchableOpacity
            style={styles.reserveBtn}
            onPress={handleReserveNow}
            activeOpacity={0.85}
          >
            <Text style={styles.reserveBtnText}>Reservar ahora</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 40 },

  // Image
  imageWrap: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },
  imageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  imageFallbackEmoji: {
    fontSize: 72,
  },
  imageFallbackLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Info
  infoSection: { padding: 20, gap: 8 },
  productName: { fontSize: 24, fontWeight: '800', color: TEXT_C },
  productPrice: { fontSize: 28, fontWeight: '800', color: GOLD },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockDot: { width: 10, height: 10, borderRadius: 5 },
  stockLabel: { fontSize: 14, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingStar: { fontSize: 16 },
  ratingValue: { fontSize: 15, fontWeight: '700', color: GOLD, marginLeft: 4 },
  ratingCount: { fontSize: 13, color: MUTED },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  categoryText: { color: GOLD, fontSize: 12, fontWeight: '600' },

  // Description
  descSection: {
    marginHorizontal: 20,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 8,
  },
  descTitle: { fontSize: 16, fontWeight: '700', color: TEXT_C },
  descText: { fontSize: 14, color: MUTED, lineHeight: 20 },

  // Quantity
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  quantityLabel: { fontSize: 16, fontWeight: '700', color: TEXT_C },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: { borderColor: BORDER },
  qtyBtnText: { color: GOLD, fontSize: 20, fontWeight: '700' },
  qtyBtnTextDisabled: { color: MUTED },
  qtyValue: { color: TEXT_C, fontSize: 20, fontWeight: '700', minWidth: 30, textAlign: 'center' },

  // Actions
  actions: { padding: 20, gap: 12, marginTop: 8 },
  addCartBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addCartBtnText: { color: BG, fontSize: 16, fontWeight: '700' },
  reserveBtn: {
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  reserveBtnText: { color: GOLD, fontSize: 16, fontWeight: '700' },
  btnDisabled: { backgroundColor: BORDER },
  btnTextDisabled: { color: MUTED },
});
