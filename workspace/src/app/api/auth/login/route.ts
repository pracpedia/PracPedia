import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { loginLimiter, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { logActivity } from '@/lib/activity-log';
import { shouldBlockEmail, GMAIL_BLOCK_ERROR } from '@/lib/gmail-check';

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

    const u = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (!u) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // ⚠️ PLAINTEXT password comparison — test mode only.
    // Passwords are stored as plaintext in the database (see /api/auth/register
    // and prisma/seed.ts). No bcrypt hashing.
    if (u.passwordHash !== String(password)) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // Successful login — reset this IP's bucket so they aren't penalized
    loginLimiter.reset(ip);

    // Log to activity feed
    await logActivity({
      userId: u.id,
      userName: u.name,
      userRole: u.role,
      action: 'login',
      category: 'auth',
      detail: `${u.name} (${u.email}) logged in`,
      request,
    });

    const token = await signToken({ userId: u.id, email: u.email, role: u.role });
    return NextResponse.json({ token, user: serializeUser(u) });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed.' }, { status: 500 });
  }
}
