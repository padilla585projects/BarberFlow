import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Membership } from '../../types';

type Props = NativeStackScreenProps<any, 'ShopSelector'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

export function ShopSelectorScreen({ navigation }: Props) {
  const { memberships, activeBarbershopId } = useAuthContext();
  const [saving, setSaving] = useState<string | null>(null);

  const handleSelect = async (membership: Membership) => {
    const user = auth.currentUser;
    if (!user) return;
    if (membership.barbershopId === activeBarbershopId) {
      // Already active — just go back
      navigation.goBack();
      return;
    }

    setSaving(membership.barbershopId);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        activeBarbershopId: membership.barbershopId,
      });
      // The useAuth realtime listener will update and RootNavigator
      // will re-render to the correct navigator automatically.
      navigation.goBack();
    } catch (err) {
      console.error('[ShopSelectorScreen] Error switching barbershop:', err);
    } finally {
      setSaving(null);
    }
  };

  const handleClientMode = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving('client');
    try {
      // Clear activeBarbershopId so RootNavigator falls through to ClientNavigator
      await updateDoc(doc(db, 'users', user.uid), {
        activeBarbershopId: null,
      });
      navigation.goBack();
    } catch (err) {
      console.error('[ShopSelectorScreen] Error entering client mode:', err);
    } finally {
      setSaving(null);
    }
  };

  const renderItem = ({ item }: { item: Membership }) => {
    const isActive = item.barbershopId === activeBarbershopId;
    const isSaving = saving === item.barbershopId;
    const roleLabel = item.role === 'owner' ? 'Dueño' : 'Barbero';

    return (
      <TouchableOpacity
        style={[styles.card, isActive && styles.cardActive]}
        onPress={() => handleSelect(item)}
        disabled={saving !== null}
        activeOpacity={0.75}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.shopName}>{item.barbershopName}</Text>
          <View style={[styles.roleBadge, item.role === 'owner' ? styles.roleBadgeOwner : styles.roleBadgeBarber]}>
            <Text style={[styles.roleText, item.role === 'owner' ? styles.roleTextOwner : styles.roleTextBarber]}>
              {roleLabel}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          {isSaving ? (
            <ActivityIndicator size="small" color={GOLD} />
          ) : isActive ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titleBadge}>Cambiar barbería</Text>
          <Text style={styles.title}>Selecciona tu barbería</Text>
          <Text style={styles.subtitle}>
            Elige la barbería en la que quieres trabajar ahora.
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Membership list */}
        <FlatList
          data={memberships}
          keyExtractor={(item) => item.barbershopId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No perteneces a ninguna barbería.</Text>
          }
        />

        <View style={styles.divider} />

        {/* Client mode option */}
        <TouchableOpacity
          style={styles.clientBtn}
          onPress={handleClientMode}
          disabled={saving !== null}
          activeOpacity={0.75}
        >
          {saving === 'client' ? (
            <ActivityIndicator color={MUTED} />
          ) : (
            <>
              <Text style={styles.clientBtnIcon}>👤</Text>
              <Text style={styles.clientBtnText}>Modo cliente</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 20,
    gap: 6,
  },
  titleBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 4,
  },
  list: {
    paddingVertical: 16,
  },
  separator: {
    height: 10,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardActive: {
    borderColor: GOLD,
    backgroundColor: '#1A1500',
  },
  cardLeft: {
    flex: 1,
    gap: 8,
  },
  cardRight: {
    marginLeft: 12,
    width: 28,
    alignItems: 'center',
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  roleBadgeOwner: {
    backgroundColor: GOLD + '20',
    borderColor: GOLD + '60',
  },
  roleBadgeBarber: {
    backgroundColor: '#FFFFFF10',
    borderColor: '#FFFFFF30',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  roleTextOwner: {
    color: GOLD,
  },
  roleTextBarber: {
    color: MUTED,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '800',
    color: GOLD,
  },
  emptyText: {
    textAlign: 'center',
    color: MUTED,
    fontSize: 14,
    marginTop: 32,
  },
  // Client mode
  clientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    marginTop: 12,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  clientBtnIcon: {
    fontSize: 18,
  },
  clientBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: MUTED,
  },
});
