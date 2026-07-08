import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthContext } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

interface FrequentClient {
  id: string;
  clientName: string;
  clientId: string;
  appointmentCount: number;
  lastAppointment: Date;
  totalSpent: number;
}

export function FrequentClientsScreen() {
  const { firebaseUser, activeBarbershopId } = useAuthContext();
  const insets = useSafeAreaInsets();
  const barberId = firebaseUser?.uid;

  const [clients, setClients] = useState<FrequentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadFrequentClients = async () => {
      if (!barberId || !activeBarbershopId) {
        setLoading(false);
        return;
      }

      try {
        const appointmentsRef = collection(db, 'appointments');
        const q = query(
          appointmentsRef,
          where('barberId', '==', barberId),
          where('barbershopId', '==', activeBarbershopId),
          orderBy('startTime', 'desc'),
          limit(100)
        );

        const snapshot = await getDocs(q);

        const clientsMap = new Map<string, FrequentClient>();

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const clientId = data.clientId || 'unknown';
          const clientName = data.clientName || 'Cliente desconocido';

          if (clientsMap.has(clientId)) {
            const existing = clientsMap.get(clientId)!;
            existing.appointmentCount += 1;
          } else {
            clientsMap.set(clientId, {
              id: clientId,
              clientId,
              clientName,
              appointmentCount: 1,
              lastAppointment: data.startTime?.toDate?.() || new Date(data.startTime),
              totalSpent: data.price || 0,
            });
          }
        });

        const clientsList = Array.from(clientsMap.values())
          .sort((a, b) => b.appointmentCount - a.appointmentCount)
          .slice(0, 20);

        setClients(clientsList);
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFrequentClients();
  }, [barberId, activeBarbershopId]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderClient = ({ item }: { item: FrequentClient }) => (
    <TouchableOpacity style={styles.clientCard} activeOpacity={0.7}>
      <View style={styles.clientAvatar}>
        <Text style={styles.avatarText}>
          {item.clientName.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.clientName}</Text>
        <Text style={styles.clientSubtext}>
          {item.appointmentCount} {item.appointmentCount === 1 ? 'cita' : 'citas'}
        </Text>
      </View>

      <View style={styles.clientStats}>
        <Text style={styles.statValue}>
          ${item.totalSpent.toFixed(2)}
        </Text>
        <Text style={styles.statLabel}>gastado</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <FlatList
        data={clients}
        renderItem={renderClient}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GOLD}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sin clientes frecuentes</Text>
            <Text style={styles.emptySubtext}>
              Los clientes que más te visitan aparecerán aquí
            </Text>
          </View>
        }
        ListHeaderComponent={
          clients.length > 0 ? (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Clientes Frecuentes</Text>
              <Text style={styles.headerSubtext}>
                Los {clients.length} clientes que más te visitan
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 4,
  },
  headerSubtext: {
    fontSize: 12,
    color: MUTED,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GOLD + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: GOLD,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 4,
  },
  clientSubtext: {
    fontSize: 12,
    color: MUTED,
  },
  clientStats: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: MUTED,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: MUTED,
  },
});
