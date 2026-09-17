// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { getUserFromRequest } from '@/lib/auth';
// import { withRetry } from '@/lib/db-retry';
// import { sendTaskCompletedEmail } from '@/lib/email';

// export async function PUT(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const payload = await getUserFromRequest(request);
//     if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

//     const { id } = await params;
//     const body = await request.json();
//     const { status: newStatus, notes } = body;

//     const subtask = await withRetry(() =>
//       db.subTask.findUnique({
//         where: { id },
//         include: {
//           booking: { select: { id: true, subject: true, status: true, price: true } },
//           assistant: { select: { id: true, name: true, email: true } },
//           parentArtist: { select: { id: true, name: true, email: true } },
//         },
//       })
//     );

//     if (!subtask) return NextResponse.json({ error: 'Subtask not found.' }, { status: 404 });

//     const isAssistant = subtask.assistantId === payload.userId;
//     const isParent = subtask.parentArtistId === payload.userId;
//     const isAdmin = payload.role === 'admin' || payload.role === 'super_admin';
//     if (!isAssistant && !isParent && !isAdmin) {
//       return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
//     }

//     const updateData: any = {};
//     const validStatuses = ['assigned', 'in_progress', 'completed', 'declined'];

//     if (newStatus !== undefined) {
//       const ns = String(newStatus);
//       if (!validStatuses.includes(ns)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
//       if (subtask.status === 'completed' && ns !== 'completed') {
//         return NextResponse.json({ error: 'Cannot modify completed subtask.' }, { status: 400 });
//       }
//       if (subtask.status === 'declined') {
//         return NextResponse.json({ error: 'Cannot modify declined subtask.' }, { status: 400 });
//       }
//       if ((ns === 'in_progress' || ns === 'completed') && !isAssistant && !isAdmin) {
//         return NextResponse.json({ error: 'Only the assistant can do this.' }, { status: 403 });
//       }
//       updateData.status = ns;
//       if (ns === 'completed' && subtask.status !== 'completed') {
//         updateData.completedAt = new Date();
//       }
//     }

//     if (notes !== undefined && isAssistant) {
//       updateData.notes = String(notes).slice(0, 1000) || null;
//     }

//     const updated = await db.$transaction(async (tx) => {
//       const result = await tx.subTask.update({ where: { id }, data: updateData });
//       if (newStatus === 'completed' && subtask.status !== 'completed') {
//         await tx.user.update({
//           where: { id: subtask.assistantId },
//           data: { assistantCompletedOrders: { increment: 1 }, assistantEarnings: { increment: subtask.earnings } },
//         });
//       }
//       if (subtask.status === 'completed' && newStatus && newStatus !== 'completed') {
//         await tx.user.update({
//           where: { id: subtask.assistantId },
//           data: { assistantCompletedOrders: { decrement: 1 }, assistantEarnings: { decrement: subtask.earnings } },
//         });
//       }
//       return result;
//     });

//     if (newStatus === 'completed' && subtask.status !== 'completed' && subtask.parentArtist?.email) {
//       void sendTaskCompletedEmail({
//         parentArtistName: subtask.parentArtist.name,
//         parentArtistEmail: subtask.parentArtist.email,
//         assistantName: subtask.assistant.name,
//         subject: subtask.booking.subject,
//         taskType: subtask.taskType,
//         earnings: subtask.earnings,
//         appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://pracpedia.vercel.app',
//       }).catch(() => {});
//     }

//     return NextResponse.json({ success: true, subtask: { id: updated.id, status: updated.status, notes: updated.notes, completedAt: updated.completedAt } });
//   } catch (err: any) {
//     console.error('PUT /api/subtasks/[id] error:', err);
//     return NextResponse.json({ error: 'Could not update subtask.' }, { status: 500 });
//   }
// }

// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const payload = await getUserFromRequest(request);
//     if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     const { id } = await params;
//     const subtask = await withRetry(() => db.subTask.findUnique({ where: { id } }));
//     if (!subtask) return NextResponse.json({ error: 'Subtask not found.' }, { status: 404 });

//     const isParent = subtask.parentArtistId === payload.userId;
//     const isAdmin = payload.role === 'admin' || payload.role === 'super_admin';
//     if (!isParent && !isAdmin) {
//       return NextResponse.json({ error: 'Only the parent artist can delete subtasks.' }, { status: 403 });
//     }

