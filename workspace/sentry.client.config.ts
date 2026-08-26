/**
 * Sentry client-side configuration.
 *
 * Active only when `SENTRY_DSN` env var is set. In development, this file
 * is a no-op (Sentry is skipped).
 *
 * To set up:
 * 1. Create a project at https://sentry.io → Next.js
 * 2. Copy the DSN
 * 3. Add `SENTRY_DSN` to your .env or Vercel env vars
 * 4. Redeploy
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Adjust this value in production — lower = more traces, higher = less cost
    tracesSampleRate: 0.1,

    // Setting this option to true will print useful information to the console
    // while you're setting up Sentry. Turn off in production.
    debug: false,

    // Replay user sessions for debugging (10% sample rate to stay within free tier)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        // Additional Replay configuration goes in here
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Ignore noisy errors that aren't actionable
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
    ],
  });
}
