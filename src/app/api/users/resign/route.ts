import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/platform-owner';
import { logActivity } from '@/lib/activity-log';

/**
 * Self-demote: an admin (or super_admin) can step down to a regular user.
 *
 * Platform owners cannot resign — their account is the bootstrap super admin
 * and is protected to prevent lockout (see lib/platform-owner.ts).
 *
 * Used by the "Resign admin role" button in Sidebar.tsx.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    if (u.role !== 'admin' && u.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only admins can resign.' }, { status: 400 });
    }
    if (isPlatformOwner(u.email)) {
      return NextResponse.json(
        { error: 'Platform owner account cannot resign. This protects the bootstrap super admin from being locked out.' },
        { status: 403 }
      );
    }

    const updated = await db.user.update({
      where: { id: u.id },
      data: { role: 'user', permissionsJson: '[]' },
    });

    await logActivity({
      userId: u.id,
      userName: u.name,
      userRole: 'user',
      action: 'resign',
      category: 'users',
      detail: `${u.email} resigned from ${u.role} role`,
      request,
    });

    return NextResponse.json({ message: 'Resigned successfully.', role: updated.role });
  } catch (err: any) {
    console.error('POST /api/users/resign error:', err);
    return NextResponse.json({ error: 'Resignation failed.' }, { status: 500 });
  }
}
