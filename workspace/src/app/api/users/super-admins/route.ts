import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Any authenticated user can list super_admins (for CMS display)
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
