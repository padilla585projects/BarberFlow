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
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';
import { useUnreadCount } from '../common/NotificationsScreen';
import { useAuthContext } from '../../contexts/AuthContext';
import { useLogout } from '../../hooks/useLogout';

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

interface Onboarding {
  hasServices: boolean;
  hasBarbers: boolean;
  hasProducts: boolean;
}

export function DashboardScreen({ navigation }: Props) {
  const [stats, setStats] = useState<Stats>({ today: 0, pending: 0, total: 0, revenue: 0 });
  const [onboarding, setOnboarding] = useState<Onboarding>({ hasServices: true, hasBarbers: true, hasProducts: true });
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noBarbershop, setNoBarbershop] = useState(false);
  const unreadCount = useUnreadCount();
  const { activeBarbershopId } = useAuthContext();
  const { handleLogout } = useLogout();
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

      // Onboarding checks — quick limit(1) queries to avoid reading entire collections
      const [servicesSnap, barbersSnap, productsSnap] = await Promise.all([
        getDocs(query(collection(db, 'barbershops', activeBarbershopId, 'services'), limit(1))),
        getDocs(query(collection(db, 'users'), where('barbershopId', '==', activeBarbershopId), where('role', 'in', ['barber', 'owner']), limit(2))),
        getDocs(query(collection(db, 'products'), where('barbershopId', '==', activeBarbershopId), limit(1))),
      ]);
      setOnboarding({
        hasServices: !servicesSnap.empty,
        hasBarbers:  barbersSnap.size > 1, // >1 because owner themselves counts
        hasProducts: !productsSnap.empty,
      });

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
          <TouchableOpacity onPress={handleLogout} style={{ marginTop: 8 }}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
            <TouchableOpacity onPress={handleLogout} style={styles.iconBtn}>
              <Text style={[styles.iconBtnText, { fontSize: 16 }]}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Onboarding checklist ────────────────────────────────────────── */}
        <OnboardingCard
          onboarding={onboarding}
          onNavigate={(screen) => navigation.navigate(screen as any)}
        />

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statCard, { borderTopColor: GOLD }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ShopAppointments', { initialFilter: 'today' })}
          >
            <Text style={[styles.statValue, { color: GOLD }]}>{stats.today}</Text>
            <Text style={styles.statLabel}>Hoy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { borderTopColor: '#F59E0B' }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ShopAppointments', { initialFilter: 'pending' })}
          >
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { borderTopColor: '#10B981' }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ShopAppointments', { initialFilter: 'all' })}
          >
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </TouchableOpacity>
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

        {/* ── Menu list ────────────────────────────────────────────────── */}
        <SectionTitle text="Gestión" />
        <View style={styles.listSection}>
          <ListRow icon="📋" title="Citas" subtitle="Ver y gestionar las citas del día" onPress={() => navigation.navigate('ShopAppointments')} />
          <ListRow icon="✂️" title="Servicios" subtitle="Catálogo de cortes y tratamientos" onPress={() => navigation.navigate('ShopServices')} />
          <ListRow icon="👥" title="Barberos" subtitle="Equipo y horarios" onPress={() => navigation.navigate('ShopBarbers')} />
          <ListRow icon="📝" title="Lista de espera" subtitle="Clientes esperando turno" onPress={() => navigation.navigate('Waitlist')} last />
        </View>

        <SectionTitle text="Ventas" />
        <View style={styles.listSection}>
          <ListRow icon="💰" title="Cobrar" subtitle="Registrar un cobro rápido" onPress={() => navigation.navigate('Sales')} />
          <ListRow icon="💳" title="Historial de pagos" subtitle="Transacciones anteriores" onPress={() => navigation.navigate('PaymentHistory')} />
          <ListRow icon="💳" title="Cobros de clientes" subtitle="Confirma pagos por Bizum, PayPal o caja" onPress={() => navigation.navigate('ClientPayments')} />
          <ListRow icon="📦" title="Inventario" subtitle="Stock de productos" onPress={() => navigation.navigate('Inventory')} />
          <ListRow icon="🛍️" title="Pedidos" subtitle="Pedidos de la tienda online" onPress={() => navigation.navigate('ProductOrders')} last />
        </View>

        <SectionTitle text="Clientes" />
        <View style={styles.listSection}>
          <ListRow icon="👤" title="Clientes" subtitle="Historial y fichas de clientes" onPress={() => navigation.navigate('ClientHistory')} />
          <ListRow icon="⭐" title="Reseñas" subtitle="Valoraciones de clientes" onPress={() => navigation.navigate('Reviews')} />
          <ListRow icon="🎖️" title="Fidelidad" subtitle="Programa de puntos y recompensas" onPress={() => navigation.navigate('LoyaltySettings')} last />
        </View>

        <SectionTitle text="Marketing" />
        <View style={styles.listSection}>
          <ListRow icon="🏷️" title="Promociones" subtitle="Descuentos y ofertas activas" onPress={() => navigation.navigate('Promos')} />
          <ListRow icon="📸" title="Galería" subtitle="Fotos de trabajos realizados" onPress={() => navigation.navigate('Gallery')} />
          <ListRow icon="💬" title="Mensajes" subtitle="Chat con clientes" onPress={() => navigation.navigate('Messages')} />
          <ListRow icon="📊" title="Reportes" subtitle="Estadísticas del negocio" onPress={() => navigation.navigate('Reports')} last />
        </View>

        <SectionTitle text="Configuración" />
        <View style={styles.listSection}>
          <ListRow icon="⚙️" title="Ajustes" subtitle="Horarios, ubicación y más" onPress={() => navigation.navigate('ShopSettings')} />
          <ListRow icon="🐛" title="Reportar un problema" subtitle="Reporta errores o sugerencias" onPress={() => navigation.navigate('BugReport')} last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Onboarding checklist ─────────────────────────────────────────────────── */

