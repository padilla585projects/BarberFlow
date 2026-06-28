import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { signOut } from '../../services/auth';

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
}

export function DashboardScreen() {
  const [stats, setStats] = useState<Stats>({ today: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [todaySnap, pendingSnap, totalSnap] = await Promise.all([
          getDocs(query(
            collection(db, 'appointments'),
            where('ownerId', '==', user.uid),
            where('date', '>=', today),
            where('date', '<', tomorrow),
          )),
          getDocs(query(
            collection(db, 'appointments'),
            where('ownerId', '==', user.uid),
            where('status', '==', 'pending'),
          )),
          getDocs(query(
            collection(db, 'appointments'),
            where('ownerId', '==', user.uid),
          )),
        ]);

        setStats({
          today: todaySnap.size,
          pending: pendingSnap.size,
          total: totalSnap.size,
        });
      } catch (err) {
        console.error('[DashboardScreen] Error:', err);
      } finally {
        setLoading(false);
      }
    };

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Panel de propietario</Text>
          <Text style={styles.sub}>{user?.displayName ?? user?.email}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.logoutBtn}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard label="Hoy" value={stats.today} emoji="📅" color={GOLD} />
        <StatCard label="Pendientes" value={stats.pending} emoji="⏳" color="#F59E0B" />
        <StatCard label="Total" value={stats.total} emoji="✂️" color="#10B981" />
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Gestión</Text>
      <View style={styles.actionsGrid}>
        <ActionCard emoji="👥" label="Barberos" onPress={() => Alert.alert('Próximamente', 'Gestión de barberos')} />
        <ActionCard emoji="✂️" label="Servicios" onPress={() => Alert.alert('Próximamente', 'Gestión de servicios')} />
        <ActionCard emoji="📊" label="Informes" onPress={() => Alert.alert('Próximamente', 'Informes de ventas')} />
        <ActionCard emoji="⚙️" label="Configurar" onPress={() => Alert.alert('Próximamente', 'Configuración de la barbería')} />
      </View>
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

function ActionCard({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={actionStyles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={actionStyles.emoji}>{emoji}</Text>
      <Text style={actionStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  content: { padding: 20, gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 22, fontWeight: '800', color: TEXT },
  sub: { fontSize: 13, color: MUTED, marginTop: 2 },
  logoutBtn: { fontSize: 14, color: '#EF4444', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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

const actionStyles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  emoji: { fontSize: 28 },
  label: { fontSize: 14, fontWeight: '700', color: TEXT },
});
