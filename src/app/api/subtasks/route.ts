// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { getUserFromRequest } from '@/lib/auth';
// import { withRetry } from '@/lib/db-retry';

// export async function GET(request: NextRequest) {
//   try {
//     const payload = await getUserFromRequest(request);
//     if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

//     const { searchParams } = new URL(request.url);
//     const statusFilter = searchParams.get('status');

//     let where: any = {};
//     let includeClient = false;

//     if (payload.role === 'super_admin' || payload.role === 'admin') {
//       includeClient = true;
//       if (statusFilter) where.status = statusFilter;
//     } else {
//       const user = await withRetry(() =>
//         db.user.findUnique({ where: { id: payload.userId }, select: { id: true, parentArtistId: true, role: true } })
//       );
//       if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

//       if (user.parentArtistId) {
//         where.assistantId = user.id;
//       } else if (user.role === 'artist') {
//         where.parentArtistId = user.id;
//       } else {
//         return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
//       }
//       if (statusFilter) where.status = statusFilter;
//     }

//     const subtasks = await withRetry(() =>
//       db.subTask.findMany({
//         where,
//         orderBy: { assignedAt: 'desc' },
//         include: {
//           booking: {
//             select: {
//               id: true, subject: true, description: true, price: true, serviceType: true,
//               notebookProvider: true, status: true, updatedAt: true,
//               ...(includeClient ? { client: { select: { id: true, name: true, email: true, profilePic: true } } } : {}),
//             },
//           },
//           assistant: { select: { id: true, name: true, email: true, profilePic: true } },
//           parentArtist: { select: { id: true, name: true, email: true, profilePic: true } },
//         },
//       })
//     );

//     return NextResponse.json({ subtasks });
//   } catch (err: any) {
//     console.error('GET /api/subtasks error:', err);
//     return NextResponse.json({ error: 'Could not load subtasks.' }, { status: 500 });
//   }
// }


// 


import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { withRetry } from '@/lib/db-retry';

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let where: any = {};
    let includeClient = false;

    if (payload.role === 'super_admin' || payload.role === 'admin') {
      includeClient = true;
      if (statusFilter) where.status = statusFilter;
    } else {
      const user = await withRetry(() =>
        db.user.findUnique({ where: { id: payload.userId }, select: { id: true, parentArtistId: true, role: true } })
      );
      if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

      if (user.parentArtistId) {
        where.assistantId = user.id;
      } else if (user.role === 'artist') {
        where.parentArtistId = user.id;
      } else {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
      if (statusFilter) where.status = statusFilter;
    }

    const subtasks = await withRetry(() =>
      db.subTask.findMany({
        where,
        orderBy: { assignedAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true, subject: true, description: true, price: true, serviceType: true,
              notebookProvider: true, status: true, updatedAt: true,
              ...(includeClient ? { client: { select: { id: true, name: true, email: true, profilePic: true } } } : {}),
            },
          },
          assistant: { select: { id: true, name: true, email: true, profilePic: true } },
          parentArtist: { select: { id: true, name: true, email: true, profilePic: true } },
        },
      })
    );

    return NextResponse.json({ subtasks });
  } catch (err: any) {
    console.error('GET /api/subtasks error:', err);
    return NextResponse.json({ error: 'Could not load subtasks.' }, { status: 500 });
  }
}