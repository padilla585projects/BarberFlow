import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

// ---------------------------------------------------------------------------
// Firestore-backed analytics for Expo managed workflow.
//
// The Firebase JS SDK's getAnalytics() requires a browser environment and
// does not work in React Native.  Instead we write lightweight event
// documents to a top-level `analytics_events` Firestore collection.  This
// keeps the implementation zero-native-modules and works with Expo Go and
// EAS builds alike.
// ---------------------------------------------------------------------------

const ANALYTICS_COLLECTION = 'analytics_events';

/** Internal helper – all public functions funnel through here. */
async function writeEvent(
  eventName: string,
  params?: Record<string, unknown>,
): Promise<void> {
  try {
    const uid = auth.currentUser?.uid ?? null;
    await addDoc(collection(db, ANALYTICS_COLLECTION), {
      event: eventName,
      userId: uid,
      timestamp: serverTimestamp(),
      ...(params ? { params } : {}),
    });
  } catch (error) {
    // Analytics should never crash the app – swallow & log.
    if (__DEV__) {
      console.warn('[analytics] failed to log event:', eventName, error);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Log an arbitrary analytics event.
 *
 * @example
 *   logEvent('appointment_booked', { barbershopId, barberId });
 */
export function logEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  // Fire-and-forget – callers don't need to await.
  void writeEvent(name, params);
}

/**
 * Log a screen view.  Designed to be called from
 * NavigationContainer's `onStateChange` callback.
 */
export function logScreenView(screenName: string): void {
  void writeEvent('screen_view', { screen_name: screenName });
}

// ---------------------------------------------------------------------------
// Pre-defined event helpers (type-safe convenience wrappers)
// ---------------------------------------------------------------------------

export function logLogin(method: string): void {
  void writeEvent('login', { method });
}

export function logBarbershopCreated(barbershopId: string): void {
  void writeEvent('barbershop_created', { barbershopId });
}

export function logAppointmentBooked(params: {
  barbershopId: string;
  barberId: string;
  serviceId?: string;
}): void {
  void writeEvent('appointment_booked', params);
}

export function logBarberJoined(params: {
  barbershopId: string;
  barberId: string;
}): void {
  void writeEvent('barber_joined', params);
}

export function logSignUp(method: string): void {
  void writeEvent('sign_up', { method });
}

export function logShopSwitched(barbershopId: string): void {
  void writeEvent('shop_switched', { barbershopId });
}
