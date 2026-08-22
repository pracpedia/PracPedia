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
      data: { catTriggered: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Could not clear cat.' }, { status: 500 });
  }
}
