#!/usr/bin/env python3
"""Phase 1 of the PracPedia refactor:
- Update Prisma schema (ChatMessage.imageUrl, new ActivityLog model)
- Add new endpoints: DELETE /api/users/[id], POST /api/users/set-credits,
  POST /api/artists/bookings/[id]/pay, GET /api/activity-log
- Update POST /api/chat to accept imageUrl
- Fix sidebar layout overlap in page.tsx
- Remove "Super Admin CMS" label in Sidebar.tsx
- Add /login route
- Update /api/credentials to surface auth provider info
"""
import os, sys

ROOT = '/home/z/my-project/workspace'

def edit(path, old, new):
    full = os.path.join(ROOT, path)
    with open(full, 'r', encoding='utf-8') as f: s = f.read()
    if old not in s:
        print(f'  ✗ {path}: pattern not found')
        sys.exit(1)
    s2 = s.replace(old, new, 1)
    with open(full, 'w', encoding='utf-8') as f: f.write(s2)
    print(f'  ✓ edited {path}')

def replace_all(path, old, new):
    full = os.path.join(ROOT, path)
    with open(full, 'r', encoding='utf-8') as f: s = f.read()
    if old not in s:
        print(f'  ✗ {path}: pattern not found for replace_all')
        sys.exit(1)
    s2 = s.replace(old, new)
    with open(full, 'w', encoding='utf-8') as f: f.write(s2)
    print(f'  ✓ replace_all {path}')

def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f: f.write(content)
    print(f'  ✓ wrote {path}')

# ============================================================================
# 1. Prisma schema — add imageUrl to ChatMessage + new ActivityLog model
# ============================================================================
print('[1] Prisma schema — ChatMessage.imageUrl + ActivityLog model')
edit('prisma/schema.prisma',
     """model ChatMessage {
  id         String   @id @default(cuid())
  subjectId  String?
  userId     String
  userName   String
  userRole   String   @default("user")
  userAvatar String?
  text       String
  createdAt  DateTime @default(now())

  subject    Subject? @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  @@map("chat_messages")
}""",
     """model ChatMessage {
  id         String   @id @default(cuid())
  subjectId  String?
  userId     String
  userName   String
  userRole   String   @default("user")
  userAvatar String?
  text       String
  imageUrl   String?  // Optional attached image (data URL or remote URL)
  createdAt  DateTime @default(now())

  subject    Subject? @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  @@map("chat_messages")
}

// Real-time audit log — surfaced in the AdminCmsPage "Activity Log" tab.
// Key API routes (login, register, promote, demote, booking create,
// message post, etc.) append a row here so admins can monitor platform
// activity in near-real-time via the /api/activity-log endpoint.
model ActivityLog {
  id         String   @id @default(cuid())
  userId     String?  // null for anonymous/system actions
  userName   String
  userRole   String   @default("system")
  action     String   // e.g. "login", "promote", "demote", "booking_create", "message_post"
  target     String?  // e.g. the affected user's email or booking ID
  details    String?  // JSON-encoded extra context
  createdAt  DateTime @default(now())

  @@map("activity_logs")
}""")

# ============================================================================
# 2. New endpoints
# ============================================================================
print('[2] New endpoints: DELETE /api/users/[id], set-credits, bookings/[id]/pay, activity-log')

write('src/app/api/users/[id]/route.ts', '''import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/platform-owner';

// DELETE — remove a user account entirely. Super-admin only.
//
// The super admin can remove any admin or artist (or regular user) from
// the platform. Platform owners are always protected — even a super_admin
// cannot delete the owner account via this route. Self-deletion is also
// blocked (use /api/users/resign for voluntary step-down).
//
// Bookings & portfolio items owned by the deleted user are cascaded by
// Prisma (see the onDelete: Cascade on Booking.client/artist and
// PortfolioItem.artist).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const requester = await db.user.findUnique({ where: { id: payload.userId } });
    if (!requester || requester.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can permanently remove user accounts.' },
        { status: 403 },
      );
    }
    const { id } = await params;
    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    // Protect platform owners from deletion
    if (isPlatformOwner(target.email)) {
      return NextResponse.json(
        { error: 'The platform owner account is protected and cannot be removed.' },
        { status: 403 },
      );
    }
    // Block self-deletion — admins/super_admins should use /api/users/resign
    if (target.id === requester.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account. Use "Resign Admin Duty" instead.' },
        { status: 400 },
      );
    }

    await db.user.delete({ where: { id } });

    // Audit log entry
    try {
      await db.activityLog.create({
        data: {
          userId: requester.id,
          userName: requester.name,
          userRole: requester.role,
          action: 'user_delete',
          target: target.email,
          details: JSON.stringify({ deletedUserId: target.id, deletedRole: target.role }),
        },
      });
    } catch {
      // audit log write must never block the delete
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${target.email} (${target.role}) from the platform.`,
    });
  } catch (err: any) {
    console.error('DELETE /api/users/[id] error:', err);
    return NextResponse.json({ error: 'Could not remove user.' }, { status: 500 });
  }
}
''')

