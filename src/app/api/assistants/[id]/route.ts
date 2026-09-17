// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { getUserFromRequest } from '@/lib/auth';
// import { withRetry } from '@/lib/db-retry';

// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const payload = await getUserFromRequest(request);
//     if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     const { id } = await params;

//     const assistant = await withRetry(() => db.user.findUnique({ where: { id } }));
//     if (!assistant) return NextResponse.json({ error: 'Assistant not found.' }, { status: 404 });
//     if (assistant.parentArtistId !== payload.userId) {
//       return NextResponse.json({ error: 'You can only remove your own assistants.' }, { status: 403 });
//     }

//     await withRetry(() =>
//       db.subTask.updateMany({
//         where: { assistantId: id, status: { in: ['assigned', 'in_progress'] } },
//         data: { status: 'declined' },
//       })
//     );
//     await withRetry(() =>
//       db.user.update({ where: { id }, data: { parentArtistId: null, isAvailable: false } })
//     );

//     return NextResponse.json({ success: true, message: `${assistant.name} removed.` });
//   } catch (err: any) {
//     console.error('DELETE /api/assistants/[id] error:', err);
//     return NextResponse.json({ error: 'Could not remove assistant.' }, { status: 500 });
//   }
// }




// 


import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { withRetry } from '@/lib/db-retry';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const assistant = await withRetry(() => db.user.findUnique({ where: { id } }));
    if (!assistant) return NextResponse.json({ error: 'Assistant not found.' }, { status: 404 });
    if (assistant.parentArtistId !== payload.userId) return NextResponse.json({ error: 'You can only remove your own assistants.' }, { status: 403 });

    await withRetry(() => db.subTask.updateMany({ where: { assistantId: id, status: { in: ['assigned', 'in_progress'] } }, data: { status: 'declined' } }));
    await withRetry(() => db.user.update({ where: { id }, data: { parentArtistId: null } }));

    return NextResponse.json({ success: true, message: `${assistant.name} removed.` });
  } catch (err: any) {
    return NextResponse.json({ error: 'Could not remove assistant.' }, { status: 500 });
  }
}