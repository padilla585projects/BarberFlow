import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

/* ─── types ─── */
type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface DaySchedule {
  active: boolean;
  start: string | null;
  end: string | null;
  breakStart: string | null;
  breakEnd: string | null;
}

export type WeeklyHours = Record<DayKey, DaySchedule>;

export interface ScheduleData {
  weeklyHours: WeeklyHours;
  daysOff: string[];
}

/* ─── service ─── */

/**
 * Saves the barber's schedule to Firestore.
 * @param barberId - The barber's user ID
 * @param scheduleData - The schedule data (weeklyHours + daysOff)
 */
export async function saveSchedule(
  barberId: string,
  scheduleData: ScheduleData
): Promise<void> {
  try {
    const ref = doc(db, 'users', barberId, 'schedule', 'config');
    await setDoc(ref, scheduleData);
  } catch (error) {
    console.error('[scheduleService] saveSchedule error:', error);
    throw new Error('No se pudo guardar el horario. Inténtalo de nuevo.');
  }
}

/**
 * Fetches the barber's schedule from Firestore (one-time fetch).
 * @param barberId - The barber's user ID
 * @returns The schedule data, or null if not found
 */
export async function getSchedule(barberId: string): Promise<ScheduleData | null> {
  try {
    const ref = doc(db, 'users', barberId, 'schedule', 'config');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as ScheduleData;
    }
    return null;
  } catch (error) {
    console.error('[scheduleService] getSchedule error:', error);
    throw new Error('No se pudo obtener el horario.');
  }
}

/**
 * Listens to changes in the barber's schedule (real-time listener).
 * @param barberId - The barber's user ID
 * @param onData - Callback when schedule data is loaded or updated
 * @param onError - Optional callback when an error occurs
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToSchedule(
  barberId: string,
  onData: (data: ScheduleData | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const ref = doc(db, 'users', barberId, 'schedule', 'config');
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          onData(snap.data() as ScheduleData);
        } else {
          onData(null);
        }
      },
      (error) => {
        console.error('[scheduleService] subscribeToSchedule error:', error);
        onError?.(new Error('Error al escuchar cambios en el horario.'));
      }
    );
  } catch (error) {
    console.error('[scheduleService] subscribeToSchedule setup error:', error);
    onError?.(new Error('No se pudo configurar el listener del horario.'));
    // Return a no-op unsubscribe
    return () => {};
  }
}

/**
 * Validates the schedule data.
 * @param scheduleData - The schedule data to validate
 * @returns An array of validation error messages (empty if valid)
 */
export function validateSchedule(scheduleData: ScheduleData): string[] {
  const errors: string[] = [];

  Object.entries(scheduleData.weeklyHours).forEach(([day, daySchedule]) => {
    if (daySchedule.active) {
      if (!daySchedule.start || !daySchedule.end) {
        errors.push(`${day}: faltan horas de inicio o fin`);
        return;
      }

      // Validate time format (HH:MM)
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(daySchedule.start) || !timeRegex.test(daySchedule.end)) {
        errors.push(`${day}: formato de hora inválido`);
        return;
      }

      // Validate start < end
      const [startH, startM] = daySchedule.start.split(':').map(Number);
      const [endH, endM] = daySchedule.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes >= endMinutes) {
        errors.push(`${day}: la hora de salida debe ser posterior a la de entrada`);
      }

      // Validate breaks if present
      if (daySchedule.breakStart && daySchedule.breakEnd) {
        if (!timeRegex.test(daySchedule.breakStart) || !timeRegex.test(daySchedule.breakEnd)) {
          errors.push(`${day}: formato de hora de descanso inválido`);
          return;
        }

        const [breakStartH, breakStartM] = daySchedule.breakStart.split(':').map(Number);
        const [breakEndH, breakEndM] = daySchedule.breakEnd.split(':').map(Number);
        const breakStartMinutes = breakStartH * 60 + breakStartM;
        const breakEndMinutes = breakEndH * 60 + breakEndM;

        if (breakStartMinutes >= breakEndMinutes) {
          errors.push(`${day}: el final del descanso debe ser posterior al inicio`);
        }

        if (breakStartMinutes <= startMinutes || breakEndMinutes >= endMinutes) {
          errors.push(`${day}: el descanso debe estar dentro del horario de trabajo`);
        }
      }
    }
  });

  return errors;
}