write('src/app/api/users/set-credits/route.ts', '''import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Set a student's AI credits balance. Admin / super_admin only.
// Replaces the ghost /api/users/set-credits call that was firing 404
// from AdminCmsPage.handleUpdateCredits.
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const requester = await db.user.findUnique({ where: { id: payload.userId } });
    if (!requester || (requester.role !== 'admin' && requester.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Admin only.' },
        { status: 403 },
      );
    }
    const body = await request.json();
    const studentId = String(body.studentId || '');
    const credits = Number(body.credits);
    if (!studentId || Number.isNaN(credits) || credits < 0) {
      return NextResponse.json(
        { error: 'studentId and a non-negative credits value are required.' },
        { status: 400 },
      );
    }

    const updated = await db.user.update({
      where: { id: studentId },
      data: { aiCredits: Math.floor(credits) },
    });

    try {
      await db.activityLog.create({
        data: {
          userId: requester.id,
          userName: requester.name,
          userRole: requester.role,
          action: 'set_credits',
          target: updated.email,
          details: JSON.stringify({ credits: Math.floor(credits) }),
        },
      });
    } catch {
      // ignore audit log failure
    }

    return NextResponse.json({
      success: true,
      aiCredits: updated.aiCredits,
      message: `Set ${updated.email}'s credits to ${updated.aiCredits}.`,
    });
  } catch (err: any) {
    console.error('POST /api/users/set-credits error:', err);
    return NextResponse.json({ error: 'Could not update credits.' }, { status: 500 });
  }
}
''')

write('src/app/api/artists/bookings/[id]/pay/route.ts', '''import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Toggle payment status for a commission booking. Admin / super_admin only.
// Replaces the ghost /api/artists/bookings/[id]/pay call firing 404 from
// AdminCmsPage.handleToggleCommissionPayment.
//
// Behaviour: toggles between 'paid' and 'unpaid'. (Use PUT /api/bookings/[id]
// for explicit status transitions.)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const requester = await db.user.findUnique({ where: { id: payload.userId } });
    if (!requester || (requester.role !== 'admin' && requester.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Admin only.' },
        { status: 403 },
      );
    }
    const { id } = await params;
    const booking = await db.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    const nextStatus = booking.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    const updated = await db.booking.update({
      where: { id },
      data: { paymentStatus: nextStatus },
    });

    try {
      await db.activityLog.create({
        data: {
          userId: requester.id,
          userName: requester.name,
          userRole: requester.role,
          action: 'booking_pay_toggle',
          target: id,
          details: JSON.stringify({ from: booking.paymentStatus, to: nextStatus }),
        },
      });
    } catch {
      // ignore audit log failure
    }

    return NextResponse.json({
      success: true,
      paymentStatus: nextStatus,
      message: `Booking ${id} marked as ${nextStatus}.`,
    });
  } catch (err: any) {
    console.error('POST /api/artists/bookings/[id]/pay error:', err);
    return NextResponse.json({ error: 'Could not update payment status.' }, { status: 500 });
  }
}
''')

write('src/app/api/activity-log/route.ts', '''import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Real-time activity log endpoint — admin / super_admin only.
//
// Returns the most recent 100 activity log entries (most-recent first).
// Supports `?since=<iso-timestamp>` for polling — only entries created
// strictly after the supplied timestamp are returned, so the AdminCmsPage
// can poll every few seconds without re-fetching the full log each time.
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const requester = await db.user.findUnique({ where: { id: payload.userId } });
    if (!requester || (requester.role !== 'admin' && requester.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Admin only.' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const where: any = {};
    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        where.createdAt = { gt: sinceDate };
      }
    }

    const entries = await db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      entries: entries.map((e) => ({ ...e, id: e.id })),
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('GET /api/activity-log error:', err);
    return NextResponse.json({ error: 'Could not load activity log.' }, { status: 500 });
  }
}
''')

