#!/usr/bin/env python3
"""Re-apply all bug fixes from the PracPedia session.

Run from /home/z/my-project/workspace.
"""
import os
import re
import sys

ROOT = '/home/z/my-project/workspace'

def read(path):
    with open(os.path.join(ROOT, path), 'r', encoding='utf-8') as f:
        return f.read()

def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  ✓ wrote {path}')

def edit(path, old, new):
    full = os.path.join(ROOT, path)
    with open(full, 'r', encoding='utf-8') as f:
        s = f.read()
    if old not in s:
        print(f'  ✗ {path}: pattern not found')
        sys.exit(1)
    s2 = s.replace(old, new, 1)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(s2)
    print(f'  ✓ edited {path}')

def replace_all(path, old, new):
    full = os.path.join(ROOT, path)
    with open(full, 'r', encoding='utf-8') as f:
        s = f.read()
    if old not in s:
        print(f'  ✗ {path}: pattern not found for replace_all')
        sys.exit(1)
    s2 = s.replace(old, new)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(s2)
    print(f'  ✓ replace_all {path}')

# ============================================================================
# FIX 1: /api/credentials shorthand bug
# ============================================================================
print('[1] Fix /api/credentials shorthand bug')
edit('src/app/api/credentials/route.ts',
     '        users: userCount,\n        subjects,\n        folders: folderCount,',
     '        users: userCount,\n        subjects: subjectCount,\n        folders: folderCount,')

edit('src/app/api/credentials/route.ts',
     """      endpoints: [
        'POST /api/auth/login',
        'POST /api/auth/register',
        'GET  /api/auth/me',
        'POST /api/auth/track-time',
        'GET  /api/subjects',
        'POST /api/subjects',
        'GET  /api/folders',
        'POST /api/folders',
        'GET  /api/announcements',
        'POST /api/announcements',
        'GET  /api/stats',
        'POST /api/images',
        'DELETE /api/images/[folderId]/[imgIndex]',
        'GET  /api/users/admins',
        'GET  /api/users/super-admins',
        'GET  /api/users/students',
        'POST /api/users/promote',
        'POST /api/users/demote',
        'POST /api/users/promote-super',
        'GET  /api/users/scare-status',
        'POST /api/users/clear-scare',
        'POST /api/users/clear-cat',
        'GET  /api/chat',
        'POST /api/chat',
        'DELETE /api/chat?id=...',
        'GET  /api/chat/[subjectId]',
        'GET  /api/hire',
        'POST /api/hire',
        'PUT  /api/profile',
        'GET  /api/bookings?scope=client|artist',
        'POST /api/bookings',
        'GET  /api/bookings/[id]',
        'PUT  /api/bookings/[id]',
        'DELETE /api/bookings/[id]',
        'GET  /api/portfolio?artistId=...',
        'POST /api/portfolio',
        'DELETE /api/portfolio/[id]',
        'GET  /api/artists',
        'GET  /api/artists/[id]',
        'POST /api/artists/register',
        'PUT  /api/artists/register',
        'GET  /api/credentials (super admin only)',
        'POST /api/academy/lesson',
        'POST /api/academy/chat',
        'POST /api/academy/mcq',
        'POST /api/academy/cq',
      ],""",
     """      endpoints: [
        'POST /api/auth/login',
        'POST /api/auth/register',
        'POST /api/auth/google (Gmail-only strict gate)',
        'GET  /api/auth/me',
        'POST /api/auth/track-time',
        'GET  /api/subjects',
        'POST /api/subjects',
        'GET  /api/folders',
        'POST /api/folders',
        'GET  /api/announcements',
        'POST /api/announcements',
        'GET  /api/stats (StatsGrid-compatible shape)',
        'POST /api/images',
        'POST /api/images/upload-file (multipart scan upload)',
        'DELETE /api/images/[folderId]/[imgIndex]',
        'GET  /api/users/admins',
        'GET  /api/users/super-admins',
        'GET  /api/users/students',
        'POST /api/users/promote',
        'POST /api/users/demote',
        'POST /api/users/promote-super',
        'POST /api/users/resign (self-demotion, owner-protected)',
        'GET  /api/users/scare-status',
        'POST /api/users/clear-scare',
        'POST /api/users/clear-cat',
        'GET  /api/chat',
        'POST /api/chat',
        'DELETE /api/chat?id=...',
        'GET  /api/chat/[subjectId]',
        'GET  /api/hire',
        'POST /api/hire',
        'PUT  /api/profile',
        'GET  /api/bookings?scope=client|artist',
        'POST /api/bookings',
        'GET  /api/bookings/[id]',
        'PUT  /api/bookings/[id]',
        'DELETE /api/bookings/[id]',
        'GET  /api/artists/bookings (admin/super_admin only)',
        'GET  /api/portfolio?artistId=...',
        'POST /api/portfolio',
        'DELETE /api/portfolio/[id]',
        'GET  /api/artists',
        'GET  /api/artists/[id]',
        'POST /api/artists/register',
        'PUT  /api/artists/register',
        'GET  /api/credentials (super admin only)',
        'GET  /api/health (Gemini key shape check)',
        'POST /api/messages/verify-otp (dev code: 123456)',
        'POST /api/academy/lesson',
        'POST /api/academy/chat',
        'POST /api/academy/mcq',
        'POST /api/academy/cq',
      ],""")

