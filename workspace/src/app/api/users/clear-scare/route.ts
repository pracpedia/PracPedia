import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await db.user.update({
      where: { id: payload.userId },
      data: { scareTriggered: false },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/users/clear-scare error:", err);
    return NextResponse.json({ error: 'Could not clear scare.' }, { status: 500 });
  }
}