function OnboardingCard({
  onboarding,
  onNavigate,
}: {
  onboarding: Onboarding;
  onNavigate: (screen: string) => void;
}) {
  const allDone = onboarding.hasServices && onboarding.hasBarbers && onboarding.hasProducts;
  if (allDone) return null;

  const steps = [
    {
      done: onboarding.hasServices,
      emoji: '✂️',
      label: 'Añade tus servicios',
      sub: 'Para que los clientes puedan reservar',
      screen: 'ShopServices',
    },
    {
      done: onboarding.hasBarbers,
      emoji: '👥',
      label: 'Invita a tu equipo',
      sub: 'Barberos que gestionarán las citas',
      screen: 'ShopBarbers',
    },
    {
      done: onboarding.hasProducts,
      emoji: '📦',
      label: 'Añade productos a la tienda',
      sub: 'Opcional — vende productos online',
      screen: 'Inventory',
    },
  ];

  const done = steps.filter((s) => s.done).length;
  const total = steps.length;

  return (
    <View style={obStyles.card}>
      <View style={obStyles.header}>
        <Text style={obStyles.title}>{'🚀'} Primeros pasos</Text>
        <Text style={obStyles.counter}>{done}/{total}</Text>
      </View>
      <View style={obStyles.progressBar}>
        <View style={[obStyles.progressFill, { width: `${(done / total) * 100}%` as any }]} />
      </View>
      {steps.map((step) => (
        <TouchableOpacity
          key={step.screen}
          style={obStyles.row}
          onPress={() => !step.done && onNavigate(step.screen)}
          activeOpacity={step.done ? 1 : 0.6}
        >
          <View style={[obStyles.check, step.done && obStyles.checkDone]}>
            <Text style={obStyles.checkText}>{step.done ? '✓' : ''}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[obStyles.stepLabel, step.done && obStyles.stepLabelDone]}>
              {step.emoji} {step.label}
            </Text>
            {!step.done && <Text style={obStyles.stepSub}>{step.sub}</Text>}
          </View>
          {!step.done && <Text style={obStyles.chevron}>›</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const obStyles = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C9A84C44',
    padding: 16,
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  counter: { fontSize: 13, fontWeight: '600', color: '#C9A84C' },
  progressBar: {
    height: 4,
    backgroundColor: '#282828',
    borderRadius: 2,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C9A84C',
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#282828',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  checkText: { fontSize: 13, fontWeight: '800', color: '#000' },
  stepLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  stepLabelDone: { color: '#888888', textDecorationLine: 'line-through' },
  stepSub: { fontSize: 11, color: '#888888', marginTop: 1 },
  chevron: { fontSize: 20, color: '#888888' },
});

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

/* ── List row ─────────────────────────────────────────────────────────────── */

function ListRow({ icon, title, subtitle, onPress, last }: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.listRow, !last && styles.listRowBorder]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.listRowIcon}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={styles.listRowText}>
        <Text style={styles.listRowTitle}>{title}</Text>
        <Text style={styles.listRowSub} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={styles.listRowChevron}>›</Text>
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

  // List section
  listSection: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  listRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GOLD + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listRowText: {
    flex: 1,
  },
  listRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
  },
  listRowSub: {
    fontSize: 11,
    color: MUTED,
    marginTop: 1,
  },
  listRowChevron: {
    fontSize: 20,
    color: MUTED,
    marginLeft: 8,
  },

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
