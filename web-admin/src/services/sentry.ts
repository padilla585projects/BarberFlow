import * as Sentry from '@sentry/react';

// Replace __SENTRY_DSN__ with your actual Sentry DSN from https://sentry.io
const SENTRY_DSN = '__SENTRY_DSN__';

export function initSentry() {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    environment: import.meta.env.DEV ? 'development' : 'production',
  });
}

export { Sentry };
