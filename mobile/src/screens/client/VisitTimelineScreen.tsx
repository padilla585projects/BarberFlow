import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';
import type { Appointment } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

// ── Helpers ────────────────────────────────────────────────────────────────

function toDate(raw: any): Date {
  if (raw instanceof Date) return raw;
  if (raw?.toDate) return raw.toDate();
  return new Date();
}

function monthKey(date: Date): string {
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function fmtShortDate(date: Date): string {
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── Stats ──────────────────────────────────────────────────────────────────

interface Stats {
  totalVisits: number;
  totalSpent: number;
  topShop: string | null;
  topService: string | null;
  currentStreak: number; // consecutive months with at least 1 visit
}

function computeStats(apts: Appointment[]): Stats {
  const completed = apts.filter((a) => a.status === 'completed');

  const totalVisits = completed.length;
  const totalSpent = completed.reduce((s, a) => s + (a.totalPrice ?? 0), 0);

  // Top shop
  const shopCount: Record<string, number> = {};
  for (const a of completed) {
    const name = a.barbershopName ?? 'Desconocida';
    shopCount[name] = (shopCount[name] ?? 0) + 1;
  }
  const topShop = Object.entries(shopCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Top service
  const svcCount: Record<string, number> = {};
  for (const a of completed) {
    for (const s of a.services ?? []) {
      svcCount[s.name] = (svcCount[s.name] ?? 0) + 1;
    }
  }
  const topService = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Streak: consecutive months (going back from now) that have at least one visit
  const visitedMonths = new Set(
    completed.map((a) => {
      const d = toDate(a.date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }),
  );
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (visitedMonths.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return { totalVisits, totalSpent, topShop, topService, currentStreak: streak };
}

// ── Component ──────────────────────────────────────────────────────────────

interface Section {
  title: string;
  data: Appointment[];
}

export function VisitTimelineScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList>>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }
    try {
      const q = query(
        collection(db, 'appointments'),
        where('clientId', '==', user.uid),
        where('status', '==', 'completed'),
        orderBy('date', 'desc'),
      );
      const snap = await getDocs(q);
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)));
    } catch (err) {
      console.error('[VisitTimeline] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const stats = useMemo(() => computeStats(appointments), [appointments]);

  // Group by month
  const sections: Section[] = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      const key = monthKey(toDate(a.date));
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return Object.entries(map).map(([title, data]) => ({ title, data }));
  }, [appointments]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📅 Mi historial</Text>
        <View style={styles.backBtn} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        ListHeaderComponent={
          appointments.length > 0 ? (
            <View style={styles.statsGrid}>
              <StatCard emoji="💈" value={String(stats.totalVisits)} label="Visitas" />
              <StatCard emoji="💶" value={`${stats.totalSpent.toFixed(0)} €`} label="Gastado" />
              <StatCard emoji="🔥" value={`${stats.currentStreak}m`} label="Racha" />
              {stats.topShop && <StatCard emoji="✂️" value={stats.topShop} label="Barbería fav." small />}
              {stats.topService && <StatCard emoji="⭐" value={stats.topService} label="Servicio fav." small />}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>Sin visitas completadas</Text>
            <Text style={styles.emptySub}>
              Aquí aparecerá el historial de todas tus citas terminadas
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title.charAt(0).toUpperCase() + section.title.slice(1)}</Text>
            <Text style={styles.sectionCount}>{section.data.length} {section.data.length === 1 ? 'visita' : 'visitas'}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const date = toDate(item.date);
          const isLast = index === section.data.length - 1;
          return (
            <TimelineItem
              appointment={item}
              date={date}
              isLast={isLast}
              onReview={
                !item.reviewed
                  ? () => navigation.navigate('Review', {
                      appointmentId: item.id,
                      barberName: item.barberName ?? 'Barbero',
                      barbershopId: item.barbershopId,
                      barberId: item.barberId,
                    })
                  : undefined
              }
            />
          );
        }}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────

function StatCard({ emoji, value, label, small }: { emoji: string; value: string; label: string; small?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, small && styles.statValueSmall]} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── TimelineItem ───────────────────────────────────────────────────────────

function TimelineItem({
  appointment: a,
  date,
  isLast,
  onReview,
}: {
  appointment: Appointment;
  date: Date;
  isLast: boolean;
  onReview?: () => void;
}) {
  const services = a.services?.map((s) => s.name).join(', ') ?? '—';

  return (
    <View style={styles.timelineRow}>
      {/* Dot + line */}
      <View style={styles.dotCol}>
        <View style={styles.dot} />
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Content card */}
      <View style={[styles.card, isLast && { marginBottom: 8 }]}>
        <View style={styles.cardTop}>
          <Text style={styles.cardDate}>{fmtShortDate(date)}</Text>
          <Text style={styles.cardTime}>{a.timeSlot}</Text>
        </View>

        {a.barbershopName && (
          <Text style={styles.cardShop}>{a.barbershopName}</Text>
        )}
        {a.barberName && (
          <Text style={styles.cardBarber}>✂️ {a.barberName}</Text>
        )}

        <Text style={styles.cardServices} numberOfLines={2}>{services}</Text>

        <View style={styles.cardBottom}>
          <Text style={styles.cardPrice}>
            {(a.totalPrice ?? 0) > 0 ? `${(a.totalPrice).toFixed(2)} €` : ''}
          </Text>
          {onReview && (
            <TouchableOpacity style={styles.reviewBtn} onPress={onReview} activeOpacity={0.8}>
              <Text style={styles.reviewBtnText}>⭐ Valorar</Text>
            </TouchableOpacity>
          )}
          {!onReview && a.reviewed && (
            <Text style={styles.reviewedBadge}>✓ Valorada</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 30, color: GOLD, lineHeight: 34 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT },

  // Content
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 16,
  },
  statCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    minWidth: 90,
    flex: 1,
  },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: '800', color: GOLD, textAlign: 'center' },
  statValueSmall: { fontSize: 13, fontWeight: '700' },
  statLabel: { fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: TEXT },
  sectionCount: { fontSize: 12, color: MUTED },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center', paddingHorizontal: 32 },

  // Timeline
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },

  // Dot + line column
  dotCol: {
    width: 16,
    alignItems: 'center',
    paddingTop: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: BG,
    zIndex: 1,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: BORDER,
    marginTop: 4,
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 5,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: { fontSize: 13, fontWeight: '700', color: TEXT },
  cardTime: { fontSize: 12, color: MUTED },
  cardShop: { fontSize: 14, fontWeight: '700', color: TEXT },
  cardBarber: { fontSize: 12, color: GOLD, fontWeight: '600' },
  cardServices: { fontSize: 12, color: MUTED, lineHeight: 18 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardPrice: { fontSize: 14, fontWeight: '700', color: GOLD },
  reviewBtn: {
    borderWidth: 1,
    borderColor: GOLD + '55',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reviewBtnText: { fontSize: 12, color: GOLD, fontWeight: '700' },
  reviewedBadge: { fontSize: 11, color: '#10B981', fontWeight: '600' },
});
