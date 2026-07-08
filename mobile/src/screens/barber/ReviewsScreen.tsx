import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
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

interface Review {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export function ReviewsScreen() {
  const { firebaseUser, activeBarbershopId } = useAuthContext();
  const insets = useSafeAreaInsets();
  const barberId = firebaseUser?.uid;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (!barberId) return;

    const reviewsRef = collection(db, 'reviews');
    const q = query(
      reviewsRef,
      where('barberId', '==', barberId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
      } as unknown as Review));

      setReviews(reviewsData);

      if (reviewsData.length > 0) {
        const avg =
          reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
        setAverageRating(avg);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [barberId]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderStar = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Text key={i} style={styles.star}>
        {i < rating ? '★' : '☆'}
      </Text>
    ));
  };

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.clientName}>{item.clientName}</Text>
        <View style={styles.stars}>{renderStar(item.rating)}</View>
      </View>
      <Text style={styles.rating}>{item.rating.toFixed(1)} de 5</Text>
      <Text style={styles.comment}>{item.comment}</Text>
      <Text style={styles.date}>
        {item.createdAt.toLocaleDateString('es-ES')}
      </Text>
    </View>
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
      {/* Summary Card */}
      {reviews.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryRating}>{averageRating.toFixed(1)}</Text>
          <Text style={styles.summaryStars}>★★★★★</Text>
          <Text style={styles.summaryText}>
            {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}
          </Text>
        </View>
      )}

      {/* Reviews List */}
      <FlatList
        data={reviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
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
            <Text style={styles.emptyText}>Sin reseñas aún</Text>
            <Text style={styles.emptySubtext}>
              Las reseñas de tus clientes aparecerán aquí
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  summaryRating: {
    fontSize: 36,
    fontWeight: '700',
    color: GOLD,
    marginBottom: 4,
  },
  summaryStars: {
    fontSize: 16,
    color: GOLD,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 12,
    color: MUTED,
  },
  listContent: {
    paddingBottom: 16,
  },
  reviewCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
  },
  stars: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 12,
    color: GOLD,
    marginLeft: 2,
  },
  rating: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 8,
  },
  comment: {
    fontSize: 13,
    color: TEXT,
    lineHeight: 18,
    marginBottom: 8,
  },
  date: {
    fontSize: 11,
    color: MUTED,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
