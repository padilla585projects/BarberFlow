/**
 * Firebase Debug Utilities
 *
 * Provides diagnostic tools for Firebase connectivity and configuration issues.
 * Helps identify HTTP 400 errors and other Firebase authentication problems.
 */

export interface FirebaseDebugInfo {
  apiKeyConfigured: boolean;
  authDomainConfigured: boolean;
  projectIdConfigured: boolean;
  appIdConfigured: boolean;
  apiKeyFormat: string | null;
  timestamp: string;
}

/**
 * Collect Firebase configuration debug info
 * (Note: env vars are only readable if properly configured)
 */
export function getFirebaseDebugInfo(): FirebaseDebugInfo {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

  return {
    apiKeyConfigured: !!apiKey && apiKey.length > 0,
    authDomainConfigured: !!authDomain && authDomain.length > 0,
    projectIdConfigured: !!projectId && projectId.length > 0,
    appIdConfigured: !!appId && appId.length > 0,
    apiKeyFormat: apiKey?.startsWith('AIzaSy') ? 'Web API Key' : apiKey?.startsWith('AIza') ? 'API Key (unknown type)' : 'Invalid or not configured',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log Firebase debug info to console
 * Useful for diagnosing configuration issues
 */
export function logFirebaseDebugInfo(): void {
  const info = getFirebaseDebugInfo();
  console.log('[Firebase Debug Info]', {
    apiKeyConfigured: info.apiKeyConfigured,
    authDomainConfigured: info.authDomainConfigured,
    projectIdConfigured: info.projectIdConfigured,
    appIdConfigured: info.appIdConfigured,
    apiKeyFormat: info.apiKeyFormat,
    timestamp: info.timestamp,
  });

  if (!info.apiKeyConfigured) {
    console.warn('⚠️  Firebase API Key not configured!');
  }
  if (!info.authDomainConfigured) {
    console.warn('⚠️  Firebase Auth Domain not configured!');
  }
  if (!info.projectIdConfigured) {
    console.warn('⚠️  Firebase Project ID not configured!');
  }
  if (!info.appIdConfigured) {
    console.warn('⚠️  Firebase App ID not configured!');
  }
}

/**
 * Diagnose Firebase HTTP 400 errors
 *
 * Common causes:
 * 1. API key doesn't have "Identity Toolkit API" enabled in Google Cloud Console
 * 2. API key has HTTP referrer restrictions that block mobile requests
 * 3. API key has IP restrictions that don't include the app's network
 * 4. Firebase project not properly configured
 * 5. Invalid or expired API key
 */
export function diagnoseHTTP400Error(error: any): string {
  const errorMsg = error?.message ?? '';

  if (!errorMsg.includes('400') && !errorMsg.includes('identitytoolkit')) {
    return 'Not a Firebase Identity Toolkit HTTP 400 error';
  }

  const suggestions = [
    '1. Verify "Identity Toolkit API" is ENABLED in Google Cloud Console (console.cloud.google.com)',
    '2. Check API Key restrictions:',
    '   - Remove HTTP referrer restrictions (they block mobile apps)',
    '   - Remove IP restrictions or allow all IPs for mobile',
    '   - Ensure "Identity Toolkit API" is in the allowed APIs list',
    '3. Verify Firebase project settings:',
    '   - Project ID matches: barberflow-2026',
    '   - Auth domain is correct: barberflow-2026.firebaseapp.com',
    '4. Try regenerating the API key in Firebase Console',
    '5. Ensure you\'re using the "Web" app configuration (not native)',
    '6. Check network connectivity on the device',
  ];

  return suggestions.join('\n');
}

/**
 * Parse Firebase error code and provide user-friendly message
 */
export function getFirebaseErrorMessage(error: any): string {
  const code = error?.code ?? '';
  const message = error?.message ?? '';

  if (message.includes('400') || message.includes('identitytoolkit')) {
    return 'Problema de conexión con Firebase. Por favor verifica tu conexión a internet o contacta a soporte.';
  }

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email o contraseña incorrectos';
    case 'auth/invalid-email':
      return 'Email no válido';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento';
    case 'auth/network-request-failed':
      return 'Error de red. Verifica tu conexión a internet';
    case 'auth/operation-not-allowed':
      return 'Este tipo de inicio de sesión no está habilitado';
    case 'auth/user-disabled':
      return 'Tu cuenta ha sido deshabilitada';
    default:
      return message || 'Error desconocido. Por favor intenta de nuevo.';
  }
}