# ============================================================================
# FIX 2: Role-check bug across 10 API routes
# ============================================================================
print('[2] Fix super_admin role checks across 10 API routes')
ROLE_OLD = "if (!payload || payload.role !== 'admin') {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }"
ROLE_NEW = "if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }"
for p in [
    'src/app/api/announcements/route.ts',
    'src/app/api/announcements/[id]/route.ts',
    'src/app/api/subjects/route.ts',
    'src/app/api/folders/route.ts',
    'src/app/api/users/students/route.ts',
    'src/app/api/hire/route.ts',
]:
    edit(p, ROLE_OLD, ROLE_NEW)

for fn in ['PUT', 'DELETE']:
    edit('src/app/api/subjects/[id]/route.ts',
         f"export async function {fn}(request: NextRequest, {{ params }}: {{ params: Promise<{{ id: string }}> }}) {{\n  try {{\n    const payload = await getUserFromRequest(request);\n    if (!payload || payload.role !== 'admin') {{\n      return NextResponse.json({{ error: 'Admin only.' }}, {{ status: 403 }});\n    }}",
         f"export async function {fn}(request: NextRequest, {{ params }}: {{ params: Promise<{{ id: string }}> }}) {{\n  try {{\n    const payload = await getUserFromRequest(request);\n    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {{\n      return NextResponse.json({{ error: 'Admin only.' }}, {{ status: 403 }});\n    }}")

for fn in ['PUT', 'DELETE']:
    edit('src/app/api/folders/[id]/route.ts',
         f"export async function {fn}(request: NextRequest, {{ params }}: {{ params: Promise<{{ id: string }}> }}) {{\n  try {{\n    const payload = await getUserFromRequest(request);\n    if (!payload || payload.role !== 'admin') {{\n      return NextResponse.json({{ error: 'Admin only.' }}, {{ status: 403 }});\n    }}",
         f"export async function {fn}(request: NextRequest, {{ params }}: {{ params: Promise<{{ id: string }}> }}) {{\n  try {{\n    const payload = await getUserFromRequest(request);\n    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {{\n      return NextResponse.json({{ error: 'Admin only.' }}, {{ status: 403 }});\n    }}")

edit('src/app/api/images/[folderId]/[imgIndex]/route.ts',
     "    if (!payload || payload.role !== 'admin') {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }",
     "    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }")

edit('src/app/api/chat/route.ts',
     "    if (msg.userId !== payload.userId && payload.role !== 'admin') {\n      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });\n    }",
     "    if (msg.userId !== payload.userId && payload.role !== 'admin' && payload.role !== 'super_admin') {\n      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });\n    }")

# ============================================================================
# FIX 3: auth.ts BufferSource TS error
# ============================================================================
print('[3] Fix auth.ts BufferSource type error')
edit('src/lib/auth.ts',
     "    const sigBytes = base64ToBytes(base64UrlToString(sigB64));\n    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));",
     """    const sigBytes = base64ToBytes(base64UrlToString(sigB64));
    // Cast to BufferSource — TS lib's ArrayBufferLike/SharedArrayBuffer union
    // is wider than Web Crypto's verify() signature accepts in strict mode.
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes as BufferSource, enc.encode(data));""")

# ============================================================================
# FIX 4: /api/images POST missing admin role guard
# ============================================================================
print('[4] Add admin role guard to /api/images POST')
edit('src/app/api/images/route.ts',
     """    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();""",
     """    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Only admins and super admins can add images to folders
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }
    const body = await request.json();""")

# ============================================================================
# FIX 5: ArtistDashboard reopen + notes-save on cancelled/completed
# ============================================================================
print('[5] Fix ArtistDashboard PUT guard')
edit('src/app/api/bookings/[id]/route.ts',
     """    // Cannot modify a cancelled or completed booking
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return NextResponse.json({ error: `Booking already ${booking.status}.` }, { status: 400 });
    }""",
     """    // Cannot modify a cancelled or completed booking — EXCEPT:
    // 1) An artist (or admin) re-opening a cancelled booking back to 'pending'
    //    (matches the "Re-open" button in ArtistDashboard).
    // 2) An artist (or admin/client) appending notes to a completed/cancelled
    //    booking — notes-only updates are always safe and don't transition state.
    //    (Matches the "Save Notes" button in ArtistDashboard which renders for
    //    every booking regardless of status.)
    const isReopenFromCancelled =
      booking.status === 'cancelled' && newStatus === 'pending' && (isArtist || isSuperAdmin || isAdmin);
    const isNotesOnlyUpdate =
      newStatus === undefined && (artistNotes !== undefined || clientNotes !== undefined);

    if (
      (booking.status === 'cancelled' || booking.status === 'completed') &&
      !isReopenFromCancelled &&
      !isNotesOnlyUpdate
    ) {
      return NextResponse.json({ error: `Booking already ${booking.status}.` }, { status: 400 });
    }""")

