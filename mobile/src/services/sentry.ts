import * as Sentry from '@sentry/react-native';

// Replace __SENTRY_DSN__ with your actual Sentry DSN from https://sentry.io
const SENTRY_DSN = '__SENTRY_DSN__';

export function initSentry() {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
  });
}

export { Sentry };
