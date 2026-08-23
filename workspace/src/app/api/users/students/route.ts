import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }
    const students = await db.user.findMany({
      where: { role: 'user' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studyTime: true,
        profilePic: true,
        isAdminStudent: true,
        isPremium: true,
        scareTriggered: true,
        catTriggered: true,
      },
    });
    return NextResponse.json(students.map((u) => ({ ...u, id: u.id })));
  } catch (err: any) {
    console.error('GET /api/users/students error:', err);
    return NextResponse.json({ error: 'Could not load students.' }, { status: 500 });
  }
}
