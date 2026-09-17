import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { withRetry } from '@/lib/db-retry';
import { sendAssistantRegisteredEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'You must be logged in to accept an invite.' }, { status: 401 });

    const body = await request.json();
    const { code } = body;
    if (!code) return NextResponse.json({ error: 'Invite code is required.' }, { status: 400 });

    const inviteCode = String(code).toUpperCase().trim();
    const invite = await withRetry(() => db.assistantInvite.findUnique({ where: { code: inviteCode }, include: { parentArtist: { select: { id: true, name: true, email: true } } } }));

    if (!invite) return NextResponse.json({ error: 'Invalid invite code.' }, { status: 404 });
    if (invite.status === 'accepted') return NextResponse.json({ error: 'This invite has already been used.' }, { status: 409 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'This invite has expired.' }, { status: 410 });

    const user = await withRetry(() => db.user.findUnique({ where: { id: payload.userId } }));
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    if (user.parentArtistId === invite.parentArtistId) return NextResponse.json({ error: 'You are already an assistant to this artist.' }, { status: 409 });
    if (user.parentArtistId && user.parentArtistId !== invite.parentArtistId) return NextResponse.json({ error: 'You are already an assistant to another artist.' }, { status: 409 });
    if (user.id === invite.parentArtistId) return NextResponse.json({ error: 'You cannot invite yourself.' }, { status: 400 });

        // Accept the invite: Add parentArtistId to existing user
    // If they're a student (role=user), upgrade them to 'artist' so they
    // can see the Assistant Studio in the sidebar.
    const updateData: any = { parentArtistId: invite.parentArtistId };
    if (user.role === 'user') {
      updateData.role = 'artist';
      updateData.rateDrawingOnly = 0;   // Assistants start with 0 rates
      updateData.rateDrawingWriting = 0;
    }
    const updatedUser = await withRetry(() =>
      db.user.update({
        where: { id: user.id },
        data: updateData,
      })
    );
    await withRetry(() => db.assistantInvite.update({ where: { id: invite.id }, data: { status: 'accepted', acceptedById: user.id, acceptedAt: new Date() } }));

    void sendAssistantRegisteredEmail({ assistantName: updatedUser.name, assistantEmail: updatedUser.email, parentArtistName: invite.parentArtist.name, parentArtistEmail: invite.parentArtist.email, appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://pracpedia.vercel.app' }).catch(() => {});

    const newToken = await signToken({ userId: updatedUser.id, email: updatedUser.email, role: updatedUser.role });
    return NextResponse.json({ success: true, token: newToken, user: serializeUser(updatedUser), message: `You are now an assistant to ${invite.parentArtist.name}.` });
  } catch (err: any) {
    return NextResponse.json({ error: 'Could not accept invite.' }, { status: 500 });
  }
}