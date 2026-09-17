// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { getUserFromRequest } from '@/lib/auth';
// import { withRetry } from '@/lib/db-retry';

// export async function GET(request: NextRequest) {
//   try {
//     const payload = await getUserFromRequest(request);
//     if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     if (payload.role !== 'artist') {
//       return NextResponse.json({ error: 'Only artists can view assistants.' }, { status: 403 });
//     }

//     const [assistants, invites] = await Promise.all([
//       withRetry(() =>
//         db.user.findMany({
//           where: { parentArtistId: payload.userId },
//           select: { id: true, name: true, email: true, profilePic: true, isAvailable: true, rating: true, completedOrders: true, assistantCompletedOrders: true, assistantEarnings: true, createdAt: true, lastSeenAt: true },
//           orderBy: { createdAt: 'asc' },
//         })
//       ),
//       withRetry(() => db.assistantInvite.findMany({ where: { parentArtistId: payload.userId, status: 'pending' }, orderBy: { createdAt: 'desc' } })),
//     ]);

//     return NextResponse.json({ assistants, invites });
//   } catch (err: any) {
//     console.error('GET /api/assistants error:', err);
//     return NextResponse.json({ error: 'Could not load assistants.' }, { status: 500 });
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
    if (payload.role !== 'artist') return NextResponse.json({ error: 'Only artists can view assistants.' }, { status: 403 });

    const [assistants, invites] = await Promise.all([
      withRetry(() => db.user.findMany({ where: { parentArtistId: payload.userId }, select: { id: true, name: true, email: true, profilePic: true, isAvailable: true, rating: true, completedOrders: true, assistantCompletedOrders: true, assistantEarnings: true, createdAt: true, lastSeenAt: true }, orderBy: { createdAt: 'asc' } })),
      withRetry(() => db.assistantInvite.findMany({ where: { parentArtistId: payload.userId, status: 'pending' }, orderBy: { createdAt: 'desc' } })),
    ]);

    return NextResponse.json({ assistants, invites });
  } catch (err: any) {
    return NextResponse.json({ error: 'Could not load assistants.' }, { status: 500 });
  }
}