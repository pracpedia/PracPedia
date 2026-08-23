import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { loginLimiter, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { logActivity } from '@/lib/activity-log';
import { shouldBlockEmail, GMAIL_BLOCK_ERROR } from '@/lib/gmail-check';

/**
 * Retry wrapper — Neon serverless Postgres can drop idle connections.
 * If the first query fails with a connection error, wait 1s and retry.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      // If it's a connection error, wait and retry
      if (err?.code === 'P1001' || err?.message?.includes('connection') || err?.message?.includes('timed out')) {
        console.warn(`DB connection error (attempt ${i + 1}/${retries}), retrying...`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit: 5 attempts / minute / IP ────────────────────────────────
    const ip = getClientIp(request);
    const rl = loginLimiter.check(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // ── Gmail block — reject Gmail addresses (except platform owners) ──
    if (shouldBlockEmail(String(email))) {
      return NextResponse.json({ error: GMAIL_BLOCK_ERROR }, { status: 403 });
    }

    // ── DB query with retry — handles Neon connection drops ──
    const u = await withRetry(() =>
      db.user.findUnique({ where: { email: String(email).toLowerCase() } })
    );

    if (!u) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // ⚠️ PLAINTEXT password comparison — test mode only.
    if (u.passwordHash !== String(password)) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // Successful login — reset this IP's bucket so they aren't penalized
    loginLimiter.reset(ip);

    // Log to activity feed (non-blocking — don't fail login if logging fails)
    logActivity({
      userId: u.id,
      userName: u.name,
      userRole: u.role,
      action: 'login',
      category: 'auth',
      detail: `${u.name} (${u.email}) logged in`,
      request,
    }).catch(() => {});

    const token = await signToken({ userId: u.id, email: u.email, role: u.role });
    return NextResponse.json({ token, user: serializeUser(u) });
  } catch (err: any) {
    console.error('Login error:', err);
    // Provide a more helpful error message for DB connection issues
    if (err?.message?.includes('connection') || err?.code === 'P1001') {
      return NextResponse.json(
        { error: 'Database connection issue. Please try again in a moment.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
