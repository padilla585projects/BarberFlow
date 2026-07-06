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
  ScrollView,
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
const BORDER  = '#282828';

const SCREEN_W = Dimensions.get('window').width;
const TILE_GAP = 2;
const TILE_SIZE = (SCREEN_W - TILE_GAP * 2) / 3;

type Tab = 'portfolio' | 'beforeAfter';

interface PortfolioItem {
  id: string;
  imageUrl: string;
  createdAt: any;
  description?: string;
}

interface BeforeAfterItem {
  id: string;
  beforeUrl: string;
  afterUrl: string;
  caption?: string;
  createdAt: any;
}

export function BarberPortfolioScreen() {
  const route = useRoute<RouteProp<ClientStackParamList, 'BarberPortfolio'>>();
  const { barberId } = route.params;

  const [tab, setTab] = useState<Tab>('portfolio');
  const [photos, setPhotos] = useState<PortfolioItem[]>([]);
  const [pairs, setPairs] = useState<BeforeAfterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPair, setPreviewPair] = useState<BeforeAfterItem | null>(null);

  useEffect(() => {
    let resolvedCount = 0;
    const checkDone = () => { resolvedCount++; if (resolvedCount === 2) setLoading(false); };

    const qPortfolio = query(collection(db, 'users', barberId, 'portfolio'), orderBy('createdAt', 'desc'));
    const unsubPortfolio = onSnapshot(qPortfolio, (snap) => {
      setPhotos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PortfolioItem)));
      checkDone();
    });

    const qBA = query(collection(db, 'users', barberId, 'beforeAfter'), orderBy('createdAt', 'desc'));
    const unsubBA = onSnapshot(qBA, (snap) => {
      setPairs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BeforeAfterItem)));
      checkDone();
    });

    return () => { unsubPortfolio(); unsubBA(); };
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
      {/* Tab toggle */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'portfolio' && styles.tabActive]}
          onPress={() => setTab('portfolio')}
        >
          <Text style={[styles.tabText, tab === 'portfolio' && styles.tabTextActive]}>
            📸 Portfolio ({photos.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'beforeAfter' && styles.tabActive]}
          onPress={() => setTab('beforeAfter')}
        >
          <Text style={[styles.tabText, tab === 'beforeAfter' && styles.tabTextActive]}>
            ✂️ Antes/Después ({pairs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Portfolio tab */}
      {tab === 'portfolio' && (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={3}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📷</Text>
              <Text style={styles.emptyTitle}>Sin fotos aún</Text>
              <Text style={styles.emptySub}>Este barbero aún no tiene fotos en su portfolio</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.8} onPress={() => setPreviewUrl(item.imageUrl)}>
              <Image source={{ uri: item.imageUrl }} style={styles.tile} />
            </TouchableOpacity>
          )}
          columnWrapperStyle={{ gap: TILE_GAP }}
          contentContainerStyle={{ gap: TILE_GAP, paddingBottom: 32 }}
        />
      )}

      {/* Before/After tab */}
      {tab === 'beforeAfter' && (
        <FlatList
          data={pairs}
          keyExtractor={(item) => item.id}
          numColumns={3}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>✂️</Text>
              <Text style={styles.emptyTitle}>Sin comparativas aún</Text>
              <Text style={styles.emptySub}>Este barbero aún no ha subido fotos antes/después</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.8} onPress={() => setPreviewPair(item)}>
              <View style={styles.tile}>
                <Image source={{ uri: item.afterUrl }} style={styles.tile} />
                <View style={styles.tileBadge}>
                  <Text style={styles.tileBadgeText}>⇄</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          columnWrapperStyle={{ gap: TILE_GAP }}
          contentContainerStyle={{ gap: TILE_GAP, paddingBottom: 32 }}
        />
      )}

      {/* Single photo preview modal */}
      <Modal visible={!!previewUrl} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPreviewUrl(null)}>
          <Image source={{ uri: previewUrl ?? '' }} style={styles.modalImage} resizeMode="contain" />
          <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewUrl(null)}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Before/After comparison modal */}
      <Modal visible={!!previewPair} transparent animationType="fade">
        <View style={styles.baOverlay}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewPair(null)}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.baContent} showsVerticalScrollIndicator={false}>
            <View style={styles.baLabels}>
              <Text style={styles.baLabel}>ANTES</Text>
              <Text style={styles.baLabel}>DESPUÉS</Text>
            </View>
            <View style={styles.baRow}>
              <Image source={{ uri: previewPair?.beforeUrl ?? '' }} style={styles.baImage} resizeMode="cover" />
              <View style={styles.baDivider} />
              <Image source={{ uri: previewPair?.afterUrl ?? '' }} style={styles.baImage} resizeMode="cover" />
            </View>
            {previewPair?.caption ? (
              <Text style={styles.baCaption}>{previewPair.caption}</Text>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: MUTED },
  tabTextActive: { color: GOLD },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT_C },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },

  // Tiles
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: SURFACE,
    position: 'relative',
  },
  tileBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: GOLD + '66',
  },
  tileBadgeText: { fontSize: 10, color: GOLD, fontWeight: '700' },

  // Single photo modal
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
    top: 56,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: { color: TEXT_C, fontSize: 18, fontWeight: '700' },

  // Before/After comparison modal
  baOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.97)',
  },
  baContent: {
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  baLabels: {
    flexDirection: 'row',
    width: SCREEN_W,
    paddingHorizontal: 16,
  },
  baLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.12,
    color: GOLD,
    textTransform: 'uppercase',
  },
  baRow: {
    flexDirection: 'row',
    width: SCREEN_W,
  },
  baImage: {
    flex: 1,
    height: SCREEN_W * 0.85,
  },
  baDivider: {
    width: 2,
    backgroundColor: GOLD,
  },
  baCaption: {
    fontSize: 15,
    color: TEXT_C,
    textAlign: 'center',
    paddingHorizontal: 32,
    fontWeight: '500',
  },
});
