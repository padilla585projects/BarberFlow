import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import type { PointTransaction, LoyaltyReward } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

interface TierInfo {
  name: string;
  emoji: string;
  min: number;
  max: number;
}

const TIERS: TierInfo[] = [
  { name: 'Bronze',   emoji: '\u{1F949}', min: 0,   max: 99 },
  { name: 'Silver',   emoji: '\u{1F948}', min: 100, max: 299 },
  { name: 'Gold',     emoji: '\u{1F947}', min: 300, max: 599 },
  { name: 'Platinum', emoji: '\u{1F48E}', min: 600, max: Infinity },
];

const DEFAULT_REWARDS: LoyaltyReward[] = [
  { pointsCost: 50,  discountValue: 5,  description: '5€ descuento' },
  { pointsCost: 100, discountValue: 10, description: '10€ descuento' },
  { pointsCost: 200, discountValue: 25, description: '25€ descuento' },
  { pointsCost: 500, discountValue: 30, description: 'Servicio gratis (hasta 30€)' },
];

function getTier(points: number): TierInfo {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

function generatePromoCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BF-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function LoyaltyScreen() {
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Get user doc for points and barbershopId
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      setPoints(userData?.loyaltyPoints ?? 0);

      // Try to find the user's most-visited barbershop from their appointments
      if (!barbershopId) {
        const appointmentsSnap = await getDocs(
          query(collection(db, 'appointments'))
        );
        const userAppts = appointmentsSnap.docs.filter(
          (d) => d.data().clientId === user.uid
        );
        if (userAppts.length > 0) {
          // Use the most recent appointment's barbershop
          const sorted = userAppts.sort((a, b) => {
            const dateA = a.data().date?.toDate?.() ?? new Date(0);
            const dateB = b.data().date?.toDate?.() ?? new Date(0);
            return dateB.getTime() - dateA.getTime();
          });
          setBarbershopId(sorted[0].data().barbershopId);
        }
      }

      // Get points history (limited to last 50 entries for performance)
      const historySnap = await getDocs(
        query(
          collection(db, 'users', user.uid, 'pointsHistory'),
          orderBy('date', 'desc'),
          limit(50),
        ),
      );
      const historyData = historySnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type,
          points: data.points,
          description: data.description,
          date: data.date?.toDate?.() ?? new Date(),
          appointmentId: data.appointmentId,
        } as PointTransaction;
      });
      setHistory(historyData);
    } catch (err) {
      console.error('[LoyaltyScreen] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [barbershopId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRedeem = (reward: LoyaltyReward, index: number) => {
    if (points < reward.pointsCost) return;

    Alert.alert(
      'Canjear recompensa',
      `¿Quieres canjear ${reward.pointsCost} puntos por "${reward.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Canjear',
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;

            setRedeeming(index);
            try {
              const promoCode = generatePromoCode();

              // Create promo code in the barbershop's promos collection
              if (barbershopId) {
                await addDoc(collection(db, 'barbershops', barbershopId, 'promos'), {
                  code: promoCode,
                  type: 'fixed',
                  value: reward.discountValue,
                  description: `Loyalty: ${reward.description}`,
                  singleUse: true,
                  usedBy: null,
                  linkedClientId: user.uid,
                  createdAt: serverTimestamp(),
                  active: true,
                });
              }

              // Deduct points
              await updateDoc(doc(db, 'users', user.uid), {
                loyaltyPoints: increment(-reward.pointsCost),
              });

              // Add redemption to history
              await addDoc(collection(db, 'users', user.uid, 'pointsHistory'), {
                type: 'redeemed',
                points: reward.pointsCost,
                description: reward.description,
                date: serverTimestamp(),
              });

              setPoints((prev) => prev - reward.pointsCost);
              setHistory((prev) => [
                {
                  id: `temp-${Date.now()}`,
                  type: 'redeemed',
                  points: reward.pointsCost,
                  description: reward.description,
                  date: new Date(),
                },
                ...prev,
              ]);

              Alert.alert(
                'Recompensa canjeada',
                `Tu código de descuento es:\n\n${promoCode}\n\nMuéstralo al pagar.`,
              );
            } catch (err) {
              console.error('[LoyaltyScreen] Redeem error:', err);
              Alert.alert('Error', 'No se pudo canjear la recompensa');
            } finally {
              setRedeeming(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  const tier = getTier(points);
  const nextTier = TIERS.find((t) => t.min > points);
  const progressToNext = nextTier
    ? ((points - tier.min) / (nextTier.min - tier.min)) * 100
    : 100;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }}
          tintColor={GOLD}
        />
      }
    >
      {/* Points balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Mis puntos</Text>
        <Text style={styles.balanceValue}>{points}</Text>
        <View style={styles.tierRow}>
          <Text style={styles.tierEmoji}>{tier.emoji}</Text>
          <Text style={styles.tierName}>{tier.name}</Text>
        </View>
        {nextTier && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${Math.min(progressToNext, 100)}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {nextTier.min - points} pts para {nextTier.emoji} {nextTier.name}
            </Text>
          </View>
        )}
      </View>

      {/* How it works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Como funciona</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>1.</Text>
            <Text style={styles.infoText}>1 punto por cada 1€ gastado</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>2.</Text>
            <Text style={styles.infoText}>Puntos canjeables por descuentos</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>3.</Text>
            <Text style={styles.infoText}>Sube de nivel y desbloquea más beneficios</Text>
          </View>
        </View>
      </View>

      {/* Tier legend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Niveles</Text>
        <View style={styles.tiersRow}>
          {TIERS.map((t) => (
            <View
              key={t.name}
              style={[
                styles.tierCard,
                t.name === tier.name && styles.tierCardActive,
              ]}
            >
              <Text style={styles.tierCardEmoji}>{t.emoji}</Text>
              <Text
                style={[
                  styles.tierCardName,
                  t.name === tier.name && styles.tierCardNameActive,
                ]}
              >
                {t.name}
              </Text>
              <Text style={styles.tierCardRange}>
                {t.max === Infinity ? `${t.min}+` : `${t.min}-${t.max}`}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Available rewards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recompensas disponibles</Text>
        {DEFAULT_REWARDS.map((reward, idx) => {
          const canRedeem = points >= reward.pointsCost;
          return (
            <View key={idx} style={styles.rewardCard}>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardCost}>{reward.pointsCost} pts</Text>
                <Text style={styles.rewardDesc}>{reward.description}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.redeemBtn,
                  !canRedeem && styles.redeemBtnDisabled,
                ]}
                onPress={() => handleRedeem(reward, idx)}
                disabled={!canRedeem || redeeming === idx}
                activeOpacity={0.8}
              >
                {redeeming === idx ? (
                  <ActivityIndicator size="small" color={BG} />
                ) : (
                  <Text
                    style={[
                      styles.redeemBtnText,
                      !canRedeem && styles.redeemBtnTextDisabled,
                    ]}
                  >
                    Canjear
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Points history */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historial de puntos</Text>
        {history.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryEmoji}>📋</Text>
            <Text style={styles.emptyHistoryText}>
              Aún no tienes movimientos de puntos
            </Text>
          </View>
        ) : (
          history.map((item) => {
            const dateStr =
              item.date instanceof Date
                ? item.date
                : ((item.date as any)?.toDate?.() ?? new Date());
            const formatted = (dateStr as Date).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const isEarned = item.type === 'earned';

            return (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Text
                    style={[
                      styles.historyPoints,
                      { color: isEarned ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {isEarned ? '+' : '-'}
                    {item.points} pts
                  </Text>
                  <Text style={styles.historyDesc}>{item.description}</Text>
                </View>
                <Text style={styles.historyDate}>{formatted}</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  content: { padding: 16, paddingBottom: 40 },

  // Balance card
  balanceCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: GOLD + '40',
    padding: 24,
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  balanceLabel: { fontSize: 14, color: MUTED, fontWeight: '600' },
  balanceValue: {
    fontSize: 56,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: -1,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  tierEmoji: { fontSize: 22 },
  tierName: { fontSize: 16, fontWeight: '700', color: TEXT },
  progressContainer: { width: '100%', marginTop: 12, gap: 6 },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: BORDER,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
  },

  // Sections
  section: { marginBottom: 20, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT },

  // Info card
  infoCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: { fontSize: 14, fontWeight: '800', color: GOLD, width: 20 },
  infoText: { fontSize: 14, color: TEXT, flex: 1 },

  // Tiers row
  tiersRow: { flexDirection: 'row', gap: 8 },
  tierCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  tierCardActive: {
    borderColor: GOLD,
    backgroundColor: GOLD + '10',
  },
  tierCardEmoji: { fontSize: 20 },
  tierCardName: { fontSize: 10, fontWeight: '700', color: MUTED },
  tierCardNameActive: { color: GOLD },
  tierCardRange: { fontSize: 9, color: MUTED },

  // Rewards
  rewardCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardInfo: { flex: 1, gap: 2 },
  rewardCost: { fontSize: 15, fontWeight: '800', color: GOLD },
  rewardDesc: { fontSize: 13, color: MUTED },
  redeemBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  redeemBtnDisabled: {
    backgroundColor: BORDER,
  },
  redeemBtnText: { fontSize: 13, fontWeight: '700', color: BG },
  redeemBtnTextDisabled: { color: MUTED },

  // History
  emptyHistory: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyHistoryEmoji: { fontSize: 32 },
  emptyHistoryText: { fontSize: 13, color: MUTED, textAlign: 'center' },
  historyItem: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyLeft: { flex: 1, gap: 2 },
  historyPoints: { fontSize: 14, fontWeight: '800' },
  historyDesc: { fontSize: 12, color: MUTED },
  historyDate: { fontSize: 11, color: MUTED },
});