//     await withRetry(() => db.subTask.delete({ where: { id } }));
//     return NextResponse.json({ success: true });
//   } catch (err: any) {
//     console.error('DELETE /api/subtasks/[id] error:', err);
//     return NextResponse.json({ error: 'Could not delete subtask.' }, { status: 500 });
//   }
// }




// 


import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { withRetry } from '@/lib/db-retry';
import { sendTaskCompletedEmail } from '@/lib/email';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status: newStatus, notes } = body;

    const subtask = await withRetry(() =>
      db.subTask.findUnique({
        where: { id },
        include: {
          booking: { select: { id: true, subject: true, status: true, price: true } },
          assistant: { select: { id: true, name: true, email: true } },
          parentArtist: { select: { id: true, name: true, email: true } },
        },
      })
    );

    if (!subtask) return NextResponse.json({ error: 'Subtask not found.' }, { status: 404 });

    const isAssistant = subtask.assistantId === payload.userId;
    const isParent = subtask.parentArtistId === payload.userId;
    const isAdmin = payload.role === 'admin' || payload.role === 'super_admin';
    if (!isAssistant && !isParent && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const updateData: any = {};
    const validStatuses = ['assigned', 'in_progress', 'completed', 'declined'];

    if (newStatus !== undefined) {
      const ns = String(newStatus);
      if (!validStatuses.includes(ns)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
      if (subtask.status === 'completed' && ns !== 'completed') {
        return NextResponse.json({ error: 'Cannot modify completed subtask.' }, { status: 400 });
      }
      if (subtask.status === 'declined') {
        return NextResponse.json({ error: 'Cannot modify declined subtask.' }, { status: 400 });
      }
      if ((ns === 'in_progress' || ns === 'completed') && !isAssistant && !isAdmin) {
        return NextResponse.json({ error: 'Only the assistant can do this.' }, { status: 403 });
      }
      updateData.status = ns;
      if (ns === 'completed' && subtask.status !== 'completed') {
        updateData.completedAt = new Date();
      }
    }

    if (notes !== undefined && isAssistant) {
      updateData.notes = String(notes).slice(0, 1000) || null;
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.subTask.update({ where: { id }, data: updateData });
      if (newStatus === 'completed' && subtask.status !== 'completed') {
        await tx.user.update({
          where: { id: subtask.assistantId },
          data: { assistantCompletedOrders: { increment: 1 }, assistantEarnings: { increment: subtask.earnings } },
        });
      }
      if (subtask.status === 'completed' && newStatus && newStatus !== 'completed') {
        await tx.user.update({
          where: { id: subtask.assistantId },
          data: { assistantCompletedOrders: { decrement: 1 }, assistantEarnings: { decrement: subtask.earnings } },
        });
      }
      return result;
    });

    if (newStatus === 'completed' && subtask.status !== 'completed' && subtask.parentArtist?.email) {
      void sendTaskCompletedEmail({
        parentArtistName: subtask.parentArtist.name,
        parentArtistEmail: subtask.parentArtist.email,
        assistantName: subtask.assistant.name,
        subject: subtask.booking.subject,
        taskType: subtask.taskType,
        earnings: subtask.earnings,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://pracpedia.vercel.app',
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, subtask: { id: updated.id, status: updated.status, notes: updated.notes, completedAt: updated.completedAt } });
  } catch (err: any) {
    console.error('PUT /api/subtasks/[id] error:', err);
    return NextResponse.json({ error: 'Could not update subtask.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const subtask = await withRetry(() => db.subTask.findUnique({ where: { id } }));
    if (!subtask) return NextResponse.json({ error: 'Subtask not found.' }, { status: 404 });

    const isParent = subtask.parentArtistId === payload.userId;
    const isAdmin = payload.role === 'admin' || payload.role === 'super_admin';
    if (!isParent && !isAdmin) {
      return NextResponse.json({ error: 'Only the parent artist can delete subtasks.' }, { status: 403 });
    }

    await withRetry(() => db.subTask.delete({ where: { id } }));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/subtasks/[id] error:', err);
    return NextResponse.json({ error: 'Could not delete subtask.' }, { status: 500 });
  }
}