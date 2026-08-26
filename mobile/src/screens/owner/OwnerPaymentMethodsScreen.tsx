import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { httpsCallable, getFunctions } from 'firebase/functions';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';
import type {
  PaymentMethods,
  StripeConfig,
  BankTransferConfig,
  PayPalConfig,
} from '../../types';

type Props = NativeStackScreenProps<OwnerStackParamList, 'PaymentMethods'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C   = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const ERROR   = '#E53E3E';
const SUCCESS = '#38A169';

export function OwnerPaymentMethodsScreen({ navigation }: Props) {
  const { activeBarbershopId } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validatingIBAN, setValidatingIBAN] = useState(false);
  const [validatingPayPal, setValidatingPayPal] = useState(false);

  // Stripe Connect
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeConnectAccountId, setStripeConnectAccountId] = useState('');
  const [stripeChargesEnabled, setStripeChargesEnabled] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [checkingStripeStatus, setCheckingStripeStatus] = useState(false);
  const [stripeError, setStripeError] = useState('');

  // Bizum (automático con Stripe)
  const [bizumEnabled, setBizumEnabled] = useState(false);

  // Bank Transfer
  const [bankEnabled, setBankEnabled] = useState(false);
  const [bankIBAN, setBankIBAN] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankValidated, setBankValidated] = useState(false);
  const [bankError, setBankError] = useState('');

  // PayPal
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [paypalValidated, setPaypalValidated] = useState(false);
  const [paypalError, setPaypalError] = useState('');

  // Cash (siempre disponible)
  const [cashEnabled, setCashEnabled] = useState(true);

  const fetchPaymentMethods = useCallback(async () => {
    if (!activeBarbershopId) return;

    try {
      const shopDoc = await getDoc(doc(db, 'barbershops', activeBarbershopId));
      if (!shopDoc.exists()) return;

      const data = shopDoc.data();
      const pm = data.paymentMethods || {};

      // Stripe Connect
      if (pm.stripe) {
        setStripeEnabled(pm.stripe.enabled ?? false);
        setStripeConnectAccountId(pm.stripe.connectAccountId ?? '');
        setStripeChargesEnabled(pm.stripe.chargesEnabled ?? false);
      }

      // Bizum
      if (pm.bizum) {
        setBizumEnabled(pm.bizum.enabled ?? false);
      }

      // Bank Transfer
      if (pm.bankTransfer) {
        setBankEnabled(pm.bankTransfer.enabled ?? false);
        setBankIBAN(pm.bankTransfer.iban ?? '');
        setBankHolder(pm.bankTransfer.accountHolder ?? '');
        setBankValidated(!!pm.bankTransfer.lastValidated);
      }

      // PayPal
      if (pm.paypal) {
        setPaypalEnabled(pm.paypal.enabled ?? false);
        setPaypalEmail(pm.paypal.email ?? '');
        setPaypalValidated(!!pm.paypal.lastValidated);
      }

      // Cash
      if (pm.cash !== undefined) {
        setCashEnabled(pm.cash.enabled ?? true);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    } finally {
      setLoading(false);
    }
  }, [activeBarbershopId]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  // ── Stripe Connect: abrir onboarding de Stripe ─────────────────────────
  const handleConnectStripe = async () => {
    if (!activeBarbershopId) return;
    setConnectingStripe(true);
    setStripeError('');
    try {
      const functions = getFunctions(undefined, 'europe-west1');
      const createLinkFn = httpsCallable(functions, 'createConnectAccountLink');
      const result: any = await createLinkFn({ barbershopId: activeBarbershopId });
      const url = result?.data?.url;
      const accountId = result?.data?.accountId;
      if (!url) throw new Error('No se pudo generar el enlace de Stripe.');
      if (accountId) setStripeConnectAccountId(accountId);

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error('No se pudo abrir el navegador.');
      await Linking.openURL(url);

      Alert.alert(
        'Completa el registro en Stripe',
        'Se ha abierto el navegador. Cuando termines de rellenar tus datos en Stripe, vuelve aquí y pulsa "Comprobar estado".',
      );
    } catch (err: any) {
      const errorMessage = err.message || 'Error conectando con Stripe';
      setStripeError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setConnectingStripe(false);
    }
  };

  // ── Stripe Connect: comprobar si ya se puede cobrar ────────────────────
  const handleCheckStripeStatus = async () => {
    if (!activeBarbershopId) return;
    setCheckingStripeStatus(true);
    setStripeError('');
    try {
      const functions = getFunctions(undefined, 'europe-west1');
      const checkFn = httpsCallable(functions, 'checkStripeConnectStatus');
      const result: any = await checkFn({ barbershopId: activeBarbershopId });
      const chargesEnabled = !!result?.data?.chargesEnabled;
      setStripeChargesEnabled(chargesEnabled);
      if (chargesEnabled) {
        Alert.alert('✓', 'Stripe conectado. Ya puedes cobrar con tarjeta y Bizum.');
      } else {
        Alert.alert(
          'Todavía no',
          'Stripe aún no ha terminado de verificar tu cuenta. Completa el registro y vuelve a comprobar en unos minutos.',
        );
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error comprobando el estado de Stripe';
      setStripeError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setCheckingStripeStatus(false);
    }
  };

  // ── IBAN validation ────────────────────────────────────────────────────
  const validateIBAN = (iban: string): boolean => {
    // Validación básica de IBAN español (ES)
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();

    // Debe empezar con ES y tener 24 caracteres
    if (!/^ES\d{22}$/.test(cleanIBAN)) {
      return false;
    }

    // Validar módulo 97 (ISO 13616)
    const rearranged = cleanIBAN.slice(4) + cleanIBAN.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());

    let remainder = 0;
    for (const digit of numeric) {
      remainder = (remainder * 10 + parseInt(digit)) % 97;
    }

    return remainder === 1;
  };

  const handleValidateIBAN = async () => {
    if (!bankIBAN.trim()) {
      setBankError('Introduce tu IBAN');
      return;
    }

    setValidatingIBAN(true);
    setBankError('');

    try {
      if (!validateIBAN(bankIBAN)) {
        throw new Error('IBAN no válido. Verifica el formato.');
      }

      if (!bankHolder.trim()) {
        throw new Error('Introduce el titular de la cuenta');
      }

      setBankValidated(true);
      setBankError('');
      Alert.alert('✓', 'IBAN validado correctamente');
    } catch (err: any) {
      setBankError(err.message);
      setBankValidated(false);
      Alert.alert('Error', err.message);
    } finally {
      setValidatingIBAN(false);
    }
  };

  // ── PayPal validation ──────────────────────────────────────────────────
  const handleValidatePayPal = async () => {
    if (!paypalEmail.trim()) {
      setPaypalError('Introduce tu email de PayPal');
      return;
    }

    setValidatingPayPal(true);
    setPaypalError('');

    try {
      // Validar formato email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(paypalEmail)) {
        throw new Error('Email no válido');
      }

      // Call Cloud Function to validate PayPal email
      // Misma región que el resto del backend; sin el segundo argumento el
      // SDK apunta a us-central1.
      const functions = getFunctions(undefined, 'europe-west1');
      const validatePayPalEmailFn = httpsCallable(functions, 'validatePayPalEmail');

      const result: any = await validatePayPalEmailFn({
        barbershopId: activeBarbershopId,
        email: paypalEmail.trim(),
      });

      if (result.data.valid) {
        setPaypalValidated(true);
        setPaypalError('');
        Alert.alert('✓', 'PayPal verificado correctamente');
      } else {
        throw new Error(result.data.error || 'PayPal email inválido');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error validando PayPal';
      setPaypalError(errorMessage);
      setPaypalValidated(false);
      Alert.alert('Error', errorMessage);
    } finally {
      setValidatingPayPal(false);
    }
  };

  // ── Save all payment methods ───────────────────────────────────────────
  const handleSavePaymentMethods = async () => {
    if (!activeBarbershopId) return;

    // Validar que al menos un método está habilitado
    if (!stripeEnabled && !bankEnabled && !paypalEnabled && !cashEnabled) {
      Alert.alert('Error', 'Habilita al menos un método de pago');
      return;
    }

    // Si Stripe está habilitado, la cuenta Connect debe estar operativa
    if (stripeEnabled && !stripeChargesEnabled) {
      Alert.alert('Error', 'Completa la conexión con Stripe antes de guardar (pulsa "Comprobar estado")');
      return;
    }

    // Si Bank Transfer está habilitado, debe estar validado
    if (bankEnabled && !bankValidated) {
      Alert.alert('Error', 'Valida tu IBAN antes de guardar');
      return;
    }

    // Si PayPal está habilitado, debe estar validado
    if (paypalEnabled && !paypalValidated) {
      Alert.alert('Error', 'Valida tu PayPal antes de guardar');
      return;
    }

    setSaving(true);

    try {
      const paymentMethods: PaymentMethods = {
        stripe: stripeEnabled
          ? {
              enabled: true,
              connectAccountId: stripeConnectAccountId,
              chargesEnabled: stripeChargesEnabled,
            }
          : { enabled: false, connectAccountId: stripeConnectAccountId },
        bizum: {
          enabled: bizumEnabled && stripeEnabled, // Bizum automático si Stripe está activo
        },
        bankTransfer: bankEnabled
          ? {
              enabled: true,
              iban: bankIBAN.replace(/\s/g, '').toUpperCase(),
              accountHolder: bankHolder,
              lastValidated: new Date(),
            }
          : { enabled: false },
        paypal: paypalEnabled
          ? {
              enabled: true,
              email: paypalEmail,
              lastValidated: new Date(),
            }
          : { enabled: false },
        cash: {
          enabled: cashEnabled,
        },
      };

      await updateDoc(doc(db, 'barbershops', activeBarbershopId), {
        paymentMethods,
      });

      Alert.alert('✓', 'Métodos de pago guardados correctamente');
      navigation.goBack();
    } catch (err: any) {
      console.error('Error saving payment methods:', err);
      Alert.alert('Error', err.message || 'No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* ── Stripe ─────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💳 Tarjeta & Bizum</Text>
              <Switch
                value={stripeEnabled}
                onValueChange={setStripeEnabled}
                trackColor={{ false: BORDER, true: GOLD + '40' }}
                thumbColor={stripeEnabled ? GOLD : MUTED}
              />
            </View>

            {stripeEnabled && (
              <View style={styles.sectionContent}>
                {stripeChargesEnabled ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>
                      ✓ Cuenta de Stripe conectada — ya puedes cobrar
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.infoText}>
                    {stripeConnectAccountId
                      ? 'Registro iniciado. Completa tus datos en Stripe y comprueba el estado.'
                      : 'Conecta tu propia cuenta de Stripe. El dinero de tus ventas entrará directamente en tu cuenta, no en la de BarberFlow.'}
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.validateBtn, connectingStripe && styles.btnDisabled]}
                  onPress={handleConnectStripe}
                  disabled={connectingStripe}
                >
                  {connectingStripe ? (
                    <ActivityIndicator color={TEXT_C} size="small" />
                  ) : (
                    <Text style={styles.validateBtnText}>
                      {stripeConnectAccountId ? 'Continuar registro en Stripe' : 'Conectar con Stripe'}
                    </Text>
                  )}
                </TouchableOpacity>

                {!!stripeConnectAccountId && !stripeChargesEnabled && (
                  <TouchableOpacity
                    style={[styles.validateBtn, styles.secondaryBtn, checkingStripeStatus && styles.btnDisabled]}
                    onPress={handleCheckStripeStatus}
                    disabled={checkingStripeStatus}
                  >
                    {checkingStripeStatus ? (
                      <ActivityIndicator color={GOLD} size="small" />
                    ) : (
                      <Text style={[styles.validateBtnText, { color: GOLD }]}>Comprobar estado</Text>
                    )}
                  </TouchableOpacity>
                )}

                {stripeError && <Text style={styles.errorText}>{stripeError}</Text>}
              </View>
            )}

            {!stripeEnabled && (
              <Text style={styles.disabledText}>
                Habilita pagos con tarjeta y Bizum
              </Text>
            )}
          </View>

          {/* ── Bizum (automático) ─────────────────────────────────────── */}
          {stripeEnabled && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📱 Bizum</Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.infoText}>
                  ✓ Disponible automáticamente si tienes Stripe activo
                </Text>
                <Text style={styles.helpText}>
                  Bizum se habilitará automáticamente para tus clientes cuando paguen con tarjeta.
                </Text>
              </View>
            </View>
          )}

          {/* ── Bank Transfer ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🏦 Transferencia Bancaria</Text>
              <Switch
                value={bankEnabled}
                onValueChange={setBankEnabled}
                trackColor={{ false: BORDER, true: GOLD + '40' }}
                thumbColor={bankEnabled ? GOLD : MUTED}
              />
            </View>

            {bankEnabled && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>IBAN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ES9121000418450200051332"
                  placeholderTextColor={MUTED}
                  value={bankIBAN}
                  onChangeText={(t) => setBankIBAN(t.toUpperCase())}
                  autoCapitalize="characters"
                  editable={!validatingIBAN}
                />

                <Text style={styles.label}>Titular de la cuenta</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Juan García Rodríguez"
                  placeholderTextColor={MUTED}
                  value={bankHolder}
                  onChangeText={setBankHolder}
                  autoCapitalize="words"
                  editable={!validatingIBAN}
                />

                <TouchableOpacity
                  style={[styles.validateBtn, validatingIBAN && styles.btnDisabled]}
                  onPress={handleValidateIBAN}
                  disabled={validatingIBAN}
                >
                  {validatingIBAN ? (
                    <ActivityIndicator color={TEXT_C} size="small" />
                  ) : (
                    <Text style={styles.validateBtnText}>Validar IBAN</Text>
                  )}
                </TouchableOpacity>

                {bankError && <Text style={styles.errorText}>{bankError}</Text>}
                {bankValidated && (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>✓ IBAN válido</Text>
                  </View>
                )}

                <Text style={styles.helpText}>
                  Los clientes verán estos datos al terminar para hacer transferencia.
                </Text>
              </View>
            )}

            {!bankEnabled && (
              <Text style={styles.disabledText}>
                Habilita para que clientes paguen por transferencia
              </Text>
            )}
          </View>

          {/* ── PayPal ────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💰 PayPal</Text>
              <Switch
                value={paypalEnabled}
                onValueChange={setPaypalEnabled}
                trackColor={{ false: BORDER, true: GOLD + '40' }}
                thumbColor={paypalEnabled ? GOLD : MUTED}
              />
            </View>

            {paypalEnabled && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Email de PayPal</Text>
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  placeholderTextColor={MUTED}
                  value={paypalEmail}
                  onChangeText={setPaypalEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!validatingPayPal}
                />

                <TouchableOpacity
                  style={[styles.validateBtn, validatingPayPal && styles.btnDisabled]}
                  onPress={handleValidatePayPal}
                  disabled={validatingPayPal}
                >
                  {validatingPayPal ? (
                    <ActivityIndicator color={TEXT_C} size="small" />
                  ) : (
                    <Text style={styles.validateBtnText}>Validar</Text>
                  )}
                </TouchableOpacity>

                {paypalError && <Text style={styles.errorText}>{paypalError}</Text>}
                {paypalValidated && (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>✓ Cuenta verificada</Text>
                  </View>
                )}

                <Text style={styles.helpText}>
                  Al pagar, el cliente será redirigido a PayPal. Recibirás el dinero en tu cuenta.
                </Text>
              </View>
            )}

            {!paypalEnabled && (
              <Text style={styles.disabledText}>
                Habilita para pagos por PayPal
              </Text>
            )}
          </View>

          {/* ── Cash ───────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💵 Efectivo en el local</Text>
              <Switch
                value={cashEnabled}
                onValueChange={setCashEnabled}
                trackColor={{ false: BORDER, true: GOLD + '40' }}
                thumbColor={cashEnabled ? GOLD : MUTED}
              />
            </View>

            <View style={styles.sectionContent}>
              <Text style={styles.infoText}>
                Los clientes marcarán "Pagaré al llegar" (no requiere configuración)
              </Text>
            </View>
          </View>

          {/* ── Action buttons ────────────────────────────────────────── */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => navigation.goBack()}
              disabled={saving}
            >
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, saving && styles.btnDisabled]}
              onPress={handleSavePaymentMethods}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={TEXT_C} size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 20,
  },

  section: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_C,
    flex: 1,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_C,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_C,
  },

  validateBtn: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: GOLD,
    marginTop: 8,
  },

  errorText: {
    fontSize: 12,
    color: ERROR,
    marginTop: 4,
  },
  successBox: {
    backgroundColor: SUCCESS + '20',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: SUCCESS,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    color: SUCCESS,
  },

  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_C,
  },
  helpText: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 18,
    marginTop: 4,
  },
  disabledText: {
    fontSize: 13,
    color: MUTED,
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  btn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: GOLD,
  },
  btnPrimaryText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: BORDER,
  },
  btnSecondaryText: {
    color: TEXT_C,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.55,
  },
});
