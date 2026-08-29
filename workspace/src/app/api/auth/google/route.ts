import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { loginLimiter, registerLimiter, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { logActivity } from '@/lib/activity-log';
import { isGmailAddress } from '@/lib/gmail-check';

/**
 * Google Sign-In endpoint — combined "login or register" flow for @gmail.com
 * accounts.
 *
 * The standard /api/auth/register endpoint blocks Gmail addresses (test-mode
 * anti-spam measure), so Gmail users go through this endpoint instead.
 *
 * Behaviour:
 *   - If a user with the email already exists → verify password → return token.
 *   - If no user exists → create a new user with the given role → return token.
 *
 * Frontend contract (AuthPage.tsx handleSelectGoogleAccount):
 *   body: { email, name?, role: 'student' | 'artist', profilePic?, password }
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit: combine login + register buckets ────────────────────────
    const ip = getClientIp(request);
    const rl = loginLimiter.check(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const { email, name, role, profilePic, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // ── Strict Gmail-only check — this endpoint must NEVER accept non-gmail ──
    if (!EMAIL_RE.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }
    if (!isGmailAddress(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Google Sign-In is strictly for @gmail.com addresses. For other providers, use the standard form.' },
        { status: 400 }
      );
    }

    // Password strength — relaxed for test mode (matches register route)
    if (String(password).length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters long.' }, { status: 400 });
    }

    const isArtist = role === 'artist';
    const displayName = String(name || normalizedEmail.split('@')[0]).slice(0, 100);

    // ── Look up existing user ───────────────────────────────────────────────
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });

    let user;
    let action: 'login' | 'register';

    if (existing) {
      // Existing user — verify plaintext password (test mode)
      if (existing.passwordHash !== String(password)) {
        return NextResponse.json({ error: 'Invalid Google account credentials.' }, { status: 401 });
      }
      user = existing;
      action = 'login';
    } else {
      // New user — create with role from the form (student or artist)
      user = await db.user.create({
        data: {
          email: normalizedEmail,
          name: displayName,
          passwordHash: String(password),
          role: isArtist ? 'artist' : 'user',
          profilePic: profilePic || null,
          aiCredits: Number(process.env.AI_CREDITS_DEFAULT || '25'),
          // Artist marketplace defaults
          rateDrawingOnly: isArtist ? 150 : 0,
          rateDrawingWriting: isArtist ? 300 : 0,
          specialtiesJson: '[]',
          isAvailable: isArtist ? true : true,
        },
      });
      action = 'register';
      // Successful registration — reset register bucket for this IP
      registerLimiter.reset(ip);
    }

    // Successful auth — reset login bucket
    loginLimiter.reset(ip);

    // Record the user's IP address for security auditing
    db.user.update({ where: { id: user.id }, data: { lastIpAddress: ip } }).catch(() => {});

    // Log to activity feed (non-blocking)
    logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      category: 'auth',
      detail: `${user.name} (${user.email}) signed in via Google`,
      request,
    }).catch(() => {});

    const token = await signToken({ userId: user.id, email: user.email, role: user.role });
    return NextResponse.json({ token, user: serializeUser(user) });
  } catch (err: any) {
    console.error('Google auth error:', err);
    if (err?.message?.includes('connection') || err?.code === 'P1001') {
      return NextResponse.json(
        { error: 'Database connection issue. Please try again in a moment.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Google authentication failed. Please try again.' }, { status: 500 });
  }
}
