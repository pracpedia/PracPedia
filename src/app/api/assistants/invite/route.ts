// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { getUserFromRequest } from '@/lib/auth';
// import { withRetry } from '@/lib/db-retry';
// import { sendAssistantInviteEmail } from '@/lib/email';

// /**
//  * POST /api/assistants/invite
//  *
//  * Main artist generates an invite for a new assistant.
//  *
//  * Body: { inviteeEmail?, inviteeName?, defaultRole?, defaultSplitPercent? }
//  *
//  * Email is OPTIONAL — only used for pre-fill convenience + sending the
//  * invite email via Brevo. The invite CODE is the only key — anyone with
//  * the code can sign up as this artist's assistant, using whatever email
//  * they want.
//  *
//  * Returns: { inviteId, code, inviteUrl, emailSent }
//  */
// export async function POST(request: NextRequest) {
//   try {
//     const payload = await getUserFromRequest(request);
//     if (!payload) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Only independent artists (no parentArtistId) can invite assistants.
//     // Assistants + students + admins cannot invite.
//     if (payload.role !== 'artist') {
//       return NextResponse.json({ error: 'Only artists can invite assistants.' }, { status: 403 });
//     }

//     // Fetch the user to verify they're an independent artist (not an assistant)
//     const inviter = await withRetry(() =>
//       db.user.findUnique({ where: { id: payload.userId }, select: { parentArtistId: true } })
//     );
//     if (inviter?.parentArtistId) {
//       return NextResponse.json({
//         error: 'Assistants cannot invite other assistants. Only independent artists can.'
//       }, { status: 403 });
//     }

//     const body = await request.json();
//     const { inviteeEmail, inviteeName, defaultRole, defaultSplitPercent } = body;

//     // Email is OPTIONAL — only for pre-fill + email sending.
//     // If provided, validate format. If not provided, invite is generic.
//     const normalizedEmail = inviteeEmail
//       ? String(inviteeEmail).toLowerCase().trim()
//       : null;
//     if (normalizedEmail && !normalizedEmail.includes('@')) {
//       return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
//     }

//     // Validate role
//     const validRoles = ['drawing', 'writing', 'both'];
//     const role = validRoles.includes(defaultRole) ? defaultRole : 'both';

//     // Validate split %
//     const split = Math.max(0, Math.min(100, Number(defaultSplitPercent) || 40));

//     // If email provided, check if the invitee is already a registered user
//     if (normalizedEmail) {
//       const existingUser = await withRetry(() =>
//         db.user.findUnique({ where: { email: normalizedEmail } })
//       );
//       if (existingUser) {
//         if (existingUser.parentArtistId === payload.userId) {
//           return NextResponse.json({
//             error: `${normalizedEmail} is already your assistant. Find them in your Assistants tab.`
//           }, { status: 409 });
//         }
//         // Independent artists cannot become assistants (would lose marketplace presence)
//         if (existingUser.role === 'artist' && !existingUser.parentArtistId) {
//           return NextResponse.json({
//             error: `${normalizedEmail} is already an independent artist on PracPedia. They cannot become your assistant.`
//           }, { status: 409 });
//         }
//         // Already an assistant to someone else
//         if (existingUser.parentArtistId && existingUser.parentArtistId !== payload.userId) {
//           return NextResponse.json({
//             error: `${normalizedEmail} is already an assistant to another artist.`
//           }, { status: 409 });
//         }
//         // Students (role='user') CAN become assistants — no conflict here
//       }
//     }

//     // Check for an existing pending invite (by email if provided, else by code generation)
//     if (normalizedEmail) {
//       const existingInvite = await withRetry(() =>
//         db.assistantInvite.findFirst({
//           where: { inviteeEmail: normalizedEmail, parentArtistId: payload.userId, status: 'pending' },
//         })
//       );
//       if (existingInvite) {
//         const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pracpedia.vercel.app';
//         const inviteUrl = `${appUrl}/?invite=${existingInvite.code}`;
//         return NextResponse.json({
//           inviteId: existingInvite.id,
//           code: existingInvite.code,
//           inviteUrl,
//           emailSent: false,
//           message: 'Pending invite already exists for this email.',
//         });
//       }
//     }

//     // Generate a unique 8-char invite code (format: XXXX-XXXX)
//     const generateCode = (): string => {
//       const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no confusing chars (I, O, 0, 1)
//       let code = '';
//       for (let i = 0; i < 8; i++) {
//         code += chars[Math.floor(Math.random() * chars.length)];
//         if (i === 3) code += '-';
//       }
//       return code;
//     };

//     // Generate + ensure uniqueness (5 attempts max)
//     let code = '';
//     let attempts = 0;
//     while (attempts < 5) {
//       code = generateCode();
//       const existing = await withRetry(() =>
//         db.assistantInvite.findUnique({ where: { code } })
//       ).catch(() => null);
//       if (!existing) break;
//       attempts++;
//     }
//     if (!code) {
//       return NextResponse.json({ error: 'Could not generate unique invite code.' }, { status: 500 });
//     }

