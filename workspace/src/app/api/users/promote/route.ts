import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Promoting a user to admin role grants admin powers — this should be
    // restricted to super_admin only (via the 'manage_admins' permission which
    // only super_admin has implicitly).
    const denied = await requirePermission(request, 'manage_admins');
    if (denied) return NextResponse.json({ error: 'Forbidden — requires permission: manage_admins (super admin only).' }, { status: 403 });
    const requester = await db.user.findUnique({ where: { id: payload.userId } });
    if (!requester) {
      return NextResponse.json({ error: 'Requester not found.' }, { status: 404 });
    }
    const body = await request.json();
    const email = String(body.email || '').toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: 'Email required.' }, { status: 400 });
    }
    const u = await db.user.findUnique({ where: { email } });
    if (!u) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    // Super admin cannot be modified by a regular admin
    if (u.role === 'super_admin' && requester.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin role is protected.' }, { status: 403 });
    }
    const updated = await db.user.update({
      where: { id: u.id },
      data: { role: 'admin' },
    });
    return NextResponse.json({
      message: `Successfully elevated ${updated.email} to administrator.`,
      userId: updated.id,
    });
  } catch (err: any) {
    console.error('POST /api/users/promote error:', err);
    return NextResponse.json({ error: 'Elevation could not be completed.' }, { status: 500 });
  }
}
