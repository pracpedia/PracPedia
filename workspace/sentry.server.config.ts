/**
 * Sentry server-side configuration.
 *
 * Active only when `SENTRY_DSN` env var is set.
 */
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Adjust this value in production
    tracesSampleRate: 0.1,

    // Uncomment to reduce noise in production
    // environment: process.env.NODE_ENV,

    // Ignore common non-actionable errors
    ignoreErrors: [
      'prisma:query',
      'connect ECONNREFUSED',
    ],
  });
}
