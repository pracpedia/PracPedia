// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { signToken } from '@/lib/auth';
// import { serializeUser } from '@/lib/user-serializer';
// import { withRetry } from '@/lib/db-retry';
// import { sendAssistantRegisteredEmail } from '@/lib/email';
// import { getClientIp, registerLimiter, rateLimitHeaders } from '@/lib/rate-limit';

// /**
//  * POST /api/assistants/register
//  *
//  * Register a new assistant using an invite code.
//  *
//  * Body: { code, name, email, password, phone? }
//  *
//  * The email does NOT need to match the invite's inviteeEmail.
//  * The invite code is the only key — anyone with the code can sign up,
//  * using whatever email they want.
//  *
//  * Rules:
//  *   - Invite must be valid + not expired + not already accepted
//  *   - Email must not already exist in the DB
//  *   - If the email belongs to an existing independent artist, reject
//  *     (they can't lose marketplace presence to become an assistant)
//  *
//  * Returns: { token, user } — auth token for immediate login.
//  */
// export async function POST(request: NextRequest) {
//   try {
//     const ip = getClientIp(request);
//     const rl = registerLimiter.check(ip);
//     if (!rl.allowed) {
//       return NextResponse.json(
//         { error: 'Too many attempts. Please try again later.' },
//         { status: 429, headers: rateLimitHeaders(rl) }
//       );
//     }

//     const body = await request.json();
//     const { code, name, email, password, phone } = body;

//     if (!code || !name || !email || !password) {
//       return NextResponse.json({ error: 'All fields (code, name, email, password) are required.' }, { status: 400 });
//     }
//     if (String(password).length < 4) {
//       return NextResponse.json({ error: 'Password must be at least 4 characters long.' }, { status: 400 });
//     }

//     const normalizedEmail = String(email).toLowerCase().trim();
//     const inviteCode = String(code).toUpperCase().trim();

//     // Look up the invite
//     const invite = await withRetry(() =>
//       db.assistantInvite.findUnique({
//         where: { code: inviteCode },
//         include: { parentArtist: { select: { id: true, name: true, email: true } } },
//       })
//     );

//     if (!invite) {
//       return NextResponse.json({ error: 'Invalid invite code.' }, { status: 404 });
//     }
//     if (invite.status === 'accepted') {
//       return NextResponse.json({ error: 'This invite has already been used.' }, { status: 409 });
//     }
//     if (invite.expiresAt < new Date()) {
//       return NextResponse.json({ error: 'This invite has expired. Please ask the artist for a new one.' }, { status: 410 });
//     }

//     // Check if user already exists with this email
//     // (regardless of whether it matches the invite's inviteeEmail)
//     const existingUser = await withRetry(() =>
//       db.user.findUnique({ where: { email: normalizedEmail } })
//     );
//     if (existingUser) {
//       // If the existing user is an independent artist, reject — they can't
//       // become an assistant without losing marketplace presence.
//       if (existingUser.role === 'artist' && !existingUser.parentArtistId) {
//         return NextResponse.json({
//           error: 'This email belongs to an independent artist on PracPedia. They cannot become an assistant. Please use a different email.',
//         }, { status: 409 });
//       }
//       // If already an assistant (to anyone), reject
//       if (existingUser.parentArtistId) {
//         return NextResponse.json({
//           error: 'This email is already registered as an assistant. Please log in instead, or use a different email.',
//         }, { status: 409 });
//       }
//       // Students (role='user') — we could auto-convert them, but safer to reject
//       // + ask them to use a fresh email, OR we could upgrade them. Let's reject
//       // for now to keep the flow simple + predictable.
//       return NextResponse.json({
//         error: 'An account with this email already exists. Please log in and use the invite link from your dashboard, or sign up with a different email.',
//       }, { status: 409 });
//     }

//     // Create the assistant user
//     // NOTE: No rate fields — assistants don't appear on the marketplace.
//     // They'll set rates when they "graduate" to independent artist.
//     const displayName = String(name).trim().slice(0, 100) || invite.inviteeName || 'Assistant';
//     const phoneNumber = phone ? String(phone).slice(0, 30) : null;

//     const newAssistant = await withRetry(() =>
//       db.user.create({
//         data: {
//           email: normalizedEmail,
//           name: displayName,
//           passwordHash: String(password),
//           role: 'artist',  // assistants are 'artist' role but hidden from marketplace
//           parentArtistId: invite.parentArtistId,  // ← this makes them an assistant
//           phoneNumber,
//           isAvailable: true,
//           // No rate fields, no specialties — those come later at graduation
//         },
//       })
//     );

