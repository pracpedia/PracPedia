import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

/**
 * GET /api/chat
 * Returns global chat messages (subjectId = null).
 *
 * Query params:
 *   ?since=ISO  — only messages newer than this timestamp (for client-side polling)
 *   ?limit=200  — max messages to return (default 200)
 *
 * Returns IMMEDIATELY — no long-polling. The client polls every 3 seconds.
 * This is Vercel serverless-safe (no held function invocations).
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const limit = Math.min(Number(searchParams.get('limit') || '200'), 500);

    const where: any = { subjectId: null };
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
    const { text, subjectId, imageUrl } = body;
    if ((!text || !text.trim()) && !imageUrl) {
      return NextResponse.json({ error: 'Message text or image required.' }, { status: 400 });
    }
    const created = await db.chatMessage.create({
      data: {
        userId: u.id,
        userName: u.name,
        userRole: u.role,
        userAvatar: u.profilePic || null,
        text: String(text || '').slice(0, 4000),
        imageUrl: imageUrl ? String(imageUrl).slice(0, 500000) : null,
        subjectId: subjectId || null,
      },
    });
    await logActivity({
      userId: u.id,
      userName: u.name,
      userRole: u.role,
      action: 'message_sent',
      category: 'chat',
      detail: `${u.name} posted a message${subjectId ? ' in a subject channel' : ' in global chat'}`,
      metadata: { messageId: created.id, subjectId: subjectId || null },
      request,
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
    if (msg.userId !== payload.userId && payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
    await db.chatMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/chat error:', err);
    return NextResponse.json({ error: 'Could not delete message.' }, { status: 500 });
  }
}
