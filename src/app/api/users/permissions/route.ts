import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ALL_PERMISSIONS, PERMISSION_KEYS, parsePermissions } from '@/lib/permissions';
import { isPlatformOwner } from '@/lib/platform-owner';

/**
 * GET /api/users/permissions
 * Returns the full permission catalog + each admin's current permissions.
 * Super admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin only.' }, { status: 403 });
    }

    const admins = await db.user.findMany({
      where: { role: 'admin' },
      select: { id: true, name: true, email: true, permissionsJson: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      catalog: ALL_PERMISSIONS,
      admins: admins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        permissions: parsePermissions(a.permissionsJson),
      })),
    });
  } catch (err: any) {
    console.error('GET /api/users/permissions error:', err);
    return NextResponse.json({ error: 'Could not load permissions.' }, { status: 500 });
  }
}

/**
 * PUT /api/users/permissions
 * Body: { userId, permissions: string[] }
 * Super admin only. Updates an admin's permission set.
 * Cannot modify super admins or platform owners.
 */
export async function PUT(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, permissions } = body as { userId: string; permissions: string[] };
    if (!userId) {
      return NextResponse.json({ error: 'userId required.' }, { status: 400 });
    }

    const target = await db.user.findUnique({ where: { id: String(userId) } });
    if (!target) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    // Cannot modify super admins
    if (target.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot modify super admin permissions.' }, { status: 403 });
    }
    // Cannot modify non-admins (they should be promoted first)
    if (target.role !== 'admin') {
      return NextResponse.json({ error: 'Target user is not an admin.' }, { status: 400 });
    }
    // Platform owner protection
    if (isPlatformOwner(target.email)) {
      return NextResponse.json({ error: 'Cannot modify platform owner.' }, { status: 403 });
    }

    // Filter to valid permission keys
    const validPerms = Array.isArray(permissions)
      ? permissions.filter((p) => PERMISSION_KEYS.includes(p))
      : [];

    await db.user.update({
      where: { id: target.id },
      data: { permissionsJson: JSON.stringify(validPerms) },
    });

    return NextResponse.json({
      success: true,
      userId: target.id,
      permissions: validPerms,
    });
  } catch (err: any) {
    console.error('PUT /api/users/permissions error:', err);
    return NextResponse.json({ error: 'Could not update permissions.' }, { status: 500 });
  }
}
