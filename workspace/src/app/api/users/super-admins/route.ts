import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Only admins/super_admins can list super_admins — exposing the list of
    // highest-privilege emails to every student/artist is a phishing risk.
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden — admin only.' }, { status: 403 });
    }
    const superAdmins = await db.user.findMany({
      where: { role: 'super_admin' },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(superAdmins.map((u) => serializeUser(u)));
  } catch (err: any) {
    console.error('GET /api/users/super-admins error:', err);
    return NextResponse.json({ error: 'Could not load super admins.' }, { status: 500 });
  }
}
