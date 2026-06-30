import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth, db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import type { User } from '../../types';
import type { OwnerStackParamList } from '../../navigation/OwnerNavigator';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

interface BarberWithStats extends User {
  appointmentCount: number;
  totalRevenue: number;
  commissionRate?: number;
}

export function ShopBarbersScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<OwnerStackParamList>>();
  const [barbers, setBarbers] = useState<BarberWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { activeBarbershopId } = useAuthContext();
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);

  const generateInviteCode = async () => {
    const user = auth.currentUser;
    if (!user || !activeBarbershopId) return;

    setGeneratingCode(true);
    try {
      // Fetch barbershop name
      const shopDoc = await getDoc(doc(db, 'barbershops', activeBarbershopId));
      const barbershopName = shopDoc.data()?.name ?? 'Barbería';

      // Generate random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

      await setDoc(doc(db, 'invitations', code), {
        barbershopId: activeBarbershopId,
        barbershopName,
        createdBy: user.uid,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        used: false,
      });

      setInviteCode(code);
      setInviteModalVisible(true);
    } catch (err) {
      console.error('[ShopBarbersScreen] Error generating invite code:', err);
      Alert.alert('Error', 'No se pudo generar el código. Inténtalo de nuevo.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await Share.share({
        message: `Tu código de invitación para unirte como barbero es: ${inviteCode}. Válido durante 24 horas. Descarga BarberFlow e introdúcelo en "Unirse como barbero".`,
        title: 'Código de invitación',
      });
    } catch {
      Alert.alert('Código', inviteCode, [{ text: 'OK' }]);
    }
  };

  const fetchBarbers = useCallback(async () => {
    if (!activeBarbershopId) return;
    const id = activeBarbershopId;

    try {
      // Fetch users belonging to this barbershop with role barber or owner
      const usersQuery = query(
        collection(db, 'users'),
        where('barbershopId', '==', id),
        where('role', 'in', ['barber', 'owner']),
      );
      const usersSnap = await getDocs(usersQuery);

      const barberList: BarberWithStats[] = await Promise.all(
        usersSnap.docs.map(async (userDoc) => {
          const userData = userDoc.data() as User;

          // Fetch completed appointments for this barber
          let appointmentCount = 0;
          let totalRevenue = 0;

          try {
            const apptQuery = query(
              collection(db, 'appointments'),
              where('barberId', '==', userData.uid),
              where('status', '==', 'completed'),
            );
            const apptSnap = await getDocs(apptQuery);

            appointmentCount = apptSnap.size;
            apptSnap.docs.forEach((apptDoc) => {
              const appt = apptDoc.data();
              totalRevenue += appt.totalPrice ?? 0;
            });
          } catch (err) {
            console.error(`[ShopBarbersScreen] Error fetching stats for ${userData.uid}:`, err);
          }

          return {
            ...userData,
            appointmentCount,
            totalRevenue,
            commissionRate: userDoc.data().commissionRate,
          };
        }),
      );

      // Sort: owners first, then alphabetically by name
      barberList.sort((a, b) => {
        if (a.role === 'owner' && b.role !== 'owner') return -1;
        if (a.role !== 'owner' && b.role === 'owner') return 1;
        return (a.displayName ?? '').localeCompare(b.displayName ?? '');
      });

      setBarbers(barberList);
    } catch (err) {
      console.error('[ShopBarbersScreen] Error fetching barbers:', err);
    }
  }, [activeBarbershopId]);

  useEffect(() => {
    const init = async () => {
      await fetchBarbers();
      setLoading(false);
    };
    init();
  }, [activeBarbershopId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBarbers();
    setRefreshing(false);
  }, [fetchBarbers]);

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const getInitial = (name?: string): string => {
    if (!name || name.length === 0) return '?';
    return name.charAt(0).toUpperCase();
  };

  const renderBarber = ({ item }: { item: BarberWithStats }) => {
    const isOwner = item.role === 'owner';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('BarberEarnings', {
            barberId: item.uid,
            barberName: item.displayName ?? 'Barbero',
          })
        }
      >
        <View style={styles.cardHeader}>
          {/* Avatar */}
          <View style={[styles.avatar, isOwner && styles.avatarOwner]}>
            <Text style={styles.avatarText}>{getInitial(item.displayName)}</Text>
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
            <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
          </View>

          {/* Role badge */}
          <View style={[styles.badge, isOwner && styles.badgeOwner]}>
            <Text style={[styles.badgeText, isOwner && styles.badgeTextOwner]}>
              {isOwner ? 'Dueno' : 'Barbero'}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.appointmentCount}</Text>
            <Text style={styles.statLabel}>Citas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: GOLD }]}>
              {formatCurrency(item.totalRevenue)}
            </Text>
            <Text style={styles.statLabel}>Ingresos</Text>
          </View>
          {item.commissionRate != null && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.commissionRate}%</Text>
                <Text style={styles.statLabel}>Comision</Text>
              </View>
            </>
          )}
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

  if (!activeBarbershopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No se encontro la barberia asociada.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Equipo</Text>
            <Text style={styles.subtitle}>
              {barbers.length} {barbers.length === 1 ? 'miembro' : 'miembros'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.inviteBtn, generatingCode && { opacity: 0.6 }]}
            onPress={generateInviteCode}
            disabled={generatingCode}
            activeOpacity={0.8}
          >
            {generatingCode ? (
              <ActivityIndicator size="small" color={BG} />
            ) : (
              <Text style={styles.inviteBtnText}>+ Invitar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Invite code modal */}
      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Código de invitación</Text>
            <Text style={styles.modalSub}>
              Comparte este código con tu barbero.{'\n'}Expira en 24 horas.
            </Text>

            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{inviteCode}</Text>
            </View>

            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopyCode}
              activeOpacity={0.8}
            >
              <Text style={styles.copyBtnText}>Compartir código</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setInviteModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeModalText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FlatList
        data={barbers}
        keyExtractor={(item) => item.uid}
        renderItem={renderBarber}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GOLD}
            colors={[GOLD]}
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No hay barberos registrados.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
    padding: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  inviteBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtnText: {
    color: BG,
    fontWeight: '800',
    fontSize: 14,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT,
  },
  modalSub: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  codeBox: {
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingHorizontal: 32,
    paddingVertical: 18,
    marginVertical: 4,
  },
  codeText: {
    fontSize: 36,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 8,
  },
  copyBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  copyBtnText: {
    color: BG,
    fontWeight: '800',
    fontSize: 15,
  },
  closeModalBtn: {
    paddingVertical: 8,
  },
  closeModalText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOwner: {
    backgroundColor: GOLD,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
  email: {
    fontSize: 12,
    color: MUTED,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#282828',
  },
  badgeOwner: {
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
  },
  badgeTextOwner: {
    color: GOLD,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: BORDER,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
  },
  emptyText: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
  },
});