# ============================================================================
# FIX 6: New shared lib files
# ============================================================================
print('[6] Create shared lib files')
write('src/lib/platform-owner.ts', '''// Platform owner email gate.
//
// The platform owner is protected from self-demotion (Sidebar "Resign"
// button, /api/users/resign endpoint) and gets the "OWNER" badge in the
// Super Admins roster. Multiple emails can be marked as owner — the seed
// super_admin `admin@gallery.com` and the original gmail account
// `mahabubrahmanakash275@gmail.com` both qualify so the seed data ships
// with a protected owner account out-of-the-box.
//
// To override this list at deploy time, set the env var
//   PLATFORM_OWNER_EMAILS="you@yourdomain.com,founder@yourdomain.com"
// and only those emails will count as platform owner. The seed admin
// address is always included as a fallback so the dev sandbox never
// locks out the only seeded super-admin.

const SEED_OWNER_EMAILS = ['admin@gallery.com', 'mahabubrahmanakash275@gmail.com'];

function getOwnerSet(): Set<string> {
  const env = process.env.PLATFORM_OWNER_EMAILS || process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAILS || '';
  const envList = env
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...envList, ...SEED_OWNER_EMAILS.map((s) => s.toLowerCase())]);
}

let _ownerSet: Set<string> | null = null;
function ownerSet(): Set<string> {
  if (!_ownerSet) _ownerSet = getOwnerSet();
  return _ownerSet;
}

export function isPlatformOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  return ownerSet().has(email.trim().toLowerCase());
}

export function _resetPlatformOwnerCacheForTests(): void {
  _ownerSet = null;
}
''')

write('src/lib/gmail-check.ts', '''// Shared Gmail detection helper — the strict auth rule (Gmail addresses
// must use the Google Sign-In button + /api/auth/google, non-Gmail
// addresses must use the standard form + /api/auth/login or
// /api/auth/register) is enforced on BOTH the client (AuthPage UI) and
// the server (these three API routes). Centralizing the helper here
// keeps the rule consistent across all enforcement points.

export function isGmailAddress(mail: string | null | undefined): boolean {
  if (!mail) return false;
  const clean = mail.trim().toLowerCase();
  return clean.endsWith('@gmail.com') || clean.endsWith('@googlemail.com');
}

export const GMAIL_MUST_USE_GOOGLE_ERROR =
  'Gmail accounts (@gmail.com) must use the "Sign in / Sign up with Google" button. The standard form is reserved for Yahoo, Outlook, Hotmail, and other non-Google email providers.';

export const NON_GMAIL_MUST_USE_STANDARD_FORM_ERROR =
  'Google authentication is strictly restricted to @gmail.com accounts. For Yahoo, Outlook, Hotmail, and all other email providers, please use the standard form on the main page.';
''')

# ============================================================================
# FIX 7: Strict Gmail auth on /api/auth/login, /api/auth/register
# ============================================================================
print('[7] Strict Gmail auth on login + register')
edit('src/app/api/auth/login/route.ts',
     """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import * as bcrypt from 'bcryptjs';
import { serializeUser } from '@/lib/user-serializer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const u = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });""",
     """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import * as bcrypt from 'bcryptjs';
import { serializeUser } from '@/lib/user-serializer';
import { isGmailAddress, GMAIL_MUST_USE_GOOGLE_ERROR } from '@/lib/gmail-check';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Strict auth rule — server-side mirror of the AuthPage client-side
    // gate at line 162-167. Even if someone bypasses the client (curl,
    // devtools, custom script), the server still rejects Gmail addresses
    // here. The user must use the Google Sign-In button + /api/auth/google.
    if (isGmailAddress(String(email))) {
      return NextResponse.json({ error: GMAIL_MUST_USE_GOOGLE_ERROR }, { status: 400 });
    }

    const u = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });""")

edit('src/app/api/auth/register/route.ts',
     """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, getUserFromRequest } from '@/lib/auth';
import * as bcrypt from 'bcryptjs';
import { serializeUser } from '@/lib/user-serializer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, profilePic, phoneNumber } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Artist registration includes rate fields
    const isArtist = role === 'artist';""",
     """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, getUserFromRequest } from '@/lib/auth';
import * as bcrypt from 'bcryptjs';
import { serializeUser } from '@/lib/user-serializer';
import { isGmailAddress, GMAIL_MUST_USE_GOOGLE_ERROR } from '@/lib/gmail-check';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, profilePic, phoneNumber } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Strict auth rule — server-side mirror of the AuthPage client-side
    // gate at line 162-167. Even if someone bypasses the client (curl,
    // devtools, custom script), the server still rejects Gmail addresses
    // here. The user must use the Google Sign-In button + /api/auth/google.
    if (isGmailAddress(String(email))) {
      return NextResponse.json({ error: GMAIL_MUST_USE_GOOGLE_ERROR }, { status: 400 });
    }

    // Artist registration includes rate fields
    const isArtist = role === 'artist';""")

