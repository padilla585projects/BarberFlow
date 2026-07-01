import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { signOut } from '../../services/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';
import { useUnreadCount } from '../common/NotificationsScreen';
import { useAuthContext } from '../../contexts/AuthContext';

type Props = NativeStackScreenProps<OwnerStackParamList, 'Dashboard'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

interface Stats {
  today: number;
  pending: number;
  total: number;
  revenue: number;
}

export function DashboardScreen({ navigation }: Props) {
  const [stats, setStats] = useState<Stats>({ today: 0, pending: 0, total: 0, revenue: 0 });
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noBarbershop, setNoBarbershop] = useState(false);
  const unreadCount = useUnreadCount();
  const { activeBarbershopId } = useAuthContext();
  const user = auth.currentUser;

  const fetchStats = async () => {
    if (!user) return;

    try {
      if (!activeBarbershopId) {
        setNoBarbershop(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setNoBarbershop(false);

      const shopDoc = await getDoc(doc(db, 'barbershops', activeBarbershopId));
      if (shopDoc.exists()) setShopName(shopDoc.data()?.name ?? '');

      const allSnap = await getDocs(query(
        collection(db, 'appointments'),
        where('barbershopId', '==', activeBarbershopId),
      ));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let todayCount = 0;
      let pendingCount = 0;
      let revenue = 0;

      allSnap.docs.forEach((d) => {
        const data = d.data();
        const date = data.date?.toDate?.() ?? new Date(0);
        if (date >= today && date < tomorrow) todayCount++;
        if (data.status === 'pending') pendingCount++;
        if (data.status === 'completed') revenue += (data.totalPrice ?? 0);
      });

      setStats({ today: todayCount, pending: pendingCount, total: allSnap.size, revenue });
    } catch (err) {
      console.error('[DashboardScreen] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </SafeAreaView>
    );
  }

  if (noBarbershop) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.ctaCard}>
          <Text style={styles.ctaIcon}>✂️</Text>
          <Text style={styles.ctaTitle}>Sin barbería registrada</Text>
          <Text style={styles.ctaSub}>
            Crea tu barbería para empezar a gestionar citas, servicios y más.
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate('CreateBarbershop')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>Crear mi barbería</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={{ marginTop: 8 }}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchStats(); }}
            tintColor={GOLD}
          />
        }
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.shopName} numberOfLines={1}>
              {shopName || 'Mi barbería'}
            </Text>
            <Text style={styles.userName}>{user?.displayName ?? user?.email}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={styles.iconBtn}
            >
              <Text style={styles.iconBtnText}>🔔</Text>
              {unreadCount > 0 && <View style={styles.badge} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut} style={styles.iconBtn}>
              <Text style={[styles.iconBtnText, { fontSize: 14 }]}>⏻</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderTopColor: GOLD }]}>
            <Text style={[styles.statValue, { color: GOLD }]}>{stats.today}</Text>
            <Text style={styles.statLabel}>Hoy</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#F59E0B' }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#10B981' }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* ── Revenue card ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.revenueCard}
          onPress={() => navigation.navigate('FinanceDashboard')}
          activeOpacity={0.8}
        >
          <Text style={styles.revenueLabel}>Ingresos totales</Text>
          <Text style={styles.revenueValue}>{stats.revenue.toFixed(2)} €</Text>
          <Text style={styles.revenueHint}>Ver detalle →</Text>
        </TouchableOpacity>

        {/* ── Quick actions ───────────────────────────────────────────────── */}
        <SectionTitle text="Mi Negocio" />
        <View style={styles.menuGrid}>
          <MenuItem icon="📋" label="Citas"     onPress={() => navigation.navigate('ShopAppointments')} />
          <MenuItem icon="👥" label="Barberos"  onPress={() => navigation.navigate('ShopBarbers')} />
          <MenuItem icon="✂️" label="Servicios" onPress={() => navigation.navigate('ShopServices')} />
          <MenuItem icon="⚙️" label="Ajustes"   onPress={() => navigation.navigate('ShopSettings')} />
        </View>

        <SectionTitle text="Ventas" />
        <View style={styles.menuGrid}>
          <MenuItem icon="💰" label="Cobrar"     onPress={() => navigation.navigate('Sales')} />
          <MenuItem icon="💳" label="Pagos"      onPress={() => navigation.navigate('PaymentHistory')} />
          <MenuItem icon="📦" label="Inventario" onPress={() => navigation.navigate('Inventory')} />
          <MenuItem icon="🛍️" label="Pedidos"    onPress={() => navigation.navigate('ProductOrders')} />
        </View>

        <SectionTitle text="Clientes" />
        <View style={styles.menuGrid}>
          <MenuItem icon="👤" label="Clientes"    onPress={() => navigation.navigate('ClientHistory')} />
          <MenuItem icon="⭐" label="Reseñas"     onPress={() => navigation.navigate('Reviews')} />
          <MenuItem icon="📝" label="Espera"      onPress={() => navigation.navigate('Waitlist')} />
          <MenuItem icon="🎖️" label="Fidelidad"   onPress={() => navigation.navigate('LoyaltySettings')} />
        </View>

        <SectionTitle text="Marketing" />
        <View style={styles.menuGrid}>
          <MenuItem icon="🏷️" label="Promos"    onPress={() => navigation.navigate('Promos')} />
          <MenuItem icon="📸" label="Galería"   onPress={() => navigation.navigate('Gallery')} />
          <MenuItem icon="💬" label="Mensajes"  onPress={() => navigation.navigate('Messages')} />
          <MenuItem icon="📊" label="Reportes"  onPress={() => navigation.navigate('Reports')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Section title ─────────────────────────────────────────────────────────── */

function SectionTitle({ text }: { text: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionText}>{text.toUpperCase()}</Text>
      <View style={[styles.sectionLine, { flex: 1 }]} />
    </View>
  );
}

/* ── Menu item (compact, 4-column grid) ────────────────────────────────────── */

function MenuItem({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIcon}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={styles.menuLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG, padding: 24 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 4,
  },
  shopName: { fontSize: 20, fontWeight: '800', color: TEXT },
  userName: { fontSize: 12, color: MUTED, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 16 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderTopWidth: 2,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: MUTED, fontWeight: '600' },

  // Revenue
  revenueCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    alignItems: 'center',
    gap: 2,
  },
  revenueLabel: { fontSize: 11, color: MUTED, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  revenueValue: { fontSize: 28, fontWeight: '800', color: GOLD },
  revenueHint: { fontSize: 11, color: MUTED, marginTop: 2 },

  // Sections
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionLine: { width: 16, height: 1, backgroundColor: BORDER },
  sectionText: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1.5 },

  // Menu grid — 4 columns, compact
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuItem: {
    width: '23%',
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GOLD + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 10, fontWeight: '700', color: TEXT, textAlign: 'center', paddingHorizontal: 2 },

  // Logout
  logoutText: { fontSize: 14, color: '#EF4444', fontWeight: '600' },

  // CTA (no barbershop)
  ctaCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  ctaIcon: { fontSize: 48 },
  ctaTitle: { fontSize: 20, fontWeight: '800', color: TEXT, textAlign: 'center' },
  ctaSub: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },
  ctaBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '800', color: BG },
});
