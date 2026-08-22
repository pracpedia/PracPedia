import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Return both admin and super_admin role users
    const admins = await db.user.findMany({
      where: {
        OR: [{ role: 'admin' }, { role: 'super_admin' }],
      },
      orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(
      admins.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        studyTime: u.studyTime,
        profilePic: u.profilePic,
      })),
    );
  } catch (err: any) {
    console.error('GET /api/users/admins error:', err);
    return NextResponse.json({ error: 'Could not load admins.' }, { status: 500 });
  }
}
