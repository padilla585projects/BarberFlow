import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
  SafeAreaView,
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

type Props = NativeStackScreenProps<ClientStackParamList, 'MyGiftCards'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const GREEN   = '#22C55E';

interface GiftCard {
  id: string;
  code: string;
  amount: number;
  balance: number;
  barbershopName: string;
  recipientName?: string;
  personalMessage?: string;
  status: 'active' | 'used' | string;
  paymentMethod: string;
  createdAt: any;
}

function formatDate(ts: any): string {
  if (!ts) return '';
  try {
    const date: Date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function MyGiftCardsScreen({ navigation }: Props) {
  const user = auth.currentUser;
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCards = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'giftCards'),
        where('purchasedBy', '==', user.uid),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      setCards(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GiftCard)));
    } catch (err) {
      console.error('[MyGiftCardsScreen] Error fetching gift cards:', err);
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchCards();
      setLoading(false);
    })();
  }, [fetchCards]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCards();
    setRefreshing(false);
  };

  const handleShare = async (code: string) => {
    try {
      await Share.share({ message: `Tu tarjeta regalo BarberFlow: ${code}` });
    } catch (err) {
      console.error('[MyGiftCardsScreen] Error sharing code:', err);
    }
  };

  const renderCard = ({ item }: { item: GiftCard }) => {
    const isActive = item.status === 'active';
    const usedAmount = item.amount - item.balance;
    const progressPercent = item.amount > 0 ? (item.balance / item.amount) * 100 : 0;

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardShop}>{item.barbershopName}</Text>
          <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeUsed]}>
            <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextUsed]}>
              {isActive ? 'Activa' : 'Usada'}
            </Text>
          </View>
        </View>

        {/* Code */}
        <Text style={styles.code}>{item.code}</Text>

        {/* Amounts */}
        <View style={styles.amountRow}>
          <View>
            <Text style={styles.amountLabel}>Saldo disponible</Text>
            <Text style={styles.amountValue}>{item.balance} €</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amountLabel}>Valor original</Text>
            <Text style={styles.amountOrig}>{item.amount} €</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
        </View>

        {usedAmount > 0 && (
          <Text style={styles.usedText}>Utilizado: {usedAmount.toFixed(2)} €</Text>
        )}

        {/* Recipient / message */}
        {item.recipientName ? (
          <Text style={styles.meta}>Para: {item.recipientName}</Text>
        ) : null}

        {/* Date */}
        <Text style={styles.meta}>{formatDate(item.createdAt)}</Text>

        {/* Copy button (only active cards) */}
        {isActive && (
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => handleShare(item.code)}
            activeOpacity={0.85}
          >
            <Text style={styles.shareBtnText}>Compartir código</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis tarjetas regalo</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎁</Text>
              <Text style={styles.emptyTitle}>Sin tarjetas regalo</Text>
              <Text style={styles.emptySubtitle}>
                Las tarjetas que compres aparecerán aquí.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT_C },
  backBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 32, color: GOLD, lineHeight: 36 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  listContent: { padding: 16, gap: 16, paddingBottom: 40 },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardShop: { fontSize: 15, fontWeight: '700', color: TEXT_C, flex: 1 },

  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeActive: { backgroundColor: GREEN + '20' },
  badgeUsed: { backgroundColor: BORDER },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextActive: { color: GREEN },
  badgeTextUsed: { color: MUTED },

  code: {
    fontSize: 22,
    fontWeight: '900',
    color: TEXT_C,
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
  },

  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  amountLabel: { fontSize: 12, color: MUTED, marginBottom: 2 },
  amountValue: { fontSize: 24, fontWeight: '800', color: GOLD },
  amountOrig: { fontSize: 16, fontWeight: '600', color: MUTED },

  progressTrack: {
    height: 6,
    backgroundColor: BORDER,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 3,
  },

  usedText: { fontSize: 12, color: MUTED },
  meta: { fontSize: 13, color: MUTED },

  shareBtn: {
    borderWidth: 1.5,
    borderColor: GOLD + '66',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  shareBtnText: { color: GOLD, fontSize: 14, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: TEXT_C },
  emptySubtitle: { fontSize: 14, color: MUTED, textAlign: 'center', paddingHorizontal: 32 },
});
