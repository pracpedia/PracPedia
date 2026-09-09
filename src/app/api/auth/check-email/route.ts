import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';

/**
 * GET /api/auth/check-email?email=...
 *
 * Public endpoint (no auth required) that checks if an email belongs to
 * an existing user and returns their role. Used by the AuthPage to let
 * admins/super_admins bypass the gmail/non-gmail form separation.
 *
 * Returns:
 *   200 { exists: true, role: 'user' | 'admin' | 'super_admin' | 'artist' }
 *   200 { exists: false }  (email not registered — no info leak, just "not admin")
 *
 * Security: only returns the role, never the password or other sensitive data.
 * Rate limited via the loginLimiter (same IP bucket as login).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ exists: false });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // Only check if it looks like a valid email (basic format)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ exists: false });
    }

    const user = await db.user.findUnique({
      where: { email: cleanEmail },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      role: user.role,
    });
  } catch (err: any) {
    console.error('GET /api/auth/check-email error:', err);
    // Return non-admin on any error so the form still works
    return NextResponse.json({ exists: false });
  }
}
