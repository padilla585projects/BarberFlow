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
} from "firebase/firestore";
import { auth, db } from "../../services/firebase";
import { useAuthContext } from "../../contexts/AuthContext";
import { useBarberTheme } from "../../theme/barberTheme";
import type { BarberStackParamList } from "../../navigation/BarberNavigator";
import type { Appointment } from "../../types";

type Nav = NativeStackNavigationProp<BarberStackParamList>;

interface EarningsData {
  today: number;
  commissionRate: number;
  commissionEarned: number;
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
  });
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [availability, setAvailability] = useState<AvailabilityStatus>({
    isAvailable: true,
    lastUpdated: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState({
    start: "--:--",
    end: "--:--",
    break: "--:--",
  });

  const fetchCommissionRate = async (): Promise<number> => {
    if (!user) return 0;
    try {
      const userSnap = await getDocs(
        query(collection(db, "users"), where("uid", "==", user.uid))
      );
      return userSnap.empty ? 0 : (userSnap.docs[0].data().commissionRate ?? 0);
    } catch (err) {
      console.error("[BarberHomeScreen] Error fetching commission rate:", err);
      return 0;
    }
  };

  useEffect(() => {
    if (!user || !activeBarbershopId) return;

    const fetchTodayEarnings = async () => {
      const commissionRate = await fetchCommissionRate();
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

          const commissionEarned = revenue * (commissionRate / 100);
          setEarnings({
            today: revenue,
            commissionRate,
            commissionEarned,
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

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleAvailability = () => {
    setAvailability((prev) => ({
      ...prev,
      isAvailable: !prev.isAvailable,
      lastUpdated: new Date(),
    }));
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
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
          <View
            style={[
              styles.commissionInfo,
              { marginTop: theme.spacing.md, paddingTop: theme.spacing.md },
            ]}
          >
            <Text style={[styles.commissionText, { color: theme.colors.textTertiary }]}>
              Comisión: {earnings.commissionRate}%
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
              },
            ]}
            onPress={toggleAvailability}
            activeOpacity={0.7}
          >
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
              },
            ]}
            onPress={toggleAvailability}
            activeOpacity={0.7}
          >
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

        <TouchableOpacity
          style={[
            styles.linkButton,
            {
              backgroundColor: theme.colors.primary,
              marginTop: theme.spacing.xl,
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
            Ver toda mi agenda →
          </Text>
        </TouchableOpacity>
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
});
