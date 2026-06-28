import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { Barbershop } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

type Props = NativeStackScreenProps<ClientStackParamList, 'Home'>;

// ── Theme (matches web-admin dark palette) ────────────────────────────────────
const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const SUBTLE  = '#555555';
const BORDER  = '#282828';

export function HomeScreen({ navigation }: Props) {
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const fetchBarbershops = async () => {
    try {
      const q    = query(collection(db, 'barbershops'), orderBy('name'));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Barbershop));
      setBarbershops(data);
    } catch (err) {
      console.error('[HomeScreen] Error fetching barbershops:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchBarbershops(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchBarbershops(); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={barbershops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GOLD}
            colors={[GOLD]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>Barberías cerca</Text>
            <View style={styles.greetingAccent} />
            <Text style={styles.sub}>Elige tu barbería favorita</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✂</Text>
            <Text style={styles.emptyTitle}>Aún no hay barberías</Text>
            <Text style={styles.emptySub}>
              Cuando los propietarios registren sus barberías aparecerán aquí
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate('Barbershop', { barbershopId: item.id, name: item.name })
            }
            activeOpacity={0.8}
          >
            {/* Avatar with gold initial */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>

            {/* Info */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
              <Text style={styles.cardPhone}>{item.phone}</Text>
            </View>

            {/* Arrow */}
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  list: {
    padding: 16,
    gap: 10,
  },

  // Header
  header: {
    marginBottom: 12,
    gap: 6,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: 0.2,
  },
  greetingAccent: {
    width: 32,
    height: 2,
    backgroundColor: GOLD,
    borderRadius: 2,
  },
  sub: {
    fontSize: 14,
    color: MUTED,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: 72,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 52,
    color: GOLD,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
  },
  emptySub: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // Barbershop card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },

  // Avatar circle with gold border + gold initial
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1E1E1E',
    borderWidth: 1.5,
    borderColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: GOLD,
    fontSize: 19,
    fontWeight: '800',
  },

  cardInfo: { flex: 1 },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
  cardAddress: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  cardPhone: {
    fontSize: 12,
    color: SUBTLE,
    marginTop: 2,
  },
  cardArrow: {
    fontSize: 24,
    color: GOLD,
    opacity: 0.6,
  },
});
