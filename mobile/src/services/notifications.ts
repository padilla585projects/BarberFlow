import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// expo-notifications no longer ships its native module inside Expo Go (since
// SDK 53). Even *importing* the module triggers internal listeners that crash
// with a red-screen error, which blocks the navigation tree from mounting and
// keeps the splash screen visible forever.
//
// Fix: use a lazy require() so the module is NEVER loaded in Expo Go.
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-load expo-notifications only in development builds / standalone apps.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
  try {
    // Dynamic require — Metro still bundles it, but the module code only
    // executes when this branch runs (i.e. NOT in Expo Go).
    Notifications = require('expo-notifications') as typeof import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('[notifications] Failed to initialize expo-notifications:', e);
    Notifications = null;
  }
}

export async function registerForPushNotifications(uid: string): Promise<string | null> {
  // Skip entirely in Expo Go — the native module is not available.
  if (isExpoGo || !Notifications) {
    console.log('[notifications] Skipping push registration (Expo Go or module unavailable)');
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'BarberFlow',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C9A84C',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID,
    });
    const token = tokenData.data;

    // setDoc(..., { merge: true }) instead of updateDoc: this must never throw
    // "No document to update" if the users/{uid} profile hasn't been created
    // yet (e.g. a brand-new account, or a race with useAuth's profile setup).
    await setDoc(doc(db, 'users', uid), { expoPushToken: token }, { merge: true });

    return token;
  } catch (e) {
    console.warn('[notifications] Push registration failed:', e);
    return null;
  }
}
