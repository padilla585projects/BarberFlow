import * as Sentry from '@sentry/react';

// To enable error reporting, set VITE_SENTRY_DSN in web-admin/.env (or in
// Firebase Hosting environment config for production builds).
//
// How to get your DSN:
//   1. Create a project at https://sentry.io → Settings → Projects → <project> → Client Keys (DSN)
//   2. Add to web-admin/.env:
//        VITE_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project-id>
//
// For Firebase Hosting: set the variable in the build step of your deploy pipeline
// (GitHub Actions secret, or locally in .env.production before running `npm run build`).
// Vite embeds VITE_* variables at build time — they are NOT runtime env vars.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN ?? '';

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
