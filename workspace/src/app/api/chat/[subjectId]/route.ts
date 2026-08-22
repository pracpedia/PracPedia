import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/chat/[subjectId]
 *
 * Fetches chat messages for a subject (or global if subjectId === 'general').
 *
 * Long-polling support:
 *   ?since=ISO_TIMESTAMP  — if provided, the server holds the request open for
 *   up to 20 seconds waiting for a message newer than `since`. Returns
 *   immediately when a new message arrives, or an empty array on timeout.
 *
 * Without `since`, returns the latest 200 messages immediately.
 *
 * This approach works on Vercel serverless (25s timeout) and provides
 * near-real-time chat without WebSocket infrastructure.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ subjectId: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subjectId: sid } = await params;
    const subjectId = sid === 'general' ? null : sid;
    const where = subjectId ? { subjectId } : { subjectId: null };

    // ── Long-polling mode ───────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    if (since) {
      const sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        return NextResponse.json({ error: 'Invalid since timestamp' }, { status: 400 });
      }

      // Poll for up to 20 seconds (Vercel safe — under 25s serverless timeout)
      const maxWaitMs = 20_000;
      const pollIntervalMs = 1_000;
      const startedAt = Date.now();

      while (Date.now() - startedAt < maxWaitMs) {
        const newMessages = await db.chatMessage.findMany({
          where: { ...where, createdAt: { gt: sinceDate } },
          orderBy: { createdAt: 'asc' },
          take: 100,
        });

        if (newMessages.length > 0) {
          return NextResponse.json({
            messages: newMessages.map((m) => ({ ...m, id: m.id })),
            polledAt: new Date().toISOString(),
            longPoll: true,
          });
        }

        // Wait 1 second before checking again
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }

      // Timeout — no new messages
      return NextResponse.json({
        messages: [],
        polledAt: new Date().toISOString(),
        longPoll: true,
      });
    }

    // ── Initial fetch mode ──────────────────────────────────────────────────
    const messages = await db.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 200,
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
