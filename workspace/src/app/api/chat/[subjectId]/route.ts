import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/chat/[subjectId]
 *
 * Fetches chat messages for a subject (or global if subjectId === 'general').
 *
 * Query params:
 *   ?since=ISO  — only messages newer than this timestamp (for client-side polling)
 *   ?limit=200  — max messages to return (default 200)
 *
 * Returns IMMEDIATELY — no long-polling busy-wait loop. The client polls
 * every 3 seconds. This is Vercel serverless-safe (no held invocations,
 * no quota burning, no timeout risk on Hobby plan).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ subjectId: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subjectId: sid } = await params;
    const subjectId = sid === 'general' ? null : sid;
    const where: any = subjectId ? { subjectId } : { subjectId: null };

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const limit = Math.min(Number(searchParams.get('limit') || '200'), 500);

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.createdAt = { gt: sinceDate };
      }
    }

    const messages = await db.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return NextResponse.json({
      messages: messages.map((m) => ({ ...m, id: m.id })),
      polledAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('GET /api/chat/[subjectId] error:', err);
    return NextResponse.json({ error: 'Could not load chat.' }, { status: 500 });
  }
}
