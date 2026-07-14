import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useBarberTheme } from '../../theme/barberTheme';

export function BarberCommissionSettingsScreen() {
  const theme = useBarberTheme();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para comisión
  const [commissionEnabled, setCommissionEnabled] = useState(false);
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [commissionValue, setCommissionValue] = useState('0');

  // Cargar configuración actual
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCommissionEnabled(data.commissionEnabled ?? false);
          setCommissionType(data.commissionType ?? 'percentage');
          setCommissionValue(String(data.commissionRate ?? 0));
        }
      } catch (error) {
        console.error('Error loading commission settings:', error);
        Alert.alert('Error', 'No se pudo cargar la configuración');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.uid]);

  // Guardar configuración
  const handleSave = async () => {
    if (!user?.uid) return;

    const rate = parseFloat(commissionValue) || 0;

    // Validaciones
    if (commissionEnabled && rate <= 0) {
      Alert.alert('Error', 'La comisión debe ser mayor a 0');
      return;
    }

    if (commissionEnabled && commissionType === 'percentage' && rate > 100) {
      Alert.alert('Error', 'El porcentaje no puede ser mayor a 100%');
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        commissionEnabled,
        commissionType,
        commissionRate: rate,
      });

      Alert.alert('Éxito', 'Configuración de comisión guardada correctamente');
    } catch (error) {
      console.error('Error saving commission settings:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <View style={[styles.header, { paddingHorizontal: theme.spacing.lg }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>⚙️ Configurar Comisión</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Define cómo se calcula tu comisión en cada cita
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.bgSecondary, marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }]}>
        {/* Toggle Comisión Habilitada */}
        <View style={[styles.settingRow, { borderBottomColor: theme.colors.textTertiary }]}>
          <View style={styles.settingLabel}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Habilitar comisión</Text>
            <Text style={[styles.settingDesc, { color: theme.colors.textTertiary }]}>
              {commissionEnabled ? 'Comisión activa' : 'Comisión desactivada'}
            </Text>
          </View>
          <Switch
            value={commissionEnabled}
            onValueChange={setCommissionEnabled}
            thumbColor={commissionEnabled ? theme.colors.success : theme.colors.textTertiary}
            trackColor={{
              false: theme.colors.textTertiary,
              true: theme.colors.success + '40',
            }}
          />
        </View>

        {commissionEnabled && (
          <>
            {/* Tipo de Comisión */}
            <View style={[styles.settingRow, { borderBottomColor: theme.colors.textTertiary, marginTop: theme.spacing.md }]}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Tipo de comisión</Text>
            </View>

            <View style={[styles.typeSelector, { marginTop: theme.spacing.md }]}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  {
                    backgroundColor:
                      commissionType === 'percentage'
                        ? theme.colors.primary
                        : theme.colors.bgPrimary,
                    borderColor:
                      commissionType === 'percentage'
                        ? theme.colors.primary
                        : theme.colors.textTertiary,
                  },
                ]}
                onPress={() => setCommissionType('percentage')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    {
                      color:
                        commissionType === 'percentage'
                          ? theme.colors.dark
                          : theme.colors.text,
                      fontWeight:
                        commissionType === 'percentage' ? '700' : '600',
                    },
                  ]}
                >
                  📊 Porcentaje (%)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  {
                    backgroundColor:
                      commissionType === 'fixed'
                        ? theme.colors.primary
                        : theme.colors.bgPrimary,
                    borderColor:
                      commissionType === 'fixed'
                        ? theme.colors.primary
                        : theme.colors.textTertiary,
                  },
                ]}
                onPress={() => setCommissionType('fixed')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    {
                      color:
                        commissionType === 'fixed'
                          ? theme.colors.dark
                          : theme.colors.text,
                      fontWeight:
                        commissionType === 'fixed' ? '700' : '600',
                    },
                  ]}
                >
                  💶 Cantidad fija (€)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Comisión */}
            <View style={[styles.inputSection, { marginTop: theme.spacing.lg }]}>
              <Text style={[styles.settingTitle, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>
                Valor de comisión
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    borderColor: theme.colors.textTertiary,
                    backgroundColor: theme.colors.bgPrimary,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder={
                    commissionType === 'percentage'
                      ? 'Ej: 20'
                      : 'Ej: 15.50'
                  }
                  placeholderTextColor={theme.colors.textTertiary}
                  value={commissionValue}
                  onChangeText={setCommissionValue}
                  keyboardType="decimal-pad"
                />
                <Text
                  style={[
                    styles.inputSuffix,
                    { color: theme.colors.primary },
                  ]}
                >
                  {commissionType === 'percentage' ? '%' : '€'}
                </Text>
              </View>

              {/* Información */}
              <View style={[styles.infoBox, { backgroundColor: theme.colors.bgPrimary, marginTop: theme.spacing.md }]}>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  💡 {commissionType === 'percentage'
                    ? `Si ganas 100€ en una cita, tu comisión será ${parseFloat(commissionValue) || 0}€`
                    : `Por cada cita completada, ganarás una comisión fija de ${commissionValue || '0'}€`}
                </Text>
              </View>
            </View>
          </>
        )}

        {!commissionEnabled && (
          <View style={[styles.infoBox, { backgroundColor: theme.colors.bgPrimary, marginTop: theme.spacing.lg }]}>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              ℹ️ Cuando desactivas la comisión, no se calcula descuento en tus ganancias.
            </Text>
          </View>
        )}
      </View>

      {/* Botón Guardar */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          {
            backgroundColor: theme.colors.primary,
            marginHorizontal: theme.spacing.lg,
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.xxl,
          },
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={theme.colors.dark} />
        ) : (
          <Text
            style={[
              styles.saveButtonText,
              { color: theme.colors.dark, fontWeight: '700' },
            ]}
          >
            💾 Guardar cambios
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 0 },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLabel: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  settingDesc: { fontSize: 12 },
  typeSelector: { flexDirection: 'row', gap: 12 },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeButtonText: { fontSize: 13, textAlign: 'center' },
  inputSection: {},
  inputWrapper: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    height: 48,
  },
  input: { flex: 1, fontSize: 16, fontWeight: '600' },
  inputSuffix: { fontSize: 16, fontWeight: '700', marginLeft: 4 },
  infoBox: {
    borderRadius: 12,
    padding: 12,
  },
  infoText: { fontSize: 13, lineHeight: 18 },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  saveButtonText: { fontSize: 14 },
});
