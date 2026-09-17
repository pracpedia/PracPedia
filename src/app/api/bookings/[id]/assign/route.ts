// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { getUserFromRequest } from '@/lib/auth';
// import { withRetry } from '@/lib/db-retry';
// import { sendTaskAssignedEmail } from '@/lib/email';

// export async function POST(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const payload = await getUserFromRequest(request);
//     if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

//     const { id: bookingId } = await params;
//     const body = await request.json();
//     const { taskType, assistantId, splitPercent, notes } = body;

//     if (!taskType || !assistantId) {
//       return NextResponse.json({ error: 'taskType and assistantId required.' }, { status: 400 });
//     }
//     const tType = String(taskType);
//     if (!['drawing', 'writing'].includes(tType)) {
//       return NextResponse.json({ error: 'taskType must be "drawing" or "writing".' }, { status: 400 });
//     }
//     const split = Math.max(1, Math.min(100, Number(splitPercent) || 0));

//     const [booking, assistant] = await Promise.all([
//       withRetry(() => db.booking.findUnique({ where: { id: bookingId } })),
//       withRetry(() => db.user.findUnique({ where: { id: String(assistantId) } })),
//     ]);

//     if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
//     if (booking.artistId !== payload.userId) {
//       return NextResponse.json({ error: 'Only the main artist can assign tasks.' }, { status: 403 });
//     }
//     if (booking.status === 'completed' || booking.status === 'cancelled') {
//       return NextResponse.json({ error: `Cannot assign to a ${booking.status} booking.` }, { status: 400 });
//     }
//     if (booking.serviceType === 'drawing_only' && tType === 'writing') {
//       return NextResponse.json({ error: 'Drawing-Only booking — no writing task.' }, { status: 400 });
//     }
//     if (!assistant) return NextResponse.json({ error: 'Assistant not found.' }, { status: 404 });
//     if (assistant.parentArtistId !== payload.userId) {
//       return NextResponse.json({ error: 'Not your assistant.' }, { status: 403 });
//     }

//     const existingSubtasks = await withRetry(() =>
//       db.subTask.findMany({ where: { bookingId }, select: { taskType: true, splitPercent: true, status: true } })
//     );

//     if (existingSubtasks.some((s) => s.taskType === tType)) {
//       return NextResponse.json({ error: `"${tType}" already assigned.` }, { status: 409 });
//     }

//     const activeSplits = existingSubtasks
//       .filter((s) => s.status !== 'declined')
//       .reduce((sum, s) => sum + s.splitPercent, 0);
//     if (activeSplits + split > 100) {
//       return NextResponse.json({ error: `Split exceeds 100%. Max: ${100 - activeSplits}%.` }, { status: 400 });
//     }

//     const earnings = Math.round((booking.price * split) / 100);
//     const subtask = await withRetry(() =>
//       db.subTask.create({
//         data: {
//           bookingId, assistantId: assistant.id, parentArtistId: payload.userId,
//           taskType: tType, splitPercent: split, earnings, status: 'assigned',
//           notes: notes ? String(notes).slice(0, 1000) : null,
//         },
//       })
//     );

//     void sendTaskAssignedEmail({
//       bookingId: booking.id, assistantName: assistant.name, assistantEmail: assistant.email,
//       parentArtistName: payload.email || 'The artist', subject: booking.subject, description: booking.description,
//       taskType: tType, splitPercent: split, earnings,
//       appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://pracpedia.vercel.app',
//     }).catch(() => {});

//     return NextResponse.json({ success: true, subtask });
//   } catch (err: any) {
//     console.error('POST /api/bookings/[id]/assign error:', err);
//     if (err?.code === 'P2002') return NextResponse.json({ error: 'Task already assigned.' }, { status: 409 });
//     return NextResponse.json({ error: 'Could not assign task.' }, { status: 500 });
//   }
// }



// 


import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { withRetry } from '@/lib/db-retry';
import { sendTaskAssignedEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: bookingId } = await params;
    const body = await request.json();
    const { taskType, assistantId, splitPercent, notes } = body;

    if (!taskType || !assistantId) {
      return NextResponse.json({ error: 'taskType and assistantId required.' }, { status: 400 });
    }
    const tType = String(taskType);
    if (!['drawing', 'writing'].includes(tType)) {
      return NextResponse.json({ error: 'taskType must be "drawing" or "writing".' }, { status: 400 });
    }
    const split = Math.max(1, Math.min(100, Number(splitPercent) || 0));

    const [booking, assistant] = await Promise.all([
      withRetry(() => db.booking.findUnique({ where: { id: bookingId } })),
      withRetry(() => db.user.findUnique({ where: { id: String(assistantId) } })),
    ]);

    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (booking.artistId !== payload.userId) {
      return NextResponse.json({ error: 'Only the main artist can assign tasks.' }, { status: 403 });
    }
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return NextResponse.json({ error: `Cannot assign to a ${booking.status} booking.` }, { status: 400 });
    }
    if (booking.serviceType === 'drawing_only' && tType === 'writing') {
      return NextResponse.json({ error: 'Drawing-Only booking — no writing task.' }, { status: 400 });
    }
    if (!assistant) return NextResponse.json({ error: 'Assistant not found.' }, { status: 404 });
    if (assistant.parentArtistId !== payload.userId) {
      return NextResponse.json({ error: 'Not your assistant.' }, { status: 403 });
    }

    const existingSubtasks = await withRetry(() =>
      db.subTask.findMany({ where: { bookingId }, select: { taskType: true, splitPercent: true, status: true } })
    );

    if (existingSubtasks.some((s) => s.taskType === tType)) {
      return NextResponse.json({ error: `"${tType}" already assigned.` }, { status: 409 });
    }

    const activeSplits = existingSubtasks
      .filter((s) => s.status !== 'declined')
      .reduce((sum, s) => sum + s.splitPercent, 0);
    if (activeSplits + split > 100) {
      return NextResponse.json({ error: `Split exceeds 100%. Max: ${100 - activeSplits}%.` }, { status: 400 });
    }

    const earnings = Math.round((booking.price * split) / 100);
    const subtask = await withRetry(() =>
      db.subTask.create({
        data: {
          bookingId, assistantId: assistant.id, parentArtistId: payload.userId,
          taskType: tType, splitPercent: split, earnings, status: 'assigned',
          notes: notes ? String(notes).slice(0, 1000) : null,
        },
      })
    );

    void sendTaskAssignedEmail({
      bookingId: booking.id, assistantName: assistant.name, assistantEmail: assistant.email,
      parentArtistName: payload.email || 'The artist', subject: booking.subject, description: booking.description,
      taskType: tType, splitPercent: split, earnings,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://pracpedia.vercel.app',
    }).catch(() => {});

    return NextResponse.json({ success: true, subtask });
  } catch (err: any) {
    console.error('POST /api/bookings/[id]/assign error:', err);
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Task already assigned.' }, { status: 409 });
    return NextResponse.json({ error: 'Could not assign task.' }, { status: 500 });
  }
}