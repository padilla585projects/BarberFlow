import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  Switch,
} from 'react-native';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useCart } from '../../contexts/CartContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

type PaymentMethod = 'cash' | 'bizum' | 'paypal';

interface BarbershopPaymentConfig {
  paymentMethods: { cash: boolean; bizum: boolean; paypal: boolean };
  bizumPhone?: string;
  paypalUsername?: string;
}

type Props = NativeStackScreenProps<ClientStackParamList, 'Checkout'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

export function CheckoutScreen({ route, navigation }: Props) {
  const { barbershopId, barbershopName } = route.params;
  const cart = useCart();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [paymentConfig, setPaymentConfig] = useState<BarbershopPaymentConfig | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // Tarjeta regalo
  const [giftCode, setGiftCode] = useState('');
  const [giftCardLoading, setGiftCardLoading] = useState(false);
  const [giftCard, setGiftCard] = useState<{
    id: string;
    balance: number;
    applied: number;
  } | null>(null);
  const [giftError, setGiftError] = useState('');

  // Dirección de envío
  const [wantsDelivery, setWantsDelivery] = useState(false);
  const [addrStreet, setAddrStreet]         = useState('');
  const [addrCity, setAddrCity]             = useState('');
  const [addrPostalCode, setAddrPostalCode] = useState('');
  const [addrProvince, setAddrProvince]     = useState('');

  const user = auth.currentUser;

  // Fetch barbershop payment config + saved address from user profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shopSnap, userSnap] = await Promise.all([
          getDoc(doc(db, 'barbershops', barbershopId)),
          user ? getDoc(doc(db, 'users', user.uid)) : Promise.resolve(null),
        ]);

        if (shopSnap.exists()) {
          const shopData = shopSnap.data();
          const pm = shopData.paymentMethods as { cash?: boolean; bizum?: boolean; paypal?: boolean } | undefined;
          setPaymentConfig({
            paymentMethods: {
              cash: pm?.cash !== false,
              bizum: pm?.bizum === true,
              paypal: pm?.paypal === true,
            },
            bizumPhone: (shopData.bizumPhone as string) ?? undefined,
            paypalUsername: (shopData.paypalUsername as string) ?? undefined,
          });
        }

        if (userSnap && userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.shippingAddress) {
            const a = userData.shippingAddress;
            setAddrStreet(a.street ?? '');
            setAddrCity(a.city ?? '');
            setAddrPostalCode(a.postalCode ?? '');
            setAddrProvince(a.province ?? '');
            // Si ya tiene dirección guardada, activamos envío a domicilio por defecto
            if (a.street) setWantsDelivery(true);
          }
        }
      } catch (err) {
        console.error('[CheckoutScreen] Error fetching data:', err);
      }
    };
    fetchData();
  }, [barbershopId, user]);

  const effectiveTotal = giftCard
    ? Math.max(0, cart.totalPrice - giftCard.applied)
    : cart.totalPrice;

  const applyGiftCard = async () => {
    const code = giftCode.trim().toUpperCase();
    if (!code) return;
    setGiftError('');
    setGiftCardLoading(true);
    try {
      const q = query(
        collection(db, 'giftCards'),
        where('code', '==', code),
        where('barbershopId', '==', barbershopId),
        where('status', '==', 'active'),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setGiftError('Código no válido o ya utilizado.');
        setGiftCard(null);
        setGiftCardLoading(false);
        return;
      }
      const cardDoc = snap.docs[0];
      const balance: number = cardDoc.data().balance ?? 0;
      if (balance <= 0) {
        setGiftError('Esta tarjeta no tiene saldo disponible.');
        setGiftCard(null);
        setGiftCardLoading(false);
        return;
      }
      const applied = Math.min(balance, cart.totalPrice);
      setGiftCard({ id: cardDoc.id, balance, applied });
      setGiftError('');
    } catch (err) {
      console.error('[CheckoutScreen] applyGiftCard error:', err);
      setGiftError('Error al validar la tarjeta. Inténtalo de nuevo.');
    } finally {
      setGiftCardLoading(false);
    }
  };

  const removeGiftCard = () => {
    setGiftCard(null);
    setGiftCode('');
    setGiftError('');
  };

  const handleConfirm = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para reservar.');
      return;
    }

    if (cart.items.length === 0) {
      Alert.alert('Error', 'El carrito esta vacio.');
      return;
    }

    // Validar dirección si el cliente quiere envío
    if (wantsDelivery) {
      if (!addrStreet.trim() || !addrCity.trim() || !addrPostalCode.trim() || !addrProvince.trim()) {
        Alert.alert('Dirección incompleta', 'Completa todos los campos de la dirección de envío o desactiva la opción de envío.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const batch = writeBatch(db);

      const shippingAddress = wantsDelivery ? {
        street: addrStreet.trim(),
        city: addrCity.trim(),
        postalCode: addrPostalCode.trim(),
        province: addrProvince.trim(),
        country: 'España',
      } : null;

      // Create order doc with auto-generated ID
      const orderRef = doc(collection(db, 'orders'));
      batch.set(orderRef, {
        clientId: user.uid,
        clientName: user.displayName || 'Cliente',
        clientEmail: user.email || '',
        items: cart.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        totalAmount: effectiveTotal,
        originalAmount: cart.totalPrice,
        giftCardId: giftCard?.id ?? null,
        giftCardApplied: giftCard?.applied ?? 0,
        notes: notes.trim() || null,
        status: 'pending',
        paymentMethod: selectedPayment,
        paymentStatus: 'pending',
        shippingAddress: shippingAddress ?? null,
        createdAt: serverTimestamp(),
        barbershopId,
      });

      // Actualizar saldo de tarjeta regalo si se aplicó una
      if (giftCard) {
        const newBalance = giftCard.balance - giftCard.applied;
        batch.update(doc(db, 'giftCards', giftCard.id), {
          balance: newBalance,
          status: newBalance <= 0 ? 'used' : 'active',
        });
      }

      // Decrement stock for each purchased product (atomic)
      for (const item of cart.items) {
        const productRef = doc(db, 'products', item.productId);
        batch.update(productRef, { stock: increment(-item.quantity) });
      }

      await batch.commit();

      setOrderId(orderRef.id);
      setCreatedOrderId(orderRef.id);
      cart.clearCart();

      if (selectedPayment === 'bizum' || selectedPayment === 'paypal') {
        setShowPaymentModal(true);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error('[CheckoutScreen] Error creating order:', err);
      Alert.alert('Error', 'No se pudo crear la reserva. Intentalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successWrap}>
        <Text style={styles.successIcon}>{'✓'}</Text>
        <Text style={styles.successTitle}>Reserva confirmada</Text>
        <Text style={styles.successSub}>
          Tu pedido ha sido reservado. Recogelo en {barbershopName}.
        </Text>
        <View style={styles.orderIdWrap}>
          <Text style={styles.orderIdLabel}>N. de pedido</Text>
          <Text style={styles.orderIdValue}>{orderId.slice(-8).toUpperCase()}</Text>
        </View>
        <TouchableOpacity
          style={styles.successBtn}
          onPress={() => navigation.popToTop()}
          activeOpacity={0.85}
        >
          <Text style={styles.successBtnText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Order review */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen del pedido</Text>
          {cart.items.map((item) => (
            <View key={item.productId} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {(item.price * item.quantity).toFixed(2)} {'€'}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {cart.totalPrice.toFixed(2)} {'€'}
            </Text>
          </View>
        </View>

        {/* Delivery / Pickup */}
        <View style={styles.section}>
          <View style={styles.deliveryToggleRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.sectionTitle}>
                {wantsDelivery ? 'Envío a domicilio' : 'Recogida en tienda'}
              </Text>
              <Text style={styles.pickupNote}>
                {wantsDelivery
                  ? 'Indica la dirección donde recibirás el pedido'
                  : `Recoge en ${barbershopName}`}
              </Text>
            </View>
            <Switch
              value={wantsDelivery}
              onValueChange={setWantsDelivery}
              trackColor={{ false: BORDER, true: GOLD + '80' }}
              thumbColor={wantsDelivery ? GOLD : MUTED}
            />
          </View>

          {!wantsDelivery && (
            <View style={styles.pickupRow}>
              <Text style={styles.pickupIcon}>{'🏠'}</Text>
              <Text style={styles.pickupText}>
                Recoge tus productos en {barbershopName}
              </Text>
            </View>
          )}

          {wantsDelivery && (
            <View style={{ gap: 10 }}>
              <View style={styles.addrField}>
                <Text style={styles.addrLabel}>Calle y número</Text>
                <TextInput
                  style={styles.addrInput}
                  value={addrStreet}
                  onChangeText={setAddrStreet}
                  placeholder="Ej: Calle Mayor 12, 3ºA"
                  placeholderTextColor={MUTED}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.addrField}>
                <Text style={styles.addrLabel}>Ciudad</Text>
                <TextInput
                  style={styles.addrInput}
                  value={addrCity}
                  onChangeText={setAddrCity}
                  placeholder="Ej: Madrid"
                  placeholderTextColor={MUTED}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.addrRowInline}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.addrLabel}>Código postal</Text>
                  <TextInput
                    style={styles.addrInput}
                    value={addrPostalCode}
                    onChangeText={setAddrPostalCode}
                    placeholder="28001"
                    placeholderTextColor={MUTED}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 3 }}>
                  <Text style={styles.addrLabel}>Provincia</Text>
                  <TextInput
                    style={styles.addrInput}
                    value={addrProvince}
                    onChangeText={setAddrProvince}
                    placeholder="Ej: Madrid"
                    placeholderTextColor={MUTED}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas (opcional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Algun mensaje para la barberia..."
            placeholderTextColor={MUTED}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Tarjeta regalo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎁 Tarjeta regalo</Text>
          {!giftCard ? (
            <View style={styles.giftRow}>
              <TextInput
                style={[styles.giftInput, { flex: 1 }]}
                placeholder="XXXX-XXXX-XXXX"
                placeholderTextColor={MUTED}
                value={giftCode}
                onChangeText={(t) => { setGiftCode(t.toUpperCase()); setGiftError(''); }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={14}
              />
              <TouchableOpacity
                style={[styles.giftApplyBtn, giftCardLoading && { opacity: 0.6 }]}
                onPress={applyGiftCard}
                disabled={giftCardLoading || giftCode.trim().length === 0}
                activeOpacity={0.8}
              >
                {giftCardLoading
                  ? <ActivityIndicator size="small" color={BG} />
                  : <Text style={styles.giftApplyBtnText}>Aplicar</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.giftAppliedRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.giftAppliedCode}>{giftCode}</Text>
                <Text style={styles.giftAppliedAmount}>
                  -{giftCard.applied.toFixed(2)} € aplicados
                  {giftCard.balance > giftCard.applied
                    ? `  (saldo restante: ${(giftCard.balance - giftCard.applied).toFixed(2)} €)`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={removeGiftCard} activeOpacity={0.7}>
                <Text style={styles.giftRemoveBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {!!giftError && <Text style={styles.giftError}>{giftError}</Text>}
          {giftCard && (
            <View style={styles.giftSummaryRow}>
              <Text style={styles.giftSummaryLabel}>Total original</Text>
              <Text style={styles.giftSummaryOld}>{cart.totalPrice.toFixed(2)} €</Text>
            </View>
          )}
        </View>

        {/* Payment method */}
        {paymentConfig && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metodo de pago</Text>
            <View style={styles.paymentList}>
              {paymentConfig.paymentMethods.cash && (
                <TouchableOpacity
                  style={[
                    styles.paymentCard,
                    selectedPayment === 'cash' && styles.paymentCardSelected,
                  ]}
                  onPress={() => setSelectedPayment('cash')}
                  activeOpacity={0.8}
                >
                  <View style={styles.paymentCardHeader}>
                    <Text style={styles.paymentIcon}>{'💵'}</Text>
                    <View style={styles.paymentCardInfo}>
                      <Text
                        style={[
                          styles.paymentCardTitle,
                          selectedPayment === 'cash' && styles.paymentCardTitleSelected,
                        ]}
                      >
                        Pagar en caja
                      </Text>
                      <Text style={styles.paymentCardDesc}>
                        Paga en efectivo o tarjeta en el local
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.paymentRadio,
                        selectedPayment === 'cash' && styles.paymentRadioSelected,
                      ]}
                    >
                      {selectedPayment === 'cash' && <View style={styles.paymentRadioDot} />}
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {paymentConfig.paymentMethods.bizum && (
                <TouchableOpacity
                  style={[
                    styles.paymentCard,
                    selectedPayment === 'bizum' && styles.paymentCardSelected,
                  ]}
                  onPress={() => setSelectedPayment('bizum')}
                  activeOpacity={0.8}
                >
                  <View style={styles.paymentCardHeader}>
                    <Text style={styles.paymentIcon}>{'📱'}</Text>
                    <View style={styles.paymentCardInfo}>
                      <Text
                        style={[
                          styles.paymentCardTitle,
                          selectedPayment === 'bizum' && styles.paymentCardTitleSelected,
                        ]}
                      >
                        Bizum
                      </Text>
                      <Text style={styles.paymentCardDesc}>
                        Envia un Bizum al {paymentConfig.bizumPhone ?? ''}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.paymentRadio,
                        selectedPayment === 'bizum' && styles.paymentRadioSelected,
                      ]}
                    >
                      {selectedPayment === 'bizum' && <View style={styles.paymentRadioDot} />}
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {paymentConfig.paymentMethods.paypal && (
                <TouchableOpacity
                  style={[
                    styles.paymentCard,
                    selectedPayment === 'paypal' && styles.paymentCardSelected,
                  ]}
                  onPress={() => setSelectedPayment('paypal')}
                  activeOpacity={0.8}
                >
                  <View style={styles.paymentCardHeader}>
                    <Text style={styles.paymentIcon}>{'🅿️'}</Text>
                    <View style={styles.paymentCardInfo}>
                      <Text
                        style={[
                          styles.paymentCardTitle,
                          selectedPayment === 'paypal' && styles.paymentCardTitleSelected,
                        ]}
                      >
                        PayPal
                      </Text>
                      <Text style={styles.paymentCardDesc}>Paga por PayPal</Text>
                    </View>
                    <View
                      style={[
                        styles.paymentRadio,
                        selectedPayment === 'paypal' && styles.paymentRadioSelected,
                      ]}
                    >
                      {selectedPayment === 'paypal' && <View style={styles.paymentRadioDot} />}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Confirm button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.confirmBtn, submitting && { opacity: 0.6 }]}
          onPress={handleConfirm}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={BG} />
          ) : (
            <Text style={styles.confirmBtnText}>
              Confirmar reserva · {effectiveTotal.toFixed(2)} {'€'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Payment instructions modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPaymentModal(false);
          setSuccess(true);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalCheckmark}>{'✓'}</Text>
            <Text style={styles.modalTitle}>Reserva confirmada</Text>

            {selectedPayment === 'bizum' && (
              <>
                <Text style={styles.modalDesc}>
                  Envia {effectiveTotal.toFixed(2)}{'€'} al numero
                </Text>
                <Text style={styles.modalHighlight}>
                  {paymentConfig?.bizumPhone ?? ''}
                </Text>
                <Text style={styles.modalSubDesc}>mediante Bizum</Text>
              </>
            )}

            {selectedPayment === 'paypal' && (
              <>
                <Text style={styles.modalDesc}>
                  Paga {effectiveTotal.toFixed(2)}{'€'} por PayPal
                </Text>
                <TouchableOpacity
                  style={styles.modalPaypalBtn}
                  onPress={() => {
                    const url = `https://paypal.me/${paymentConfig?.paypalUsername ?? ''}/${effectiveTotal.toFixed(2)}`;
                    Linking.openURL(url);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalPaypalBtnText}>Abrir PayPal</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={async () => {
                if (createdOrderId) {
                  try {
                    await updateDoc(doc(db, 'orders', createdOrderId), {
                      paymentStatus: 'client_confirmed',
                    });
                  } catch (e) {
                    console.error('[CheckoutScreen] Error updating payment status:', e);
                  }
                }
                setShowPaymentModal(false);
                setSuccess(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalConfirmBtnText}>Ya he pagado</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowPaymentModal(false);
                setSuccess(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSkipText}>Pagare mas tarde</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 120, gap: 16 },

  // Section
  section: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT_C },

  // Item row
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  itemName: { color: TEXT_C, fontSize: 14, fontWeight: '500', flex: 1 },
  itemQty: { color: MUTED, fontSize: 13 },
  itemPrice: { color: GOLD, fontSize: 14, fontWeight: '600' },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 4 },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { color: TEXT_C, fontSize: 18, fontWeight: '700' },
  totalValue: { color: GOLD, fontSize: 22, fontWeight: '800' },

  // Pickup / Delivery
  deliveryToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickupRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickupIcon: { fontSize: 20 },
  pickupText: { color: TEXT_C, fontSize: 14, fontWeight: '500', flex: 1 },
  pickupNote: { color: MUTED, fontSize: 12, fontStyle: 'italic' },

  // Address fields inside checkout
  addrField: { gap: 4 },
  addrLabel: { fontSize: 12, color: MUTED, fontWeight: '600' },
  addrInput: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_C,
    fontSize: 14,
  },
  addrRowInline: {
    flexDirection: 'row',
    gap: 10,
  },

  // Notes
  notesInput: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    color: TEXT_C,
    fontSize: 14,
    minHeight: 80,
  },

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
  confirmBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnText: { color: BG, fontSize: 16, fontWeight: '700' },

  // Success
  successWrap: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  successIcon: {
    fontSize: 56,
    color: '#4CAF50',
    width: 100,
    height: 100,
    lineHeight: 100,
    textAlign: 'center',
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#4CAF50',
    overflow: 'hidden',
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: TEXT_C },
  successSub: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  orderIdWrap: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    width: '100%',
    marginTop: 8,
  },
  orderIdLabel: { color: MUTED, fontSize: 12, fontWeight: '600' },
  orderIdValue: { color: GOLD, fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  successBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  successBtnText: { color: BG, fontSize: 15, fontWeight: '700' },

  /* Gift card */
  giftRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  giftInput: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_C,
    fontSize: 15,
    letterSpacing: 1,
    fontWeight: '700' as const,
  },
  giftApplyBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 80,
  },
  giftApplyBtnText: { color: BG, fontWeight: '700' as const, fontSize: 14 },
  giftAppliedRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: GOLD + '18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD + '44',
    padding: 12,
    gap: 10,
  },
  giftAppliedCode: { fontSize: 14, fontWeight: '700' as const, color: GOLD, letterSpacing: 1 },
  giftAppliedAmount: { fontSize: 12, color: TEXT_C },
  giftRemoveBtn: { color: MUTED, fontSize: 18, fontWeight: '700' as const, paddingHorizontal: 4 },
  giftError: { fontSize: 12, color: '#EF4444', fontWeight: '600' as const },
  giftSummaryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  giftSummaryLabel: { fontSize: 13, color: MUTED },
  giftSummaryOld: { fontSize: 14, color: MUTED, textDecorationLine: 'line-through' as const },

  /* Payment method */
  paymentList: { gap: 10 },
  paymentCard: {
    flexDirection: 'column' as const,
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 16,
  },
  paymentCardSelected: { borderColor: GOLD },
  paymentCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  paymentIcon: { fontSize: 24 },
  paymentCardInfo: { flex: 1, gap: 2 },
  paymentCardTitle: { fontSize: 15, fontWeight: '700' as const, color: TEXT_C },
  paymentCardTitleSelected: { color: GOLD },
  paymentCardDesc: { fontSize: 12, color: MUTED },
  paymentRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: MUTED,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  paymentRadioSelected: { borderColor: GOLD },
  paymentRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GOLD,
  },

  /* Payment modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 24,
  },
  modalContent: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 32,
    alignItems: 'center' as const,
    gap: 12,
    width: '100%' as const,
    maxWidth: 360,
  },
  modalCheckmark: {
    fontSize: 40,
    color: '#4CAF50',
    width: 72,
    height: 72,
    lineHeight: 72,
    textAlign: 'center' as const,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#4CAF50',
    overflow: 'hidden' as const,
  },
  modalTitle: { fontSize: 22, fontWeight: '800' as const, color: TEXT_C },
  modalDesc: { fontSize: 15, color: MUTED, textAlign: 'center' as const, lineHeight: 22 },
  modalHighlight: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: GOLD,
    letterSpacing: 1,
    marginVertical: 4,
  },
  modalSubDesc: { fontSize: 13, color: MUTED },
  modalPaypalBtn: {
    backgroundColor: '#0070BA',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  modalPaypalBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' as const },
  modalConfirmBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%' as const,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  modalConfirmBtnText: { color: '#000', fontSize: 15, fontWeight: '700' as const },
  modalSkipText: { color: MUTED, fontSize: 13, fontWeight: '600' as const, marginTop: 4 },
});
