import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, getUserFromRequest } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { registerLimiter, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { logActivity } from '@/lib/activity-log';
import { shouldBlockEmail, GMAIL_BLOCK_ERROR } from '@/lib/gmail-check';

// Basic email format check
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit: 3 registrations / 10 minutes / IP ───────────────────────
    const ip = getClientIp(request);
    const rl = registerLimiter.check(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const { email, password, name, role, profilePic, phoneNumber } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Email format validation
    if (!EMAIL_RE.test(String(email))) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    // ── Gmail block — reject Gmail addresses (except platform owners) ──
    if (shouldBlockEmail(String(email))) {
      return NextResponse.json({ error: GMAIL_BLOCK_ERROR }, { status: 403 });
    }

    // Password strength: minimum 4 characters (test mode — relaxed for convenience)
    if (String(password).length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters long.' }, { status: 400 });
    }

    // Artist registration includes rate fields
    const isArtist = role === 'artist';

    const existing = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // ⚠️ PLAINTEXT password storage — test mode only.
    // No bcrypt. Password is stored as-is in the passwordHash column.
    const passwordHash = String(password);
    const newUser = await db.user.create({
      data: {
        email: String(email).toLowerCase(),
        name: String(name || email.split('@')[0]).slice(0, 100),
        passwordHash,
        role: isArtist ? 'artist' : 'user',
        phoneNumber: phoneNumber ? String(phoneNumber).slice(0, 30) : null,
        profilePic: profilePic || null,
        // Artist-specific marketplace fields
        rateDrawingOnly: isArtist ? Number(body.rateDrawingOnly) || 150 : 0,
        rateDrawingWriting: isArtist ? Number(body.rateDrawingWriting) || 300 : 0,
        specialtiesJson: isArtist && body.specialties
          ? JSON.stringify(Array.isArray(body.specialties) ? body.specialties : String(body.specialties).split(',').map((s: string) => s.trim()).filter(Boolean))
          : '[]',
        isAvailable: isArtist ? body.isAvailable !== false : true,
      },
    });

    // Successful registration — reset this IP's bucket
    registerLimiter.reset(ip);

    // Record the user's IP address for security auditing
    db.user.update({ where: { id: newUser.id }, data: { lastIpAddress: ip } }).catch(() => {});

    // Log to activity feed
    await logActivity({
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
      action: 'register',
      category: 'auth',
      detail: `New ${newUser.role} registered: ${newUser.email}`,
      request,
    });

    const token = await signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return NextResponse.json({ token, user: serializeUser(newUser) });
  } catch (err: any) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Registration failed.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ user: serializeUser(u) });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
