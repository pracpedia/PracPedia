import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/platform-owner';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const requester = await db.user.findUnique({ where: { id: payload.userId } });
    if (!requester || (requester.role !== 'super_admin' && requester.role !== 'admin')) {
      return NextResponse.json({ error: 'Access forbidden.' }, { status: 403 });
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
    // Platform owners cannot be demoted by anyone
    if (isPlatformOwner(u.email)) {
      return NextResponse.json({ error: 'Platform owner cannot be demoted.' }, { status: 403 });
    }
    // Super admins cannot be demoted by regular admins
    if (u.role === 'super_admin' && requester.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin role is protected.' }, { status: 403 });
    }
    if (u.email === requester.email) {
      return NextResponse.json({ error: 'You cannot demote yourself.' }, { status: 400 });
    }
    const updated = await db.user.update({
      where: { id: u.id },
      data: { role: 'user', permissionsJson: '[]' },
    });
    return NextResponse.json({ message: `Demoted ${updated.email}.`, userId: updated.id });
  } catch (err: any) {
    console.error('POST /api/users/demote error:', err);
    return NextResponse.json({ error: 'Demotion failed.' }, { status: 500 });
  }
}
