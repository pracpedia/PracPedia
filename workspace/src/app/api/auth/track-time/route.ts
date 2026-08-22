import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const seconds = Number(body.seconds) || 0;

    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await db.user.update({
      where: { id: u.id },
      data: { studyTime: u.studyTime + seconds },
    });

    return NextResponse.json({ studyTime: updated.studyTime });
  } catch (err: any) {
    console.error('Track time error:', err);
    return NextResponse.json({ error: 'Could not track time.' }, { status: 500 });
  }
}