# ============================================================================
# FIX 8: /api/stats — StatsGrid-compatible shape
# ============================================================================
print('[8] Update /api/stats to return StatsGrid-compatible shape')
write('src/app/api/stats/route.ts', '''import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest) {
  try {
    const subjects = await db.subject.count();
    const folders = await db.folder.count();
    const users = await db.user.count();
    const announcements = await db.announcement.count();

    // Derive image count by summing the JSON arrays stored on each folder.
    let images = 0;
    try {
      const allFolders = await db.folder.findMany({ select: { imagesJson: true } });
      for (const f of allFolders) {
        try {
          const arr = JSON.parse(f.imagesJson || '[]');
          if (Array.isArray(arr)) images += arr.length;
        } catch {
          // skip malformed folder
        }
      }
    } catch {
      // image-count probe failure is non-fatal — fall back to 0
    }

    // Sniff the DATABASE_URL to label the engine.
    const dbUrl = process.env.DATABASE_URL || '';
    let databaseType = 'SQLite';
    if (dbUrl.startsWith('postgres')) databaseType = 'PostgreSQL';
    else if (dbUrl.startsWith('mysql')) databaseType = 'MySQL';
    else if (dbUrl.startsWith('mongodb')) databaseType = 'MongoDB';
    else if (dbUrl.startsWith('file:')) databaseType = 'SQLite';

    return NextResponse.json({
      subjects,
      folders,
      users,
      announcements,
      images,
      usersCount: users,
      subjectsCount: subjects,
      foldersCount: folders,
      imagesCount: images,
      databaseType,
      uptime: Math.floor(process.uptime()),
    });
  } catch (err: any) {
    console.error('GET /api/stats error:', err);
    return NextResponse.json({ error: 'Could not load stats.' }, { status: 500 });
  }
}
''')

# ============================================================================
# FIX 9: Missing endpoints
# ============================================================================
print('[9] Create 6 missing endpoints')
write('src/app/api/auth/google/route.ts', '''import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { isGmailAddress, NON_GMAIL_MUST_USE_STANDARD_FORM_ERROR } from '@/lib/gmail-check';

// Google Sign-In endpoint. Strict Gmail-only gate. Stub that wraps
// existing login + register logic — swap body for real Supabase/
// NextAuth OAuth later, the strict gate stays.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const name = body.name ? String(body.name) : email.split('@')[0];
    const password = body.password ? String(body.password) : 'google-oauth-managed';
    const profilePic = body.profilePic ? String(body.profilePic) : null;
    const role = body.role === 'artist' ? 'artist' : 'user';

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    if (!isGmailAddress(email)) {
      return NextResponse.json(
        { error: NON_GMAIL_MUST_USE_STANDARD_FORM_ERROR },
        { status: 400 },
      );
    }

    let u = await db.user.findUnique({ where: { email } });
    if (!u) {
      u = await db.user.create({
        data: {
          email,
          name,
          passwordHash: `google-oauth:${Buffer.from(password).toString('base64')}`,
          role,
          profilePic,
        },
      });
    }

    const token = await signToken({ userId: u.id, email: u.email, role: u.role });
    return NextResponse.json({ token, user: serializeUser(u) });
  } catch (err: any) {
    console.error('POST /api/auth/google error:', err);
    return NextResponse.json({ error: 'Google authentication failed.' }, { status: 500 });
  }
}
''')

write('src/app/api/messages/verify-otp/route.ts', '''import { NextRequest, NextResponse } from 'next/server';

// OTP verification endpoint (mock). Dev code is "123456". Swap body for
// real Twilio Verify / Supabase auth.verifyOtp in production.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body.code || '').trim();
    const email = body.email ? String(body.email) : undefined;

    if (!code) {
      return NextResponse.json(
        { error: 'Please enter the 6-digit verification code.' },
        { status: 400 },
      );
    }

    if (code === '123456') {
      return NextResponse.json({
        ok: true,
        message: 'Verification successful.',
        email,
      });
    }

    return NextResponse.json(
      { error: 'Incorrect or expired verification passcode.' },
      { status: 400 },
    );
  } catch (err: any) {
    console.error('POST /api/messages/verify-otp error:', err);
    return NextResponse.json({ error: 'Could not verify OTP code.' }, { status: 500 });
  }
}
''')

write('src/app/api/artists/bookings/route.ts', '''import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Admin-only endpoint returning ALL marketplace commission bookings,
// used by the AdminCmsPage "Commissions" tab.
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Admin only. Use /api/bookings?scope=client or ?scope=artist for personal bookings.' },
        { status: 403 },
      );
    }

    const bookings = await db.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, email: true, profilePic: true } },
        artist: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePic: true,
            rating: true,
            completedOrders: true,
          },
        },
      },
    });

    return NextResponse.json(
      bookings.map((b) => ({
        ...b,
        id: b.id,
        referenceImages: JSON.parse(b.referenceImagesJson || '[]'),
        client: { ...b.client, id: b.client.id },
        artist: { ...b.artist, id: b.artist.id },
      })),
    );
  } catch (err: any) {
    console.error('GET /api/artists/bookings error:', err);
    return NextResponse.json({ error: 'Could not load commissions.' }, { status: 500 });
  }
}
''')

