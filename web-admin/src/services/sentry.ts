import * as Sentry from '@sentry/react';

// Replace with your actual Sentry DSN from https://sentry.io
// or set VITE_SENTRY_DSN in your .env file
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN ?? '__SENTRY_DSN__';

const isSentryEnabled = Boolean(SENTRY_DSN && SENTRY_DSN.startsWith('https://'));

export function initSentry() {
  if (!isSentryEnabled) {
    console.warn('Sentry DSN not configured — error reporting disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    environment: import.meta.env.DEV ? 'development' : 'production',
  });
}

export { Sentry };
