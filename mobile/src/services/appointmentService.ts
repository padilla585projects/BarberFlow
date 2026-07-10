import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  Timestamp,
  Query,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Appointment } from '../types';

/**
 * Get all appointments for a barber
 * Filtered by status (default: pending, confirmed)
 */
export async function getBarberoAppointments(
  barberId: string,
  barbershopId: string,
  statuses: string[] = ['pending', 'confirmed']
): Promise<Appointment[]> {
  try {
    const appointments: Appointment[] = [];

    for (const status of statuses) {
      const q = query(
        collection(db, 'appointments'),
        where('barberId', '==', barberId),
        where('barbershopId', '==', barbershopId),
        where('status', '==', status),
        orderBy('date', 'asc')
      );

      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate?.() ?? new Date(data.date),
        } as Appointment);
      });
    }

    return appointments.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  } catch (error) {
    console.error('[appointmentService] Error fetching barber appointments:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates of barber's appointments
 * Returns unsubscribe function
 */
export function subscribeToBarberoAppointments(
  barberId: string,
  barbershopId: string,
  statuses: string[] = ['pending', 'confirmed'],
  onUpdate: (appointments: Appointment[]) => void
): Unsubscribe {
  const queries: Query<DocumentData>[] = statuses.map((status) =>
    query(
      collection(db, 'appointments'),
      where('barberId', '==', barberId),
      where('barbershopId', '==', barbershopId),
      where('status', '==', status),
      orderBy('date', 'asc')
    )
  );

  // If only one query, subscribe directly
  if (queries.length === 1) {
    return onSnapshot(queries[0], (snapshot) => {
      const appointments: Appointment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate?.() ?? new Date(data.date),
        } as Appointment);
      });
      onUpdate(appointments);
    });
  }

  // For multiple statuses, subscribe to each and merge
  const unsubscribers: Unsubscribe[] = [];
  const appointmentsByStatus: Map<string, Appointment[]> = new Map();

  statuses.forEach((status, index) => {
    const unsub = onSnapshot(queries[index], (snapshot) => {
      const appointments: Appointment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate?.() ?? new Date(data.date),
        } as Appointment);
      });
      appointmentsByStatus.set(status, appointments);

      // Merge all statuses and sort by date
      const allAppointments = Array.from(appointmentsByStatus.values()).flat();
      allAppointments.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      onUpdate(allAppointments);
    });
    unsubscribers.push(unsub);
  });

  // Return function that unsubscribes from all queries
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
): Promise<void> {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      status: newStatus,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('[appointmentService] Error updating appointment status:', error);
    throw error;
  }
}

/**
 * Get detailed information about an appointment
 */
export async function getAppointmentDetails(appointmentId: string): Promise<Appointment | null> {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const snapshot = await getDocs(query(collection(db, 'appointments')));

    // Since we can't get a single doc directly with the functions above,
    // we'll implement a simpler version
    const q = query(
      collection(db, 'appointments'),
      where('__name__', '==', appointmentId)
    );

    const result = await getDocs(q);
    if (result.empty) return null;

    const data = result.docs[0].data();
    return {
      id: result.docs[0].id,
      ...data,
      date: data.date?.toDate?.() ?? new Date(data.date),
    } as Appointment;
  } catch (error) {
    console.error('[appointmentService] Error fetching appointment details:', error);
    throw error;
  }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(appointmentId: string, reason?: string): Promise<void> {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: reason || 'Cancelado por el barbero',
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('[appointmentService] Error cancelling appointment:', error);
    throw error;
  }
}

/**
 * Complete an appointment
 */
export async function completeAppointment(appointmentId: string): Promise<void> {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('[appointmentService] Error completing appointment:', error);
    throw error;
  }
}

/**
 * Get appointments for a specific date range
 */
export async function getBarberoAppointmentsByDateRange(
  barberId: string,
  barbershopId: string,
  startDate: Date,
  endDate: Date,
  statuses: string[] = ['pending', 'confirmed', 'completed']
): Promise<Appointment[]> {
  try {
    const appointments: Appointment[] = [];

    for (const status of statuses) {
      const q = query(
        collection(db, 'appointments'),
        where('barberId', '==', barberId),
        where('barbershopId', '==', barbershopId),
        where('status', '==', status),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'asc')
      );

      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate?.() ?? new Date(data.date),
        } as Appointment);
      });
    }

    return appointments.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  } catch (error) {
    console.error('[appointmentService] Error fetching appointments by date range:', error);
    throw error;
  }
}
