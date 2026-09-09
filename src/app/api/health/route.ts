import { NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';

/**
 * Health check endpoint for load balancers, Docker, Kubernetes, and uptime monitors.
 *
 * Returns 200 + `{ status: 'ok' }` when:
 *   - The Node.js process is running
 *   - The database is reachable (Prisma can execute a trivial query)
 *
 * Returns 503 + `{ status: 'unhealthy', error }` when the DB is unreachable.
 *
 * Auth: none — this endpoint must be publicly reachable for health checks.
 * No sensitive info is leaked.
 *
 * Usage:
 *   - Docker: HEALTHCHECK CMD curl -f http://localhost:3000/api/health || exit 1
 *   - Kubernetes: livenessProbe + readinessProbe
 *   - UptimeRobot: monitor https://yourapp.com/api/health
 */

export async function GET() {
  const startedAt = Date.now();

  try {
    // Trivial DB ping — Prisma will throw if the DB is unreachable
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        env: process.env.NODE_ENV || 'development',
      },
      {
        status: 200,
        headers: {
          // Tell load balancers not to cache this
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('Health check failed:', err);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        error: 'database_unreachable',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
