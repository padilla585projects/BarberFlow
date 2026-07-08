import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCart } from '../../contexts/CartContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';
import type { Product } from '../../types';

type Props = NativeStackScreenProps<ClientStackParamList, 'Shop'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - CARD_GAP) / 2;

// Categories are derived dynamically from the products in the shop (see `categories` useMemo below)

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

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return <Text style={[styles.stockText, { color: '#FF4444' }]}>Agotado</Text>;
  }
  if (stock < 5) {
    return <Text style={[styles.stockText, { color: '#E8913A' }]}>Pocas uds.</Text>;
  }
  return <Text style={[styles.stockText, { color: '#4CAF50' }]}>En stock</Text>;
}

export function ShopScreen({ route, navigation }: Props) {
  const { barbershopId, barbershopName } = route.params;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const cart = useCart();

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'products'),
        where('barbershopId', '==', barbershopId),
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        data.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(data);
        setLoading(false);
        setRefreshing(false);
      });

      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error('[ShopScreen] Error setting up listener:', err);
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbershopId]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Cart', { barbershopId, barbershopName })
          }
          style={styles.cartBtn}
        >
          <Text style={styles.cartBtnText}>Carrito</Text>
          {cart.totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, cart.totalItems, barbershopId, barbershopName]);

  // Build filter chips dynamically from the actual product categories in this barbershop
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
    return ['Todos', ...cats];
  }, [products]);

  // Reset selected category whenever products change (e.g. navigating to a different shop)
  useEffect(() => {
    setSelectedCategory('Todos');
  }, [barbershopId]);

  const filtered = useMemo(() => {
    let result = products;
    if (selectedCategory !== 'Todos') {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(lower));
    }
    return result;
  }, [products, selectedCategory, searchText]);

  const onRefresh = () => {
    setRefreshing(true);
    setLoading(false);
  };

  const handleAdd = (product: Product) => {
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
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos..."
          placeholderTextColor={MUTED}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Category chips — generated from actual product categories */}
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.chipRow}
        style={styles.chipList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.chip,
              selectedCategory === item && styles.chipActive,
            ]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === item && styles.chipTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Product grid */}
      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GOLD}
            colors={[GOLD]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>{'🛍'}</Text>
            <Text style={styles.emptyTitle}>No hay productos</Text>
            <Text style={styles.emptySub}>
              Esta barbería aún no tiene productos a la venta
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('ProductDetail', {
                barbershopId,
                product: JSON.stringify(item),
              })
            }
          >
            {/* Product image */}
            {item.photoURL ? (
              <Image
                source={{ uri: item.photoURL }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.cardImage,
                  styles.cardFallback,
                  { backgroundColor: getPlaceholderColor(item.name) },
                ]}
              >
                <Text style={styles.cardFallbackEmoji}>
                  {getCategoryEmoji(item.category)}
                </Text>
                <Text style={styles.cardFallbackLabel}>Sin imagen</Text>
              </View>
            )}

            <View style={styles.cardBody}>
              <Text style={styles.cardName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.cardPrice}>{item.price.toFixed(2)} {'€'}</Text>
              {(item.totalRatings ?? 0) > 0 && (
                <Text style={styles.cardRating}>
                  {'⭐'} {((item.ratingSum ?? 0) / item.totalRatings!).toFixed(1)}
                  {' '}
                  <Text style={styles.cardRatingCount}>({item.totalRatings})</Text>
                </Text>
              )}
              <StockBadge stock={item.stock} />
              <TouchableOpacity
                style={[
                  styles.addBtn,
                  item.stock === 0 && styles.addBtnDisabled,
                ]}
                disabled={item.stock === 0}
                onPress={() => handleAdd(item)}
              >
                <Text
                  style={[
                    styles.addBtnText,
                    item.stock === 0 && styles.addBtnTextDisabled,
                  ]}
                >
                  {item.stock === 0 ? 'Agotado' : 'Anadir'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Cart header button
  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  cartBtnText: { color: GOLD, fontSize: 13, fontWeight: '600' },
  cartBadge: {
    backgroundColor: GOLD,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: BG, fontSize: 11, fontWeight: '800' },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    color: TEXT_C,
    fontSize: 14,
  },

  // Category chips
  chipList: { flexGrow: 0, marginTop: 10 },
  chipRow: { paddingHorizontal: 16, gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: SURFACE,
  },
  chipActive: { borderColor: GOLD, backgroundColor: GOLD },
  chipText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: BG },

  // Grid
  grid: { padding: 16, paddingTop: 12 },
  gridRow: { gap: CARD_GAP },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: CARD_GAP,
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH * 0.85,
  },
  cardFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cardFallbackEmoji: {
    fontSize: 40,
  },
  cardFallbackLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardBody: { padding: 10, gap: 4 },
  cardName: { color: TEXT_C, fontSize: 13, fontWeight: '600' },
  cardPrice: { color: GOLD, fontSize: 15, fontWeight: '700' },
  cardRating: { fontSize: 11, color: GOLD, fontWeight: '600' },
  cardRatingCount: { fontSize: 10, color: MUTED, fontWeight: '400' },
  stockText: { fontSize: 11, fontWeight: '600' },
  addBtn: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnDisabled: {
    backgroundColor: BORDER,
  },
  addBtnText: { color: BG, fontSize: 12, fontWeight: '700' },
  addBtnTextDisabled: { color: MUTED },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: TEXT_C, fontSize: 18, fontWeight: '700' },
  emptySub: { color: MUTED, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
