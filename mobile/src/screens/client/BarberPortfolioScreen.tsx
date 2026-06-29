import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C   = '#FFFFFF';
const MUTED   = '#888888';

const SCREEN_W = Dimensions.get('window').width;
const TILE_GAP = 2;
const TILE_SIZE = (SCREEN_W - TILE_GAP * 2) / 3;

interface PortfolioItem {
  id: string;
  imageUrl: string;
  createdAt: any;
  description?: string;
}

export function BarberPortfolioScreen() {
  const route = useRoute<RouteProp<ClientStackParamList, 'BarberPortfolio'>>();
  const { barberId } = route.params;

  const [photos, setPhotos] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'users', barberId, 'portfolio'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setPhotos(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as PortfolioItem)),
      );
      setLoading(false);
    });
    return unsub;
  }, [barberId]);

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
        data={photos}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.sub}>
              {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📷</Text>
            <Text style={styles.emptyTitle}>Sin fotos aún</Text>
            <Text style={styles.emptySub}>
              Este barbero aún no tiene fotos en su portfolio
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPreviewUrl(item.imageUrl)}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.tile} />
          </TouchableOpacity>
        )}
        columnWrapperStyle={{ gap: TILE_GAP }}
        contentContainerStyle={{ gap: TILE_GAP, paddingBottom: 32 }}
      />

      {/* Full-screen preview modal */}
      <Modal visible={!!previewUrl} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPreviewUrl(null)}
        >
          <Image
            source={{ uri: previewUrl ?? '' }}
            style={styles.modalImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setPreviewUrl(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sub: { fontSize: 14, color: MUTED },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT_C },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: SURFACE,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_W,
    height: SCREEN_W,
  },
  modalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: { color: TEXT_C, fontSize: 18, fontWeight: '700' },
});
