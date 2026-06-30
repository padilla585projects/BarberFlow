import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import {
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';

/* ── Design tokens ────────────────────────────────────────────────────────── */

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const RED     = '#EF4444';
const GREEN   = '#10B981';

/* ── Types ────────────────────────────────────────────────────────────────── */

interface Promo {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses: number;
  currentUses: number;
  expiryDate: Date;
  active: boolean;
  createdAt: Date;
}

interface PromoFormData {
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  maxUses: string;
  expiryDate: Date;
  active: boolean;
}

const INITIAL_FORM: PromoFormData = {
  code: '',
  type: 'percentage',
  value: '',
  maxUses: '0',
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  active: true,
};

/* ── Component ────────────────────────────────────────────────────────────── */

export function PromosScreen() {
  const { activeBarbershopId } = useAuthContext();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [form, setForm] = useState<PromoFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  /* ── Data fetching ──────────────────────────────────────────────────── */

  useEffect(() => {
    fetchPromos();
  }, [activeBarbershopId]);

  const fetchPromos = async () => {
    if (!activeBarbershopId) return;

    try {
      setLoading(true);

      const snap = await getDocs(
        query(
          collection(db, 'barbershops', activeBarbershopId, 'promos'),
          orderBy('createdAt', 'desc'),
        ),
      );

      const list: Promo[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          code: data.code ?? '',
          type: data.type ?? 'percentage',
          value: data.value ?? 0,
          maxUses: data.maxUses ?? 0,
          currentUses: data.currentUses ?? 0,
          expiryDate: data.expiryDate?.toDate?.() ?? new Date(),
          active: data.active ?? false,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
        };
      });

      setPromos(list);
    } catch (err) {
      console.error('[PromosScreen] Error fetching promos:', err);
      Alert.alert('Error', 'No se pudieron cargar las promociones.');
    } finally {
      setLoading(false);
    }
  };

  /* ── CRUD ────────────────────────────────────────────────────────────── */

  const openCreateModal = () => {
    setEditingPromo(null);
    setForm(INITIAL_FORM);
    setModalVisible(true);
  };

  const openEditModal = (promo: Promo) => {
    setEditingPromo(promo);
    setForm({
      code: promo.code,
      type: promo.type,
      value: String(promo.value),
      maxUses: String(promo.maxUses),
      expiryDate: promo.expiryDate,
      active: promo.active,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) {
      Alert.alert('Error', 'Introduce un codigo promocional.');
      return;
    }
    const value = parseFloat(form.value);
    if (isNaN(value) || value <= 0) {
      Alert.alert('Error', 'Introduce un valor de descuento valido.');
      return;
    }
    if (form.type === 'percentage' && value > 100) {
      Alert.alert('Error', 'El porcentaje no puede ser mayor a 100%.');
      return;
    }
    const maxUses = parseInt(form.maxUses, 10);
    if (isNaN(maxUses) || maxUses < 0) {
      Alert.alert('Error', 'Usos maximos debe ser 0 (ilimitado) o un numero positivo.');
      return;
    }

    setSaving(true);
    try {
      const promoData = {
        code,
        type: form.type,
        value,
        maxUses,
        expiryDate: form.expiryDate,
        active: form.active,
      };

      if (editingPromo) {
        // Update existing
        await updateDoc(
          doc(db, 'barbershops', activeBarbershopId!, 'promos', editingPromo.id),
          promoData,
        );
      } else {
        // Create new
        await addDoc(collection(db, 'barbershops', activeBarbershopId!, 'promos'), {
          ...promoData,
          currentUses: 0,
          createdAt: serverTimestamp(),
        });
      }

      setModalVisible(false);
      fetchPromos();
    } catch (err) {
      console.error('[PromosScreen] Error saving promo:', err);
      Alert.alert('Error', 'No se pudo guardar la promocion.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (promo: Promo) => {
    Alert.alert(
      'Eliminar promocion',
      `Seguro que quieres eliminar "${promo.code}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, 'barbershops', activeBarbershopId!, 'promos', promo.id),
              );
              fetchPromos();
            } catch (err) {
              console.error('[PromosScreen] Error deleting promo:', err);
              Alert.alert('Error', 'No se pudo eliminar la promocion.');
            }
          },
        },
      ],
    );
  };

  const toggleActive = async (promo: Promo) => {
    try {
      await updateDoc(
        doc(db, 'barbershops', activeBarbershopId!, 'promos', promo.id),
        { active: !promo.active },
      );
      setPromos((prev) =>
        prev.map((p) =>
          p.id === promo.id ? { ...p, active: !p.active } : p,
        ),
      );
    } catch (err) {
      console.error('[PromosScreen] Error toggling promo:', err);
    }
  };

  /* ── Date helpers ───────────────────────────────────────────────────── */

  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const isExpired = (d: Date) => d < new Date();

  /** Simple date adjuster buttons instead of a native date picker */
  const adjustExpiryDays = (days: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    setForm((prev) => ({ ...prev, expiryDate: newDate }));
  };

  /* ── Render helpers ─────────────────────────────────────────────────── */

  const renderPromoCard = ({ item }: { item: Promo }) => {
    const expired = isExpired(item.expiryDate);
    const usesLabel =
      item.maxUses === 0
        ? `${item.currentUses} usos`
        : `${item.currentUses}/${item.maxUses} usos`;
    const discountLabel =
      item.type === 'percentage'
        ? `${item.value}%`
        : `${item.value.toFixed(2)} EUR`;

    return (
      <TouchableOpacity
        style={[styles.promoCard, (!item.active || expired) && styles.promoCardInactive]}
        onPress={() => openEditModal(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.8}
      >
        <View style={styles.promoHeader}>
          <View style={styles.codeContainer}>
            <Text style={styles.promoCode}>{item.code}</Text>
            {expired && (
              <View style={[styles.badge, styles.badgeExpired]}>
                <Text style={styles.badgeText}>Expirado</Text>
              </View>
            )}
            {!item.active && !expired && (
              <View style={[styles.badge, styles.badgeInactive]}>
                <Text style={styles.badgeText}>Inactivo</Text>
              </View>
            )}
            {item.active && !expired && (
              <View style={[styles.badge, styles.badgeActive]}>
                <Text style={styles.badgeText}>Activo</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteBtnText}>X</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.promoDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Descuento</Text>
            <Text style={styles.detailValue}>{discountLabel}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Usos</Text>
            <Text style={styles.detailValue}>{usesLabel}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expira</Text>
            <Text style={[styles.detailValue, expired && { color: RED }]}>
              {formatDate(item.expiryDate)}
            </Text>
          </View>
        </View>

        <View style={styles.promoFooter}>
          <Text style={styles.toggleLabel}>
            {item.active ? 'Activo' : 'Inactivo'}
          </Text>
          <Switch
            value={item.active}
            onValueChange={() => toggleActive(item)}
            trackColor={{ false: BORDER, true: GOLD + '60' }}
            thumbColor={item.active ? GOLD : MUTED}
          />
        </View>
      </TouchableOpacity>
    );
  };

  /* ── Main render ────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={promos}
        keyExtractor={(item) => item.id}
        renderItem={renderPromoCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🏷️</Text>
            <Text style={styles.emptyTitle}>Sin promociones</Text>
            <Text style={styles.emptyText}>
              Crea codigos promocionales para ofrecer descuentos a tus clientes.
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingPromo ? 'Editar promocion' : 'Nueva promocion'}
              </Text>

              {/* Code */}
              <Text style={styles.fieldLabel}>Codigo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: BARBER20"
                placeholderTextColor={MUTED}
                value={form.code}
                onChangeText={(t) =>
                  setForm((prev) => ({ ...prev, code: t.toUpperCase() }))
                }
                autoCapitalize="characters"
              />

              {/* Discount type */}
              <Text style={styles.fieldLabel}>Tipo de descuento</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    form.type === 'percentage' && styles.typeChipActive,
                  ]}
                  onPress={() => setForm((prev) => ({ ...prev, type: 'percentage' }))}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      form.type === 'percentage' && styles.typeChipTextActive,
                    ]}
                  >
                    Porcentaje %
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    form.type === 'fixed' && styles.typeChipActive,
                  ]}
                  onPress={() => setForm((prev) => ({ ...prev, type: 'fixed' }))}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      form.type === 'fixed' && styles.typeChipTextActive,
                    ]}
                  >
                    Cantidad fija EUR
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Value */}
              <Text style={styles.fieldLabel}>
                {form.type === 'percentage' ? 'Porcentaje (%)' : 'Cantidad (EUR)'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={form.type === 'percentage' ? 'Ej: 20' : 'Ej: 5.00'}
                placeholderTextColor={MUTED}
                value={form.value}
                onChangeText={(t) => setForm((prev) => ({ ...prev, value: t }))}
                keyboardType="decimal-pad"
              />

              {/* Max uses */}
              <Text style={styles.fieldLabel}>Usos maximos (0 = ilimitado)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={MUTED}
                value={form.maxUses}
                onChangeText={(t) => setForm((prev) => ({ ...prev, maxUses: t }))}
                keyboardType="number-pad"
              />

              {/* Expiry date */}
              <Text style={styles.fieldLabel}>Fecha de expiracion</Text>
              <View style={styles.dateDisplay}>
                <Text style={styles.dateText}>{formatDate(form.expiryDate)}</Text>
              </View>
              <View style={styles.dateButtons}>
                <TouchableOpacity
                  style={styles.dateBtn}
                  onPress={() => adjustExpiryDays(7)}
                >
                  <Text style={styles.dateBtnText}>7 dias</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateBtn}
                  onPress={() => adjustExpiryDays(15)}
                >
                  <Text style={styles.dateBtnText}>15 dias</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateBtn}
                  onPress={() => adjustExpiryDays(30)}
                >
                  <Text style={styles.dateBtnText}>30 dias</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateBtn}
                  onPress={() => adjustExpiryDays(90)}
                >
                  <Text style={styles.dateBtnText}>90 dias</Text>
                </TouchableOpacity>
              </View>

              {/* Active toggle */}
              <View style={styles.activeRow}>
                <Text style={styles.fieldLabel}>Activo</Text>
                <Switch
                  value={form.active}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, active: v }))}
                  trackColor={{ false: BORDER, true: GOLD + '60' }}
                  thumbColor={form.active ? GOLD : MUTED}
                />
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editingPromo ? 'Guardar' : 'Crear'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { padding: 16, paddingBottom: 100, gap: 12 },

  /* Promo card */
  promoCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  promoCardInactive: { opacity: 0.55 },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promoCode: {
    fontSize: 18,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeActive: { backgroundColor: GREEN + '20' },
  badgeInactive: { backgroundColor: MUTED + '20' },
  badgeExpired: { backgroundColor: RED + '20' },
  badgeText: { fontSize: 10, fontWeight: '700', color: TEXT },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#331111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: { color: RED, fontSize: 12, fontWeight: '800' },

  promoDetails: { gap: 6 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: { fontSize: 13, color: MUTED, fontWeight: '600' },
  detailValue: { fontSize: 14, color: TEXT, fontWeight: '700' },

  promoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
  },
  toggleLabel: { fontSize: 13, color: MUTED, fontWeight: '600' },

  /* Empty */
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptyText: { fontSize: 14, color: MUTED, textAlign: 'center', maxWidth: 260 },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabText: { fontSize: 28, fontWeight: '700', color: '#000', marginTop: -2 },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT,
    fontWeight: '600',
  },

  /* Type chips */
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: BG,
    alignItems: 'center',
  },
  typeChipActive: { borderColor: GOLD, backgroundColor: GOLD },
  typeChipText: { fontSize: 14, fontWeight: '700', color: MUTED },
  typeChipTextActive: { color: '#000' },

  /* Date */
  dateDisplay: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dateText: { fontSize: 16, fontWeight: '700', color: TEXT },
  dateButtons: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dateBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
    alignItems: 'center',
  },
  dateBtnText: { fontSize: 12, fontWeight: '700', color: GOLD },

  /* Active row */
  activeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },

  /* Modal actions */
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: MUTED },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
});
