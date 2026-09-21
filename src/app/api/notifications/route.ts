import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/notifications
 *
 * Returns unread notifications for the current user from 3 sources:
 *   1. Classroom chat messages (ChatMessage)
 *   2. Order chat messages (OrderChat)
 *   3. Assistant subtask updates (SubTask)
 *
 * IMPORTANT: On first ever visit (no lastNotificationSeen), we set it to NOW
 * so subsequent fetches only return truly NEW messages. This fixes the bug
 * where unreadCount was always 0.
 */

const MAX_NOTIFICATIONS = 20;

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { lastNotificationSeen: true, parentArtistId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── FIRST EVER VISIT: set lastNotificationSeen to NOW ──
    // This prevents old messages from flooding as "unread" on first load.
    // Subsequent fetches will only return messages newer than this timestamp.
    if (!user.lastNotificationSeen) {
      const now = new Date();
      await db.user.update({
        where: { id: userId },
        data: { lastNotificationSeen: now },
      });

      // Return empty on first visit — user starts with clean slate
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
        polledAt: now.toISOString(),
      });
    }

    // ── NORMAL FETCH: messages since lastNotificationSeen ──
    const since = user.lastNotificationSeen;

    const [classroomMessages, orderChats, subtaskUpdates] = await Promise.all([
      // 1. Classroom chat messages
      db.chatMessage.findMany({
        where: {
          createdAt: { gt: since },
          userId: { not: userId },
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_NOTIFICATIONS,
        include: {
          subject: { select: { id: true, title: true } },
        },
      }),

      // 2. Order chat messages
      db.orderChat.findMany({
        where: {
          createdAt: { gt: since },
          senderId: { not: userId },
          booking: {
            OR: [
              { clientId: userId },
              { artistId: userId },
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_NOTIFICATIONS,
        include: {
          sender: { select: { id: true, name: true, profilePic: true, role: true } },
          booking: { select: { id: true, subject: true } },
        },
      }),

      // 3. Subtask updates
      db.subTask.findMany({
        where: {
          updatedAt: { gt: since },
          OR: [
            { assistantId: userId },
            { parentArtistId: userId },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: MAX_NOTIFICATIONS,
        include: {
          assistant: { select: { id: true, name: true, profilePic: true } },
          parentArtist: { select: { id: true, name: true, profilePic: true } },
          booking: { select: { id: true, subject: true } },
        },
      }),
    ]);

    // ── Transform into unified format ──
    interface NotificationItem {
      id: string;
      type: 'classroom' | 'order_chat' | 'assistant_chat';
      senderName: string;
      senderAvatar?: string | null;
      preview: string;
      createdAt: string;
      sourceLabel: string;
      bookingId?: string;
      subjectId?: string;
    }

    const allNotifications: NotificationItem[] = [];

    for (const m of classroomMessages) {
      allNotifications.push({
        id: `classroom-${m.id}`,
        type: 'classroom',
        senderName: m.userName || 'Someone',
        senderAvatar: m.userAvatar || null,
        preview: m.imageUrl ? '📷 Sent an image' : (m.text || '').slice(0, 80),
        createdAt: m.createdAt.toISOString(),
        sourceLabel: m.subject?.title || 'General',
        subjectId: m.subjectId || undefined,
      });
    }

    for (const c of orderChats) {
      allNotifications.push({
        id: `order-${c.id}`,
        type: 'order_chat',
        senderName: c.sender?.name || 'Someone',
        senderAvatar: c.sender?.profilePic || null,
        preview: (c.text || '').slice(0, 80),
        createdAt: c.createdAt.toISOString(),
        sourceLabel: c.booking?.subject || 'Order',
        bookingId: c.bookingId,
      });
    }

    for (const s of subtaskUpdates) {
      const isUserAssistant = s.assistantId === userId;
      const otherParty = isUserAssistant ? s.parentArtist : s.assistant;
      const statusVerb = s.status === 'completed' ? 'completed' :
                         s.status === 'in_progress' ? 'started' :
                         s.status === 'declined' ? 'declined' :
                         'was assigned';
      allNotifications.push({
        id: `subtask-${s.id}-${s.updatedAt.getTime()}`,
        type: 'assistant_chat',
        senderName: otherParty?.name || 'Assistant',
        senderAvatar: otherParty?.profilePic || null,
        preview: `${s.taskType === 'drawing' ? 'Drawing' : 'Writing'} task ${statusVerb}`,
        createdAt: s.updatedAt.toISOString(),
        sourceLabel: s.booking?.subject || 'Task',
        bookingId: s.bookingId,
      });
    }

    allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const trimmed = allNotifications.slice(0, MAX_NOTIFICATIONS);

    // unreadCount = ALL new messages since lastNotificationSeen
    const unreadCount = allNotifications.length;

    return NextResponse.json({
      notifications: trimmed,
      unreadCount,
      polledAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json(
      { error: 'Could not load notifications.' },
      { status: 500 },
    );
  }
}