# ============================================================================
# 3. Update POST /api/chat to accept imageUrl
# ============================================================================
print('[3] Update POST /api/chat to accept imageUrl + audit log')
edit('src/app/api/chat/route.ts',
     """    const created = await db.chatMessage.create({
      data: {
        userId: u.id,
        userName: u.name,
        userRole: u.role,
        userAvatar: u.profilePic || null,
        text: String(text).slice(0, 4000),
        subjectId: subjectId || null,
      },
    });
    return NextResponse.json({ ...created, id: created.id });""",
     """    // Optional attached image. Accept either a remote URL or a base64
    // data URL (capped at ~5MB to keep SQLite rows reasonable). The
    // ClassroomDiscussion component renders the image inline below the
    // text body when imageUrl is present.
    let imageUrl: string | null = null;
    if (typeof body.imageUrl === 'string' && body.imageUrl) {
      const raw = body.imageUrl.slice(0, 7_000_000);
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:image/')) {
        imageUrl = raw;
      }
    }

    const created = await db.chatMessage.create({
      data: {
        userId: u.id,
        userName: u.name,
        userRole: u.role,
        userAvatar: u.profilePic || null,
        text: String(text).slice(0, 4000),
        imageUrl,
        subjectId: subjectId || null,
      },
    });

    // Audit log entry
    try {
      await db.activityLog.create({
        data: {
          userId: u.id,
          userName: u.name,
          userRole: u.role,
          action: 'message_post',
          target: subjectId ? `subject:${subjectId}` : 'general',
          details: JSON.stringify({ messageId: created.id, hasImage: !!imageUrl }),
        },
      });
    } catch {
      // audit log write must never block the chat post
    }

    return NextResponse.json({ ...created, id: created.id });""")

# ============================================================================
# 4. Update auth routes to write activity log
# ============================================================================
print('[4] Login + register + promote + demote audit log entries')
edit('src/app/api/auth/login/route.ts',
     """    const token = await signToken({ userId: u.id, email: u.email, role: u.role });
    return NextResponse.json({ token, user: serializeUser(u) });""",
     """    const token = await signToken({ userId: u.id, email: u.email, role: u.role });

    try {
      await db.activityLog.create({
        data: {
          userId: u.id,
          userName: u.name,
          userRole: u.role,
          action: 'login',
          target: u.email,
        },
      });
    } catch {
      // audit log write must never block the login
    }

    return NextResponse.json({ token, user: serializeUser(u) });""")

edit('src/app/api/users/promote/route.ts',
     """    return NextResponse.json({
      message: `Successfully elevated ${updated.email} to administrator.`,
      userId: updated.id,
    });""",
     """    try {
      await db.activityLog.create({
        data: {
          userId: requester.id,
          userName: requester.name,
          userRole: requester.role,
          action: 'promote',
          target: updated.email,
          details: JSON.stringify({ toRole: 'admin' }),
        },
      });
    } catch {
      // ignore audit log failure
    }

    return NextResponse.json({
      message: `Successfully elevated ${updated.email} to administrator.`,
      userId: updated.id,
    });""")

edit('src/app/api/users/demote/route.ts',
     """    return NextResponse.json({ message: `Demoted ${updated.email}.`, userId: updated.id });""",
     """    try {
      await db.activityLog.create({
        data: {
          userId: requester.id,
          userName: requester.name,
          userRole: requester.role,
          action: 'demote',
          target: updated.email,
          details: JSON.stringify({ fromRole: u.role, toRole: 'user' }),
        },
      });
    } catch {
      // ignore audit log failure
    }

    return NextResponse.json({ message: `Demoted ${updated.email}.`, userId: updated.id });""")

edit('src/app/api/users/promote-super/route.ts',
     """    return NextResponse.json({ message: `Successfully elevated ${updated.email} to super admin.`, userId: updated.id });""",
     """    try {
      await db.activityLog.create({
        data: {
          userId: requester.id,
          userName: requester.name,
          userRole: requester.role,
          action: 'promote_super',
          target: updated.email,
          details: JSON.stringify({ toRole: 'super_admin' }),
        },
      });
    } catch {
      // ignore audit log failure
    }

    return NextResponse.json({ message: `Successfully elevated ${updated.email} to super admin.`, userId: updated.id });""")

# ============================================================================
# 5. Fix sidebar layout overlap (page.tsx)
# ============================================================================
print('[5] Fix sidebar layout overlap')
edit('src/app/page.tsx',
     """  return (
    <div className={`min-h-screen flex flex-col text-slate-100 relative transition-all duration-300 ${""",
     """  return (
    <div className={`min-h-screen flex flex-col lg:flex-row text-slate-100 relative transition-all duration-300 ${""")

