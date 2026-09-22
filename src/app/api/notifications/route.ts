// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { getUserFromRequest } from '@/lib/auth';

// /**
//  * GET /api/notifications
//  *
//  * Returns unread notifications for the current user from 3 sources:
//  *   1. Classroom chat messages (ChatMessage)
//  *   2. Order chat messages (OrderChat)
//  *   3. Assistant subtask updates (SubTask)
//  *
//  * IMPORTANT: On first ever visit (no lastNotificationSeen), we set it to NOW
//  * so subsequent fetches only return truly NEW messages. This fixes the bug
//  * where unreadCount was always 0.
//  */

// const MAX_NOTIFICATIONS = 20;

// export async function GET(request: NextRequest) {
//   try {
//     const payload = await getUserFromRequest(request);
//     if (!payload) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const userId = payload.userId;
//     const user = await db.user.findUnique({
//       where: { id: userId },
//       select: { lastNotificationSeen: true, parentArtistId: true, role: true },
//     });

//     if (!user) {
//       return NextResponse.json({ error: 'User not found' }, { status: 404 });
//     }

//     // ── FIRST EVER VISIT: set lastNotificationSeen to NOW ──
//     // This prevents old messages from flooding as "unread" on first load.
//     // Subsequent fetches will only return messages newer than this timestamp.
//     if (!user.lastNotificationSeen) {
//       const now = new Date();
//       await db.user.update({
//         where: { id: userId },
//         data: { lastNotificationSeen: now },
//       });

//       // Return empty on first visit — user starts with clean slate
//       return NextResponse.json({
//         notifications: [],
//         unreadCount: 0,
//         polledAt: now.toISOString(),
//       });
//     }

//     // ── NORMAL FETCH: messages since lastNotificationSeen ──
//     const since = user.lastNotificationSeen;

//     const [classroomMessages, orderChats, subtaskUpdates] = await Promise.all([
//       // 1. Classroom chat messages
//       db.chatMessage.findMany({
//         where: {
//           createdAt: { gt: since },
//           userId: { not: userId },
//         },
//         orderBy: { createdAt: 'desc' },
//         take: MAX_NOTIFICATIONS,
//         include: {
//           subject: { select: { id: true, title: true } },
//         },
//       }),

//       // 2. Order chat messages
//       db.orderChat.findMany({
//         where: {
//           createdAt: { gt: since },
//           senderId: { not: userId },
//           booking: {
//             OR: [
//               { clientId: userId },
//               { artistId: userId },
//             ],
//           },
//         },
//         orderBy: { createdAt: 'desc' },
//         take: MAX_NOTIFICATIONS,
//         include: {
//           sender: { select: { id: true, name: true, profilePic: true, role: true } },
//           booking: { select: { id: true, subject: true } },
//         },
//       }),

//       // 3. Subtask updates
//       db.subTask.findMany({
//         where: {
//           updatedAt: { gt: since },
//           OR: [
//             { assistantId: userId },
//             { parentArtistId: userId },
//           ],
//         },
//         orderBy: { updatedAt: 'desc' },
//         take: MAX_NOTIFICATIONS,
//         include: {
//           assistant: { select: { id: true, name: true, profilePic: true } },
//           parentArtist: { select: { id: true, name: true, profilePic: true } },
//           booking: { select: { id: true, subject: true } },
//         },
//       }),
//     ]);

//     // ── Transform into unified format ──
//     interface NotificationItem {
//       id: string;
//       type: 'classroom' | 'order_chat' | 'assistant_chat';
//       senderName: string;
//       senderAvatar?: string | null;
//       preview: string;
//       createdAt: string;
//       sourceLabel: string;
//       bookingId?: string;
//       subjectId?: string;
//     }

//     const allNotifications: NotificationItem[] = [];

