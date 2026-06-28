import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import type { LoyaltyReward } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const DEFAULT_REWARDS: LoyaltyReward[] = [
  { pointsCost: 50,  discountValue: 5,  description: '5€ descuento' },
  { pointsCost: 100, discountValue: 10, description: '10€ descuento' },
  { pointsCost: 200, discountValue: 25, description: '25€ descuento' },
  { pointsCost: 500, discountValue: 30, description: 'Servicio gratis (hasta 30€)' },
];

export function LoyaltySettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [pointsPerEuro, setPointsPerEuro] = useState('1');
  const [rewards, setRewards] = useState<LoyaltyReward[]>(DEFAULT_REWARDS);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  // For adding new reward
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCost, setNewCost] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const shopId = userDoc.data()?.barbershopId;
      if (!shopId) return;
      setBarbershopId(shopId);

      const shopDoc = await getDoc(doc(db, 'barbershops', shopId));
      const config = shopDoc.data()?.loyaltyConfig;
      if (config) {
        setEnabled(config.enabled ?? false);
        setPointsPerEuro(String(config.pointsPerEuro ?? 1));
        if (config.rewards?.length > 0) {
          setRewards(config.rewards);
        }
      }
    } catch (err) {
      console.error('[LoyaltySettings] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!barbershopId) return;
    const rate = parseFloat(pointsPerEuro);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Error', 'La tasa de puntos debe ser un número positivo');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'barbershops', barbershopId), {
        loyaltyConfig: {
          enabled,
          pointsPerEuro: rate,
          rewards,
        },
      });
      Alert.alert('Guardado', 'Configuración de fidelidad actualizada');
    } catch (err) {
      console.error('[LoyaltySettings] Save error:', err);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const addReward = () => {
    const cost = parseInt(newCost, 10);
    const discount = parseFloat(newDiscount);
    if (isNaN(cost) || cost <= 0 || isNaN(discount) || discount <= 0 || !newDesc.trim()) {
      Alert.alert('Error', 'Rellena todos los campos correctamente');
      return;
    }
    setRewards((prev) =>
      [...prev, { pointsCost: cost, discountValue: discount, description: newDesc.trim() }].sort(
        (a, b) => a.pointsCost - b.pointsCost,
      ),
    );
    setNewCost('');
    setNewDiscount('');
    setNewDesc('');
    setShowAddForm(false);
  };

  const removeReward = (index: number) => {
    Alert.alert('Eliminar recompensa', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => setRewards((prev) => prev.filter((_, i) => i !== index)),
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Enable toggle */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Programa de fidelidad</Text>
            <Text style={styles.toggleSub}>
              Los clientes acumulan puntos al pagar
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: BORDER, true: GOLD + '60' }}
            thumbColor={enabled ? GOLD : MUTED}
          />
        </View>
      </View>

      {/* Points rate */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tasa de puntos</Text>
        <View style={styles.rateRow}>
          <TextInput
            style={styles.rateInput}
            value={pointsPerEuro}
            onChangeText={setPointsPerEuro}
            keyboardType="numeric"
            placeholderTextColor={MUTED}
          />
          <Text style={styles.rateLabel}>punto(s) por cada 1€</Text>
        </View>
      </View>

      {/* Rewards list */}
      <View style={styles.card}>
        <View style={styles.rewardsHeader}>
          <Text style={styles.cardTitle}>Recompensas</Text>
          <TouchableOpacity
            onPress={() => setShowAddForm(!showAddForm)}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtn}>{showAddForm ? 'Cancelar' : '+ Añadir'}</Text>
          </TouchableOpacity>
        </View>

        {showAddForm && (
          <View style={styles.addForm}>
            <TextInput
              style={styles.input}
              placeholder="Coste en puntos"
              placeholderTextColor={MUTED}
              value={newCost}
              onChangeText={setNewCost}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Descuento en €"
              placeholderTextColor={MUTED}
              value={newDiscount}
              onChangeText={setNewDiscount}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Descripción"
              placeholderTextColor={MUTED}
              value={newDesc}
              onChangeText={setNewDesc}
            />
            <TouchableOpacity
              style={styles.addConfirmBtn}
              onPress={addReward}
              activeOpacity={0.8}
            >
              <Text style={styles.addConfirmText}>Añadir recompensa</Text>
            </TouchableOpacity>
          </View>
        )}

        {rewards.map((reward, idx) => (
          <View key={idx} style={styles.rewardItem}>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardCost}>{reward.pointsCost} pts</Text>
              <Text style={styles.rewardDesc}>
                {reward.description} ({reward.discountValue}€)
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeReward(idx)} activeOpacity={0.8}>
              <Text style={styles.removeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator size="small" color={BG} />
        ) : (
          <Text style={styles.saveBtnText}>Guardar configuración</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  content: { padding: 16, paddingBottom: 40, gap: 16 },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: TEXT },
  toggleSub: { fontSize: 12, color: MUTED, marginTop: 2 },

  // Rate
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rateInput: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: TEXT,
    fontSize: 16,
    fontWeight: '700',
    width: 70,
    textAlign: 'center',
  },
  rateLabel: { fontSize: 14, color: MUTED },

  // Rewards header
  rewardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addBtn: { fontSize: 14, fontWeight: '700', color: GOLD },

  // Add form
  addForm: {
    backgroundColor: BG,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  input: {
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: TEXT,
    fontSize: 14,
  },
  addConfirmBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addConfirmText: { fontSize: 14, fontWeight: '700', color: BG },

  // Reward item
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  rewardInfo: { flex: 1, gap: 2 },
  rewardCost: { fontSize: 14, fontWeight: '800', color: GOLD },
  rewardDesc: { fontSize: 12, color: MUTED },
  removeBtn: { fontSize: 16, color: '#EF4444', padding: 8 },

  // Save
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: BG },
});