edit('src/app/page.tsx',
     """      {/* Main dashboard view container */}
      <div className=\"flex-1 min-w-0 flex flex-col relative overflow-x-hidden\">""",
     """      {/* Main dashboard view container — lg:h-screen + lg:overflow-y-auto so the main panel scrolls independently of the sticky sidebar */}
      <div className=\"flex-1 min-w-0 flex flex-col relative overflow-x-hidden lg:h-screen lg:overflow-y-auto\">""")

# ============================================================================
# 6. Remove "Super Admin CMS" label in Sidebar (use Admin Portal for both)
# ============================================================================
print('[6] Sidebar — unify admin/super_admin nav label')
edit('src/components/gallery/Sidebar.tsx',
     """                <span className=\"truncate\">
                  {user?.role === 'super_admin' ? 'Super Admin CMS' : t('adminPortal')}
                </span>""",
     """                <span className=\"truncate\">
                  {t('adminPortal')}
                </span>""")

# ============================================================================
# 7. New /login route — dedicated login page
# ============================================================================
print('[7] New /login route')
write('src/app/login/page.tsx', ''''use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthPage } from '@/components/gallery/pages/AuthPage';
import { useRouter } from 'next/navigation';

// Dedicated /login route.
//
// The AuthPage used to be rendered via view-state switching inside the
// root page.tsx (which means a refresh on the "login" screen dropped the
// user back onto the landing page). This route fixes that — /login is a
// real Next.js App Router page that any unauthenticated visitor can hit
// directly. After successful auth, the user is bounced back to '/' which
// will route them into PortalConsole.
//
// Backward-compat: page.tsx still keeps its view-state AuthPage rendering
// for the landing-page "Sign In" button + footer "Admin Login" shortcut.
// Both paths render the same AuthPage component — the /login route is
// just an additional explicit entry point that survives refreshes.
export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // If already authenticated, bounce to home — no point showing the form.
  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className=\"fixed inset-0 bg-[#020617] flex flex-col items-center justify-center gap-4 text-slate-300 font-sans p-4\">
        <div className=\"w-9 h-9 rounded-full border-t-2 border-b-2 border-cyan-400 animate-spin\" />
        <p className=\"text-[10px] font-mono uppercase tracking-widest text-slate-500\">Loading session...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // brief blank during the replace() redirect
  }

  return (
    <AuthPage
      onSuccess={() => router.replace('/')}
      onGoBack={() => router.push('/')}
    />
  );
}
''')

# ============================================================================
# 8. Update /api/credentials — add auth provider detection
# ============================================================================
print('[8] /api/credentials — add auth provider detection')
edit('src/app/api/credentials/route.ts',
     """        database: 'SQLite',
        databaseUrl: process.env.DATABASE_URL || '(not set)',
        jwtSecretSet: !!process.env.JWT_SECRET,
        zAiSdkInstalled: true,
        nodeVersion: process.version,""",
     """        database: 'SQLite',
        databaseUrl: process.env.DATABASE_URL || '(not set)',
        jwtSecretSet: !!process.env.JWT_SECRET,
        // Detect which auth provider is currently configured. The
        // credentials page must continue to surface all credentials
        // regardless of whether the deploy uses JWT (default), Supabase,
        // NextAuth, or Firebase — this chip lets the super-admin confirm
        // at a glance which provider is actually wired up.
        authProvider: (() => {
          if (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return 'Supabase';
          }
          if (process.env.NEXTAUTH_URL || process.env.NEXTAUTH_SECRET) {
            return 'NextAuth';
          }
          if (process.env.FIREBASE_API_KEY || process.env.FIREBASE_PROJECT_ID) {
            return 'Firebase';
          }
          if (process.env.AUTH0_DOMAIN || process.env.AUTH0_CLIENT_ID) {
            return 'Auth0';
          }
          return 'JWT (in-house)';
        })(),
        supabaseConfigured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPASE_URL),
        zAiSdkInstalled: true,
        nodeVersion: process.version,""")

# Add to endpoints list
edit('src/app/api/credentials/route.ts',
     "        'GET  /api/credentials (super admin only)',",
     "        'GET  /api/credentials (super admin only)',\n        'GET  /api/activity-log (admin/super_admin, real-time polling)',")

print()
print('Phase 1 complete. Run `bunx prisma db push --accept-data-loss` then `bunx prisma generate`.')