//     for (const m of classroomMessages) {
//       allNotifications.push({
//         id: `classroom-${m.id}`,
//         type: 'classroom',
//         senderName: m.userName || 'Someone',
//         senderAvatar: m.userAvatar || null,
//         preview: m.imageUrl ? '📷 Sent an image' : (m.text || '').slice(0, 80),
//         createdAt: m.createdAt.toISOString(),
//         sourceLabel: m.subject?.title || 'General',
//         subjectId: m.subjectId || undefined,
//       });
//     }

//     for (const c of orderChats) {
//       allNotifications.push({
//         id: `order-${c.id}`,
//         type: 'order_chat',
//         senderName: c.sender?.name || 'Someone',
//         senderAvatar: c.sender?.profilePic || null,
//         preview: (c.text || '').slice(0, 80),
//         createdAt: c.createdAt.toISOString(),
//         sourceLabel: c.booking?.subject || 'Order',
//         bookingId: c.bookingId,
//       });
//     }

//     for (const s of subtaskUpdates) {
//       const isUserAssistant = s.assistantId === userId;
//       const otherParty = isUserAssistant ? s.parentArtist : s.assistant;
//       const statusVerb = s.status === 'completed' ? 'completed' :
//                          s.status === 'in_progress' ? 'started' :
//                          s.status === 'declined' ? 'declined' :
//                          'was assigned';
//       allNotifications.push({
//         id: `subtask-${s.id}-${s.updatedAt.getTime()}`,
//         type: 'assistant_chat',
//         senderName: otherParty?.name || 'Assistant',
//         senderAvatar: otherParty?.profilePic || null,
//         preview: `${s.taskType === 'drawing' ? 'Drawing' : 'Writing'} task ${statusVerb}`,
//         createdAt: s.updatedAt.toISOString(),
//         sourceLabel: s.booking?.subject || 'Task',
//         bookingId: s.bookingId,
//       });
//     }

//     allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
//     const trimmed = allNotifications.slice(0, MAX_NOTIFICATIONS);

//     // unreadCount = ALL new messages since lastNotificationSeen
//     const unreadCount = allNotifications.length;

//     return NextResponse.json({
//       notifications: trimmed,
//       unreadCount,
//       polledAt: new Date().toISOString(),
//     });
//   } catch (err: any) {
//     console.error('GET /api/notifications error:', err);
//     return NextResponse.json(
//       { error: 'Could not load notifications.' },
//       { status: 500 },
//     );
//   }
// }





// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { getUserFromRequest } from '@/lib/auth';

// /**
//  * GET /api/notifications
//  *
//  * Returns unread notifications from ALL sources:
//  *   1. Classroom chat messages (ChatMessage)
//  *   2. Order chat messages (OrderChat)
//  *   3. Booking lifecycle events (order placed, accepted, completed, cancelled)
//  *   4. Subtask lifecycle events (assigned, started, completed, declined)
//  *
//  * Uses lastNotificationSeen to determine what's "unread".
//  * First visit sets lastNotificationSeen to NOW (clean slate).
//  */

// const MAX_NOTIFICATIONS = 30;

// export async function GET(request: NextRequest) {
//   try {
//     const payload = await getUserFromRequest(request);
//     if (!payload) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const userId = payload.userId;
//     const user = await db.user.findUnique({
//       where: { id: userId },
//       select: { lastNotificationSeen: true, parentArtistId: true, role: true },
//     });

//     if (!user) {
//       return NextResponse.json({ error: 'User not found' }, { status: 404 });
//     }

//     // First visit: set lastNotificationSeen to NOW
//     if (!user.lastNotificationSeen) {
//       const now = new Date();
//       await db.user.update({
//         where: { id: userId },
//         data: { lastNotificationSeen: now },
//       });
//       return NextResponse.json({
//         notifications: [],
//         unreadCount: 0,
//         polledAt: now.toISOString(),
//       });
//     }

//     const since = user.lastNotificationSeen;

//     // ── Parallel fetch from ALL sources ──
//     const [classroomMessages, orderChats, subtaskUpdates, bookingEvents] = await Promise.all([
//       // 1. Classroom chat messages
//       db.chatMessage.findMany({
//         where: { createdAt: { gt: since }, userId: { not: userId } },
//         orderBy: { createdAt: 'desc' },
//         take: MAX_NOTIFICATIONS,
//         include: { subject: { select: { id: true, title: true } } },
//       }),

