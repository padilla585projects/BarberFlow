import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';

const GREEN = '#10B981';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

interface Stats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
  revenue: number;
  commissionRate: number;
  commissionEarned: number;
}

export function BarberStatsScreen() {
  const [stats, setStats] = useState<Stats>({
    today: 0, thisWeek: 0, thisMonth: 0, total: 0,
    pending: 0, completed: 0, cancelled: 0, revenue: 0,
    commissionRate: 0, commissionEarned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = auth.currentUser;
  const { activeBarbershopId } = useAuthContext();

  const fetchStats = async () => {
    if (!user || !activeBarbershopId) return;

    try {
      // Fetch commission rate from user doc
      let commissionRate = 0;
      const userSnap = await getDocs(query(
        collection(db, 'users'),
        where('uid', '==', user.uid),
      ));
      if (!userSnap.empty) {
        commissionRate = userSnap.docs[0].data().commissionRate ?? 0;
      }

      const snap = await getDocs(query(
        collection(db, 'appointments'),
        where('barberId', '==', user.uid),
        where('barbershopId', '==', activeBarbershopId),
      ));

      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let today = 0, thisWeek = 0, thisMonth = 0;
      let pending = 0, completed = 0, cancelled = 0, revenue = 0;

      snap.docs.forEach((d) => {
        const data = d.data();
        const date: Date = data.date?.toDate?.() ?? new Date(0);

        if (date >= todayStart) today++;
        if (date >= weekStart) thisWeek++;
        if (date >= monthStart) thisMonth++;

        if (data.status === 'pending') pending++;
        else if (data.status === 'completed') { completed++; revenue += (data.totalPrice ?? 0); }
        else if (data.status === 'cancelled') cancelled++;
      });

      const commissionEarned = revenue * (commissionRate / 100);

      setStats({
        today, thisWeek, thisMonth, total: snap.size,
        pending, completed, cancelled, revenue,
        commissionRate, commissionEarned,
      });
    } catch (err) {
      console.error('[BarberStatsScreen] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, [activeBarbershopId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={GOLD} />}
    >
      <Text style={styles.heading}>Mis estadísticas</Text>
      <Text style={styles.sub}>{user?.displayName ?? user?.email}</Text>

      {/* Revenue highlight */}
      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>Ingresos totales</Text>
        <Text style={styles.revenueValue}>{stats.revenue.toFixed(2)} €</Text>
      </View>

      {/* Commission section */}
      {stats.commissionRate > 0 && (
        <View style={styles.commissionCard}>
          <Text style={styles.commissionTitle}>Mi comision</Text>
          <View style={styles.commissionRow}>
            <View style={styles.commissionItem}>
              <Text style={styles.commissionRate}>{stats.commissionRate}%</Text>
              <Text style={styles.commissionItemLabel}>Porcentaje</Text>
            </View>
            <View style={styles.commissionDivider} />
            <View style={styles.commissionItem}>
              <Text style={styles.commissionEarned}>
                {stats.commissionEarned.toFixed(2)} €
              </Text>
              <Text style={styles.commissionItemLabel}>Ganancia</Text>
            </View>
          </View>
        </View>
      )}

      {/* Period stats */}
      <Text style={styles.sectionTitle}>Citas</Text>
      <View style={styles.statsRow}>
        <StatCard label="Hoy" value={stats.today} color={GOLD} />
        <StatCard label="Semana" value={stats.thisWeek} color="#3B82F6" />
        <StatCard label="Mes" value={stats.thisMonth} color="#8B5CF6" />
        <StatCard label="Total" value={stats.total} color="#10B981" />
      </View>

      {/* Status breakdown */}
      <Text style={styles.sectionTitle}>Por estado</Text>
      <View style={styles.breakdownCol}>
        <BreakdownRow label="Pendientes" value={stats.pending} color="#F59E0B" />
        <BreakdownRow label="Completadas" value={stats.completed} color="#10B981" />
        <BreakdownRow label="Canceladas" value={stats.cancelled} color="#EF4444" />
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[cardStyles.card, { borderTopColor: color }]}>
      <Text style={[cardStyles.value, { color }]}>{value}</Text>
      <Text style={cardStyles.label}>{label}</Text>
    </View>
  );
}

function BreakdownRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={rowStyles.row}>
      <View style={[rowStyles.dot, { backgroundColor: color }]} />
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  content: { padding: 20, gap: 20 },
  heading: { fontSize: 26, fontWeight: '800', color: TEXT },
  sub: { fontSize: 13, color: MUTED },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  statsRow: { flexDirection: 'row', gap: 8 },
  breakdownCol: { gap: 8 },
  revenueCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  revenueLabel: { fontSize: 13, color: MUTED, fontWeight: '600' },
  revenueValue: { fontSize: 34, fontWeight: '800', color: GOLD },
  commissionCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  commissionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
  commissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  commissionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  commissionDivider: {
    width: 1,
    height: 32,
    backgroundColor: BORDER,
  },
  commissionRate: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT,
  },
  commissionEarned: {
    fontSize: 22,
    fontWeight: '800',
    color: GREEN,
  },
  commissionItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 3,
  },
  value: { fontSize: 24, fontWeight: '800' },
  label: { fontSize: 11, color: MUTED, fontWeight: '600' },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT },
  value: { fontSize: 20, fontWeight: '800' },
});