write('src/app/api/images/upload-file/route.ts', '''import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Multipart file-upload endpoint used by UploadModal Step 3.
// Stores the image inline as a base64 data URL in the folder's
// imagesJson array — no separate upload dir required.
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('image');
    const folderId = String(formData.get('folderId') || '');
    const title = String(formData.get('title') || 'Scanned notebook page');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Image file required.' }, { status: 400 });
    }
    if (!folderId) {
      return NextResponse.json({ error: 'folderId required.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buf = Buffer.from(bytes);
    const mime = file.type || 'image/jpeg';
    const base64 = buf.toString('base64');
    const dataUrl = `data:${mime};base64,${base64}`;

    const folder = await db.folder.findUnique({ where: { id: folderId } });
    if (!folder) {
      return NextResponse.json({
        url: dataUrl,
        title,
        message: 'Folder not found — passing data URL to caller for separate attach.',
      });
    }

    const images = JSON.parse(folder.imagesJson || '[]') as { url: string; title: string }[];
    images.push({ url: dataUrl, title });
    const updated = await db.folder.update({
      where: { id: folder.id },
      data: { imagesJson: JSON.stringify(images) },
    });

    return NextResponse.json({
      url: dataUrl,
      title,
      id: updated.id,
      subjectId: updated.subjectId,
      folderId: updated.id,
      title_dup: updated.title,
      images,
      createdAt: updated.createdAt,
    });
  } catch (err: any) {
    console.error('POST /api/images/upload-file error:', err);
    return NextResponse.json({ error: 'Could not upload scan image.' }, { status: 500 });
  }
}
''')

write('src/app/api/health/route.ts', '''import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

// Health-check endpoint used by GeminiKeyModal "Save API Key" flow.
// Strictly validates the key shape (starts with "AIza", 39 chars,
// URL-safe base64) and returns 400 with a clear error otherwise.
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const key = request.headers.get('x-gemini-api-key') || '';
    if (!key) {
      return NextResponse.json(
        { error: 'No API key supplied. Paste your Gemini key into the input first.' },
        { status: 400 },
      );
    }

    if (!key.startsWith('AIza') || key.length !== 39 || !/^[A-Za-z0-9_-]+$/.test(key.slice(4))) {
      return NextResponse.json(
        {
          error:
            'This does not look like a Google Gemini API key. Keys start with "AIza" and are exactly 39 characters. Grab one free at https://aistudio.google.com/app/apikey',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      provider: 'gemini',
      message: 'Gemini API key format is valid. Saved locally for AI co-pilot use.',
    });
  } catch (err: any) {
    console.error('GET /api/health error:', err);
    return NextResponse.json({ error: 'Health check failed.' }, { status: 500 });
  }
}
''')

write('src/app/api/users/resign/route.ts', '''import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { isPlatformOwner } from '@/lib/platform-owner';

// Allow a non-owner admin (or super_admin) to voluntarily step down
// to a regular user. Platform owner emails are protected.
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    if (u.role !== 'admin' && u.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only admins can resign.' }, { status: 403 });
    }
    if (isPlatformOwner(u.email)) {
      return NextResponse.json(
        { error: 'The platform owner cannot resign. Please contact support.' },
        { status: 403 },
      );
    }
    const updated = await db.user.update({
      where: { id: u.id },
      data: { role: 'user' },
    });
    return NextResponse.json({
      message: `Resignation accepted. ${updated.email} is now a regular user.`,
      user: serializeUser(updated),
    });
  } catch (err: any) {
    console.error('POST /api/users/resign error:', err);
    return NextResponse.json({ error: 'Resignation failed.' }, { status: 500 });
  }
}
''')

# ============================================================================
# FIX 10: Sidebar super_admin treatment + Resign button + platform-owner helper
# ============================================================================
print('[10] Sidebar super_admin visual + Resign button')
edit('src/components/gallery/Sidebar.tsx',
     """'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  Home,
  LogOut,
  User,
  ShieldCheck,
  FolderPlus,
  BookOpen,""",
     """'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { isPlatformOwner } from '@/lib/platform-owner';
import {
  Home,
  LogOut,
  User,
  ShieldCheck,
  FolderPlus,
  BookOpen,""")

edit('src/components/gallery/Sidebar.tsx',
     """              <div className={`
                p-2 rounded-lg flex items-center justify-center shrink-0
                ${user.role === 'admin' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'}
              `}>
                {user.role === 'admin' ? <ShieldCheck className=\"w-4 h-4\" /> : <User className=\"w-4 h-4\" />}
              </div>""",
     """              <div className={`
                p-2 rounded-lg flex items-center justify-center shrink-0
                ${(user.role === 'admin' || user.role === 'super_admin') ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'}
              `}>
                {(user.role === 'admin' || user.role === 'super_admin') ? <ShieldCheck className=\"w-4 h-4\" /> : <User className=\"w-4 h-4\" />}
              </div>""")

edit('src/components/gallery/Sidebar.tsx',
     """                <span className={`
                  inline-block px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider uppercase font-bold
                  ${user.role === 'admin' ? 'bg-amber-400/10 text-amber-300' : 'bg-cyan-400/10 text-cyan-300'}
                `}>
                  {user.role}
                </span>

                {user.role === 'admin' && user.email?.toLowerCase() !== 'mahabubrahmanakash275@gmail.com' && (""",
     """                <span className={`
                  inline-block px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider uppercase font-bold
                  ${(user.role === 'admin' || user.role === 'super_admin') ? 'bg-amber-400/10 text-amber-300' : 'bg-cyan-400/10 text-cyan-300'}
                `}>
                  {user.role}
                </span>

                {(user.role === 'admin' || user.role === 'super_admin') && !isPlatformOwner(user.email) && (""")