//       // 2. Order chat messages
//       db.orderChat.findMany({
//         where: {
//           createdAt: { gt: since },
//           senderId: { not: userId },
//           booking: { OR: [{ clientId: userId }, { artistId: userId }] },
//         },
//         orderBy: { createdAt: 'desc' },
//         take: MAX_NOTIFICATIONS,
//         include: {
//           sender: { select: { id: true, name: true, profilePic: true } },
//           booking: { select: { id: true, subject: true } },
//         },
//       }),

//       // 3. Subtask lifecycle (assigned, started, completed, declined)
//       db.subTask.findMany({
//         where: {
//           OR: [
//             // Task assigned to me (assistant)
//             { assignedAt: { gt: since }, assistantId: userId },
//             // Task status changed (I'm either assistant or parent artist)
//             { updatedAt: { gt: since }, OR: [{ assistantId: userId }, { parentArtistId: userId }] },
//           ],
//         },
//         orderBy: { updatedAt: 'desc' },
//         take: MAX_NOTIFICATIONS,
//         include: {
//           assistant: { select: { id: true, name: true } },
//           parentArtist: { select: { id: true, name: true } },
//           booking: { select: { id: true, subject: true } },
//         },
//       }),

//       // 4. Booking lifecycle events
//       // New orders (artist sees: order placed), status changes (client sees: accepted/completed/cancelled)
//       db.booking.findMany({
//         where: {
//           OR: [
//             // New order placed (for the artist)
//             { createdAt: { gt: since }, artistId: userId },
//             // Order status changed (for the client)
//             { updatedAt: { gt: since }, clientId: userId, status: { in: ['in_progress', 'completed', 'cancelled'] } },
//             // Order status changed (for the artist too, except 'pending' which is just new)
//             { updatedAt: { gt: since }, artistId: userId, status: { in: ['in_progress', 'completed', 'cancelled'] } },
//           ],
//         },
//         orderBy: { updatedAt: 'desc' },
//         take: MAX_NOTIFICATIONS,
//         include: {
//           client: { select: { id: true, name: true } },
//           artist: { select: { id: true, name: true } },
//         },
//       }),
//     ]);

//     // ── Transform into unified format ──
//     interface NotificationItem {
//       id: string;
//       type: string;
//       senderName: string;
//       preview: string;
//       createdAt: string;
//       sourceLabel: string;
//     }

//     const allNotifications: NotificationItem[] = [];

//     // 1. Classroom messages
//     for (const m of classroomMessages) {
//       allNotifications.push({
//         id: `classroom-${m.id}`,
//         type: 'classroom',
//         senderName: m.userName || 'Someone',
//         preview: m.imageUrl ? '📷 Sent an image' : (m.text || '').slice(0, 100),
//         createdAt: m.createdAt.toISOString(),
//         sourceLabel: m.subject?.title || 'General',
//       });
//     }

//     // 2. Order chat messages
//     for (const c of orderChats) {
//       allNotifications.push({
//         id: `order-${c.id}`,
//         type: 'order_chat',
//         senderName: c.sender?.name || 'Someone',
//         preview: (c.text || '').slice(0, 100),
//         createdAt: c.createdAt.toISOString(),
//         sourceLabel: c.booking?.subject || 'Order',
//       });
//     }

//     // 3. Subtask lifecycle
//     for (const s of subtaskUpdates) {
//       const isUserAssistant = s.assistantId === userId;
//       const otherParty = isUserAssistant ? s.parentArtist : s.assistant;
//       const taskLabel = s.taskType === 'drawing' ? 'Drawing' : 'Writing';

