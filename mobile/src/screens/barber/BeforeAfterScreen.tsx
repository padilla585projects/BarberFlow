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
  TextInput,
  ScrollView,
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

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const SCREEN_W = Dimensions.get('window').width;
const TILE_GAP = 2;
const TILE_SIZE = (SCREEN_W - TILE_GAP * 2) / 3;

interface BeforeAfterItem {
  id: string;
  beforeUrl: string;
  afterUrl: string;
  beforePath: string;
  afterPath: string;
  caption?: string;
  createdAt: any;
}

async function uploadPhoto(uid: string, uri: string, slot: 'before' | 'after'): Promise<{ url: string; path: string }> {
  const filename = `${slot}_${Date.now()}.jpg`;
  const storagePath = `beforeAfter/${uid}/${filename}`;
  const storageRef = ref(storage, storagePath);

  // XHR blob — safe with Hermes (same pattern as PortfolioScreen)
  const blob: Blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error('Failed to read image file'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  (blob as any).close?.();

  const url = await getDownloadURL(storageRef);
  return { url, path: storagePath };
}

export function BeforeAfterScreen() {
  const barberId = auth.currentUser?.uid;
  const [pairs, setPairs] = useState<BeforeAfterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<BeforeAfterItem | null>(null);
  const [captionInput, setCaptionInput] = useState('');
  const [captionModalVisible, setCaptionModalVisible] = useState(false);
  const [pendingPair, setPendingPair] = useState<{ beforeUri: string; afterUri: string } | null>(null);

  useEffect(() => {
    if (!barberId) return;
    const q = query(
      collection(db, 'users', barberId, 'beforeAfter'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setPairs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BeforeAfterItem)));
      setLoading(false);
    });
    return unsub;
  }, [barberId]);

  const pickImage = async (source: 'camera' | 'gallery'): Promise<string | null> => {
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara'); return null; }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería'); return null; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    }
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
  };

  const chooseSource = (): Promise<string | null> => new Promise((resolve) => {
    Alert.alert('Seleccionar foto', 'Elige el origen', [
      { text: 'Cámara', onPress: () => pickImage('camera').then(resolve) },
      { text: 'Galería', onPress: () => pickImage('gallery').then(resolve) },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });

  const startAddPair = useCallback(async () => {
    if (!barberId) return;

    // Step 1: pick BEFORE photo
    Alert.alert('Foto ANTES', 'Selecciona la foto del resultado antes del servicio', [
      {
        text: 'Continuar',
        onPress: async () => {
          const beforeUri = await chooseSource();
          if (!beforeUri) return;

          // Step 2: pick AFTER photo
          setTimeout(() => {
            Alert.alert('Foto DESPUÉS', 'Ahora selecciona la foto del resultado final', [
              {
                text: 'Continuar',
                onPress: async () => {
                  const afterUri = await chooseSource();
                  if (!afterUri) return;
                  setPendingPair({ beforeUri, afterUri });
                  setCaptionInput('');
                  setCaptionModalVisible(true);
                },
              },
              { text: 'Cancelar', style: 'cancel' },
            ]);
          }, 300);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [barberId]);

  const confirmUpload = async () => {
    if (!barberId || !pendingPair) return;
    setCaptionModalVisible(false);
    setUploading(true);
    try {
      const [before, after] = await Promise.all([
        uploadPhoto(barberId, pendingPair.beforeUri, 'before'),
        uploadPhoto(barberId, pendingPair.afterUri, 'after'),
      ]);
      await addDoc(collection(db, 'users', barberId, 'beforeAfter'), {
        beforeUrl: before.url,
        beforePath: before.path,
        afterUrl: after.url,
        afterPath: after.path,
        caption: captionInput.trim() || null,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[BeforeAfterScreen] Upload error:', err);
      Alert.alert('Error', 'No se pudo subir el par de fotos');
    } finally {
      setUploading(false);
      setPendingPair(null);
    }
  };

  const confirmDelete = (item: BeforeAfterItem) => {
    if (!barberId) return;
    Alert.alert('Eliminar par', '¿Eliminar estas fotos antes/después?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'users', barberId, 'beforeAfter', item.id));
            await Promise.allSettled([
              item.beforePath ? deleteObject(ref(storage, item.beforePath)) : Promise.resolve(),
              item.afterPath  ? deleteObject(ref(storage, item.afterPath))  : Promise.resolve(),
            ]);
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el par de fotos');
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
      <FlatList
        data={pairs}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.heading}>Antes / Después</Text>
              <Text style={styles.sub}>
                {pairs.length} {pairs.length === 1 ? 'par' : 'pares'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={startAddPair}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={BG} />
              ) : (
                <Text style={styles.addBtnText}>+ Añadir</Text>
              )}
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✂️</Text>
            <Text style={styles.emptyTitle}>Sin comparativas aún</Text>
            <Text style={styles.emptySub}>
              Muestra tu transformaciones subiendo pares de fotos antes/después de tus trabajos
            </Text>
            <TouchableOpacity style={styles.addBtnLarge} onPress={startAddPair} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color={BG} />
              ) : (
                <Text style={styles.addBtnText}>Añadir primera comparativa</Text>
              )}
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPreview(item)}
            onLongPress={() => confirmDelete(item)}
          >
            <View style={styles.tile}>
              {/* Show after photo with a small ⇄ badge */}
              <Image source={{ uri: item.afterUrl }} style={styles.tileImage} />
              <View style={styles.tileBadge}>
                <Text style={styles.tileBadgeText}>⇄</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        columnWrapperStyle={{ gap: TILE_GAP }}
        contentContainerStyle={{ gap: TILE_GAP, paddingBottom: 32 }}
      />

      {/* Caption modal */}
      <Modal visible={captionModalVisible} transparent animationType="fade">
        <View style={styles.captionOverlay}>
          <View style={styles.captionModal}>
            <Text style={styles.captionTitle}>Añadir descripción</Text>
            <Text style={styles.captionSub}>Opcional — ej: "Corte con degradado"</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Descripción del trabajo..."
              placeholderTextColor={MUTED}
              value={captionInput}
              onChangeText={setCaptionInput}
              maxLength={100}
              autoFocus
            />
            <View style={styles.captionActions}>
              <TouchableOpacity
                style={styles.captionSkip}
                onPress={confirmUpload}
              >
                <Text style={styles.captionSkipText}>Omitir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.captionConfirm}
                onPress={confirmUpload}
              >
                <Text style={styles.captionConfirmText}>Subir fotos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-screen comparison modal */}
      <Modal visible={!!preview} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.previewClose}
            onPress={() => setPreview(null)}
          >
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.previewContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Labels */}
            <View style={styles.previewLabels}>
              <Text style={styles.previewLabel}>ANTES</Text>
              <Text style={styles.previewLabel}>DESPUÉS</Text>
            </View>

            {/* Side by side */}
            <View style={styles.previewRow}>
              <Image
                source={{ uri: preview?.beforeUrl ?? '' }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.previewDivider} />
              <Image
                source={{ uri: preview?.afterUrl ?? '' }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            </View>

            {preview?.caption ? (
              <Text style={styles.previewCaption}>{preview.caption}</Text>
            ) : null}

            <Text style={styles.previewHint}>Mantén pulsado el tile para eliminar</Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
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
    alignItems: 'center',
  },
  addBtnText: { color: BG, fontWeight: '800', fontSize: 14 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT_C },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },

  // Tile
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: SURFACE,
    position: 'relative',
  },
  tileImage: {
    width: TILE_SIZE,
    height: TILE_SIZE,
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

  // Caption modal
  captionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  captionModal: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    width: '100%',
    gap: 12,
  },
  captionTitle: { fontSize: 18, fontWeight: '800', color: TEXT_C },
  captionSub: { fontSize: 13, color: MUTED, marginTop: -4 },
  captionInput: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    color: TEXT_C,
    fontSize: 15,
  },
  captionActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  captionSkip: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  captionSkipText: { color: MUTED, fontWeight: '700' },
  captionConfirm: {
    flex: 2,
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  captionConfirmText: { color: BG, fontWeight: '800', fontSize: 15 },

  // Preview modal
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.97)',
  },
  previewClose: {
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
  previewCloseText: { color: TEXT_C, fontSize: 18, fontWeight: '700' },
  previewContent: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 0,
    alignItems: 'center',
    gap: 16,
  },
  previewLabels: {
    flexDirection: 'row',
    width: SCREEN_W,
    paddingHorizontal: 16,
  },
  previewLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.12,
    color: GOLD,
    textTransform: 'uppercase',
  },
  previewRow: {
    flexDirection: 'row',
    width: SCREEN_W,
  },
  previewImage: {
    flex: 1,
    height: SCREEN_W * 0.85,
  },
  previewDivider: {
    width: 2,
    backgroundColor: GOLD,
  },
  previewCaption: {
    fontSize: 15,
    color: TEXT_C,
    textAlign: 'center',
    paddingHorizontal: 32,
    fontWeight: '500',
  },
  previewHint: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
  },
});
