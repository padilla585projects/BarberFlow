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
  TextInput,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  increment,
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

  // Promo code
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<{
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

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
    // For products, check stock before adding
    if (type === 'product') {
      const product = products.find(p => p.id === item.id);
      const currentInCart = cart.find(c => c.itemId === item.id && c.type === 'product');
      const qtyInCart = currentInCart ? currentInCart.quantity : 0;
      if (product && qtyInCart >= product.stock) {
        Alert.alert('Stock insuficiente', `Solo quedan ${product.stock} unidades de "${item.name}".`);
        return;
      }
    }

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
    // For products, check stock before incrementing
    if (type === 'product' && delta > 0) {
      const product = products.find(p => p.id === itemId);
      const currentInCart = cart.find(c => c.itemId === itemId && c.type === 'product');
      if (product && currentInCart && currentInCart.quantity >= product.stock) {
        Alert.alert('Stock insuficiente', `Solo quedan ${product.stock} unidades de "${product.name}".`);
        return;
      }
    }

    setCart(prev =>
      prev.map(c =>
        c.itemId === itemId && c.type === type
          ? { ...c, quantity: Math.max(1, c.quantity + delta) }
          : c,
      ),
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const discountAmount = (() => {
    if (!promoApplied) return 0;
    if (promoApplied.type === 'percentage') {
      return Math.round(cartTotal * promoApplied.value) / 100;
    }
    return Math.min(promoApplied.value, cartTotal);
  })();

  const finalTotal = cartTotal - discountAmount;

  // ── Promo code ──────────────────────────────────────────────

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code || !barbershopId) return;

    setPromoError('');
    setPromoLoading(true);
    try {
      const promoSnap = await getDocs(
        query(
          collection(db, 'barbershops', barbershopId, 'promos'),
          where('code', '==', code),
        ),
      );

      if (promoSnap.empty) {
        setPromoError('Codigo no valido.');
        setPromoApplied(null);
        setPromoLoading(false);
        return;
      }

      const promoDoc = promoSnap.docs[0];
      const data = promoDoc.data();

      if (!data.active) {
        setPromoError('Este codigo ya no esta activo.');
        setPromoApplied(null);
        setPromoLoading(false);
        return;
      }

      const expiry = data.expiryDate?.toDate?.();
      if (expiry && expiry < new Date()) {
        setPromoError('Este codigo ha expirado.');
        setPromoApplied(null);
        setPromoLoading(false);
        return;
      }

      if (data.maxUses > 0 && (data.currentUses ?? 0) >= data.maxUses) {
        setPromoError('Este codigo ha alcanzado el limite de usos.');
        setPromoApplied(null);
        setPromoLoading(false);
        return;
      }

      setPromoApplied({
        id: promoDoc.id,
        code: data.code,
        type: data.type,
        value: data.value,
      });
      setPromoError('');
    } catch (err) {
      console.error('SalesScreen promo error:', err);
      setPromoError('Error al validar el codigo.');
      setPromoApplied(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoInput('');
    setPromoError('');
  };

  // ── Checkout ──────────────────────────────────────────────

  const handleCheckout = async () => {
    const user = auth.currentUser;
    if (!user || cart.length === 0 || !barbershopId) return;

    setSaving(true);
    try {
      // Verify current stock levels from Firestore to prevent race conditions
      const productItems = cart.filter(c => c.type === 'product');
      for (const item of productItems) {
        const productDoc = await getDoc(doc(db, 'products', item.itemId));
        if (!productDoc.exists()) {
          Alert.alert('Error', `El producto "${item.name}" ya no existe.`);
          setSaving(false);
          return;
        }
        const currentStock = productDoc.data().stock ?? 0;
        if (currentStock < item.quantity) {
          Alert.alert(
            'Stock insuficiente',
            `"${item.name}" solo tiene ${currentStock} unidades disponibles, pero intentas vender ${item.quantity}.`,
          );
          setSaving(false);
          return;
        }
      }

      // Record the sale
      const saleData: Record<string, unknown> = {
        barberId: user.uid,
        barbershopId,
        items: cart,
        totalAmount: finalTotal,
        originalAmount: cartTotal,
        date: serverTimestamp(),
      };

      if (promoApplied) {
        saleData.promoCode = promoApplied.code;
        saleData.discount = discountAmount;
        saleData.promoType = promoApplied.type;
        saleData.promoValue = promoApplied.value;
      }

      await addDoc(collection(db, 'sales'), saleData);

      // Increment promo usage
      if (promoApplied) {
        await updateDoc(
          doc(db, 'barbershops', barbershopId, 'promos', promoApplied.id),
          { currentUses: increment(1) },
        );
      }

      // Decrement stock for each product sold
      for (const item of productItems) {
        await updateDoc(doc(db, 'products', item.itemId), {
          stock: increment(-item.quantity),
        });
      }

      // Update local product state to reflect new stock
      if (productItems.length > 0) {
        setProducts(prev =>
          prev.map(p => {
            const sold = productItems.find(c => c.itemId === p.id);
            if (sold) {
              return { ...p, stock: Math.max(0, p.stock - sold.quantity) };
            }
            return p;
          }),
        );
      }

      Alert.alert('Venta registrada', `Total: ${finalTotal.toFixed(2)}€`);
      setCart([]);
      handleRemovePromo();
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

          {/* Promo code section */}
          <View style={styles.promoContainer}>
            <TouchableOpacity
              style={styles.promoToggle}
              onPress={() => setPromoExpanded((v) => !v)}
            >
              <Text style={styles.promoToggleText}>
                {promoExpanded ? '▾' : '▸'} Codigo promocional
              </Text>
            </TouchableOpacity>

            {promoExpanded && (
              <View style={styles.promoSection}>
                {promoApplied ? (
                  <View style={styles.promoApplied}>
                    <View style={styles.promoAppliedLeft}>
                      <Text style={styles.promoCheckmark}>{'✓'}</Text>
                      <View>
                        <Text style={styles.promoAppliedCode}>{promoApplied.code}</Text>
                        <Text style={styles.promoAppliedDiscount}>
                          -{promoApplied.type === 'percentage'
                            ? `${promoApplied.value}%`
                            : `${promoApplied.value.toFixed(2)}€`}
                          {' '}(-{discountAmount.toFixed(2)}€)
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={handleRemovePromo}>
                      <Text style={styles.promoRemove}>Quitar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.promoInputRow}>
                    <TextInput
                      style={styles.promoInput}
                      placeholder="Codigo"
                      placeholderTextColor={MUTED}
                      value={promoInput}
                      onChangeText={(t) => {
                        setPromoInput(t.toUpperCase());
                        setPromoError('');
                      }}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={[styles.promoApplyBtn, promoLoading && { opacity: 0.6 }]}
                      onPress={handleApplyPromo}
                      disabled={promoLoading}
                    >
                      {promoLoading ? (
                        <ActivityIndicator color="#000" size="small" />
                      ) : (
                        <Text style={styles.promoApplyBtnText}>Aplicar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {!!promoError && <Text style={styles.promoErrorText}>{promoError}</Text>}
              </View>
            )}
          </View>

          <View style={styles.cartFooter}>
            {promoApplied && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>SUBTOTAL</Text>
                  <Text style={[styles.totalAmount, { fontSize: 16, color: MUTED }]}>{cartTotal.toFixed(2)}{'€'}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: '#10B981' }]}>DESCUENTO</Text>
                  <Text style={[styles.totalAmount, { fontSize: 16, color: '#10B981' }]}>-{discountAmount.toFixed(2)}{'€'}</Text>
                </View>
              </>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalAmount}>{finalTotal.toFixed(2)}{'€'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, saving && styles.checkoutBtnDisabled]}
              onPress={handleCheckout}
              disabled={saving}
            >
              <Text style={styles.checkoutBtnText}>
                {saving ? 'Registrando...' : `Cobrar ${finalTotal.toFixed(2)}€`}
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

  // Promo code
  promoContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  promoToggle: { paddingVertical: 4 },
  promoToggleText: { fontSize: 13, fontWeight: '600', color: GOLD },
  promoSection: { gap: 8, marginTop: 8 },
  promoInputRow: { flexDirection: 'row', gap: 8 },
  promoInput: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 1,
  },
  promoApplyBtn: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoApplyBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
  promoErrorText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10B981' + '15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981' + '30',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  promoAppliedLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promoCheckmark: { fontSize: 16, color: '#10B981', fontWeight: '800' },
  promoAppliedCode: { fontSize: 14, fontWeight: '800', color: TEXT },
  promoAppliedDiscount: { fontSize: 11, fontWeight: '600', color: '#10B981' },
  promoRemove: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
});
