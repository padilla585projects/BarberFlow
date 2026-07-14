import React, { useEffect, useState, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import * as ImagePicker from 'expo-image-picker';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../../services/firebase';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BarberStackParamList } from '../../navigation/BarberNavigator';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C   = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const SCREEN_W = Dimensions.get('window').width;
const TILE_GAP = 2;
const TILE_SIZE = (SCREEN_W - TILE_GAP * 2) / 3;

interface PortfolioItem {
  id: string;
  imageUrl: string;
  storagePath: string;
  createdAt: any;
  description?: string;
}

export function PortfolioScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BarberStackParamList>>();
  const [photos, setPhotos] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const barberId = auth.currentUser?.uid;

  useEffect(() => {
    if (!barberId) return;
    const q = query(
      collection(db, 'users', barberId, 'portfolio'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setPhotos(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as PortfolioItem)),
      );
      setLoading(false);
      setRefreshing(false);
    });
    return unsub;
  }, [barberId]);

  const pickAndUpload = useCallback(async () => {
    if (!barberId) return;

    Alert.alert('Agregar foto', 'Selecciona el origen', [
      {
        text: 'Cámara',
        onPress: () => launchPicker('camera'),
      },
      {
        text: 'Galería',
        onPress: () => launchPicker('gallery'),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [barberId]);

  const launchPicker = async (source: 'camera' | 'gallery') => {
    if (!barberId) return;

    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
    }

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const filename = `${Date.now()}.jpg`;
      const storagePath = `portfolios/${barberId}/${filename}`;
      const storageRef = ref(storage, storagePath);

      // Hermes doesn't support new Blob([uint8Array]) — that path is used by both
      // uploadBytes(uint8) and uploadString(base64) internally inside the Firebase SDK.
      // The safe alternative in React Native is XHR with responseType='blob': the blob
      // is created by the native networking layer (BlobManager) without any
      // ArrayBuffer/Uint8Array in JS, so Hermes handles it correctly.
      const blob: Blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response as Blob);
        xhr.onerror = () => reject(new Error('Failed to read image file'));
        xhr.responseType = 'blob';
        xhr.open('GET', asset.uri, true);
        xhr.send(null);
      });
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      (blob as any).close?.();

      const imageUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'users', barberId, 'portfolio'), {
        imageUrl,
        storagePath,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[PortfolioScreen] Upload error:', err);
      Alert.alert('Error', 'No se pudo subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (item: PortfolioItem) => {
    if (!barberId) return;
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que quieres eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', barberId, 'portfolio', item.id));
              if (item.storagePath) {
                await deleteObject(ref(storage, item.storagePath)).catch(() => {});
              }
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar la foto');
            }
          },
        },
      ],
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    // onSnapshot will trigger and set refreshing to false
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
        style={{ flex: 1, backgroundColor: BG }}
        data={photos}
        keyExtractor={(item) => item.id}
        numColumns={3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.heading}>Mi Portfolio</Text>
                <Text style={styles.sub}>
                  {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={pickAndUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={BG} />
                ) : (
                  <Text style={styles.addBtnText}>+ Agregar</Text>
                )}
              </TouchableOpacity>
            </View>
            {/* Quick link to Before/After section */}
            <TouchableOpacity
              style={styles.beforeAfterBanner}
              onPress={() => navigation.navigate('BeforeAfter')}
              activeOpacity={0.85}
            >
              <Text style={styles.beforeAfterBannerText}>✂️ Ver / gestionar Antes & Después →</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyTitle}>Tu portfolio está vacío</Text>
            <Text style={styles.emptySub}>
              Sube fotos de tus mejores trabajos para que los clientes vean tu estilo
            </Text>
            <TouchableOpacity style={styles.addBtnLarge} onPress={pickAndUpload}>
              <Text style={styles.addBtnText}>Subir primera foto</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPreviewUrl(item.imageUrl)}
            onLongPress={() => confirmDelete(item)}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.tile}
              onError={() => console.warn('[PortfolioScreen] Failed to load image:', item.imageUrl)}
            />
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
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  beforeAfterBanner: {
    backgroundColor: GOLD + '18',
    borderWidth: 1,
    borderColor: GOLD + '44',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  beforeAfterBannerText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '700',
  },
  heading: { fontSize: 24, fontWeight: '800', color: TEXT_C },
  sub: { fontSize: 14, color: MUTED, marginTop: 2 },
  addBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  addBtnLarge: {
    backgroundColor: GOLD,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  addBtnText: { color: BG, fontWeight: '800', fontSize: 14 },
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