edit('src/components/gallery/Sidebar.tsx',
     """            {/* Admin actions shortcut within the dashboard structure */}
            {user.role === 'admin' && (
              <button
                onClick={onOpenFolderCreate}
                className=\"w-full mt-2 flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-indigo-950/50 transition-all active:scale-[0.98] cursor-pointer\"
              >
                <FolderPlus className=\"w-4 h-4 shrink-0\" />
                <span className=\"truncate\">{t('addFolder')}</span>
              </button>
            )}""",
     """            {/* Admin actions shortcut within the dashboard structure */}
            {(user.role === 'admin' || user.role === 'super_admin') && (
              <button
                onClick={onOpenFolderCreate}
                className=\"w-full mt-2 flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-indigo-950/50 transition-all active:scale-[0.98] cursor-pointer\"
              >
                <FolderPlus className=\"w-4 h-4 shrink-0\" />
                <span className=\"truncate\">{t('addFolder')}</span>
              </button>
            )}""")

# ============================================================================
# FIX 11: page.tsx — replace user?.role === 'admin' → super_admin OR
# ============================================================================
print('[11] page.tsx — super_admin OR admin (11 occurrences)')
replace_all('src/app/page.tsx', "user?.role === 'admin'", "(user?.role === 'admin' || user?.role === 'super_admin')")

# ============================================================================
# FIX 12: LanguageContext lang key
# ============================================================================
print('[12] LanguageContext lang key → png_lang')
edit('src/context/LanguageContext.tsx',
     "      const saved = safeLocalStorage.getItem('app_language');\n      if (saved === 'en' || saved === 'bn') return saved;",
     "      const saved = safeLocalStorage.getItem('png_lang');\n      if (saved === 'en' || saved === 'bn') return saved;")
edit('src/context/LanguageContext.tsx',
     "  const setLanguage = (lang: Language) => {\n    setLanguageState(lang);\n    safeLocalStorage.setItem('app_language', lang);\n  };",
     "  const setLanguage = (lang: Language) => {\n    setLanguageState(lang);\n    safeLocalStorage.setItem('png_lang', lang);\n  };")

# ============================================================================
# FIX 13: ClassroomDiscussion super_admin delete + window guard
# ============================================================================
print('[13] ClassroomDiscussion super_admin delete + window guard')
edit('src/components/gallery/ClassroomDiscussion.tsx',
     """  // Real-time active users
  const [activeUsers, setActiveUsers] = useState<any[]>((window as any).__activeUsers || []);""",
     """  // Real-time active users (SSR-safe — window may be undefined during prerender)
  const [activeUsers, setActiveUsers] = useState<any[]>(() =>
    typeof window !== 'undefined' ? (window as any).__activeUsers || [] : [],
  );""")

edit('src/components/gallery/ClassroomDiscussion.tsx',
     """                        {/* Accessible delete marker button — visible on hover (desktop) or always (mobile) for owner/admin */}
                        {(isMine || user?.role === 'admin') && dbId && (""",
     """                        {/* Accessible delete marker button — visible on hover (desktop) or always (mobile) for owner/admin/super_admin */}
                        {(isMine || user?.role === 'admin' || user?.role === 'super_admin') && dbId && (""")

# ============================================================================
# FIX 14: AdminCmsPage platform-owner helper
# ============================================================================
print('[14] AdminCmsPage platform-owner helper')
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     """import { useAuth } from '@/context/AuthContext';
import { CredentialsView } from '@/components/gallery/pages/CredentialsView';""",
     """import { useAuth } from '@/context/AuthContext';
import { CredentialsView } from '@/components/gallery/pages/CredentialsView';
import { isPlatformOwner } from '@/lib/platform-owner';""")

edit('src/components/gallery/pages/AdminCmsPage.tsx',
     "  const isMainOwner = user?.email?.toLowerCase() === 'mahabubrahmanakash275@gmail.com';",
     "  const isMainOwner = isPlatformOwner(user?.email);")

edit('src/components/gallery/pages/AdminCmsPage.tsx',
     "                  const isRowMainOwner = adm.email?.toLowerCase() === 'mahabubrahmanakash275@gmail.com';",
     "                  const isRowMainOwner = isPlatformOwner(adm.email);")

