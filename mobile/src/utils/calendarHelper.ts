/**
 * calendarHelper.ts
 * Crea un evento en el calendario nativo del dispositivo.
 * Compatible con expo-calendar (SDK 56).
 */

import * as Calendar from 'expo-calendar'
import { Alert, Platform } from 'react-native'

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
