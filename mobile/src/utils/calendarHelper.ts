/**
 * calendarHelper.ts
 * Crea un evento en el calendario nativo del dispositivo.
 * Compatible con expo-calendar (SDK 56).
 */

// SDK 56: `expo-calendar`'s default export now points at the new class-based
// "Next" API (ExpoCalendar). The old imperative functions used below
// (getCalendarsAsync, requestCalendarPermissionsAsync, createEventAsync,
// getDefaultCalendarAsync) still type-check from the main entrypoint as
// deprecated shims, but THROW AT RUNTIME. The real implementations now live
// under the `expo-calendar/legacy` subpath — see
// https://docs.expo.dev/versions/v56.0.0/sdk/calendar/
import * as Calendar from 'expo-calendar/legacy'
import { Platform } from 'react-native';
import { Alert } from '../components/AppAlert';

export interface AppointmentCalendarEvent {
  title: string          // e.g. "Corte + Barba en BarberFlow"
  startDate: Date
  durationMinutes: number
  location?: string      // barbershop address or name
  notes?: string         // service names, barber name, price
}

/**
 * Solicita permisos y añade el evento al calendario por defecto.
 * Retorna true si se creó correctamente.
 */
export async function addAppointmentToCalendar(
  event: AppointmentCalendarEvent,
): Promise<boolean> {
  try {
    // Request permissions
    const { status } = await Calendar.requestCalendarPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permiso denegado',
        'Para guardar la cita en el calendario, activa el permiso en Ajustes.',
      )
      return false
    }

    // Get the default calendar
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)

    // Try to find the default writable calendar
    let targetCalendar = calendars.find(
      (c) =>
        c.isPrimary &&
        c.allowsModifications &&
        c.source?.isLocalAccount === true,
    )

    // Fallback: first writable calendar
    if (!targetCalendar) {
      targetCalendar = calendars.find((c) => c.allowsModifications)
    }

    // Android: use default calendar directly
    if (!targetCalendar && Platform.OS === 'android') {
      const defaultId = await Calendar.getDefaultCalendarAsync()
      targetCalendar = defaultId as unknown as Calendar.Calendar
    }

    if (!targetCalendar) {
      Alert.alert(
        'Sin calendario',
        'No se encontró un calendario disponible en el dispositivo.',
      )
      return false
    }

    const endDate = new Date(event.startDate.getTime() + event.durationMinutes * 60 * 1000)

    await Calendar.createEventAsync(targetCalendar.id, {
      title: event.title,
      startDate: event.startDate,
      endDate,
      location: event.location,
      notes: event.notes,
      alarms: [
        { relativeOffset: -60 },   // 1 hora antes
        { relativeOffset: -1440 }, // 1 día antes
      ],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })

    return true
  } catch (err) {
    console.error('[calendarHelper] Error creating event:', err)
    Alert.alert(
      'Error',
      'No se pudo guardar la cita en el calendario. Inténtalo más tarde.',
    )
    return false
  }
}
