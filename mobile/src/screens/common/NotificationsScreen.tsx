import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  doc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C   = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'appointment' | 'review' | 'loyalty' | 'payment' | 'summary' | 'general';
  read: boolean;
  createdAt: Timestamp | null;
  data?: Record<string, string>;
}

const TYPE_ICONS: Record<string, string> = {
  appointment: '✂️',
  review: '⭐',
  loyalty: '🎉',
  payment: '💰',
  summary: '📊',
  general: '🔔',
};

function getRelativeTime(ts: Timestamp | null): string {
  if (!ts) return '';
  const now = Date.now();
  const diff = now - ts.toDate().getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days}d`;
  const weeks = Math.floor(days / 7);
  return `hace ${weeks} sem`;
}

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const uid = auth.currentUser?.uid;

  const subscribe = useCallback(() => {
    if (!uid) {
      setLoading(false);
      return () => {};
    }

    const q = query(
      collection(db, 'users', uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50),
    );

    const unsub = onSnapshot(q, (snap) => {
      const items: AppNotification[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AppNotification, 'id'>),
      }));
      setNotifications(items);
      setLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.error('[NotificationsScreen] snapshot error:', err);
      setLoading(false);
      setRefreshing(false);
    });

    return unsub;
  }, [uid]);

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  const markAllRead = async () => {
    if (!uid) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'users', uid, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const markRead = async (notif: AppNotification) => {
    if (!uid || notif.read) return;
    await updateDoc(doc(db, 'users', uid, 'notifications', notif.id), { read: true });
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const icon = TYPE_ICONS[item.type] || TYPE_ICONS.general;
    return (
      <TouchableOpacity
        style={[
          styles.card,
          !item.read && styles.cardUnread,
        ]}
        activeOpacity={0.7}
        onPress={() => markRead(item)}
      >
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardText} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.cardTime}>{getRelativeTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
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
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        {notifications.some((n) => !n.read) && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllBtn}>Marcar todo leido</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); subscribe(); }}
            tintColor={GOLD}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'🔔'}</Text>
            <Text style={styles.emptyText}>No tienes notificaciones</Text>
          </View>
        }
      />
    </View>
  );
}

/** Hook to get unread notification count for badge display */
export function useUnreadCount(): number {
  const [count, setCount] = useState(0);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, 'users', uid, 'notifications'),
      where('read', '==', false),
    );

    const unsub = onSnapshot(q, (snap) => {
      setCount(snap.size);
    }, () => setCount(0));

    return unsub;
  }, [uid]);

  return count;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT_C },
  markAllBtn: { fontSize: 13, fontWeight: '600', color: GOLD },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  emptyContainer: { flex: 1 },
  card: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    alignItems: 'flex-start',
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  icon: { fontSize: 24, marginTop: 2 },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT_C },
  cardText: { fontSize: 13, color: MUTED, lineHeight: 18 },
  cardTime: { fontSize: 11, color: MUTED, marginTop: 2 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 48, opacity: 0.4 },
  emptyText: { fontSize: 15, color: MUTED },
});