//     // Create the invite (expires in 7 days)
//     const invite = await withRetry(() =>
//       db.assistantInvite.create({
//         data: {
//           code,
//           parentArtistId: payload.userId,
//           inviteeEmail: normalizedEmail || '',  // empty string if not provided
//           inviteeName: inviteeName ? String(inviteeName).slice(0, 100) : null,
//           defaultRole: role,
//           defaultSplitPercent: split,
//           status: 'pending',
//           expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//         },
//       })
//     );

//     const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pracpedia.vercel.app';
//     const inviteUrl = `${appUrl}/?invite=${invite.code}`;

//     // Fetch parent artist's name for the email
//     const parentArtist = await withRetry(() =>
//       db.user.findUnique({ where: { id: payload.userId }, select: { name: true, email: true } })
//     );

//     // Try to send the invite email via Brevo (only if email was provided)
//     // Fire-and-forget — if no BREVO_API_KEY or no email, just skip
//     let emailSent = false;
//     if (normalizedEmail && parentArtist?.email) {
//       try {
//         const result = await sendAssistantInviteEmail({
//           inviteeEmail: normalizedEmail,
//           inviteeName: inviteeName || undefined,
//           parentArtistName: parentArtist.name,
//           parentArtistEmail: parentArtist.email,
//           defaultRole: role,
//           defaultSplitPercent: split,
//           inviteUrl,
//           appUrl,
//         }).catch(() => false);
//         emailSent = !!result;
//       } catch {
//         emailSent = false;
//       }
//     }

//     return NextResponse.json({
//       inviteId: invite.id,
//       code: invite.code,
//       inviteUrl,
//       emailSent,
//       message: emailSent
//         ? `Invite sent to ${normalizedEmail} via email.`
//         : normalizedEmail
//           ? `Invite link created. Share it manually with ${normalizedEmail} (WhatsApp, Messenger, etc.).`
//           : `Invite link created. Share it with anyone — they can sign up with any email.`,
//     });
//   } catch (err: any) {
//     console.error('POST /api/assistants/invite error:', err);
//     return NextResponse.json({ error: 'Could not create invite.' }, { status: 500 });
//   }
// }





// 


import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { withRetry } from '@/lib/db-retry';
import { sendAssistantInviteEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (payload.role !== 'artist') return NextResponse.json({ error: 'Only artists can invite assistants.' }, { status: 403 });

    const inviter = await withRetry(() => db.user.findUnique({ where: { id: payload.userId }, select: { parentArtistId: true } }));
    if (inviter?.parentArtistId) return NextResponse.json({ error: 'Assistants cannot invite other assistants.' }, { status: 403 });

    const body = await request.json();
    const { inviteeEmail, inviteeName, defaultRole, defaultSplitPercent } = body;
    const normalizedEmail = inviteeEmail ? String(inviteeEmail).toLowerCase().trim() : null;
    if (normalizedEmail && !normalizedEmail.includes('@')) return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });

    const role = ['drawing', 'writing', 'both'].includes(defaultRole) ? defaultRole : 'both';
    const split = Math.max(0, Math.min(100, Number(defaultSplitPercent) || 40));

    if (normalizedEmail) {
      const existingInvite = await withRetry(() => db.assistantInvite.findFirst({ where: { inviteeEmail: normalizedEmail, parentArtistId: payload.userId, status: 'pending' } }));
      if (existingInvite) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pracpedia.vercel.app';
        return NextResponse.json({ inviteId: existingInvite.id, code: existingInvite.code, inviteUrl: `${appUrl}/?invite=${existingInvite.code}`, emailSent: false, message: 'Pending invite already exists.' });
      }
    }

    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) { code += chars[Math.floor(Math.random() * chars.length)]; if (i === 3) code += '-'; }

    const invite = await withRetry(() => db.assistantInvite.create({ data: { code, parentArtistId: payload.userId, inviteeEmail: normalizedEmail || '', inviteeName: inviteeName ? String(inviteeName).slice(0, 100) : null, defaultRole: role, defaultSplitPercent: split, status: 'pending', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }));
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pracpedia.vercel.app';
    const inviteUrl = `${appUrl}/?invite=${invite.code}`;
    const parentArtist = await withRetry(() => db.user.findUnique({ where: { id: payload.userId }, select: { name: true, email: true } }));

    let emailSent = false;
    if (normalizedEmail && parentArtist?.email) {
      emailSent = !!(await sendAssistantInviteEmail({ inviteeEmail: normalizedEmail, inviteeName: inviteeName || undefined, parentArtistName: parentArtist.name, parentArtistEmail: parentArtist.email, defaultRole: role, defaultSplitPercent: split, inviteUrl, appUrl }).catch(() => false));
    }

    return NextResponse.json({ inviteId: invite.id, code: invite.code, inviteUrl, emailSent, message: emailSent ? `Invite sent to ${normalizedEmail} via email.` : normalizedEmail ? `Invite link created. Share it manually.` : `Invite link created. Share it with anyone.` });
  } catch (err: any) {
    console.error('POST /api/assistants/invite error:', err);
    return NextResponse.json({ error: 'Could not create invite.' }, { status: 500 });
  }
}