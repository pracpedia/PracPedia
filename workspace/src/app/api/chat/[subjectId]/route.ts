import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ subjectId: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { subjectId: sid } = await params;
    const subjectId = sid === 'general' ? null : sid;
    const where = subjectId ? { subjectId } : { subjectId: null };
    const messages = await db.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return NextResponse.json(messages.map((m) => ({ ...m, id: m.id })));
  } catch (err: any) {
    console.error('GET /api/chat/[subjectId] error:', err);
    return NextResponse.json({ error: 'Could not load chat.' }, { status: 500 });
  }
}
