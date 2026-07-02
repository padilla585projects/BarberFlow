import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  or,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'owner' | 'barber';
  recipientId: string; // uid or 'all'
  text: string;
  createdAt: any;
}

interface BarberInfo {
  uid: string;
  name: string;
}

export function MessagesScreen() {
  const user = auth.currentUser;
  const { activeBarbershopId } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // User info
  const [userRole, setUserRole] = useState<'owner' | 'barber' | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [barbers, setBarbers] = useState<BarberInfo[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('all');
  const [ownerName, setOwnerName] = useState('');

  // Load user data and barbershop info
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        if (!userData) return;

        const role = userData.role as 'owner' | 'barber';
        const shopId = activeBarbershopId ?? (userData.barbershopId as string);
        setUserRole(role);
        setBarbershopId(shopId);

        if (!shopId) return;

        const shopDoc = await getDoc(doc(db, 'barbershops', shopId));
        const shopData = shopDoc.data();
        if (!shopData) return;

        if (role === 'owner') {
          // Load barber list
          const barberUids: string[] = shopData.barbers ?? [];
          const barberInfos: BarberInfo[] = [];
          for (const uid of barberUids) {
            const barberDoc = await getDoc(doc(db, 'users', uid));
            const bd = barberDoc.data();
            barberInfos.push({
              uid,
              name: bd?.displayName ?? bd?.name ?? 'Barbero',
            });
          }
          setBarbers(barberInfos);
        } else {
          // Barber: find owner name
          const ownerId = shopData.ownerId as string | undefined;
          if (ownerId) {
            const ownerDoc = await getDoc(doc(db, 'users', ownerId));
            const od = ownerDoc.data();
            setOwnerName(od?.displayName ?? od?.name ?? 'Dueño');
            setSelectedRecipient(ownerId);
          }
        }
      } catch (err) {
        console.error('[MessagesScreen] Init error:', err);
      }
    })();
  }, [user, activeBarbershopId]);

  // Subscribe to messages
  useEffect(() => {
    if (!barbershopId || !userRole || !user) return;

    const messagesRef = collection(db, 'barbershops', barbershopId, 'messages');

    let q;
    if (userRole === 'owner') {
      // Owner sees all messages
      q = query(messagesRef, orderBy('createdAt', 'desc'));
    } else {
      // Barber sees: messages sent to them, broadcasts, or messages they sent
      q = query(
        messagesRef,
        or(
          where('recipientId', '==', user.uid),
          where('recipientId', '==', 'all'),
          where('senderId', '==', user.uid),
        ),
        orderBy('createdAt', 'desc'),
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
      setLoading(false);
    }, (err) => {
      console.error('[MessagesScreen] Snapshot error:', err);
      setLoading(false);
    });

    return unsub;
  }, [barbershopId, userRole, user]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !user || !barbershopId || !userRole || sending) return;

    setSending(true);
    try {
      const messagesRef = collection(db, 'barbershops', barbershopId, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        senderName: user.displayName ?? user.email ?? 'Usuario',
        senderRole: userRole,
        recipientId: selectedRecipient,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      setText('');
    } catch (err) {
      console.error('[MessagesScreen] Send error:', err);
    } finally {
      setSending(false);
    }
  }, [text, user, barbershopId, userRole, selectedRecipient, sending]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msgDate = new Date(date);
    msgDate.setHours(0, 0, 0, 0);

    if (msgDate.getTime() === today.getTime()) return 'Hoy';

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgDate.getTime() === yesterday.getTime()) return 'Ayer';

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnerMsg = item.senderRole === 'owner';
    const isBroadcast = item.recipientId === 'all';
    const isMine = item.senderId === user?.uid;

    if (isBroadcast) {
      return (
        <View style={styles.broadcastBubble}>
          <Text style={styles.broadcastLabel}>Para todos</Text>
          <Text style={styles.senderName}>{item.senderName}</Text>
          <Text style={styles.broadcastText}>{item.text}</Text>
          <Text style={styles.timeRight}>{formatTime(item.createdAt)}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
        <View
          style={[
            styles.bubble,
            isMine
              ? styles.bubbleMine
              : styles.bubbleTheirs,
          ]}
        >
          <Text style={[styles.senderName, isMine && styles.senderNameDark]}>
            {item.senderName}
          </Text>
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextDark]}>
            {item.text}
          </Text>
          <Text style={[styles.timeRight, isMine && styles.timeDark]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Recipient selector (owner only) */}
      {userRole === 'owner' && barbers.length > 0 && (
        <View style={styles.recipientBar}>
          <TouchableOpacity
            style={[
              styles.recipientPill,
              selectedRecipient === 'all' && styles.recipientPillActive,
            ]}
            onPress={() => setSelectedRecipient('all')}
          >
            <Text
              style={[
                styles.recipientPillText,
                selectedRecipient === 'all' && styles.recipientPillTextActive,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>
          {barbers.map((b) => (
            <TouchableOpacity
              key={b.uid}
              style={[
                styles.recipientPill,
                selectedRecipient === b.uid && styles.recipientPillActive,
              ]}
              onPress={() => setSelectedRecipient(b.uid)}
            >
              <Text
                style={[
                  styles.recipientPillText,
                  selectedRecipient === b.uid && styles.recipientPillTextActive,
                ]}
              >
                {b.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Empty state — fuera del FlatList inverted para que no se vea al revés */}
      {messages.length === 0 && !loading && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyText}>No hay mensajes</Text>
        </View>
      )}

      {/* Messages list */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={null}
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={MUTED}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color={BG} />
          ) : (
            <Text style={styles.sendBtnText}>{'→'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },

  // Recipient bar
  recipientBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  recipientPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  recipientPillActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  recipientPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  recipientPillTextActive: {
    color: BG,
  },

  // Messages list
  listContent: {
    padding: 16,
    gap: 8,
  },

  // Bubble
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: GOLD,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: SURFACE,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    marginBottom: 2,
  },
  senderNameDark: {
    color: 'rgba(0,0,0,0.5)',
  },
  bubbleText: {
    fontSize: 15,
    color: TEXT,
    lineHeight: 20,
  },
  bubbleTextDark: {
    color: '#1A1A1A',
  },
  timeRight: {
    fontSize: 10,
    color: MUTED,
    textAlign: 'right',
    marginTop: 4,
  },
  timeDark: {
    color: 'rgba(0,0,0,0.4)',
  },

  // Broadcast
  broadcastBubble: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: GOLD + '10',
    marginVertical: 4,
  },
  broadcastLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    marginBottom: 4,
  },
  broadcastText: {
    fontSize: 15,
    color: TEXT,
    lineHeight: 20,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 64,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: MUTED, fontWeight: '600' },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: TEXT,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: BG,
  },
});
