import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuthContext } from "../../contexts/AuthContext";
import type { Appointment } from "../../types";
import { auth, db } from "../../services/firebase";
import { useUnreadCount } from "../common/NotificationsScreen";

const BG      = "#0A0A0A";
const SURFACE = "#141414";
const GOLD    = "#C9A84C";
const TEXT    = "#FFFFFF";
const MUTED   = "#888888";
const BORDER  = "#282828";
const SUCCESS = "#4CAF50";

export function BarberHomeScreen() {
  const navigation = useNavigation<any>();
  const { activeBarbershopId, firebaseUser, profile } = useAuthContext();
  const insets = useSafeAreaInsets();
  const barberId = firebaseUser?.uid;
  const unreadCount = useUnreadCount();

  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalAppointments: 0,
    averageRating: 0,
  });

  useEffect(() => {
    if (!barberId) return;

    const userDocRef = doc(db, "users", barberId);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsAvailable(docSnap.data().available ?? false);
      }
    });

    return () => unsubscribe();
  }, [barberId]);

  useEffect(() => {
    if (!barberId || !activeBarbershopId) {
      setLoading(false);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointmentsRef = collection(db, "appointments");
    const q = query(
      appointmentsRef,
      where("barberId", "==", barberId),
      where("barbershopId", "==", activeBarbershopId),
      where("date", ">=", today),
      where("date", "<", tomorrow),
      orderBy("date", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as unknown as Appointment));

      setTodayAppointments(appts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [barberId, activeBarbershopId]);

  useEffect(() => {
    if (!barberId || !activeBarbershopId) return;

    const loadStats = async () => {
      try {
        const barberDocRef = doc(db, "users", barberId);
        const barberDoc = await getDoc(barberDocRef);

        if (barberDoc.exists()) {
          const data = barberDoc.data();
          setStats({
            totalClients: data.totalClients || 0,
            totalAppointments: data.totalAppointments || 0,
            averageRating: data.averageRating || 0,
          });
        }
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };

    loadStats();
  }, [barberId]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const nextAppointment = todayAppointments[0];
  const appointmentCount = todayAppointments.length;

  const displayName = profile?.displayName || firebaseUser?.displayName || "Barbero";

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={GOLD}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {displayName}</Text>
        <View
          style={[
            styles.availabilityBadge,
            isAvailable ? styles.availableBadge : styles.unavailableBadge,
          ]}
        >
          <Text style={styles.badgeText}>
            {isAvailable ? "● Disponible" : "● No disponible"}
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("Agenda")}
        >
          <Text style={styles.statNumber}>{appointmentCount}</Text>
          <Text style={styles.statLabel}>Citas hoy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("Stats")}
        >
          <Text style={styles.statNumber}>{stats.totalClients}</Text>
          <Text style={styles.statLabel}>Clientes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("Stats")}
        >
          <Text style={styles.statNumber}>
            {stats.averageRating.toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Calificación</Text>
        </TouchableOpacity>
      </View>

      {nextAppointment ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Próxima cita</Text>
          <View style={styles.appointmentCard}>
            <View>
              <Text style={styles.appointmentTime}>
                {nextAppointment.timeSlot}
              </Text>
              <Text style={styles.appointmentClient}>
                {(nextAppointment as any).clientName || "Cliente"}
              </Text>
              <Text style={styles.appointmentService}>
                {nextAppointment.services?.[0]?.name || "Servicio"}
              </Text>
            </View>
            <View style={styles.appointmentStatus}>
              <Text style={styles.statusBadge}>
                {nextAppointment.status === "completed" ? "✓" : "→"}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sin citas</Text>
          <Text style={styles.emptyText}>No tienes citas programadas para hoy</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Acciones rápidas</Text>
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("Agenda")}
        >
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionLabel}>Ver Agenda completa</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("Messages")}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>Mensajes {unreadCount > 0 ? `(${unreadCount})` : ""}</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("Schedule")}
        >
          <Text style={styles.actionIcon}>⏰</Text>
          <Text style={styles.actionLabel}>Configurar horario</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>

      {!isAvailable && (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ No disponible</Text>
          <Text style={styles.warningText}>
            Actualmente no estás disponible. Los clientes no pueden reservarte.
          </Text>
          <TouchableOpacity
            style={styles.warningButton}
            onPress={() => navigation.navigate("Availability")}
          >
            <Text style={styles.warningButtonText}>Activar disponibilidad</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 16,
  },
  header: {
    marginVertical: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 12,
  },
  availabilityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  availableBadge: {
    backgroundColor: SUCCESS + "20",
  },
  unavailableBadge: {
    backgroundColor: "#FF5252" + "20",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: GOLD,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: MUTED,
    textAlign: "center",
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 12,
  },
  appointmentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  appointmentTime: {
    fontSize: 14,
    fontWeight: "600",
    color: GOLD,
    marginBottom: 4,
  },
  appointmentClient: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 4,
  },
  appointmentService: {
    fontSize: 12,
    color: MUTED,
  },
  appointmentStatus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GOLD + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    fontSize: 20,
    fontWeight: "700",
    color: GOLD,
  },
  emptyText: {
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    paddingVertical: 16,
  },
  actionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 4,
    backgroundColor: "#0A0A0A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
  },
  arrow: {
    fontSize: 14,
    color: MUTED,
  },
  warningBox: {
    backgroundColor: "#FF5252" + "15",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#FF5252",
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 20,
    marginBottom: 12,
  },
  warningButton: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  warningButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: BG,
  },
});
