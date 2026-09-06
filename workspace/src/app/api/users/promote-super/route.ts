import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Super admin promotion — only a super_admin can elevate someone to super_admin
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const requester = await db.user.findUnique({ where: { id: payload.userId } });
    if (!requester || requester.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can elevate to super admin role.' }, { status: 403 });
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
    if (u.role === 'super_admin') {
      return NextResponse.json({ error: 'User is already a super admin.' }, { status: 400 });
    }
    const updated = await db.user.update({
      where: { id: u.id },
      data: { role: 'super_admin' },
    });
    return NextResponse.json({ message: `Successfully elevated ${updated.email} to super admin.`, userId: updated.id });
  } catch (err: any) {
    console.error('POST /api/users/promote-super error:', err);
    return NextResponse.json({ error: 'Elevation failed.' }, { status: 500 });
  }
}
