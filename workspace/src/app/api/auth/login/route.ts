import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { loginLimiter, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { logActivity } from '@/lib/activity-log';
import { shouldBlockEmail, GMAIL_BLOCK_ERROR } from '@/lib/gmail-check';
import { withRetry } from '@/lib/db-retry';

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

    // NOTE: Gmail blocking is ONLY for registration, NOT login.
    // Existing users (including admins with Gmail) should be able to log in.

    // ── DB query with retry — handles Neon connection drops ──
    const u = await withRetry(() =>
      db.user.findUnique({ where: { email: String(email).toLowerCase() } })
    );

    if (!u) {
      // Distinguish "account doesn't exist" from "wrong password" so the user
      // knows whether to sign up or retry their password. This is safe to
      // reveal — it's not an info leak (anyone can try registering an email
      // to see if it exists).
      return NextResponse.json(
        { error: 'No account found with this email. Please sign up to create an account.' },
        { status: 404 }
      );
    }

    // ⚠️ PLAINTEXT password comparison — test mode only.
    if (u.passwordHash !== String(password)) {
      return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });
    }

    // Successful login — reset this IP's bucket so they aren't penalized
    loginLimiter.reset(ip);

    // Record the user's IP address for security auditing
    db.user.update({ where: { id: u.id }, data: { lastIpAddress: ip } }).catch(() => {});

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
