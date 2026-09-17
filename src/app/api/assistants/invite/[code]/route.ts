// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { withRetry } from '@/lib/db-retry';

// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ code: string }> }
// ) {
//   try {
//     const { code } = await params;
//     if (!code) return NextResponse.json({ error: 'Invite code required.' }, { status: 400 });

//     const invite = await withRetry(() =>
//       db.assistantInvite.findUnique({
//         where: { code: code.toUpperCase() },
//         include: { parentArtist: { select: { id: true, name: true, email: true, profilePic: true } } },
//       })
//     );

//     if (!invite) return NextResponse.json({ valid: false, error: 'Invite not found.' }, { status: 404 });
//     if (invite.status === 'accepted') {
//       return NextResponse.json({ valid: false, error: 'This invite has already been used.' }, { status: 409 });
//     }
//     if (invite.expiresAt < new Date()) {
//       return NextResponse.json({ valid: false, error: 'This invite has expired.' }, { status: 410 });
//     }

//     return NextResponse.json({
//       valid: true,
//       invite: {
//         code: invite.code,
//         inviteeEmail: invite.inviteeEmail,
//         inviteeName: invite.inviteeName,
//         defaultRole: invite.defaultRole,
//         defaultSplitPercent: invite.defaultSplitPercent,
//         parentArtist: { name: invite.parentArtist.name, email: invite.parentArtist.email, profilePic: invite.parentArtist.profilePic },
//         expiresAt: invite.expiresAt,
//       },
//     });
//   } catch (err: any) {
//     console.error('GET /api/assistants/invite/[code] error:', err);
//     return NextResponse.json({ error: 'Could not look up invite.' }, { status: 500 });
//   }
// }

// 





import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry } from '@/lib/db-retry';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!code) return NextResponse.json({ error: 'Invite code required.' }, { status: 400 });
    const invite = await withRetry(() => db.assistantInvite.findUnique({ where: { code: code.toUpperCase() }, include: { parentArtist: { select: { id: true, name: true, email: true, profilePic: true } } } }));
    if (!invite) return NextResponse.json({ valid: false, error: 'Invite not found.' }, { status: 404 });
    if (invite.status === 'accepted') return NextResponse.json({ valid: false, error: 'This invite has already been used.' }, { status: 409 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ valid: false, error: 'This invite has expired.' }, { status: 410 });
    return NextResponse.json({ valid: true, invite: { code: invite.code, inviteeEmail: invite.inviteeEmail, inviteeName: invite.inviteeName, defaultRole: invite.defaultRole, defaultSplitPercent: invite.defaultSplitPercent, parentArtist: { name: invite.parentArtist.name, email: invite.parentArtist.email, profilePic: invite.parentArtist.profilePic }, expiresAt: invite.expiresAt } });
  } catch (err: any) {
    return NextResponse.json({ error: 'Could not look up invite.' }, { status: 500 });
  }
}