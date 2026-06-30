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
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { signOut } from '../../services/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';
import { useUnreadCount } from '../common/NotificationsScreen';

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
  const user = auth.currentUser;

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get owner's barbershopId
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const barbershopId = userDoc.data()?.barbershopId;
      if (!barbershopId) {
        setNoBarbershop(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setNoBarbershop(false);

      // Get shop name
      const shopDoc = await getDoc(doc(db, 'barbershops', barbershopId));
      if (shopDoc.exists()) setShopName(shopDoc.data()?.name ?? '');

      // Get all appointments for this barbershop
      const allSnap = await getDocs(query(
        collection(db, 'appointments'),
        where('barbershopId', '==', barbershopId),
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

      setStats({
        today: todayCount,
        pending: pendingCount,
        total: allSnap.size,
        revenue,
      });
    } catch (err) {
      console.error('[DashboardScreen] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  if (noBarbershop) {
    return (
      <View style={styles.centered}>
        <View style={styles.ctaCard}>
          <Text style={styles.ctaEmoji}>✂️</Text>
          <Text style={styles.ctaTitle}>Sin barbería registrada</Text>
          <Text style={styles.ctaSub}>
            Aún no tienes una barbería asociada a tu cuenta. Crea la tuya para empezar a gestionar citas, servicios y más.
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate('CreateBarbershop')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>Crear mi barbería</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={{ marginTop: 8 }}>
            <Text style={styles.logoutBtn}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={GOLD} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{shopName || 'Mi barbería'}</Text>
          <Text style={styles.sub}>{user?.displayName ?? user?.email}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ position: 'relative' }}>
            <Text style={{ fontSize: 20 }}>{'🔔'}</Text>
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute', top: -4, right: -4,
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: GOLD,
              }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut}>
            <Text style={styles.logoutBtn}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard label="Hoy" value={stats.today} emoji="📅" color={GOLD} />
        <StatCard label="Pendientes" value={stats.pending} emoji="⏳" color="#F59E0B" />
        <StatCard label="Total" value={stats.total} emoji="✂️" color="#10B981" />
      </View>

      {/* Revenue */}
      <TouchableOpacity style={styles.revenueCard} onPress={() => navigation.navigate('FinanceDashboard')} activeOpacity={0.8}>
        <Text style={styles.revenueLabel}>Ingresos totales</Text>
        <Text style={styles.revenueValue}>{stats.revenue.toFixed(2)} €</Text>
        <Text style={{fontSize: 12, color: MUTED, marginTop: 4}}>Toca para ver detalle →</Text>
      </TouchableOpacity>

      {/* Section: Mi Negocio */}
      <ActionSection title="Mi Negocio">
        <ActionCard emoji="📋" label="Citas"     onPress={() => navigation.navigate('ShopAppointments')} />
        <ActionCard emoji="👥" label="Barberos"  onPress={() => navigation.navigate('ShopBarbers')} />
        <ActionCard emoji="✂️" label="Servicios" onPress={() => navigation.navigate('ShopServices')} />
        <ActionCard emoji="⚙️" label="Ajustes"   onPress={() => navigation.navigate('ShopSettings')} />
      </ActionSection>

      {/* Section: Ventas */}
      <ActionSection title="Ventas">
        <ActionCard emoji="💰" label="Cobrar"     onPress={() => navigation.navigate('Sales')} />
        <ActionCard emoji="💳" label="Pagos"      onPress={() => navigation.navigate('PaymentHistory')} />
        <ActionCard emoji="📦" label="Inventario" onPress={() => navigation.navigate('Inventory')} />
        <ActionCard emoji="🛍️" label="Pedidos"    onPress={() => navigation.navigate('ProductOrders')} />
      </ActionSection>

      {/* Section: Clientes */}
      <ActionSection title="Clientes">
        <ActionCard emoji="👤" label="Clientes"        onPress={() => navigation.navigate('ClientHistory')} />
        <ActionCard emoji="⭐" label="Valoraciones"     onPress={() => navigation.navigate('Reviews')} />
        <ActionCard emoji="📝" label="Lista de espera"  onPress={() => navigation.navigate('Waitlist')} />
        <ActionCard emoji="🎖️" label="Fidelidad"        onPress={() => navigation.navigate('LoyaltySettings')} />
      </ActionSection>

      {/* Section: Marketing */}
      <ActionSection title="Marketing">
        <ActionCard emoji="🏷️" label="Promos"   onPress={() => navigation.navigate('Promos')} />
        <ActionCard emoji="📸" label="Galería"   onPress={() => navigation.navigate('Gallery')} />
        <ActionCard emoji="💬" label="Mensajes"  onPress={() => navigation.navigate('Messages')} />
      </ActionSection>

      {/* Section: Análisis */}
      <ActionSection title="Análisis">
        <ActionCard emoji="📊" label="Reportes" onPress={() => navigation.navigate('Reports')} />
      </ActionSection>
    </ScrollView>
  );
}

function StatCard({ label, value, emoji, color }: { label: string; value: number; emoji: string; color: string }) {
  return (
    <View style={[statStyles.card, { borderTopColor: color }]}>
      <Text style={statStyles.emoji}>{emoji}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function ActionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.wrapper}>
      <View style={sectionStyles.headerRow}>
        <View style={sectionStyles.dividerLeft} />
        <Text style={sectionStyles.title}>{title.toUpperCase()}</Text>
        <View style={sectionStyles.dividerRight} />
      </View>
      <View style={sectionStyles.grid}>{children}</View>
    </View>
  );
}

function ActionCard({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={actionStyles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={actionStyles.emojiWrapper}>
        <Text style={actionStyles.emoji}>{emoji}</Text>
      </View>
      <Text style={actionStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG, padding: 24 },
  content: { padding: 20, gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 22, fontWeight: '800', color: TEXT },
  sub: { fontSize: 13, color: MUTED, marginTop: 2 },
  logoutBtn: { fontSize: 14, color: '#EF4444', fontWeight: '600' },
  // No-barbershop CTA
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
  ctaEmoji: { fontSize: 52, marginBottom: 4 },
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
  statsRow: { flexDirection: 'row', gap: 10 },
  revenueCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  revenueLabel: { fontSize: 13, color: MUTED, fontWeight: '600' },
  revenueValue: { fontSize: 32, fontWeight: '800', color: GOLD },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 3,
  },
  emoji: { fontSize: 22 },
  value: { fontSize: 28, fontWeight: '800' },
  label: { fontSize: 11, color: MUTED, fontWeight: '600' },
});

const sectionStyles = StyleSheet.create({
  wrapper: { gap: 12 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLeft: {
    width: 18,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerRight: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 1.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});

const actionStyles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
  },
  emojiWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201,168,76,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  label: { fontSize: 13, fontWeight: '700', color: TEXT, textAlign: 'center' },
});
