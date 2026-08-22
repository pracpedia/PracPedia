/**
 * Sentry edge runtime configuration.
 *
 * Active only when `SENTRY_DSN` env var is set. Used by Next.js edge
 * middleware/proxy functions.
 */
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
