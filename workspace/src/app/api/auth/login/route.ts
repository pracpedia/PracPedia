import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import * as bcrypt from 'bcryptjs';
import { serializeUser } from '@/lib/user-serializer';
import { loginLimiter, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

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

    // Constant-time-ish compare: do the DB lookup + bcrypt regardless of which
    // field is wrong, so timing doesn't reveal whether the email exists.
    const u = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
    // Always run a bcrypt compare even if user is null — prevents email enumeration via timing
    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'; // hash of "x"
    const valid = u ? bcrypt.compareSync(String(password), u.passwordHash)
                    : bcrypt.compareSync(String(password), dummyHash);

    if (!u || !valid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // Successful login — reset this IP's bucket so they aren't penalized
    loginLimiter.reset(ip);

    const token = await signToken({ userId: u.id, email: u.email, role: u.role });
    return NextResponse.json({ token, user: serializeUser(u) });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed.' }, { status: 500 });
  }
}