# ============================================================================
# FIX 15: GeminiKeyModal /api/health strict verify
# ============================================================================
print('[15] GeminiKeyModal strict /api/health verify')
edit('src/components/gallery/GeminiKeyModal.tsx',
     """    setStatus('testing');
    setMsg(language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying Gemini API key...');

    try {
      // Test Gemini API key against health check endpoint
      const res = await fetch('/api/health', {
        headers: { 'x-gemini-api-key': cleanKey }
      });

      if (res.ok) {
        setGeminiApiKey(cleanKey);
        setStatus('success');
        setMsg(language === 'bn' ? 'গুগল জেমিনি এপিআই কি সফলভাবে সংযুক্ত হয়েছে!' : 'Google Gemini API key successfully linked!');
        setTimeout(() => {
          setIsKeyModalOpen(false);
          setStatus('idle');
        }, 1200);
      } else {
        setGeminiApiKey(cleanKey); // save anyway
        setStatus('success');
        setMsg(language === 'bn' ? 'এপিআই কি সংরক্ষিত হয়েছে!' : 'Gemini API key saved!');
        setTimeout(() => {
          setIsKeyModalOpen(false);
          setStatus('idle');
        }, 1200);
      }
    } catch (err) {
      setGeminiApiKey(cleanKey);
      setStatus('success');
      setMsg(language === 'bn' ? 'এপিআই কি সংরক্ষিত হয়েছে!' : 'Gemini API key saved!');
      setTimeout(() => {
        setIsKeyModalOpen(false);
        setStatus('idle');
      }, 1200);
    }
  };""",
     """    setStatus('testing');
    setMsg(language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying Gemini API key...');

    try {
      const res = await fetch('/api/health', {
        headers: { 'x-gemini-api-key': cleanKey },
      });

      if (res.ok) {
        setGeminiApiKey(cleanKey);
        setStatus('success');
        setMsg(language === 'bn' ? 'গুগল জেমিনি এপিআই কি সফলভাবে সংযুক্ত হয়েছে!' : 'Google Gemini API key successfully linked!');
        setTimeout(() => {
          setIsKeyModalOpen(false);
          setStatus('idle');
        }, 1200);
      } else {
        let serverMsg = '';
        try {
          const errData = await res.json();
          serverMsg = errData.error || errData.message || '';
        } catch {
          // response wasn't JSON
        }
        setStatus('error');
        setMsg(
          serverMsg ||
            (language === 'bn'
              ? 'এপিআই কি যাচাই করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'
              : 'Could not verify the Gemini API key. Please try again.'),
        );
      }
    } catch (err) {
      setStatus('error');
      setMsg(
        language === 'bn'
          ? 'নেটওয়ার্ক সমস্যার কারণে কি যাচাই করা যায়নি। সংরক্ষণ করতে আবার চেষ্টা করুন।'
          : 'Network issue prevented key verification. Try saving again.',
      );
    }
  };""")

# ============================================================================
# FIX 16: AuthPage prefill + isGmailAddress note + LandingPage footer Admin Login
# ============================================================================
print('[16] AuthPage prefill + LandingPage footer Admin Login')
edit('src/components/gallery/pages/AuthPage.tsx',
     """interface AuthPageProps {
  onSuccess: () => void;
  onGoBack: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onGoBack }) => {
  const { login, apiFetch } = useAuth();
  const passwordRef = useRef<HTMLInputElement>(null);

  // Custom 2-way Auth Segment Choice: 'student' | 'artist'
  const [authType, setAuthType] = useState<'student' | 'artist'>('student');
  const [isLogin, setIsLogin] = useState(true);

  // Standard Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');""",
     """interface AuthPageProps {
  onSuccess: () => void;
  onGoBack: () => void;
  /**
   * Optional prefill credentials. When provided, the form is seeded with
   * these values on mount — used by the landing-page footer "Admin Login"
   * shortcut so the user can hop straight into the admin account without
   * typing credentials or hunting for the demo-preset card.
   */
  initialEmail?: string;
  initialPassword?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccess,
  onGoBack,
  initialEmail = '',
  initialPassword = '',
}) => {
  const { login, apiFetch } = useAuth();
  const passwordRef = useRef<HTMLInputElement>(null);

  // Custom 2-way Auth Segment Choice: 'student' | 'artist'
  const [authType, setAuthType] = useState<'student' | 'artist'>('student');
  const [isLogin, setIsLogin] = useState(true);

  // Standard Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);""")

edit('src/components/gallery/pages/AuthPage.tsx',
     """  const isGmailAddress = (mail: string): boolean => {
    if (!mail) return false;
    const clean = mail.trim().toLowerCase();
    return clean.endsWith('@gmail.com') || clean.endsWith('@googlemail.com');
  };
""",
     """  const isGmailAddress = (mail: string): boolean => {
    if (!mail) return false;
    const clean = mail.trim().toLowerCase();
    return clean.endsWith('@gmail.com') || clean.endsWith('@googlemail.com');
  };

  // NOTE: This local isGmailAddress helper duplicates the shared
  // implementation in src/lib/gmail-check.ts. Kept inline so the AuthPage
  // component stays self-contained for the client-side validation gates
  // (lines 162-167, 685-709, 1018-1050). The server-side /api/auth/login,
  // /api/auth/register, and /api/auth/google endpoints use the shared
  // helper — both copies must stay in sync.
""")

