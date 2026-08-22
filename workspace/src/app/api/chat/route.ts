import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    // Long-polling mode (kept for backward compat — prefer /api/chat/general)
    if (since) {
      const sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        return NextResponse.json({ error: 'Invalid since timestamp' }, { status: 400 });
      }
      const maxWaitMs = 20_000;
      const startedAt = Date.now();
      while (Date.now() - startedAt < maxWaitMs) {
        const newMessages = await db.chatMessage.findMany({
          where: { subjectId: null, createdAt: { gt: sinceDate } },
          orderBy: { createdAt: 'asc' },
          take: 100,
        });
        if (newMessages.length > 0) {
          return NextResponse.json({
            messages: newMessages.map((m) => ({ ...m, id: m.id })),
            polledAt: new Date().toISOString(),
          });
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      return NextResponse.json({ messages: [], polledAt: new Date().toISOString() });
    }

    const messages = await db.chatMessage.findMany({
      where: { subjectId: null },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return NextResponse.json({
      messages: messages.map((m) => ({ ...m, id: m.id })),
      polledAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('GET /api/chat error:', err);
    return NextResponse.json({ error: 'Could not load chat.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const body = await request.json();
    const { text, subjectId } = body;
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Message required.' }, { status: 400 });
    }
    const created = await db.chatMessage.create({
      data: {
        userId: u.id,
        userName: u.name,
        userRole: u.role,
        userAvatar: u.profilePic || null,
        text: String(text).slice(0, 4000),
        subjectId: subjectId || null,
      },
    });
    return NextResponse.json({ ...created, id: created.id });
  } catch (err: any) {
    console.error('POST /api/chat error:', err);
    return NextResponse.json({ error: 'Could not post message.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Message id required.' }, { status: 400 });
    }
    const msg = await db.chatMessage.findUnique({ where: { id } });
    if (!msg) {
      return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    }
    if (msg.userId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
    await db.chatMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/chat error:', err);
    return NextResponse.json({ error: 'Could not delete message.' }, { status: 500 });
  }
}
