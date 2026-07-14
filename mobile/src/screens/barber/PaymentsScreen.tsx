import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { Appointment, PaymentMethod, PaymentStatus } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const PAYMENT_METHOD_ICON: Record<PaymentMethod, string> = {
  cash: '💵',
  bizum: '📱',
  paypal: '🅿️',
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  bizum: 'Bizum',
  paypal: 'PayPal',
};

type Section = {
  key: 'toConfirm' | 'unpaid' | 'paid';
  title: string;
  data: Appointment[];
  collapsible: boolean;
};

export function PaymentsScreen() {
  const { activeBarbershopId } = useAuthContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paidExpanded, setPaidExpanded] = useState(false);

  const fetchAppointments = async () => {
    const user = auth.currentUser;
    if (!user || !activeBarbershopId) return;

    try {
      const q = query(
        collection(db, 'appointments'),
        where('barberId', '==', user.uid),
        where('barbershopId', '==', activeBarbershopId),
        orderBy('date', 'desc'),
      );
      const snap = await getDocs(q);
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)));
    } catch (err) {
      console.error('[PaymentsScreen] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [activeBarbershopId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const updatePaymentStatus = async (id: string, paymentStatus: PaymentStatus) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { paymentStatus });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, paymentStatus } : a)),
      );
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el estado de pago');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  const toConfirm = appointments.filter((a) => a.paymentStatus === 'client_confirmed');
  const unpaid = appointments.filter((a) => (a.paymentStatus ?? 'pending') === 'pending');
  const paid = appointments.filter(
    (a) => a.paymentStatus === 'paid' || a.paymentStatus === 'confirmed',
  );

  const sections: Section[] = [
    { key: 'toConfirm', title: '⚠️ Pendientes de confirmar', data: toConfirm, collapsible: false },
    { key: 'unpaid', title: '🔴 Sin cobrar', data: unpaid, collapsible: false },
    { key: 'paid', title: '✅ Cobrados', data: paidExpanded ? paid : [], collapsible: true },
  ];

  const formatDate = (date: Appointment['date']) => {
    const d = (date as any)?.toDate ? (date as any).toDate() : new Date(date as any);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const renderRow = (item: Appointment) => {
    const pm: PaymentMethod = item.paymentMethod ?? 'cash';
    const ps: PaymentStatus = item.paymentStatus ?? 'pending';

    return (
      <View style={styles.row} key={item.id}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowClient}>{(item as any).clientName ?? 'Cliente'}</Text>
          <Text style={styles.rowMeta}>
            {formatDate(item.date)} · {item.timeSlot} · {item.totalPrice.toFixed(2)} €
          </Text>
          <Text style={styles.rowMethod}>
            {PAYMENT_METHOD_ICON[pm]} {PAYMENT_METHOD_LABEL[pm]}
          </Text>
        </View>
        {ps === 'client_confirmed' && (
          <View style={styles.rowActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              onPress={() => updatePaymentStatus(item.id, 'paid')}
            >
              <Text style={styles.actionBtnText}>✅ Confirmar pago</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
              onPress={() => updatePaymentStatus(item.id, 'pending')}
            >
              <Text style={styles.actionBtnText}>❌ Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}
        {ps === 'pending' && pm === 'cash' && (
          <View style={styles.rowActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: GOLD }]}
              onPress={() => updatePaymentStatus(item.id, 'paid')}
            >
              <Text style={[styles.actionBtnText, { color: '#000' }]}>💵 Marcar como cobrado</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <TouchableOpacity
            style={styles.sectionHeader}
            activeOpacity={section.collapsible ? 0.7 : 1}
            disabled={!section.collapsible}
            onPress={() => section.collapsible && setPaidExpanded((v) => !v)}
          >
            <Text style={styles.sectionTitle}>
              {section.title}
              {section.key !== 'paid' ? ` (${section.data.length})` : ` (${paid.length})`}
            </Text>
            {section.collapsible && (
              <Text style={styles.chevron}>{paidExpanded ? '▲' : '▼'}</Text>
            )}
          </TouchableOpacity>
        )}
        renderItem={({ item }) => renderRow(item)}
        renderSectionFooter={({ section }) => {
          if (section.key === 'paid' && !paidExpanded) return null;
          if (section.data.length === 0) {
            return (
              <Text style={styles.emptySection}>
                {section.key === 'toConfirm' && 'No hay pagos pendientes de confirmar'}
                {section.key === 'unpaid' && 'No hay citas sin cobrar'}
                {section.key === 'paid' && 'No hay pagos cobrados todavía'}
              </Text>
            );
          }
          return null;
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Pagos</Text>
            <Text style={styles.sub}>Gestiona los cobros de tus citas</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={styles.emptyTitle}>Sin citas</Text>
            <Text style={styles.emptySub}>Todavía no tienes citas registradas</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  list: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: TEXT },
  sub: { fontSize: 14, color: MUTED, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: TEXT },
  chevron: { fontSize: 12, color: MUTED },
  emptySection: { fontSize: 13, color: MUTED, fontStyle: 'italic', paddingVertical: 8 },
  row: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 10,
    gap: 10,
  },
  rowInfo: { gap: 3 },
  rowClient: { fontSize: 15, fontWeight: '700', color: TEXT },
  rowMeta: { fontSize: 12, color: MUTED },
  rowMethod: { fontSize: 12, color: GOLD, fontWeight: '600', marginTop: 2 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
});
