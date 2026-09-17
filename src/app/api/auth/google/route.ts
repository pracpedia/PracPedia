import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { loginLimiter, registerLimiter, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { logActivity } from '@/lib/activity-log';
import { isGmailAddress } from '@/lib/gmail-check';
import { withRetry } from '@/lib/db-retry';

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

    // ── Invite code handling ──
    const inviteCode = body.inviteCode
      ? String(body.inviteCode).toUpperCase().trim()
      : null;
    let parentArtistId: string | null = null;
    let validInvite: any = null;

    if (inviteCode && body.isSignup === true) {
      const invite = await withRetry(() =>
        db.assistantInvite.findUnique({
          where: { code: inviteCode },
          include: { parentArtist: { select: { id: true } } },
        })
      );
      if (invite && invite.status === 'pending' && invite.expiresAt > new Date()) {
        parentArtistId = invite.parentArtist.id;
        validInvite = invite;
      }
    }

    // ── If assistant signup, skip artist-specific fields ──
    const isAssistantSignup = !!parentArtistId;

        const phoneNumber = body.phoneNumber ? String(body.phoneNumber).slice(0, 30) : null;
    const artistBio = isArtist && !isAssistantSignup && body.bio ? String(body.bio).slice(0, 1000) : null;
    const rateDrawingOnly = isArtist && !isAssistantSignup && body.rateDrawingOnly
      ? Math.max(50, Math.min(2000, Number(body.rateDrawingOnly) || 150))
      : (isArtist && !isAssistantSignup ? 150 : 0);
    const rateDrawingWriting = isArtist && !isAssistantSignup && body.rateDrawingWriting
      ? Math.max(100, Math.min(4000, Number(body.rateDrawingWriting) || 300))
      : (isArtist && !isAssistantSignup ? 300 : 0);
    const specialtiesArray = isArtist && !isAssistantSignup && Array.isArray(body.specialties)
      ? body.specialties.map((s: any) => String(s).slice(0, 100)).filter(Boolean).slice(0, 20)
      : [];

    // ── Look up existing user (with retry for Neon cold-start) ──────────────
    const existing = await withRetry(() =>
      db.user.findUnique({ where: { email: normalizedEmail } })
    );

    let user;
    let action: 'login' | 'register';

    if (existing) {
      // Existing user — verify plaintext password (test mode)
      if (existing.passwordHash !== String(password)) {
        return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });
      }
      user = existing;
      action = 'login';
    } else {
      // New user — only create if this is a signup (register) request.
      // The frontend sends isSignup=true when the user is on the "Sign Up" tab.
      const isSignup = body.isSignup === true;
      if (!isSignup) {
        // Login attempt for non-existent account — tell user to sign up
        return NextResponse.json(
          { error: 'No account found with this email. Please sign up to create an account.' },
          { status: 404 }
        );
      }

            // Create new user
            user = await withRetry(() =>
        db.user.create({
          data: {
            email: normalizedEmail,
            name: displayName,
            passwordHash: String(password),
            role: isArtist ? 'artist' : 'user',
            profilePic: profilePic || null,
            phoneNumber,
            bio: artistBio,
            rateDrawingOnly,
            rateDrawingWriting,
            specialtiesJson: JSON.stringify(specialtiesArray),
            isAvailable: true,
            parentArtistId,  // ← ADD THIS LINE
          },
        })
      );
      action = 'register';
      registerLimiter.reset(ip);

      // ← ADD THIS BLOCK (marks invite as accepted):
      if (validInvite) {
        await withRetry(() =>
          db.assistantInvite.update({
            where: { id: validInvite.id },
            data: {
              status: 'accepted',
              acceptedById: user.id,
              acceptedAt: new Date(),
            },
          })
        ).catch(() => {});
      }
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
    if (err?.code === 'P1001' || err?.code === 'P1002' || err?.message?.includes('connection') || err?.message?.includes('timed out') || err?.message?.includes('Can\'t reach')) {
      return NextResponse.json(
        { error: 'The database is warming up. Please wait a few seconds and try again.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Google authentication failed. Please try again.' }, { status: 500 });
  }
}
