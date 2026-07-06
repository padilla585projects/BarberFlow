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
  Share,
} from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

type Props = NativeStackScreenProps<ClientStackParamList, 'PurchaseGiftCard'>;

type PaymentMethod = 'cash' | 'bizum' | 'paypal';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const PRESET_AMOUNTS = [25, 50, 75, 100];

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg()}-${seg()}-${seg()}`;
}

export function PurchaseGiftCardScreen({ route, navigation }: Props) {
  const { barbershopId, barbershopName } = route.params;
  const user = auth.currentUser;

  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [submitting, setSubmitting] = useState(false);

  // Success state
  const [success, setSuccess] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const finalAmount = useCustom
    ? parseFloat(customAmount.replace(',', '.')) || 0
    : selectedAmount ?? 0;

  const paymentLabels: Record<PaymentMethod, string> = {
    cash: 'Efectivo',
    bizum: 'Bizum',
    paypal: 'PayPal',
  };

  const handleConfirm = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para comprar una tarjeta regalo.');
      return;
    }
    if (finalAmount <= 0) {
      Alert.alert('Importe inválido', 'Selecciona o introduce un importe válido.');
      return;
    }
    if (useCustom && finalAmount < 5) {
      Alert.alert('Importe mínimo', 'El importe mínimo es 5 €.');
      return;
    }

    setSubmitting(true);
    try {
      const code = generateCode();
      await addDoc(collection(db, 'giftCards'), {
        code,
        amount: finalAmount,
        balance: finalAmount,
        purchasedBy: user.uid,
        purchasedByName: user.displayName ?? user.email ?? '',
        barbershopId,
        barbershopName,
        recipientName: recipientName.trim() || null,
        personalMessage: personalMessage.trim() || null,
        status: 'active',
        paymentMethod,
        createdAt: serverTimestamp(),
      });
      setGeneratedCode(code);
      setSuccess(true);
    } catch (err) {
      console.error('[PurchaseGiftCardScreen] Error creating gift card:', err);
      Alert.alert('Error', 'No se pudo crear la tarjeta regalo. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await Share.share({ message: `Tu tarjeta regalo BarberFlow: ${generatedCode}` });
    } catch (err) {
      console.error('[PurchaseGiftCardScreen] Error sharing code:', err);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>🎁</Text>
          <Text style={styles.successTitle}>¡Tarjeta creada!</Text>
          <Text style={styles.successSubtitle}>
            {recipientName.trim() ? `Para: ${recipientName.trim()}` : barbershopName}
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>CÓDIGO DE REGALO</Text>
            <Text style={styles.codeText}>{generatedCode}</Text>
            <Text style={styles.codeAmount}>{finalAmount} €</Text>
          </View>
          {personalMessage.trim().length > 0 && (
            <Text style={styles.successMessage}>"{personalMessage.trim()}"</Text>
          )}
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode} activeOpacity={0.85}>
            <Text style={styles.copyBtnText}>Compartir código</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.85}
          >
            <Text style={styles.backBtnText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Tarjeta regalo</Text>
      <Text style={styles.pageSubtitle}>{barbershopName}</Text>

      {/* Amount selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Importe</Text>
        <View style={styles.amountGrid}>
          {PRESET_AMOUNTS.map((a) => (
            <TouchableOpacity
              key={a}
              style={[
                styles.amountChip,
                !useCustom && selectedAmount === a && styles.amountChipSelected,
              ]}
              onPress={() => {
                setSelectedAmount(a);
                setUseCustom(false);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.amountChipText,
                  !useCustom && selectedAmount === a && styles.amountChipTextSelected,
                ]}
              >
                {a} €
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.customToggle, useCustom && styles.customToggleActive]}
          onPress={() => setUseCustom(!useCustom)}
          activeOpacity={0.8}
        >
          <Text style={[styles.customToggleText, useCustom && styles.customToggleTextActive]}>
            Importe personalizado
          </Text>
        </TouchableOpacity>
        {useCustom && (
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="Ej: 30"
              placeholderTextColor={MUTED}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={styles.customCurrency}>€</Text>
          </View>
        )}
      </View>

      {/* Recipient */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Destinatario (opcional)</Text>
        <TextInput
          style={styles.input}
          value={recipientName}
          onChangeText={setRecipientName}
          placeholder="Nombre de quien recibe el regalo"
          placeholderTextColor={MUTED}
        />
      </View>

      {/* Personal message */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mensaje personal (opcional)</Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          value={personalMessage}
          onChangeText={(t) => setPersonalMessage(t.slice(0, 200))}
          placeholder="Escribe un mensaje para el destinatario..."
          placeholderTextColor={MUTED}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <Text style={styles.charCounter}>{personalMessage.length}/200</Text>
      </View>

      {/* Payment method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Método de pago</Text>
        {(['cash', 'bizum', 'paypal'] as PaymentMethod[]).map((method) => (
          <TouchableOpacity
            key={method}
            style={[styles.paymentRow, paymentMethod === method && styles.paymentRowSelected]}
            onPress={() => setPaymentMethod(method)}
            activeOpacity={0.8}
          >
            <View
              style={[styles.paymentRadio, paymentMethod === method && styles.paymentRadioSelected]}
            >
              {paymentMethod === method && <View style={styles.paymentRadioDot} />}
            </View>
            <Text
              style={[
                styles.paymentLabel,
                paymentMethod === method && styles.paymentLabelSelected,
              ]}
            >
              {paymentLabels[method]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total a pagar</Text>
        <Text style={styles.summaryAmount}>
          {finalAmount > 0 ? `${finalAmount} €` : '—'}
        </Text>
      </View>

      {/* Confirm */}
      <TouchableOpacity
        style={[styles.confirmBtn, (submitting || finalAmount <= 0) && styles.confirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={submitting || finalAmount <= 0}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={BG} />
        ) : (
          <Text style={styles.confirmBtnText}>Comprar tarjeta regalo</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 24, gap: 20, paddingBottom: 48 },

  pageTitle: { fontSize: 26, fontWeight: '800', color: TEXT_C },
  pageSubtitle: { fontSize: 14, color: MUTED, marginTop: -12 },

  section: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amountChip: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  amountChipSelected: { borderColor: GOLD, backgroundColor: GOLD + '20' },
  amountChipText: { color: MUTED, fontSize: 16, fontWeight: '600' },
  amountChipTextSelected: { color: GOLD },

  customToggle: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  customToggleActive: { borderColor: GOLD },
  customToggleText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  customToggleTextActive: { color: GOLD },

  customInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customInput: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: TEXT_C,
    fontWeight: '700',
  },
  customCurrency: { fontSize: 20, fontWeight: '700', color: GOLD },

  input: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_C,
  },
  messageInput: { height: 100, lineHeight: 22 },
  charCounter: { fontSize: 12, color: MUTED, textAlign: 'right', marginTop: -4 },

  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  paymentRowSelected: { backgroundColor: GOLD + '15' },
  paymentRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentRadioSelected: { borderColor: GOLD },
  paymentRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD },
  paymentLabel: { fontSize: 15, color: MUTED, fontWeight: '600' },
  paymentLabelSelected: { color: TEXT_C },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  summaryLabel: { fontSize: 16, color: MUTED },
  summaryAmount: { fontSize: 24, fontWeight: '800', color: GOLD },

  confirmBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: BG, fontSize: 16, fontWeight: '700' },

  // Success screen
  successContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#1A1500',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: GOLD + '66',
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  successIcon: { fontSize: 48 },
  successTitle: { fontSize: 26, fontWeight: '800', color: GOLD },
  successSubtitle: { fontSize: 14, color: MUTED },
  codeBox: {
    width: '100%',
    backgroundColor: BG,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: GOLD,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  codeLabel: { fontSize: 11, fontWeight: '700', color: GOLD, letterSpacing: 2, opacity: 0.7 },
  codeText: {
    fontSize: 28,
    fontWeight: '900',
    color: TEXT_C,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  codeAmount: { fontSize: 20, fontWeight: '700', color: GOLD },
  successMessage: { fontSize: 14, color: MUTED, fontStyle: 'italic', textAlign: 'center' },
  copyBtn: {
    width: '100%',
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  copyBtnText: { color: BG, fontSize: 15, fontWeight: '700' },
  backBtn: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: { color: MUTED, fontSize: 15, fontWeight: '600' },
});
