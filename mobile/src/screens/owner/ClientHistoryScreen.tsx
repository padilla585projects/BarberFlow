import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

/* ── theme tokens ────────────────────────────────────── */
const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

/* ── types ───────────────────────────────────────────── */
interface ClientStats {
  clientId: string;
  clientName: string;
  clientEmail: string;
  totalVisits: number;
  lastVisitDate: Date;
  totalSpent: number;
}

/* ── helpers ─────────────────────────────────────────── */
const toDate = (date: any): Date => {
  if (!date) return new Date(0);
  return date.toDate ? date.toDate() : new Date(date);
};

const formatDate = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatCurrency = (amount: number): string =>
  `$${amount.toFixed(2)}`;

/* ── component ───────────────────────────────────────── */
export function ClientHistoryScreen() {
  const [clients, setClients] = useState<ClientStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchClients = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Get barbershopId from user doc
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const barbershopId = userSnap.exists()
        ? (userSnap.data() as any).barbershopId
        : null;

      if (!barbershopId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch all appointments for this barbershop
      const q = query(
        collection(db, 'appointments'),
        where('barbershopId', '==', barbershopId),
        orderBy('date', 'desc'),
      );
      const snap = await getDocs(q);

      // Group by clientId and accumulate stats
      const map = new Map<string, ClientStats>();

      snap.docs.forEach((d) => {
        const data = d.data() as any;
        const cId = data.clientId as string;
        if (!cId) return;

        const apptDate = toDate(data.date);
        const price =
          data.status === 'completed' ? Number(data.totalPrice) || 0 : 0;

        const existing = map.get(cId);
        if (existing) {
          existing.totalVisits += 1;
          if (apptDate > existing.lastVisitDate) {
            existing.lastVisitDate = apptDate;
          }
          existing.totalSpent += price;
        } else {
          map.set(cId, {
            clientId: cId,
            clientName: (data.clientName as string) || 'Sin nombre',
            clientEmail: (data.clientEmail as string) || '',
            totalVisits: 1,
            lastVisitDate: apptDate,
            totalSpent: price,
          });
        }
      });

      // Sort by most recent visit first
      const sorted = Array.from(map.values()).sort(
        (a, b) => b.lastVisitDate.getTime() - a.lastVisitDate.getTime(),
      );

      setClients(sorted);
    } catch (err) {
      console.error('[ClientHistoryScreen] Error fetching clients:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClients();
  }, [fetchClients]);

  /* ── filtered list based on search ─────────────────── */
  const filtered = useMemo(() => {
    if (!searchText.trim()) return clients;
    const lower = searchText.toLowerCase();
    return clients.filter(
      (c) =>
        c.clientName.toLowerCase().includes(lower) ||
        c.clientEmail.toLowerCase().includes(lower),
    );
  }, [clients, searchText]);

  /* ── render helpers ────────────────────────────────── */
  const renderClient = ({ item }: { item: ClientStats }) => {
    const initial = item.clientName.charAt(0).toUpperCase();

    return (
      <View style={styles.card}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.clientName}
          </Text>
          {item.clientEmail ? (
            <Text style={styles.email} numberOfLines={1}>
              {item.clientEmail}
            </Text>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{item.totalVisits}</Text>
              <Text style={styles.statLabel}>Visitas</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {formatCurrency(item.totalSpent)}
              </Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {formatDate(item.lastVisitDate)}
              </Text>
              <Text style={styles.statLabel}>Última visita</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          {searchText.trim()
            ? 'No se encontraron clientes'
            : 'Aún no hay clientes registrados'}
        </Text>
      </View>
    );
  };

  /* ── main render ───────────────────────────────────── */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente por nombre o email..."
          placeholderTextColor={MUTED}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.clientId}
        renderItem={renderClient}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          filtered.length === 0
            ? styles.listEmpty
            : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GOLD}
            colors={[GOLD]}
          />
        }
      />
    </View>
  );
}

/* ── styles ──────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* search */
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: SURFACE,
    color: TEXT_C,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  /* list */
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  /* card */
  card: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  /* avatar */
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: BG,
    fontSize: 20,
    fontWeight: '700',
  },
  /* info */
  info: {
    flex: 1,
  },
  name: {
    color: TEXT_C,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  email: {
    color: MUTED,
    fontSize: 13,
    marginBottom: 10,
  },
  /* stats row */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  /* empty */
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: MUTED,
    fontSize: 15,
    textAlign: 'center',
  },
});
