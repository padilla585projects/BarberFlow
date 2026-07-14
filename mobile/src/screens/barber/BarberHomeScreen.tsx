import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../services/firebase";
import { useAuthContext } from "../../contexts/AuthContext";
import { useBarberTheme } from "../../theme/barberTheme";
import type { BarberStackParamList } from "../../navigation/BarberNavigator";
import type { Appointment } from "../../types";
import { AppointmentList } from "../../components/AppointmentList";

type Nav = NativeStackNavigationProp<BarberStackParamList>;

interface EarningsData {
  today: number;
  commissionRate: number;
  commissionEarned: number;
  commissionEnabled: boolean;
  commissionType: 'percentage' | 'fixed'; // % o €
}

interface AvailabilityStatus {
  isAvailable: boolean;
  lastUpdated: Date;
}

export function BarberHomeScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useBarberTheme();
  const { activeBarbershopId } = useAuthContext();
  const user = auth.currentUser;

  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    commissionRate: 0,
    commissionEarned: 0,
    commissionEnabled: false,
    commissionType: 'percentage',
  });
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [availability, setAvailability] = useState<AvailabilityStatus>({
    isAvailable: true,
    lastUpdated: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState({
    start: "--:--",
    end: "--:--",
    break: "--:--",
  });
  const [showAppointmentList, setShowAppointmentList] = useState(false);

  const fetchCommissionData = async (): Promise<{
    rate: number;
    enabled: boolean;
    type: 'percentage' | 'fixed';
  }> => {
    if (!user) return { rate: 0, enabled: false, type: 'percentage' };
    try {
      const userSnap = await getDocs(
        query(collection(db, "users"), where("uid", "==", user.uid))
      );
      if (userSnap.empty) return { rate: 0, enabled: false, type: 'percentage' };
      const data = userSnap.docs[0].data();
      return {
        rate: data.commissionRate ?? 0,
        enabled: data.commissionEnabled ?? false,
        type: data.commissionType ?? 'percentage',
      };
    } catch (err) {
      console.error("[BarberHomeScreen] Error fetching commission data:", err);
      return { rate: 0, enabled: false, type: 'percentage' };
    }
  };

  useEffect(() => {
    if (!user || !activeBarbershopId) return;

    const fetchTodayEarnings = async () => {
      const commissionData = await fetchCommissionData();
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const unsubscribe = onSnapshot(
        query(
          collection(db, "appointments"),
          where("barberId", "==", user.uid),
          where("barbershopId", "==", activeBarbershopId),
          where("status", "==", "completed"),
          orderBy("date", "desc")
        ),
        (snap) => {
          let revenue = 0;
          snap.docs.forEach((d) => {
            const data = d.data();
            const date: Date = data.date?.toDate?.() ?? new Date(0);
            if (date >= todayStart && date <= todayEnd) {
              revenue += data.totalPrice ?? 0;
            }
          });

          // Calcular ganancia según tipo de comisión
          let commissionEarned = 0;
          if (commissionData.enabled) {
            if (commissionData.type === 'percentage') {
              commissionEarned = revenue * (commissionData.rate / 100);
            } else {
              // tipo 'fixed': cantidad fija en euros
              commissionEarned = commissionData.rate;
            }
          }

          setEarnings({
            today: revenue,
            commissionRate: commissionData.rate,
            commissionEarned,
            commissionEnabled: commissionData.enabled,
            commissionType: commissionData.type,
          });
        }
      );

      return unsubscribe;
    };

    fetchTodayEarnings().then((unsub) => {
      setLoading(false);
      return unsub;
    });
  }, [user, activeBarbershopId]);

  useEffect(() => {
    if (!user || !activeBarbershopId) return;

    const now = new Date();
    const unsubscribe = onSnapshot(
      query(
        collection(db, "appointments"),
        where("barberId", "==", user.uid),
        where("barbershopId", "==", activeBarbershopId),
        where("status", "==", "pending"),
        orderBy("date", "asc"),
        limit(1)
      ),
      (snap) => {
        if (!snap.empty) {
          const data = snap.docs[0].data();
          const date: Date = data.date?.toDate?.() ?? new Date(0);
          if (date > now) {
            setNextAppointment({
              id: snap.docs[0].id,
              ...data,
            } as Appointment);
          }
        } else {
          setNextAppointment(null);
        }
      }
    );

    return () => unsubscribe();
  }, [user, activeBarbershopId]);

  // Load barber's availability status and today's schedule
  useEffect(() => {
    if (!user || !activeBarbershopId) return;

    const barberDocRef = doc(
      db,
      'barbershops',
      activeBarbershopId,
      'barbers',
      user.uid
    );

    const unsubscribe = onSnapshot(
      barberDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          // Load availability status
          if (typeof data.isAvailable === 'boolean') {
            setAvailability((prev) => ({
              ...prev,
              isAvailable: data.isAvailable,
              lastUpdated: data.availabilityUpdatedAt?.toDate?.() ?? new Date(),
            }));
          }

          // Load today's schedule
          const now = new Date();
          const todaySchedule = data.schedule?.[now.getDay()];
          if (todaySchedule) {
            setTodaySchedule({
              start: todaySchedule.startTime ?? "--:--",
              end: todaySchedule.endTime ?? "--:--",
              break: todaySchedule.breakTime ?? "--:--",
            });
          }
        }
      },
      (err) => {
        console.error('[BarberHomeScreen] Error loading barber data:', err);
      }
    );

    return () => unsubscribe();
  }, [user, activeBarbershopId]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleAvailability = async () => {
    if (!user || !activeBarbershopId || availabilityLoading) return;

    setAvailabilityLoading(true);
    const newAvailability = !availability.isAvailable;

    try {
      // Update in Firestore (barber doc within barbershop)
      const barberDocRef = doc(
        db,
        'barbershops',
        activeBarbershopId,
        'barbers',
        user.uid
      );
      await updateDoc(barberDocRef, {
        isAvailable: newAvailability,
        availabilityUpdatedAt: new Date(),
      });

      // Also update user doc as backup
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        isAvailable: newAvailability,
        availabilityUpdatedAt: new Date(),
      });

      // Update local state
      setAvailability((prev) => ({
        ...prev,
        isAvailable: newAvailability,
        lastUpdated: new Date(),
      }));
    } catch (err) {
      console.error('[BarberHomeScreen] Error toggling availability:', err);
      // Revert on error
      setAvailability((prev) => ({
        ...prev,
        isAvailable: !prev.isAvailable,
      }));
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const formatTime = (date?: any) => {
    if (!date) return "--:--";
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  };

  const formatAppointmentDate = (date?: any) => {
    if (!date) return "";
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show appointment list in full screen mode
  if (showAppointmentList && user && activeBarbershopId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
        <View style={styles.appointmentListHeader}>
          <TouchableOpacity
            onPress={() => setShowAppointmentList(false)}
            style={styles.backButton}
          >
            <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>
              ← Atrás
            </Text>
          </TouchableOpacity>
          <Text style={[styles.appointmentListTitle, { color: theme.colors.text }]}>
            Mis citas
          </Text>
        </View>
        <AppointmentList
          barberId={user.uid}
          barbershopId={activeBarbershopId}
          onStatusChange={() => {
            // Refresh data when appointments are updated
            setRefreshing(true);
            setTimeout(() => setRefreshing(false), 500);
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        overScrollMode="never"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            💈 Tu Dashboard
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textTertiary }]}>
            Bienvenido de vuelta
          </Text>
        </View>

        <View
          style={[
            styles.card,
            styles.earningsCard,
            {
              backgroundColor: theme.colors.bgSecondary,
              borderLeftColor: theme.colors.primary,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
              💰 Dinero ganado HOY
            </Text>
          </View>
          <Text
            style={[
              styles.earningsAmount,
              { color: theme.colors.primary, marginTop: theme.spacing.lg },
            ]}
          >
            {earnings.today.toFixed(2)} €
          </Text>
          {earnings.commissionEnabled && (
            <View
              style={[
                styles.commissionInfo,
                { marginTop: theme.spacing.md, paddingTop: theme.spacing.md },
              ]}
            >
              <Text style={[styles.commissionText, { color: theme.colors.textTertiary }]}>
                Comisión: {earnings.commissionRate}
                {earnings.commissionType === 'percentage' ? '%' : ' €'}
              </Text>
              <Text
                style={[
                  styles.commissionEarned,
                  { color: theme.colors.success, marginTop: 4 },
                ]}
              >
                Tu ganancia: {earnings.commissionEarned.toFixed(2)} €
              </Text>
            </View>
          )}
        </View>

        {nextAppointment ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.bgSecondary,
                borderLeftColor: theme.colors.pending,
              },
            ]}
          >
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
              ⏰ Próxima cita
            </Text>
            <View style={[styles.appointmentInfo, { marginTop: theme.spacing.lg }]}>
              <View style={styles.appointmentRow}>
                <Text style={[styles.appointmentTime, { color: theme.colors.primary }]}>
                  {formatTime(nextAppointment.date)} • {nextAppointment.timeSlot}
                </Text>
              </View>
              <Text
                style={[
                  styles.appointmentClient,
                  { color: theme.colors.text, marginTop: theme.spacing.sm },
                ]}
              >
                Cliente: {(nextAppointment as any).clientName ?? "Sin nombre"}
              </Text>
              <Text
                style={[
                  styles.appointmentService,
                  { color: theme.colors.textSecondary, marginTop: 4 },
                ]}
              >
                Servicio: {nextAppointment.services?.[0]?.name ?? "Sin servicio"}
              </Text>
              <Text
                style={[
                  styles.appointmentDate,
                  { color: theme.colors.textTertiary, marginTop: 4 },
                ]}
              >
                {formatAppointmentDate(nextAppointment.date)}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.bgSecondary,
                borderLeftColor: theme.colors.textTertiary,
              },
            ]}
          >
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
              ⏰ Próxima cita
            </Text>
            <Text
              style={[
                styles.noAppointment,
                { color: theme.colors.textTertiary, marginTop: theme.spacing.lg },
              ]}
            >
              No hay citas programadas
            </Text>
          </View>
        )}

        <View
          style={[
            styles.buttonRow,
            { gap: theme.spacing.md, marginVertical: theme.spacing.lg },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: availability.isAvailable
                  ? theme.colors.success
                  : theme.colors.bgSecondary,
                borderWidth: availability.isAvailable ? 0 : 1,
                borderColor: theme.colors.textTertiary,
                flex: 1,
                minHeight: 48,
                opacity: availabilityLoading ? 0.6 : 1,
              },
            ]}
            onPress={toggleAvailability}
            disabled={availabilityLoading}
            activeOpacity={0.7}
          >
            {availabilityLoading && availability.isAvailable ? (
              <ActivityIndicator color={theme.colors.dark} />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: availability.isAvailable
                      ? theme.colors.dark
                      : theme.colors.text,
                    fontWeight: availability.isAvailable ? "700" : "600",
                  },
                ]}
              >
                ✅ Disponible
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: !availability.isAvailable
                  ? theme.colors.error
                  : theme.colors.bgSecondary,
                borderWidth: !availability.isAvailable ? 0 : 1,
                borderColor: theme.colors.textTertiary,
                flex: 1,
                minHeight: 48,
                opacity: availabilityLoading ? 0.6 : 1,
              },
            ]}
            onPress={toggleAvailability}
            disabled={availabilityLoading}
            activeOpacity={0.7}
          >
            {availabilityLoading && !availability.isAvailable ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: !availability.isAvailable
                      ? theme.colors.text
                      : theme.colors.text,
                    fontWeight: !availability.isAvailable ? "700" : "600",
                  },
                ]}
              >
                ❌ No disponible
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.bgSecondary,
              borderLeftColor: theme.colors.primary,
            },
          ]}
        >
          <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
            📅 Horario de hoy
          </Text>
          <View
            style={[
              styles.scheduleGrid,
              {
                marginTop: theme.spacing.lg,
                gap: theme.spacing.md,
              },
            ]}
          >
            <View style={styles.scheduleItem}>
              <Text style={[styles.scheduleLabel, { color: theme.colors.textTertiary }]}>
                Entrada
              </Text>
              <Text
                style={[
                  styles.scheduleTime,
                  { color: theme.colors.text, marginTop: 4 },
                ]}
              >
                {todaySchedule.start}
              </Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={[styles.scheduleLabel, { color: theme.colors.textTertiary }]}>
                Descanso
              </Text>
              <Text
                style={[
                  styles.scheduleTime,
                  { color: theme.colors.warning, marginTop: 4 },
                ]}
              >
                {todaySchedule.break}
              </Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={[styles.scheduleLabel, { color: theme.colors.textTertiary }]}>
                Salida
              </Text>
              <Text
                style={[
                  styles.scheduleTime,
                  { color: theme.colors.text, marginTop: 4 },
                ]}
              >
                {todaySchedule.end}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonRowVertical}>
          <TouchableOpacity
            style={[
              styles.linkButton,
              {
                backgroundColor: theme.colors.primary,
                marginBottom: theme.spacing.md,
              },
            ]}
            onPress={() => setShowAppointmentList(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.linkButtonText,
                { color: theme.colors.dark, fontWeight: "700" },
              ]}
            >
              Ver todas mis citas →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.linkButton,
              {
                backgroundColor: theme.colors.primary,
                marginBottom: theme.spacing.xxl,
              },
            ]}
            onPress={() => navigation.navigate("Agenda")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.linkButtonText,
                { color: theme.colors.dark, fontWeight: "700" },
              ]}
            >
              Ver mi agenda →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 4 },
  subtitle: { fontSize: 14 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  earningsCard: { minHeight: 140 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { fontSize: 14, fontWeight: "600" },
  earningsAmount: { fontSize: 36, fontWeight: "800", marginBottom: 8 },
  commissionInfo: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  commissionText: { fontSize: 13, fontWeight: "500" },
  commissionEarned: { fontSize: 14, fontWeight: "700" },
  appointmentInfo: { gap: 8 },
  appointmentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  appointmentTime: { fontSize: 16, fontWeight: "700" },
  appointmentClient: { fontSize: 14, fontWeight: "600" },
  appointmentService: { fontSize: 13 },
  appointmentDate: { fontSize: 12 },
  noAppointment: { fontSize: 14, fontStyle: "italic" },
  buttonRow: { flexDirection: "row", justifyContent: "space-between" },
  buttonRowVertical: { flexDirection: "column", gap: 12, marginTop: 24 },
  button: {
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: { fontSize: 14 },
  scheduleGrid: { flexDirection: "row", justifyContent: "space-around" },
  scheduleItem: { flex: 1, alignItems: "center" },
  scheduleLabel: { fontSize: 12 },
  scheduleTime: { fontSize: 16, fontWeight: "700" },
  linkButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  linkButtonText: { fontSize: 14 },
  appointmentListHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  appointmentListTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
});