# LandingPage footer admin login button
edit('src/components/gallery/pages/LandingPage.tsx',
     """import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ArrowRight,
  Layout,
  Activity,
  Calendar,
  CheckCircle2,
  Microscope,
} from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
  isAuthenticated: boolean;
  onGoToDashboard: () => void;
  subjects?: any[];
  folders?: any[];
  announcements?: any[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnter,
  isAuthenticated,
  onGoToDashboard,
  subjects = [],
  folders = [],
  announcements = [],
}) => {""",
     """import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ArrowRight,
  Layout,
  Activity,
  Calendar,
  CheckCircle2,
  Microscope,
  KeyRound,
} from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
  isAuthenticated: boolean;
  onGoToDashboard: () => void;
  /**
   * Optional callback fired when the user clicks the discreet "Admin Login"
   * shortcut in the landing-page footer. When omitted, the footer button is
   * not rendered (keeps the public landing page clean for deployments that
   * don't want to expose the admin entry point).
   */
  onAdminLogin?: () => void;
  subjects?: any[];
  folders?: any[];
  announcements?: any[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnter,
  isAuthenticated,
  onGoToDashboard,
  onAdminLogin,
  subjects = [],
  folders = [],
  announcements = [],
}) => {""")

edit('src/components/gallery/pages/LandingPage.tsx',
     """      {/* Footer */}
      <footer id=\"landing_footer\" className=\"relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-mono uppercase tracking-[0.14em] text-center\">
        <span>© 2026 Bangladesh HSC Science Practical Portal • All Rights Reserved</span>
        <div className=\"flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/5 shadow-sm\">
          <span className=\"w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse\" />
          <span>OFFICIALLY LINKED WITH STUDENT COMMUNITIES</span>
        </div>
      </footer>""",
     """      {/* Footer */}
      <footer id=\"landing_footer\" className=\"relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-mono uppercase tracking-[0.14em] text-center\">
        <span>© 2026 Bangladesh HSC Science Practical Portal • All Rights Reserved</span>
        <div className=\"flex items-center justify-center gap-3 flex-wrap\">
          {onAdminLogin && (
            <button
              type=\"button\"
              onClick={onAdminLogin}
              title=\"Sign in with an administrator or super-admin account\"
              className=\"group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/[0.06] hover:bg-amber-500/[0.12] border border-amber-500/20 hover:border-amber-400/40 text-amber-300 hover:text-amber-200 transition-all duration-200 cursor-pointer min-h-[32px]\"
            >
              <KeyRound className=\"w-3 h-3 shrink-0 group-hover:rotate-12 transition-transform\" />
              <span className=\"font-bold tracking-wider\">Admin Login</span>
            </button>
          )}
          <div className=\"flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/5 shadow-sm\">
            <span className=\"w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse\" />
            <span>OFFICIALLY LINKED WITH STUDENT COMMUNITIES</span>
          </div>
        </div>
      </footer>""")

# page.tsx — wire adminPrefill state + LandingPage onAdminLogin prop
edit('src/app/page.tsx',
     """export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [viewAuth, setViewAuth] = useState(false);

  // Suppress unused-warning for `user` — referenced to keep the hook contract explicit.
  void user;""",
     """export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [viewAuth, setViewAuth] = useState(false);
  // When true, AuthPage mounts with admin credentials pre-filled — used by the
  // landing-page footer "Admin Login" shortcut so admins skip the demo-preset
  // card and go straight to the Sign In button.
  const [adminPrefill, setAdminPrefill] = useState(false);

  // Suppress unused-warning for `user` — referenced to keep the hook contract explicit.
  void user;""")

edit('src/app/page.tsx',
     """  if (viewAuth && !isAuthenticated) {
    return (
      <AuthPage
        onSuccess={() => {
          setViewAuth(false);
        }}
        onGoBack={() => setViewAuth(false)}
      />
    );
  }

  return (
    <LandingPage
      onEnter={() => {
        if (isAuthenticated) {
          // Already authenticated (e.g. silent refresh) — no-op, the outer branch will render PortalConsole.
          return;
        }
        setViewAuth(true);
      }}
      isAuthenticated={isAuthenticated}
      onGoToDashboard={() => {
        // The dashboard requires auth; if the visitor isn't signed in, route them through AuthPage.
        if (isAuthenticated) {
          return;
        }
        setViewAuth(true);
      }}
      subjects={[]}
      folders={[]}
      announcements={[]}
    />
  );
}""",
     """  if (viewAuth && !isAuthenticated) {
    return (
      <AuthPage
        onSuccess={() => {
          setViewAuth(false);
          setAdminPrefill(false);
        }}
        onGoBack={() => {
          setViewAuth(false);
          setAdminPrefill(false);
        }}
        initialEmail={adminPrefill ? 'admin@gallery.com' : ''}
        initialPassword={adminPrefill ? 'admin123' : ''}
      />
    );
  }

  return (
    <LandingPage
      onEnter={() => {
        if (isAuthenticated) {
          // Already authenticated (e.g. silent refresh) — no-op, the outer branch will render PortalConsole.
          return;
        }
        setAdminPrefill(false);
        setViewAuth(true);
      }}
      isAuthenticated={isAuthenticated}
      onGoToDashboard={() => {
        // The dashboard requires auth; if the visitor isn't signed in, route them through AuthPage.
        if (isAuthenticated) {
          return;
        }
        setAdminPrefill(false);
        setViewAuth(true);
      }}
      onAdminLogin={() => {
        // Footer shortcut — open AuthPage with admin credentials pre-filled.
        setAdminPrefill(true);
        setViewAuth(true);
      }}
      subjects={[]}
      folders={[]}
      announcements={[]}
    />
  );
}""")

print()
print('All fixes re-applied. Done.')
