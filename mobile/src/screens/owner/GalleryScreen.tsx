import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../../services/firebase';
import { pickAndUploadImage } from '../../utils/imageUpload';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';

type Props = NativeStackScreenProps<OwnerStackParamList, 'Gallery'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const MAX_PHOTOS = 12;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 4;
const COLUMNS = 3;
const TILE_SIZE = (SCREEN_WIDTH - 48 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

export function GalleryScreen({ navigation }: Props) {
  const [gallery, setGallery] = useState<string[]>([]);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const user = auth.currentUser;

  const fetchGallery = useCallback(async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const shopId = userDoc.data()?.barbershopId;
      if (!shopId) return;
      setBarbershopId(shopId);

      const shopDoc = await getDoc(doc(db, 'barbershops', shopId));
      if (shopDoc.exists()) {
        setGallery(shopDoc.data()?.gallery ?? []);
      }
    } catch (err) {
      console.error('[GalleryScreen] Error fetching gallery:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const handleAddPhoto = async () => {
    if (!barbershopId) return;
    if (gallery.length >= MAX_PHOTOS) {
      Alert.alert('Límite alcanzado', `Solo puedes subir un máximo de ${MAX_PHOTOS} fotos.`);
      return;
    }

    setUploading(true);
    try {
      const filename = `${Date.now()}.jpg`;
      const storagePath = `barbershops/${barbershopId}/gallery/${filename}`;
      const url = await pickAndUploadImage(storagePath);

      if (url) {
        await updateDoc(doc(db, 'barbershops', barbershopId), {
          gallery: arrayUnion(url),
        });
        setGallery((prev) => [...prev, url]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = (url: string) => {
    Alert.alert('Eliminar foto', '¿Seguro que quieres eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          if (!barbershopId) return;
          try {
            // Delete from Firebase Storage
            const storageRef = ref(storage, url);
            await deleteObject(storageRef);

            // Remove URL from Firestore array
            await updateDoc(doc(db, 'barbershops', barbershopId), {
              gallery: arrayRemove(url),
            });

            setGallery((prev) => prev.filter((u) => u !== url));
            if (selectedPhoto === url) setSelectedPhoto(null);
          } catch (err) {
            console.error('[GalleryScreen] Error deleting photo:', err);
            Alert.alert('Error', 'No se pudo eliminar la foto.');
          }
        },
      },
    ]);
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
      {/* Header info */}
      <View style={styles.headerRow}>
        <Text style={styles.count}>{gallery.length} / {MAX_PHOTOS} fotos</Text>
        <TouchableOpacity
          style={[styles.addBtn, uploading && styles.addBtnDisabled]}
          onPress={handleAddPhoto}
          disabled={uploading}
          activeOpacity={0.85}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.addBtnText}>+ Añadir foto</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Grid */}
      {gallery.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>📷</Text>
          <Text style={styles.emptyText}>No hay fotos en la galería</Text>
          <Text style={styles.emptyHint}>Añade fotos de tu barbería para que tus clientes las vean</Text>
        </View>
      ) : (
        <FlatList
          data={gallery}
          keyExtractor={(item) => item}
          numColumns={COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <View style={styles.tileWrap}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setSelectedPhoto(item)}
              >
                <Image source={{ uri: item }} style={styles.tile} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeletePhoto(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Full-screen preview */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedPhoto(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 20 },
  centered: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  count: { fontSize: 14, color: MUTED, fontWeight: '600' },

  addBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },

  grid: { gap: GRID_GAP },
  gridRow: { gap: GRID_GAP },

  tileWrap: { position: 'relative' },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    backgroundColor: SURFACE,
  },

  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '800' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: TEXT },
  emptyHint: { fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 260 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: { color: TEXT, fontSize: 20, fontWeight: '700' },
  modalImage: { width: SCREEN_WIDTH - 32, height: SCREEN_WIDTH - 32 },
});
