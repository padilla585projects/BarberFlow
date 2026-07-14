import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Alert } from './AppAlert';
import { MaterialIcons } from '@expo/vector-icons';
import {
  subscribeToBarberoAppointments,
  completeAppointment,
  cancelAppointment,
} from '../services/appointmentService';
import { useBarberTheme } from '../theme/barberTheme';
import type { Appointment } from '../types';

interface AppointmentListProps {
  barberId: string;
  barbershopId: string;
  onStatusChange?: () => void;
}

export function AppointmentList({
  barberId,
  barbershopId,
  onStatusChange,
}: AppointmentListProps) {
  const theme = useBarberTheme();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToBarberoAppointments(
      barberId,
      barbershopId,
      ['pending', 'confirmed'],
      (updatedAppointments) => {
        setAppointments(updatedAppointments);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [barberId, barbershopId]);

  const handleCompleteAppointment = async (appointment: Appointment) => {
    Alert.alert(
      'Completar cita',
      `¿Marcar cita con ${appointment.services?.[0]?.name || 'servicio'} como completada?`,
      [
        {
          text: 'Cancelar',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Completar',
          onPress: async () => {
            try {
              setProcessingId(appointment.id);
              await completeAppointment(appointment.id);
              Alert.alert('Éxito', 'Cita marcada como completada');
              onStatusChange?.();
            } catch (error) {
              console.error('Error completing appointment:', error);
              Alert.alert('Error', 'No se pudo completar la cita');
            } finally {
              setProcessingId(null);
            }
          },
          style: 'default',
        },
      ]
    );
  };

  const handleCancelAppointment = async (appointment: Appointment) => {
    Alert.alert(
      'Cancelar cita',
      `¿Cancelar cita con ${appointment.services?.[0]?.name || 'servicio'}?`,
      [
        {
          text: 'No cancelar',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Cancelar cita',
          onPress: async () => {
            try {
              setProcessingId(appointment.id);
              await cancelAppointment(appointment.id, 'Cancelada por el barbero');
              Alert.alert('Éxito', 'Cita cancelada');
              onStatusChange?.();
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              Alert.alert('Error', 'No se pudo cancelar la cita');
            } finally {
              setProcessingId(null);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatTime = (timeSlot: string) => {
    // timeSlot comes as "10:00" or similar
    return timeSlot || '--:--';
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDuration = (services: any[] = []) => {
    if (!services.length) return '0 min';
    const totalDuration = services.reduce((sum, svc) => sum + (svc.duration || 0), 0);
    return `${totalDuration} min`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      case 'completed':
        return theme.colors.info;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'pending':
        return 'Pendiente';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    const isProcessing = processingId === item.id;
    const serviceNames = item.services?.map((s) => s.name).join(', ') || 'Servicio';

    return (
      <View
        style={[
          styles.appointmentCard,
          {
            backgroundColor: theme.colors.bgSecondary,
            borderLeftColor: getStatusColor(item.status),
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.timeContainer}>
            <MaterialIcons
              name="access-time"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.time, { color: theme.colors.primary }]}>
              {formatTime(item.timeSlot)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.clientName, { color: theme.colors.text }]}>
            {item.services?.[0]?.name || 'Servicio'}
          </Text>
          <Text style={[styles.secondaryText, { color: theme.colors.textSecondary }]}>
            {formatDate(item.date)} • {formatDuration(item.services)}
          </Text>
          <Text style={[styles.price, { color: theme.colors.primary }]}>
            €{(item.totalPrice || 0).toFixed(2)}
          </Text>
        </View>

        {item.status === 'pending' || item.status === 'confirmed' ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.completeButton,
                { backgroundColor: theme.colors.success },
                isProcessing && styles.actionButtonDisabled,
              ]}
              onPress={() => handleCompleteAppointment(item)}
              disabled={isProcessing}
            >
              {isProcessing && processingId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Completar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.cancelButton,
                { backgroundColor: theme.colors.error },
                isProcessing && styles.actionButtonDisabled,
              ]}
              onPress={() => handleCancelAppointment(item)}
              disabled={isProcessing}
            >
              {isProcessing && processingId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="close-circle" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Cancelar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const emptyContent = (
    <View style={[styles.emptyContainer, { backgroundColor: theme.colors.bgPrimary }]}>
      <MaterialIcons
        name="event-available"
        size={64}
        color={theme.colors.textSecondary}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        Sin citas próximas
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        No tienes citas confirmadas o pendientes
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}>
      <FlatList
        data={appointments}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={emptyContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  appointmentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    marginBottom: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  secondaryText: {
    fontSize: 13,
    marginBottom: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  completeButton: {},
  cancelButton: {},
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