//       // If assignedAt > since and I'm the assistant → new task assigned
//       if (s.assignedAt > since && s.assistantId === userId) {
//         allNotifications.push({
//           id: `subtask-assigned-${s.id}`,
//           type: 'task_assigned',
//           senderName: s.parentArtist?.name || 'Artist',
//           preview: `${taskLabel} task assigned to you for "${s.booking?.subject || ''}"`,
//           createdAt: s.assignedAt.toISOString(),
//           sourceLabel: s.booking?.subject || 'Task',
//         });
//       }

//       // Status changes
//       if (s.updatedAt > since && s.assignedAt <= since) {
//         let type = '';
//         let preview = '';
//         if (s.status === 'in_progress') {
//           type = isUserAssistant ? 'task_started' : 'task_started';
//           preview = `${taskLabel} task started${isUserAssistant ? '' : ` by ${s.assistant?.name || 'assistant'}`} — "${s.booking?.subject || ''}"`;
//         } else if (s.status === 'completed') {
//           type = 'task_completed';
//           preview = `${taskLabel} task completed${isUserAssistant ? '' : ` by ${s.assistant?.name || 'assistant'}`} — "${s.booking?.subject || ''}"`;
//         } else if (s.status === 'declined') {
//           type = 'task_declined';
//           preview = `${taskLabel} task declined${isUserAssistant ? '' : ` by ${s.assistant?.name || 'assistant'}`} — "${s.booking?.subject || ''}"`;
//         }

//         if (type) {
//           allNotifications.push({
//             id: `subtask-${s.id}-${s.status}`,
//             type,
//             senderName: otherParty?.name || 'Assistant',
//             preview,
//             createdAt: s.updatedAt.toISOString(),
//             sourceLabel: s.booking?.subject || 'Task',
//           });
//         }
//       }
//     }

//     // 4. Booking lifecycle events
//     for (const b of bookingEvents) {
//       const isUserArtist = b.artistId === userId;
//       const isUserClient = b.clientId === userId;

//       // New order placed (artist sees this)
//       if (b.createdAt > since && isUserArtist) {
//         allNotifications.push({
//           id: `booking-placed-${b.id}`,
//           type: 'order_placed',
//           senderName: b.client?.name || 'Client',
//           preview: `New order: "${b.subject}" — ৳${b.price}`,
//           createdAt: b.createdAt.toISOString(),
//           sourceLabel: b.subject,
//         });
//       }

//       // Status changes (client + artist see these, but not pending which is just "placed")
//       if (b.updatedAt > since && b.createdAt <= since) {
//         let type = '';
//         let preview = '';
//         const otherName = isUserArtist ? b.client?.name : b.artist?.name;

//         if (b.status === 'in_progress') {
//           type = 'order_accepted';
//           preview = isUserClient
//             ? `Your order "${b.subject}" was accepted and is now in progress`
//             : `Order "${b.subject}" started — ৳${b.artistEarnings || b.price} earnings`;
//         } else if (b.status === 'completed') {
//           type = 'order_completed';
//           preview = isUserClient
//             ? `Your order "${b.subject}" has been delivered!`
//             : `Order "${b.subject}" marked as completed`;
//         } else if (b.status === 'cancelled') {
//           type = 'order_cancelled';
//           preview = `Order "${b.subject}" was cancelled`;
//         }

//         if (type) {
//           allNotifications.push({
//             id: `booking-${b.id}-${b.status}`,
//             type,
//             senderName: otherName || 'System',
//             preview,
//             createdAt: b.updatedAt.toISOString(),
//             sourceLabel: b.subject,
//           });
//         }
//       }
//     }

//     // Sort by createdAt desc, take top N
//     allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
//     const trimmed = allNotifications.slice(0, MAX_NOTIFICATIONS);
//     const unreadCount = allNotifications.length;

//     return NextResponse.json({
//       notifications: trimmed,
//       unreadCount,
//       polledAt: new Date().toISOString(),
//     });
//   } catch (err: any) {
//     console.error('GET /api/notifications error:', err);
//     return NextResponse.json(
//       { error: 'Could not load notifications.' },
//       { status: 500 },
//     );
//   }
// }
