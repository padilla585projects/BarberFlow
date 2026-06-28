import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import type { Service, Product, SaleItem } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

type CatalogTab = 'services' | 'products';

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  type: 'service' | 'product';
  subtitle: string;
  disabled?: boolean;
}

export function SalesScreen() {
  const [loading, setLoading] = useState(true);
  const [barbershopId, setBarbershopId] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<CatalogTab>('services');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);

      // Get owner's barbershopId
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const shopId = userDoc.data()?.barbershopId;
      if (!shopId) {
        setLoading(false);
        return;
      }
      setBarbershopId(shopId);

      // Fetch services from barbershop document
      const shopDoc = await getDoc(doc(db, 'barbershops', shopId));
      const shopServices: Service[] = shopDoc.data()?.services ?? [];
      setServices(shopServices);

      // Fetch products
      const prodSnap = await getDocs(
        query(collection(db, 'products'), where('barbershopId', '==', shopId)),
      );
      const prods: Product[] = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(prods);
    } catch (err) {
      console.error('SalesScreen fetchData error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Cart helpers ──────────────────────────────────────────

  const addToCart = (type: 'service' | 'product', item: { id: string; name: string; price: number }) => {
    setCart(prev => {
      const existing = prev.find(c => c.itemId === item.id && c.type === type);
      if (existing) {
        return prev.map(c =>
          c.itemId === item.id && c.type === type
            ? { ...c, quantity: c.quantity + 1 }
            : c,
        );
      }
      return [...prev, { type, itemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string, type: 'service' | 'product') => {
    setCart(prev => prev.filter(c => !(c.itemId === itemId && c.type === type)));
  };

  const changeQty = (itemId: string, type: 'service' | 'product', delta: number) => {
    setCart(prev =>
      prev.map(c =>
        c.itemId === itemId && c.type === type
          ? { ...c, quantity: Math.max(1, c.quantity + delta) }
          : c,
      ),
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  // ── Checkout ──────────────────────────────────────────────

  const handleCheckout = async () => {
    const user = auth.currentUser;
    if (!user || cart.length === 0 || !barbershopId) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'sales'), {
        barberId: user.uid,
        barbershopId,
        items: cart,
        totalAmount: cartTotal,
        date: serverTimestamp(),
      });

      Alert.alert('Venta registrada', `Total: ${cartTotal.toFixed(2)}€`);
      setCart([]);
    } catch (err) {
      console.error('SalesScreen handleCheckout error:', err);
      Alert.alert('Error', 'No se pudo registrar la venta.');
    } finally {
      setSaving(false);
    }
  };

  // ── Catalog items ─────────────────────────────────────────

  const catalogData: CatalogItem[] =
    tab === 'services'
      ? services.map(s => ({ id: s.id, name: s.name, price: s.price, type: 'service', subtitle: `${s.duration} min` }))
      : products.map(p => ({ id: p.id, name: p.name, price: p.price, type: 'product', subtitle: `Stock: ${p.stock}`, disabled: p.stock === 0 }));

  // ── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'services' && styles.tabActive]}
          onPress={() => setTab('services')}
        >
          <Text style={[styles.tabText, tab === 'services' && styles.tabTextActive]}>
            Servicios ({services.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'products' && styles.tabActive]}
          onPress={() => setTab('products')}
        >
          <Text style={[styles.tabText, tab === 'products' && styles.tabTextActive]}>
            Productos ({products.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Catalog ── */}
      <FlatList
        data={catalogData}
        keyExtractor={item => `${item.type}-${item.id}`}
        contentContainerStyle={styles.catalogList}
        renderItem={({ item }) => {
          const inCart = cart.some(c => c.itemId === item.id && c.type === item.type);
          const isDisabled = !!item.disabled;
          return (
            <View style={[styles.card, inCart && styles.cardActive, isDisabled && styles.cardDisabled]}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardSub}>{item.subtitle}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardPrice}>{item.price.toFixed(2)}{'€'}</Text>
                <TouchableOpacity
                  style={[styles.addBtn, isDisabled && styles.addBtnDisabled]}
                  disabled={isDisabled}
                  onPress={() => addToCart(item.type, { id: item.id, name: item.name, price: item.price })}
                >
                  <Text style={styles.addBtnText}>{isDisabled ? 'Agotado' : 'Añadir'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={styles.emptyText}>
              {tab === 'services' ? 'No hay servicios configurados.' : 'No hay productos en el inventario.'}
            </Text>
          </View>
        }
      />

      {/* ── Cart ── */}
      {cart.length > 0 && (
        <View style={styles.cart}>
          <Text style={styles.cartTitle}>Ticket</Text>

          <ScrollView style={styles.cartScroll}>
            {cart.map(item => (
              <View key={`${item.type}-${item.itemId}`} style={styles.cartItem}>
                <View style={styles.cartItemLeft}>
                  <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cartItemType}>
                    {item.type === 'service' ? 'Servicio' : 'Producto'}
                  </Text>
                </View>

                <View style={styles.cartItemControls}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => changeQty(item.itemId, item.type, -1)}
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => changeQty(item.itemId, item.type, +1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.cartItemPrice}>
                  {(item.price * item.quantity).toFixed(2)}{'€'}
                </Text>

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeFromCart(item.itemId, item.type)}
                >
                  <Text style={styles.removeBtnText}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={styles.cartFooter}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalAmount}>{cartTotal.toFixed(2)}{'€'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, saving && styles.checkoutBtnDisabled]}
              onPress={handleCheckout}
              disabled={saving}
            >
              <Text style={styles.checkoutBtnText}>
                {saving ? 'Registrando...' : `Cobrar ${cartTotal.toFixed(2)}€`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
  },
  tabText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: GOLD,
  },

  // Catalog
  catalogList: {
    padding: 12,
    paddingBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardActive: {
    borderColor: GOLD,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '600',
  },
  cardSub: {
    color: MUTED,
    fontSize: 13,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  cardPrice: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  addBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnDisabled: {
    backgroundColor: BORDER,
  },
  addBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },

  // Empty
  emptyList: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
  },

  // Cart
  cart: {
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    maxHeight: '45%',
  },
  cartTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  cartScroll: {
    paddingHorizontal: 14,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  cartItemLeft: {
    flex: 1,
    marginRight: 8,
  },
  cartItemName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '600',
  },
  cartItemType: {
    color: MUTED,
    fontSize: 11,
    marginTop: 1,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  qtyNum: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
    minWidth: 18,
    textAlign: 'center',
  },
  cartItemPrice: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
    marginRight: 8,
  },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#331111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: '800',
  },

  // Footer
  cartFooter: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalLabel: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '700',
  },
  totalAmount: {
    color: GOLD,
    fontSize: 22,
    fontWeight: '800',
  },
  checkoutBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  checkoutBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
});