//     // Mark the invite as accepted
//     await withRetry(() =>
//       db.assistantInvite.update({
//         where: { id: invite.id },
//         data: {
//           status: 'accepted',
//           acceptedById: newAssistant.id,
//           acceptedAt: new Date(),
//         },
//       })
//     );

//     registerLimiter.reset(ip);

//     // Send confirmation emails (fire-and-forget, non-blocking)
//     void sendAssistantRegisteredEmail({
//       assistantName: displayName,
//       assistantEmail: normalizedEmail,
//       parentArtistName: invite.parentArtist.name,
//       parentArtistEmail: invite.parentArtist.email,
//       appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://pracpedia.vercel.app',
//     }).catch(() => {});

//     const token = await signToken({
//       userId: newAssistant.id,
//       email: newAssistant.email,
//       role: newAssistant.role,
//     });

//     return NextResponse.json({
//       token,
//       user: serializeUser(newAssistant),
//       message: `Welcome to PracPedia! You're now an assistant to ${invite.parentArtist.name}.`,
//     });
//   } catch (err: any) {
//     console.error('POST /api/assistants/register error:', err);
//     if (err?.code === 'P2002') {
//       return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
//     }
//     return NextResponse.json({ error: 'Could not complete registration.' }, { status: 500 });
//   }
// }





// 



import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { withRetry } from '@/lib/db-retry';
import { sendAssistantRegisteredEmail } from '@/lib/email';
import { getClientIp, registerLimiter, rateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = registerLimiter.check(ip);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many attempts.' }, { status: 429, headers: rateLimitHeaders(rl) });

    const body = await request.json();
    const { code, name, email, password, phone } = body;
    if (!code || !name || !email || !password) return NextResponse.json({ error: 'All fields required.' }, { status: 400 });
    if (String(password).length < 4) return NextResponse.json({ error: 'Password must be 4+ characters.' }, { status: 400 });

    const normalizedEmail = String(email).toLowerCase().trim();
    const inviteCode = String(code).toUpperCase().trim();
    const invite = await withRetry(() => db.assistantInvite.findUnique({ where: { code: inviteCode }, include: { parentArtist: { select: { id: true, name: true, email: true } } } }));

    if (!invite) return NextResponse.json({ error: 'Invalid invite code.' }, { status: 404 });
    if (invite.status === 'accepted') return NextResponse.json({ error: 'Invite already used.' }, { status: 409 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite expired.' }, { status: 410 });

    const existingUser = await withRetry(() => db.user.findUnique({ where: { email: normalizedEmail } }));
    if (existingUser) {
      if (existingUser.role === 'artist' && !existingUser.parentArtistId) return NextResponse.json({ error: 'This email belongs to an independent artist. Please log in and accept the invite.' }, { status: 409 });
      if (existingUser.parentArtistId) return NextResponse.json({ error: 'This email is already an assistant. Please log in.' }, { status: 409 });
      return NextResponse.json({ error: 'Account already exists. Please log in and accept the invite.' }, { status: 409 });
    }

    const displayName = String(name).trim().slice(0, 100) || invite.inviteeName || 'Assistant';
        const newAssistant = await withRetry(() =>
      db.user.create({
        data: {
          email: normalizedEmail,
          name: displayName,
          passwordHash: String(password),
          role: 'artist',
          parentArtistId: invite.parentArtistId,
          phoneNumber: phone ? String(phone).slice(0, 30) : null,
          isAvailable: true,
          rateDrawingOnly: 0,        // ← ADD: assistants start with 0 rates
          rateDrawingWriting: 0,     // ← ADD: assistants start with 0 rates
        },
      })
    );
    
    await withRetry(() => db.assistantInvite.update({ where: { id: invite.id }, data: { status: 'accepted', acceptedById: newAssistant.id, acceptedAt: new Date() } }));
    registerLimiter.reset(ip);

    void sendAssistantRegisteredEmail({ assistantName: displayName, assistantEmail: normalizedEmail, parentArtistName: invite.parentArtist.name, parentArtistEmail: invite.parentArtist.email, appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://pracpedia.vercel.app' }).catch(() => {});

    const token = await signToken({ userId: newAssistant.id, email: newAssistant.email, role: newAssistant.role });
    return NextResponse.json({ token, user: serializeUser(newAssistant) });
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Email already exists.' }, { status: 409 });
    return NextResponse.json({ error: 'Registration failed.' }, { status: 500 });
  }
}