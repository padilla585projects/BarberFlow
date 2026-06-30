import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  SectionList,
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { WaitlistEntry } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

interface WaitlistSection {
  title: string;
  data: WaitlistEntry[];
}

export function WaitlistScreen() {
  const { activeBarbershopId } = useAuthContext();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWaitlist = useCallback(async () => {
    if (!activeBarbershopId) return;

    try {
      const q = query(
        collection(db, 'barbershops', activeBarbershopId, 'waitlist'),
        where('status', '==', 'waiting'),
        orderBy('date', 'asc'),
      );
      const snap = await getDocs(q);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const items: WaitlistEntry[] = [];
      const pastIds: string[] = [];

      snap.docs.forEach((d) => {
        const data = d.data();
        const entryDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);

        // Auto-clean past entries
        if (entryDate < now) {
          pastIds.push(d.id);
          return;
        }

        items.push({
          id: d.id,
          clientId: data.clientId,
          clientName: data.clientName ?? 'Cliente',
          clientEmail: data.clientEmail ?? '',
          barberId: data.barberId,
          barberName: data.barberName ?? 'Sin asignar',
          date: entryDate,
          services: data.services ?? [],
          totalPrice: data.totalPrice ?? 0,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          status: data.status,
        });
      });

      // Clean up past entries in background
      if (pastIds.length > 0) {
        pastIds.forEach((pid) => {
          deleteDoc(doc(db, 'barbershops', activeBarbershopId, 'waitlist', pid)).catch(() => {});
        });
      }

      setEntries(items);
    } catch (err) {
      console.error('[WaitlistScreen] Error fetching waitlist:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeBarbershopId]);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWaitlist();
  };

  const handleNotify = async (entry: WaitlistEntry) => {
    if (!activeBarbershopId) return;

    Alert.alert(
      'Notificar cliente',
      `Se enviara una notificacion a ${entry.clientName} indicando que hay un hueco disponible.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              // Mark as notified
              await updateDoc(
                doc(db, 'barbershops', activeBarbershopId, 'waitlist', entry.id),
                { status: 'notified' },
              );

              // Send push notification via the notifications collection
              const { addDoc, collection: col, serverTimestamp } = await import('firebase/firestore');
              await addDoc(col(db, 'notifications'), {
                userId: entry.clientId,
                title: 'Hueco disponible',
                body: `Se ha liberado un hueco para ${entry.barberName}. Reserva tu cita ahora.`,
                type: 'waitlist',
                read: false,
                createdAt: serverTimestamp(),
              });

              setEntries((prev) => prev.filter((e) => e.id !== entry.id));
              Alert.alert('Enviado', 'Se ha notificado al cliente.');
            } catch (err) {
              console.error('[WaitlistScreen] Error notifying:', err);
              Alert.alert('Error', 'No se pudo enviar la notificacion.');
            }
          },
        },
      ],
    );
  };

  const handleRemove = async (entry: WaitlistEntry) => {
    if (!activeBarbershopId) return;

    Alert.alert(
      'Eliminar de la lista',
      `Quieres eliminar a ${entry.clientName} de la lista de espera?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, 'barbershops', activeBarbershopId, 'waitlist', entry.id),
              );
              setEntries((prev) => prev.filter((e) => e.id !== entry.id));
            } catch (err) {
              console.error('[WaitlistScreen] Error removing:', err);
              Alert.alert('Error', 'No se pudo eliminar la entrada.');
            }
          },
        },
      ],
    );
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  // Group entries by date
  const sections: WaitlistSection[] = entries.reduce<WaitlistSection[]>((acc, entry) => {
    const dateStr = formatDate(entry.date);
    const existing = acc.find((s) => s.title === dateStr);
    if (existing) {
      existing.data.push(entry);
    } else {
      acc.push({ title: dateStr, data: [entry] });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  if (!activeBarbershopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Sin barberia asociada</Text>
        <Text style={styles.emptySub}>No se encontro una barberia vinculada a tu cuenta</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
        }
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            <Text style={styles.heading}>Lista de espera</Text>
            <Text style={styles.sub}>
              {entries.length} cliente{entries.length !== 1 ? 's' : ''} en espera
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{"📋"}</Text>
            <Text style={styles.emptyTitle}>Sin lista de espera</Text>
            <Text style={styles.emptySub}>
              No hay clientes en la lista de espera actualmente
            </Text>
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const serviceNames = item.services.map((s) => s.name).join(', ');

          return (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardClient}>{item.clientName}</Text>
                <Text style={styles.cardBarber}>Barbero: {item.barberName}</Text>
                <Text style={styles.cardServices} numberOfLines={1}>
                  {serviceNames}
                </Text>
                <Text style={styles.cardPrice}>{item.totalPrice.toFixed(2)} EUR</Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.notifyBtn}
                  onPress={() => handleNotify(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.notifyBtnText}>Notificar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.removeBtnText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
    paddingHorizontal: 32,
  },
  list: { padding: 16, gap: 8 },
  headerWrapper: { marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '800', color: TEXT },
  sub: { fontSize: 14, color: MUTED, marginTop: 2 },

  sectionHeader: {
    backgroundColor: BG,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  empty: { alignItems: 'center', paddingTop: 64, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center' },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
    marginBottom: 8,
  },
  cardInfo: { gap: 4 },
  cardClient: { fontSize: 16, fontWeight: '700', color: TEXT },
  cardBarber: { fontSize: 13, color: MUTED },
  cardServices: { fontSize: 13, color: GOLD, fontWeight: '600' },
  cardPrice: { fontSize: 14, fontWeight: '700', color: TEXT, marginTop: 2 },

  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  notifyBtn: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  notifyBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  removeBtn: {
    flex: 1,
    backgroundColor: '#DC2626' + '20',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DC2626' + '40',
    paddingVertical: 10,
    alignItems: 'center',
  },
  removeBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },
});
