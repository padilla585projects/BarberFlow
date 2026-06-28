import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useCart } from '../../contexts/CartContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

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

  const user = auth.currentUser;

  const handleConfirm = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesion para reservar.');
      return;
    }

    if (cart.items.length === 0) {
      Alert.alert('Error', 'El carrito esta vacio.');
      return;
    }

    setSubmitting(true);

    try {
      const orderData = {
        clientId: user.uid,
        clientName: user.displayName || 'Cliente',
        clientEmail: user.email || '',
        items: cart.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        totalPrice: cart.totalPrice,
        notes: notes.trim() || null,
        status: 'pending',
        createdAt: serverTimestamp(),
        barbershopId,
      };

      const docRef = await addDoc(
        collection(db, 'orders'),
        orderData,
      );

      setOrderId(docRef.id);
      cart.clearCart();
      setSuccess(true);
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

        {/* Pickup info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Punto de recogida</Text>
          <View style={styles.pickupRow}>
            <Text style={styles.pickupIcon}>{'📍'}</Text>
            <Text style={styles.pickupText}>
              Recoge tus productos en {barbershopName}
            </Text>
          </View>
          <Text style={styles.pickupNote}>
            Paga directamente en la barberia al recoger tu pedido
          </Text>
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
              Confirmar reserva - {cart.totalPrice.toFixed(2)} {'€'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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

  // Pickup
  pickupRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickupIcon: { fontSize: 20 },
  pickupText: { color: TEXT_C, fontSize: 14, fontWeight: '500', flex: 1 },
  pickupNote: { color: MUTED, fontSize: 12, fontStyle: 'italic' },

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
});
