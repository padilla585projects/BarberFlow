import * as Sentry from '@sentry/react-native';
import type { ComponentType } from 'react';

// Replace with your actual Sentry DSN from https://sentry.io
// or set EXPO_PUBLIC_SENTRY_DSN in your environment / eas.json
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '__SENTRY_DSN__';

const isSentryEnabled = Boolean(SENTRY_DSN && SENTRY_DSN.startsWith('https://'));

export function initSentry() {
  if (!isSentryEnabled) {
    // Use console.log (not warn) — not a user-facing error, just dev info
    console.log('[Sentry] DSN not configured — error reporting disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
  });
}

/**
 * Wraps the root component with Sentry error boundary.
 * Returns the component unchanged when Sentry is not configured.
 */
export function wrapWithSentry<P extends Record<string, unknown>>(
  component: ComponentType<P>,
): ComponentType<P> {
  if (!isSentryEnabled) {
    return component;
  }
  return Sentry.wrap(component);
}

export { Sentry };
