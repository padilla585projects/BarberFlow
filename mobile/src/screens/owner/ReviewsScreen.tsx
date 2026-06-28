import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

interface Review {
  id: string;
  clientName: string;
  barberName: string;
  barberId: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export function ReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [barbers, setBarbers] = useState<{ id: string; name: string }[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);

  const fetchReviews = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const barbershopId = userDoc.data()?.barbershopId;
      if (!barbershopId) return;

      // Get barbershop aggregate data
      const shopDoc = await getDoc(doc(db, 'barbershops', barbershopId));
      if (shopDoc.exists()) {
        const shopData = shopDoc.data();
        const total = shopData?.totalRatings ?? 0;
        const sum = shopData?.ratingSum ?? 0;
        setTotalRatings(total);
        setAverageRating(total > 0 ? sum / total : 0);
      }

      // Fetch all reviews
      const q = query(
        collection(db, 'barbershops', barbershopId, 'reviews'),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
      setReviews(data);

      // Extract unique barbers for filter chips
      const barberMap = new Map<string, string>();
      data.forEach((r) => {
        if (r.barberId && r.barberName) {
          barberMap.set(r.barberId, r.barberName);
        }
      });
      setBarbers(Array.from(barberMap, ([id, name]) => ({ id, name })));
    } catch (err) {
      console.error('[ReviewsScreen] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const filteredReviews = selectedBarber
    ? reviews.filter((r) => r.barberId === selectedBarber)
    : reviews;

  const renderStars = (rating: number, size: number = 16) => {
    return (
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text key={star} style={{ fontSize: size }}>
            {star <= rating ? '⭐' : '☆'}
          </Text>
        ))}
      </View>
    );
  };

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
        data={filteredReviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
        }
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Average rating card */}
            <View style={styles.avgCard}>
              <Text style={styles.avgNumber}>{averageRating.toFixed(1)}</Text>
              {renderStars(Math.round(averageRating), 22)}
              <Text style={styles.avgSub}>
                {totalRatings} {totalRatings === 1 ? 'valoración' : 'valoraciones'}
              </Text>
            </View>

            {/* Barber filter chips */}
            {barbers.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                <TouchableOpacity
                  style={[styles.chip, !selectedBarber && styles.chipActive]}
                  onPress={() => setSelectedBarber(null)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, !selectedBarber && styles.chipTextActive]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {barbers.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.chip, selectedBarber === b.id && styles.chipActive]}
                    onPress={() => setSelectedBarber(selectedBarber === b.id ? null : b.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.chipText, selectedBarber === b.id && styles.chipTextActive]}
                    >
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>⭐</Text>
            <Text style={styles.emptyTitle}>Sin valoraciones</Text>
            <Text style={styles.emptySub}>
              Las valoraciones de tus clientes aparecerán aquí
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const date = item.createdAt?.toDate?.();
          const dateStr = date
            ? date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '';

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.clientName}>{item.clientName}</Text>
                  {renderStars(item.rating, 14)}
                </View>
                <Text style={styles.dateText}>{dateStr}</Text>
              </View>
              <Text style={styles.barberTag}>Barbero: {item.barberName}</Text>
              {item.comment ? (
                <Text style={styles.commentText}>{item.comment}</Text>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  list: { padding: 16, gap: 12 },
  headerSection: { gap: 16, marginBottom: 8 },
  avgCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  avgNumber: { fontSize: 48, fontWeight: '800', color: GOLD },
  avgSub: { fontSize: 13, color: MUTED, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: {
    backgroundColor: GOLD + '20',
    borderColor: GOLD,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: MUTED },
  chipTextActive: { color: GOLD },
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
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: { gap: 4, flex: 1 },
  clientName: { fontSize: 15, fontWeight: '700', color: TEXT },
  dateText: { fontSize: 12, color: MUTED },
  barberTag: { fontSize: 12, color: GOLD, fontWeight: '600' },
  commentText: { fontSize: 14, color: TEXT, lineHeight: 20 },
});
