import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
} from 'firebase/firestore';
// expo-location requires a native build — guard against missing native module
// (happens when APK was built before the package was added; rebuild fixes it permanently)
// eslint-disable-next-line @typescript-eslint/no-require-imports
let Location: typeof import('expo-location') | null = null;
try { Location = require('expo-location'); } catch { /* native module not in current build */ }
import { db, auth } from '../../services/firebase';
import type { Barbershop } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

type Props = NativeStackScreenProps<ClientStackParamList, 'Home'>;
type FilterMode = 'all' | 'nearby' | 'favorites';
type BarbershopWithDistance = Barbershop & { distance: number | null };

// ── Theme ────────────────────────────────────────────────────────────────────
const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const SUBTLE  = '#555555';
const BORDER  = '#282828';
const RED     = '#EF4444';

// ── Haversine distance (km) ──────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// ── Greeting helper ──────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 14) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

// ── Component ────────────────────────────────────────────────────────────────
export function HomeScreen({ navigation }: Props) {
  const [barbershops, setBarbershops]       = useState<Barbershop[]>([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [loyaltyPoints, setLoyaltyPoints]   = useState(0);
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterMode, setFilterMode]         = useState<FilterMode>('all');
  const [userCoords, setUserCoords]         = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle');
  const [favoriteShops, setFavoriteShops]   = useState<string[]>([]);
  const [togglingFav, setTogglingFav]       = useState<string | null>(null);
  const [userName, setUserName]             = useState<string>('');
  const [userPhotoURL, setUserPhotoURL]     = useState<string | null>(null);

  // ── Geolocation ────────────────────────────────────────────────────────────
  const requestLocation = useCallback(async () => {
    if (!Location) { setLocationStatus('denied'); return; }
    setLocationStatus('loading');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setLocationStatus('granted');
    } catch {
      setLocationStatus('denied');
    }
  }, []);

  // Pedir ubicación al montar (silencioso — sin modal previo)
  useEffect(() => {
    if (!Location) { setLocationStatus('denied'); return; }
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        requestLocation();
      } else if (status === 'undetermined') {
        requestLocation();
      } else {
        setLocationStatus('denied');
      }
    });
  }, [requestLocation]);

  // ── User doc (loyalty + favorites + profile) ────────────────────────────
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    // Seed name/photo immediately from auth (no latency)
    if (user.displayName) setUserName(user.displayName.split(' ')[0]);
    if (user.photoURL)    setUserPhotoURL(user.photoURL);
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setLoyaltyPoints(data?.loyaltyPoints ?? 0);
          setFavoriteShops(data?.favoriteShops ?? []);
          if (data?.displayName) setUserName((data.displayName as string).split(' ')[0]);
          if (data?.photoURL)    setUserPhotoURL(data.photoURL as string);
        }
      },
      (err) => console.error('[HomeScreen] user listener:', err),
    );
    return unsub;
  }, []);

  // ── Barbershops listener ─────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'barbershops'), orderBy('name'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Barbershop & { active?: boolean }))
          .filter((b) => b.active !== false);
        setBarbershops(data);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error('[HomeScreen] barbershops listener:', err);
        setLoading(false);
        setRefreshing(false);
      },
    );
    return unsub;
  }, []);

  // ── Toggle favorite ──────────────────────────────────────────────────────
  const toggleFavorite = useCallback(async (shopId: string) => {
    const user = auth.currentUser;
    if (!user || togglingFav) return;
    setTogglingFav(shopId);
    const isFav     = favoriteShops.includes(shopId);
    const updated   = isFav
      ? favoriteShops.filter((id) => id !== shopId)
      : [...favoriteShops, shopId];
    setFavoriteShops(updated); // optimistic
    try {
      await updateDoc(doc(db, 'users', user.uid), { favoriteShops: updated });
    } catch {
      setFavoriteShops(favoriteShops); // revert
    } finally {
      setTogglingFav(null);
    }
  }, [favoriteShops, togglingFav]);

  // ── Shops with distance ──────────────────────────────────────────────────
  const shopsWithDist = useMemo<BarbershopWithDistance[]>(() => {
    return barbershops.map((shop) => ({
      ...shop,
      distance:
        userCoords != null &&
        shop.latitude != null &&
        shop.longitude != null
          ? haversineKm(userCoords.lat, userCoords.lng, shop.latitude, shop.longitude)
          : null,
    }));
  }, [barbershops, userCoords]);

  // ── Filtered & sorted list ───────────────────────────────────────────────
  const displayedShops = useMemo<BarbershopWithDistance[]>(() => {
    let result = shopsWithDist;

    // Text search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.address && s.address.toLowerCase().includes(q)),
      );
    }

    // Filter mode
    if (filterMode === 'favorites') {
      result = result.filter((s) => favoriteShops.includes(s.id));
    }

    // Sort: nearby mode or if location available → by distance (nulls last)
    if (filterMode === 'nearby' || (filterMode === 'all' && userCoords)) {
      result = [...result].sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    return result;
  }, [shopsWithDist, searchQuery, filterMode, favoriteShops, userCoords]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // ── Open app settings (location denied) ─────────────────────────────────
  const openSettings = () => Linking.openSettings();

  // ── Render ───────────────────────────────────────────────────────────────
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
        data={displayedShops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Personalized greeting with avatar */}
            <TouchableOpacity
              style={styles.greetingRow}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              {userPhotoURL ? (
                <Image source={{ uri: userPhotoURL }} style={styles.greetingAvatar} />
              ) : (
                <View style={[styles.greetingAvatar, styles.greetingAvatarFallback]}>
                  <Text style={styles.greetingAvatarInitial}>
                    {(userName || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.greetingText}>
                  {getGreeting()}{userName ? `, ${userName}` : ''} {'👋'}
                </Text>
                <Text style={styles.greetingSub}>¿Qué barbería visitas hoy?</Text>
              </View>
              <Text style={styles.greetingChevron}>{'›'}</Text>
            </TouchableOpacity>

            {/* Filter tabs */}
            <View style={styles.filterRow}>
              {(
                [
                  { key: 'all',       label: 'Todas' },
                  { key: 'nearby',    label: '📍 Cerca' },
                  { key: 'favorites', label: '❤️ Favoritas' },
                ] as { key: FilterMode; label: string }[]
              ).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.filterChip, filterMode === key && styles.filterChipActive]}
                  onPress={() => {
                    setFilterMode(key);
                    if (key === 'nearby' && locationStatus === 'idle') {
                      requestLocation();
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[styles.filterChipText, filterMode === key && styles.filterChipTextActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Location status banner */}
            {filterMode === 'nearby' && locationStatus === 'loading' && (
              <View style={styles.locationBanner}>
                <ActivityIndicator size="small" color={GOLD} />
                <Text style={styles.locationBannerText}>Obteniendo tu ubicación…</Text>
              </View>
            )}
            {filterMode === 'nearby' && locationStatus === 'denied' && (
              <TouchableOpacity style={styles.locationBannerDenied} onPress={openSettings} activeOpacity={0.8}>
                <Text style={styles.locationBannerDeniedIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationBannerDeniedTitle}>Ubicación desactivada</Text>
                  <Text style={styles.locationBannerDeniedSub}>
                    Actívala en Ajustes para ver las barberías más cercanas
                  </Text>
                </View>
                <Text style={[styles.filterChipText, { color: GOLD }]}>Ajustes ›</Text>
              </TouchableOpacity>
            )}

            {/* Search bar */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o dirección…"
                placeholderTextColor={MUTED}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
                  <Text style={styles.searchClearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Result count while searching */}
            {searchQuery.trim() !== '' && (
              <Text style={styles.resultsCount}>
                {displayedShops.length}{' '}
                resultado{displayedShops.length !== 1 ? 's' : ''}
              </Text>
            )}

            {/* Loyalty points banner */}
            <TouchableOpacity
              style={styles.loyaltyBanner}
              onPress={() => navigation.navigate('Loyalty')}
              activeOpacity={0.8}
            >
              <View style={styles.loyaltyLeft}>
                <Text style={styles.loyaltyEmoji}>⭐</Text>
                <View>
                  <Text style={styles.loyaltyLabel}>Mis puntos</Text>
                  <Text style={styles.loyaltyValue}>{loyaltyPoints} pts</Text>
                </View>
              </View>
              <Text style={styles.loyaltyArrow}>›</Text>
            </TouchableOpacity>

            {/* Orders banner */}
            <TouchableOpacity
              style={styles.ordersBanner}
              onPress={() => navigation.navigate('OrderHistory')}
              activeOpacity={0.8}
            >
              <View style={styles.loyaltyLeft}>
                <Text style={styles.loyaltyEmoji}>{'📦'}</Text>
                <View>
                  <Text style={styles.loyaltyLabel}>Mis compras</Text>
                  <Text style={styles.ordersValue}>Ver historial de pedidos</Text>
                </View>
              </View>
              <Text style={styles.loyaltyArrow}>{'›'}</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              {filterMode === 'favorites' ? '❤️' : '✂️'}
            </Text>
            <Text style={styles.emptyTitle}>
              {filterMode === 'favorites'
                ? 'Sin favoritas aún'
                : filterMode === 'nearby' && locationStatus === 'denied'
                ? 'Activa la ubicación'
                : 'Sin barberías'}
            </Text>
            <Text style={styles.emptySub}>
              {filterMode === 'favorites'
                ? 'Pulsa el corazón en cualquier barbería para añadirla aquí'
                : filterMode === 'nearby' && locationStatus === 'denied'
                ? 'Activa el permiso de ubicación para ver las barberías cercanas'
                : 'Cuando los propietarios registren sus barberías aparecerán aquí'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isFav = favoriteShops.includes(item.id);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate('Barbershop', { barbershopId: item.id, name: item.name })
              }
              activeOpacity={0.8}
            >
              {/* Photo or avatar */}
              {item.photoURL ? (
                <Image source={{ uri: item.photoURL }} style={styles.shopPhoto} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}

              {/* Info */}
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardAddress} numberOfLines={1}>
                  {item.address}
                </Text>
                {/* Distance badge */}
                {item.distance !== null ? (
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>📍 {formatDist(item.distance)}</Text>
                  </View>
                ) : (
                  <Text style={styles.cardPhone}>{item.phone}</Text>
                )}
              </View>

              {/* Favorite heart button */}
              <TouchableOpacity
                style={styles.favBtn}
                onPress={() => toggleFavorite(item.id)}
                activeOpacity={0.6}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Text style={[styles.favIcon, isFav && styles.favIconActive]}>
                  {isFav ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  list:      { padding: 16, gap: 10 },

  // Header
  header: { marginBottom: 12, gap: 6 },
  // Personalized greeting row
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
    paddingVertical: 4,
  },
  greetingAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: GOLD,
  },
  greetingAvatarFallback: {
    backgroundColor: SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingAvatarInitial: {
    color: GOLD,
    fontSize: 22,
    fontWeight: '800',
  },
  greetingText: {
    color: TEXT,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  greetingSub: {
    color: MUTED,
    fontSize: 13,
    marginTop: 2,
  },
  greetingChevron: {
    fontSize: 22,
    color: MUTED,
    opacity: 0.5,
  },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterChipActive: {
    backgroundColor: GOLD + '22',
    borderColor: GOLD,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  filterChipTextActive: {
    color: GOLD,
  },

  // Location banners
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
  },
  locationBannerText: { fontSize: 13, color: MUTED },
  locationBannerDenied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RED + '50',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
  },
  locationBannerDeniedIcon: { fontSize: 20 },
  locationBannerDeniedTitle: { fontSize: 13, fontWeight: '700', color: TEXT },
  locationBannerDeniedSub:  { fontSize: 11, color: MUTED, marginTop: 1 },

  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  searchIcon:      { fontSize: 18, marginRight: 8 },
  searchInput:     { flex: 1, color: TEXT, fontSize: 14, paddingVertical: 10 },
  searchClear:     { padding: 8 },
  searchClearText: { fontSize: 18, color: MUTED },
  resultsCount:    { fontSize: 12, color: MUTED, marginBottom: 4, marginLeft: 2 },

  // Loyalty banner
  loyaltyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GOLD + '40',
    padding: 14,
    marginTop: 10,
  },
  loyaltyLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loyaltyEmoji: { fontSize: 24 },
  loyaltyLabel: { fontSize: 12, color: MUTED, fontWeight: '600' },
  loyaltyValue: { fontSize: 18, fontWeight: '800', color: GOLD },
  loyaltyArrow: { fontSize: 22, color: GOLD, opacity: 0.6 },

  // Orders banner (same layout as loyalty but accent color is muted)
  ordersBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginTop: 8,
  },
  ordersValue: { fontSize: 13, fontWeight: '700', color: TEXT },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 72, gap: 12 },
  emptyIcon:  { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySub:   { fontSize: 14, color: MUTED, textAlign: 'center', paddingHorizontal: 16 },

  // Barbershop card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    // paddingRight > borderRadius para que el corazón no quede clipado por la esquina redondeada
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 14,
    paddingRight: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  shopPhoto: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    borderWidth: 1.5,
    borderColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: GOLD, fontSize: 20, fontWeight: '800' },
  cardInfo:   { flex: 1, gap: 3 },
  cardName:   { fontSize: 15, fontWeight: '700', color: TEXT },
  cardAddress: { fontSize: 13, color: MUTED },
  cardPhone:   { fontSize: 12, color: SUBTLE },

  // Distance badge
  distanceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GOLD + '18',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  distanceText: { fontSize: 12, fontWeight: '600', color: GOLD },

  // Favorite button — tamaño explícito para que no se comprima ni clipado
  favBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  favIcon: {
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    // opacity 0.75 en lugar de 0.5 — más visible sobre fondo oscuro #141414
    opacity: 0.75,
  },
  favIconActive: {
    opacity: 1,
  },
});
