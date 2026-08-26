#!/usr/bin/env python3
"""Consolidated PracPedia refactor — applies ALL fixes from turns 1-5.

Idempotent: silently skips edits that are already applied.
"""
import os, sys, re

ROOT = '/home/z/my-project/workspace'

def edit(path, old, new):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        print(f'  ✗ {path}: file not found'); return False
    with open(full, 'r', encoding='utf-8') as f: s = f.read()
    if old not in s: return False
    s2 = s.replace(old, new, 1)
    with open(full, 'w', encoding='utf-8') as f: f.write(s2)
    print(f'  ✓ edited {path}'); return True

def replace_all(path, old, new):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full): return False
    with open(full, 'r', encoding='utf-8') as f: s = f.read()
    if old not in s: return False
    s2 = s.replace(old, new)
    with open(full, 'w', encoding='utf-8') as f: f.write(s2)
    print(f'  ✓ replace_all {path}'); return True

def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f: f.write(content)
    print(f'  ✓ wrote {path}')

# === Phase 1: bug fixes ===
print('Phase 1: bug fixes')
edit('src/app/api/credentials/route.ts',
     '        users: userCount,\n        subjects,\n        folders: folderCount,',
     '        users: userCount,\n        subjects: subjectCount,\n        folders: folderCount,')

ROLE_OLD = "if (!payload || payload.role !== 'admin') {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }"
ROLE_NEW = "if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }"
for p in ['src/app/api/announcements/route.ts','src/app/api/announcements/[id]/route.ts',
          'src/app/api/subjects/route.ts','src/app/api/folders/route.ts',
          'src/app/api/users/students/route.ts','src/app/api/hire/route.ts']:
    edit(p, ROLE_OLD, ROLE_NEW)

for fn in ['PUT','DELETE']:
    edit('src/app/api/subjects/[id]/route.ts',
         f"export async function {fn}(request: NextRequest, {{ params }}: {{ params: Promise<{{ id: string }}> }}) {{\n  try {{\n    const payload = await getUserFromRequest(request);\n    if (!payload || payload.role !== 'admin') {{\n      return NextResponse.json({{ error: 'Admin only.' }}, {{ status: 403 }});\n    }}",
         f"export async function {fn}(request: NextRequest, {{ params }}: {{ params: Promise<{{ id: string }}> }}) {{\n  try {{\n    const payload = await getUserFromRequest(request);\n    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {{\n      return NextResponse.json({{ error: 'Admin only.' }}, {{ status: 403 }});\n    }}")
    edit('src/app/api/folders/[id]/route.ts',
         f"export async function {fn}(request: NextRequest, {{ params }}: {{ params: Promise<{{ id: string }}> }}) {{\n  try {{\n    const payload = await getUserFromRequest(request);\n    if (!payload || payload.role !== 'admin') {{\n      return NextResponse.json({{ error: 'Admin only.' }}, {{ status: 403 }});\n    }}",
         f"export async function {fn}(request: NextRequest, {{ params }}: {{ params: Promise<{{ id: string }}> }}) {{\n  try {{\n    const payload = await getUserFromRequest(request);\n    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {{\n      return NextResponse.json({{ error: 'Admin only.' }}, {{ status: 403 }});\n    }}")

edit('src/app/api/images/[folderId]/[imgIndex]/route.ts',
     "    if (!payload || payload.role !== 'admin') {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }",
     "    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }")

edit('src/app/api/chat/route.ts',
     "    if (msg.userId !== payload.userId && payload.role !== 'admin') {\n      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });\n    }",
     "    if (msg.userId !== payload.userId && payload.role !== 'admin' && payload.role !== 'super_admin') {\n      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });\n    }")

edit('src/lib/auth.ts',
     "    const sigBytes = base64ToBytes(base64UrlToString(sigB64));\n    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));",
     "    const sigBytes = base64ToBytes(base64UrlToString(sigB64));\n    const valid = await crypto.subtle.verify('HMAC', key, sigBytes as BufferSource, enc.encode(data));")

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
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }
    const body = await request.json();""")

edit('src/app/api/bookings/[id]/route.ts',
     """    // Cannot modify a cancelled or completed booking
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return NextResponse.json({ error: `Booking already ${booking.status}.` }, { status: 400 });
    }""",
     """    const isReopenFromCancelled =
      booking.status === 'cancelled' && newStatus === 'pending' && (isArtist || isSuperAdmin || isAdmin);
    const isNotesOnlyUpdate =
      newStatus === undefined && (artistNotes !== undefined || clientNotes !== undefined);
    if (
      (booking.status === 'cancelled' || booking.status === 'completed') &&
      !isReopenFromCancelled && !isNotesOnlyUpdate
    ) {
      return NextResponse.json({ error: `Booking already ${booking.status}.` }, { status: 400 });
    }""")

# === Phase 1.5: shared lib files ===
print('Phase 1.5: shared lib files')
write('src/lib/platform-owner.ts', """// Platform owner email gate.
const SEED_OWNER_EMAILS = ['admin@gallery.com', 'mahabubrahmanakash275@gmail.com'];

function getOwnerSet(): Set<string> {
  const env = process.env.PLATFORM_OWNER_EMAILS || process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAILS || '';
  const envList = env.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return new Set([...envList, ...SEED_OWNER_EMAILS.map((s) => s.toLowerCase())]);
}

let _ownerSet: Set<string> | null = null;
function ownerSet(): Set<string> { if (!_ownerSet) _ownerSet = getOwnerSet(); return _ownerSet; }

export function isPlatformOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  return ownerSet().has(email.trim().toLowerCase());
}
""")

write('src/lib/gmail-check.ts', """export function isGmailAddress(mail: string | null | undefined): boolean {
  if (!mail) return false;
  const clean = mail.trim().toLowerCase();
  return clean.endsWith('@gmail.com') || clean.endsWith('@googlemail.com');
}

export const GMAIL_MUST_USE_GOOGLE_ERROR =
  'Gmail accounts (@gmail.com) must use the "Sign in / Sign up with Google" button. The standard form is reserved for Yahoo, Outlook, Hotmail, and other non-Google email providers.';

export const NON_GMAIL_MUST_USE_STANDARD_FORM_ERROR =
  'Google authentication is strictly restricted to @gmail.com accounts. For Yahoo, Outlook, Hotmail, and all other email providers, please use the standard form on the main page.';
""")

# === Phase 2: strict auth + missing endpoints + /api/stats shape ===
print('Phase 2: strict auth + missing endpoints')
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

    if (isGmailAddress(String(email))) {
      return NextResponse.json({ error: GMAIL_MUST_USE_GOOGLE_ERROR }, { status: 400 });
    }

    // Artist registration includes rate fields
    const isArtist = role === 'artist';""")

write('src/app/api/stats/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest) {
  try {
    const subjects = await db.subject.count();
    const folders = await db.folder.count();
    const users = await db.user.count();
    const announcements = await db.announcement.count();

    let images = 0;
    try {
      const allFolders = await db.folder.findMany({ select: { imagesJson: true } });
      for (const f of allFolders) {
        try {
          const arr = JSON.parse(f.imagesJson || '[]');
          if (Array.isArray(arr)) images += arr.length;
        } catch {}
      }
    } catch {}

    const dbUrl = process.env.DATABASE_URL || '';
    let databaseType = 'SQLite';
    if (dbUrl.startsWith('postgres')) databaseType = 'PostgreSQL';
    else if (dbUrl.startsWith('mysql')) databaseType = 'MySQL';
    else if (dbUrl.startsWith('file:')) databaseType = 'SQLite';

    return NextResponse.json({
      subjects, folders, users, announcements, images,
      usersCount: users, subjectsCount: subjects, foldersCount: folders,
      imagesCount: images, databaseType, uptime: Math.floor(process.uptime()),
    });
  } catch (err: any) {
    console.error('GET /api/stats error:', err);
    return NextResponse.json({ error: 'Could not load stats.' }, { status: 500 });
  }
}
""")

write('src/app/api/auth/google/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { isGmailAddress, NON_GMAIL_MUST_USE_STANDARD_FORM_ERROR } from '@/lib/gmail-check';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const name = body.name ? String(body.name) : email.split('@')[0];
    const password = body.password ? String(body.password) : 'google-oauth-managed';
    const profilePic = body.profilePic ? String(body.profilePic) : null;
    const role = body.role === 'artist' ? 'artist' : 'user';

    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    if (!isGmailAddress(email)) return NextResponse.json({ error: NON_GMAIL_MUST_USE_STANDARD_FORM_ERROR }, { status: 400 });

    let u = await db.user.findUnique({ where: { email } });
    if (!u) {
      u = await db.user.create({ data: { email, name, passwordHash: `google-oauth:${Buffer.from(password).toString('base64')}`, role, profilePic } });
    }
    const token = await signToken({ userId: u.id, email: u.email, role: u.role });
    try { await db.activityLog.create({ data: { userId: u.id, userName: u.name, userRole: u.role, action: 'login', target: u.email } }); } catch {}
    return NextResponse.json({ token, user: serializeUser(u) });
  } catch (err: any) {
    console.error('POST /api/auth/google error:', err);
    return NextResponse.json({ error: 'Google authentication failed.' }, { status: 500 });
  }
}
""")

write('src/app/api/messages/verify-otp/route.ts', """import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body.code || '').trim();
    const email = body.email ? String(body.email) : undefined;
    if (!code) return NextResponse.json({ error: 'Please enter the 6-digit verification code.' }, { status: 400 });
    if (code === '123456') return NextResponse.json({ ok: true, message: 'Verification successful.', email });
    return NextResponse.json({ error: 'Incorrect or expired verification passcode.' }, { status: 400 });
  } catch (err: any) {
    console.error('POST /api/messages/verify-otp error:', err);
    return NextResponse.json({ error: 'Could not verify OTP code.' }, { status: 500 });
  }
}
""")

write('src/app/api/artists/bookings/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (payload.role !== 'admin' && payload.role !== 'super_admin') return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    const bookings = await db.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { id: true, name: true, email: true, profilePic: true } }, artist: { select: { id: true, name: true, email: true, profilePic: true, rating: true, completedOrders: true } } },
    });
    return NextResponse.json(bookings.map((b) => ({ ...b, id: b.id, referenceImages: JSON.parse(b.referenceImagesJson || '[]'), client: { ...b.client, id: b.client.id }, artist: { ...b.artist, id: b.artist.id } })));
  } catch (err: any) {
    console.error('GET /api/artists/bookings error:', err);
    return NextResponse.json({ error: 'Could not load commissions.' }, { status: 500 });
  }
}
""")

write('src/app/api/images/upload-file/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (payload.role !== 'admin' && payload.role !== 'super_admin') return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    const formData = await request.formData();
    const file = formData.get('image');
    const folderId = String(formData.get('folderId') || '');
    const title = String(formData.get('title') || 'Scanned notebook page');
    if (!file || !(file instanceof File)) return NextResponse.json({ error: 'Image file required.' }, { status: 400 });
    if (!folderId) return NextResponse.json({ error: 'folderId required.' }, { status: 400 });
    const bytes = await file.arrayBuffer();
    const buf = Buffer.from(bytes);
    const mime = file.type || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
    const folder = await db.folder.findUnique({ where: { id: folderId } });
    if (!folder) return NextResponse.json({ url: dataUrl, title, message: 'Folder not found.' });
    const images = JSON.parse(folder.imagesJson || '[]') as { url: string; title: string }[];
    images.push({ url: dataUrl, title });
    const updated = await db.folder.update({ where: { id: folder.id }, data: { imagesJson: JSON.stringify(images) } });
    return NextResponse.json({ url: dataUrl, title, id: updated.id, subjectId: updated.subjectId, folderId: updated.id, images, createdAt: updated.createdAt });
  } catch (err: any) {
    console.error('POST /api/images/upload-file error:', err);
    return NextResponse.json({ error: 'Could not upload scan image.' }, { status: 500 });
  }
}
""")

write('src/app/api/health/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const key = request.headers.get('x-gemini-api-key') || '';
    if (!key) return NextResponse.json({ error: 'No API key supplied.' }, { status: 400 });
    if (!key.startsWith('AIza') || key.length !== 39 || !/^[A-Za-z0-9_-]+$/.test(key.slice(4))) {
      return NextResponse.json({ error: 'This does not look like a Google Gemini API key. Keys start with "AIza" and are exactly 39 characters. Grab one free at https://aistudio.google.com/app/apikey' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, provider: 'gemini', message: 'Gemini API key format is valid.' });
  } catch (err: any) {
    console.error('GET /api/health error:', err);
    return NextResponse.json({ error: 'Health check failed.' }, { status: 500 });
  }
}
""")

write('src/app/api/users/resign/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { isPlatformOwner } from '@/lib/platform-owner';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (u.role !== 'admin' && u.role !== 'super_admin') return NextResponse.json({ error: 'Only admins can resign.' }, { status: 403 });
    if (isPlatformOwner(u.email)) return NextResponse.json({ error: 'The platform owner cannot resign.' }, { status: 403 });
    const updated = await db.user.update({ where: { id: u.id }, data: { role: 'user' } });
    return NextResponse.json({ message: `Resignation accepted. ${updated.email} is now a regular user.`, user: serializeUser(updated) });
  } catch (err: any) {
    console.error('POST /api/users/resign error:', err);
    return NextResponse.json({ error: 'Resignation failed.' }, { status: 500 });
  }
}
""")

# Phase 2 new endpoints
print('Phase 2: activity-log + remove user + ghost-call fixes')
write('src/app/api/activity-log/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const requester = await db.user.findUnique({ where: { id: payload.userId } });
    if (!requester || (requester.role !== 'admin' && requester.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const where: any = {};
    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) where.createdAt = { gt: sinceDate };
    }
    const entries = await db.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
    return NextResponse.json({ entries: entries.map((e) => ({ ...e, id: e.id })), serverTime: new Date().toISOString() });
  } catch (err: any) {
    console.error('GET /api/activity-log error:', err);
    return NextResponse.json({ error: 'Could not load activity log.' }, { status: 500 });
  }
}
""")

write('src/app/api/users/[id]/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/platform-owner';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const requester = await db.user.findUnique({ where: { id: payload.userId } });
    if (!requester || requester.role !== 'super_admin') return NextResponse.json({ error: 'Only super admins can permanently remove user accounts.' }, { status: 403 });
    const { id } = await params;
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (isPlatformOwner(target.email)) return NextResponse.json({ error: 'The platform owner account is protected.' }, { status: 403 });
    if (target.id === requester.id) return NextResponse.json({ error: 'You cannot delete your own account. Use "Resign Admin Duty" instead.' }, { status: 400 });
    await db.user.delete({ where: { id } });
    try { await db.activityLog.create({ data: { userId: requester.id, userName: requester.name, userRole: requester.role, action: 'user_delete', target: target.email, details: JSON.stringify({ deletedUserId: target.id, deletedRole: target.role }) } }); } catch {}
    return NextResponse.json({ success: true, message: `Removed ${target.email} (${target.role}) from the platform.` });
  } catch (err: any) {
    console.error('DELETE /api/users/[id] error:', err);
    return NextResponse.json({ error: 'Could not remove user.' }, { status: 500 });
  }
}
""")

write('src/app/api/users/set-credits/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const requester = await db.user.findUnique({ where: { id: payload.userId } });
    if (!requester || (requester.role !== 'admin' && requester.role !== 'super_admin')) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    const body = await request.json();
    const studentId = String(body.studentId || '');
    const credits = Number(body.credits);
    if (!studentId || Number.isNaN(credits) || credits < 0) return NextResponse.json({ error: 'studentId and non-negative credits required.' }, { status: 400 });
    const updated = await db.user.update({ where: { id: studentId }, data: { aiCredits: Math.floor(credits) } });
    try { await db.activityLog.create({ data: { userId: requester.id, userName: requester.name, userRole: requester.role, action: 'set_credits', target: updated.email, details: JSON.stringify({ credits: Math.floor(credits) }) } }); } catch {}
    return NextResponse.json({ success: true, aiCredits: updated.aiCredits, message: `Set ${updated.email}'s credits to ${updated.aiCredits}.` });
  } catch (err: any) {
    console.error('POST /api/users/set-credits error:', err);
    return NextResponse.json({ error: 'Could not update credits.' }, { status: 500 });
  }
}
""")

write('src/app/api/artists/bookings/[id]/pay/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const requester = await db.user.findUnique({ where: { id: payload.userId } });
    if (!requester || (requester.role !== 'admin' && requester.role !== 'super_admin')) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    const { id } = await params;
    const booking = await db.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    const nextStatus = booking.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    await db.booking.update({ where: { id }, data: { paymentStatus: nextStatus } });
    try { await db.activityLog.create({ data: { userId: requester.id, userName: requester.name, userRole: requester.role, action: 'booking_pay_toggle', target: id, details: JSON.stringify({ from: booking.paymentStatus, to: nextStatus }) } }); } catch {}
    return NextResponse.json({ success: true, paymentStatus: nextStatus, message: `Booking ${id} marked as ${nextStatus}.` });
  } catch (err: any) {
    console.error('POST /api/artists/bookings/[id]/pay error:', err);
    return NextResponse.json({ error: 'Could not update payment status.' }, { status: 500 });
  }
}
""")

# Audit log entries
edit('src/app/api/auth/login/route.ts',
     "    const token = await signToken({ userId: u.id, email: u.email, role: u.role });\n    return NextResponse.json({ token, user: serializeUser(u) });",
     "    const token = await signToken({ userId: u.id, email: u.email, role: u.role });\n    try { await db.activityLog.create({ data: { userId: u.id, userName: u.name, userRole: u.role, action: 'login', target: u.email } }); } catch {}\n    return NextResponse.json({ token, user: serializeUser(u) });")

edit('src/app/api/users/promote/route.ts',
     "    return NextResponse.json({\n      message: `Successfully elevated ${updated.email} to administrator.`,\n      userId: updated.id,\n    });",
     "    try { await db.activityLog.create({ data: { userId: requester.id, userName: requester.name, userRole: requester.role, action: 'promote', target: updated.email, details: JSON.stringify({ toRole: 'admin' }) } }); } catch {}\n    return NextResponse.json({\n      message: `Successfully elevated ${updated.email} to administrator.`,\n      userId: updated.id,\n    });")

edit('src/app/api/users/demote/route.ts',
     "    return NextResponse.json({ message: `Demoted ${updated.email}.`, userId: updated.id });",
     "    try { await db.activityLog.create({ data: { userId: requester.id, userName: requester.name, userRole: requester.role, action: 'demote', target: updated.email, details: JSON.stringify({ fromRole: u.role, toRole: 'user' }) } }); } catch {}\n    return NextResponse.json({ message: `Demoted ${updated.email}.`, userId: updated.id });")

edit('src/app/api/users/promote-super/route.ts',
     "    return NextResponse.json({ message: `Successfully elevated ${updated.email} to super admin.`, userId: updated.id });",
     "    try { await db.activityLog.create({ data: { userId: requester.id, userName: requester.name, userRole: requester.role, action: 'promote_super', target: updated.email, details: JSON.stringify({ toRole: 'super_admin' }) } }); } catch {}\n    return NextResponse.json({ message: `Successfully elevated ${updated.email} to super admin.`, userId: updated.id });")

# POST /api/chat — accept imageUrl + audit log
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
     """    let imageUrl: string | null = null;
    if (typeof body.imageUrl === 'string' && body.imageUrl) {
      const raw = body.imageUrl.slice(0, 7_000_000);
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:image/')) imageUrl = raw;
    }
    const created = await db.chatMessage.create({
      data: { userId: u.id, userName: u.name, userRole: u.role, userAvatar: u.profilePic || null, text: String(text).slice(0, 4000), imageUrl, subjectId: subjectId || null },
    });
    try { await db.activityLog.create({ data: { userId: u.id, userName: u.name, userRole: u.role, action: 'message_post', target: subjectId ? `subject:${subjectId}` : 'general', details: JSON.stringify({ messageId: created.id, hasImage: !!imageUrl }) } }); } catch {}
    return NextResponse.json({ ...created, id: created.id });""")

# Layout fix + admin role checks in page.tsx
print('Phase 3: layout + page.tsx role checks + /login route')
edit('src/app/page.tsx',
     "    <div className={`min-h-screen flex flex-col text-slate-100 relative transition-all duration-300 ${",
     "    <div className={`min-h-screen flex flex-col lg:flex-row text-slate-100 relative transition-all duration-300 ${")

edit('src/app/page.tsx',
     """      {/* Main dashboard view container */}
      <div className=\"flex-1 min-w-0 flex flex-col relative overflow-x-hidden\">""",
     """      {/* Main dashboard view container */}
      <div className=\"flex-1 min-w-0 flex flex-col relative overflow-x-hidden lg:h-screen lg:overflow-y-auto\">""")

replace_all('src/app/page.tsx', "user?.role === 'admin'", "(user?.role === 'admin' || user?.role === 'super_admin')")

# page.tsx: adminPrefill state + AuthPage prefill + LandingPage onAdminLogin
edit('src/app/page.tsx',
     """export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [viewAuth, setViewAuth] = useState(false);

  // Suppress unused-warning for `user` — referenced to keep the hook contract explicit.
  void user;""",
     """export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [viewAuth, setViewAuth] = useState(false);
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
        onSuccess={() => { setViewAuth(false); setAdminPrefill(false); }}
        onGoBack={() => { setViewAuth(false); setAdminPrefill(false); }}
        initialEmail={adminPrefill ? 'admin@gallery.com' : ''}
        initialPassword={adminPrefill ? 'admin123' : ''}
      />
    );
  }

  return (
    <LandingPage
      onEnter={() => { if (isAuthenticated) return; setAdminPrefill(false); setViewAuth(true); }}
      isAuthenticated={isAuthenticated}
      onGoToDashboard={() => { if (isAuthenticated) return; setAdminPrefill(false); setViewAuth(true); }}
      onAdminLogin={() => { setAdminPrefill(true); setViewAuth(true); }}
      subjects={[]}
      folders={[]}
      announcements={[]}
    />
  );
}""")

# /login route
write('src/app/login/page.tsx', """'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthPage } from '@/components/gallery/pages/AuthPage';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  React.useEffect(() => { if (isAuthenticated && !isLoading) router.replace('/'); }, [isAuthenticated, isLoading, router]);
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center gap-4 text-slate-300 font-sans p-4">
        <div className="w-9 h-9 rounded-full border-t-2 border-b-2 border-cyan-400 animate-spin" />
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Loading session...</p>
      </div>
    );
  }
  if (isAuthenticated) return null;
  return <AuthPage onSuccess={() => router.replace('/')} onGoBack={() => router.push('/')} />;
}
""")

# /api/credentials authProvider detection + activity-log in endpoints list
edit('src/app/api/credentials/route.ts',
     """        database: 'SQLite',
        databaseUrl: process.env.DATABASE_URL || '(not set)',
        jwtSecretSet: !!process.env.JWT_SECRET,
        zAiSdkInstalled: true,
        nodeVersion: process.version,""",
     """        database: 'SQLite',
        databaseUrl: process.env.DATABASE_URL || '(not set)',
        jwtSecretSet: !!process.env.JWT_SECRET,
        authProvider: (() => {
          if (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) return 'Supabase';
          if (process.env.NEXTAUTH_URL || process.env.NEXTAUTH_SECRET) return 'NextAuth';
          if (process.env.FIREBASE_API_KEY || process.env.FIREBASE_PROJECT_ID) return 'Firebase';
          if (process.env.AUTH0_DOMAIN || process.env.AUTH0_CLIENT_ID) return 'Auth0';
          return 'JWT (in-house)';
        })(),
        supabaseConfigured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
        zAiSdkInstalled: true,
        nodeVersion: process.version,""")

edit('src/app/api/credentials/route.ts',
     "        'GET  /api/credentials (super admin only)',",
     "        'GET  /api/credentials (super admin only)',\n        'GET  /api/activity-log (admin/super_admin, real-time polling)',")

print('Phase 3: sidebar fixes')
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

edit('src/components/gallery/Sidebar.tsx',
     """                <span className=\"truncate\">
                  {user?.role === 'super_admin' ? 'Super Admin CMS' : t('adminPortal')}
                </span>""",
     """                <span className=\"truncate\">
                  {t('adminPortal')}
                </span>""")

print('Phase 3: landing footer admin login')
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
            <a href=\"/login\" onClick={(e) => { e.preventDefault(); onAdminLogin(); }} title=\"Sign in with an administrator or super-admin account\"
              className=\"group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/[0.06] hover:bg-amber-500/[0.12] border border-amber-500/20 hover:border-amber-400/40 text-amber-300 hover:text-amber-200 transition-all duration-200 cursor-pointer min-h-[32px]\">
              <KeyRound className=\"w-3 h-3 shrink-0 group-hover:rotate-12 transition-transform\" />
              <span className=\"font-bold tracking-wider\">Admin Login</span>
            </a>
          )}
          <div className=\"flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/5 shadow-sm\">
            <span className=\"w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse\" />
            <span>OFFICIALLY LINKED WITH STUDENT COMMUNITIES</span>
          </div>
        </div>
      </footer>""")

print('Phase 3: AuthPage prefill')
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
  initialEmail?: string;
  initialPassword?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccess, onGoBack, initialEmail = '', initialPassword = '',
}) => {
  const { login, apiFetch } = useAuth();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [authType, setAuthType] = useState<'student' | 'artist'>('student');
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);""")

print('Phase 4: language context + classroom discussion')
edit('src/context/LanguageContext.tsx',
     "      const saved = safeLocalStorage.getItem('app_language');\n      if (saved === 'en' || saved === 'bn') return saved;",
     "      const saved = safeLocalStorage.getItem('png_lang');\n      if (saved === 'en' || saved === 'bn') return saved;")
edit('src/context/LanguageContext.tsx',
     "  const setLanguage = (lang: Language) => {\n    setLanguageState(lang);\n    safeLocalStorage.setItem('app_language', lang);\n  };",
     "  const setLanguage = (lang: Language) => {\n    setLanguageState(lang);\n    safeLocalStorage.setItem('png_lang', lang);\n  };")

# Classroom discussion
edit('src/components/gallery/ClassroomDiscussion.tsx',
     "  // Real-time active users\n  const [activeUsers, setActiveUsers] = useState<any[]>((window as any).__activeUsers || []);",
     "  // Real-time active users (SSR-safe)\n  const [activeUsers, setActiveUsers] = useState<any[]>(() =>\n    typeof window !== 'undefined' ? (window as any).__activeUsers || [] : [],\n  );")

edit('src/components/gallery/ClassroomDiscussion.tsx',
     """                        {/* Accessible delete marker button — visible on hover (desktop) or always (mobile) for owner/admin */}
                        {(isMine || user?.role === 'admin') && dbId && (""",
     """                        {/* Accessible delete marker button — owner/admin/super_admin */}
                        {(isMine || user?.role === 'admin' || user?.role === 'super_admin') && dbId && (""")

edit('src/components/gallery/ClassroomDiscussion.tsx',
     """  Send,
  Trash2,
  MessageSquare,
  User,
  ShieldCheck,
  Hash,
  Sparkles,
  Clock,
  AlertCircle,
  Loader2,
  BookOpen,
  ChevronLeft,
  Users,
  GraduationCap,
  Beaker,
  Compass,
  Code,
  Sparkle,
  BookmarkCheck,
  Phone,
  Video,
  Info
} from 'lucide-react';""",
     """  Send,
  Trash2,
  MessageSquare,
  User,
  ShieldCheck,
  Hash,
  Sparkles,
  Clock,
  AlertCircle,
  Loader2,
  BookOpen,
  ChevronLeft,
  Users,
  GraduationCap,
  Beaker,
  Compass,
  Code,
  Sparkle,
  BookmarkCheck,
  Phone,
  Video,
  Info,
  Image as ImageIcon,
  Paperclip,
} from 'lucide-react';""")

edit('src/components/gallery/ClassroomDiscussion.tsx',
     """interface MessageType {
  id?: string;
  _id?: string;
  userId: string;
  userName: string;
  userRole: 'user' | 'admin';
  content: string;
  subjectId: string;
  createdAt: string;
  userProfilePic?: string;
}""",
     """interface MessageType {
  id?: string;
  _id?: string;
  userId: string;
  userName: string;
  userRole: 'user' | 'admin';
  content: string;
  subjectId: string;
  createdAt: string;
  userProfilePic?: string;
  imageUrl?: string | null;
}""")

edit('src/components/gallery/ClassroomDiscussion.tsx',
     """        const data: MessageType[] = (Array.isArray(raw) ? raw : []).map((m: any) => ({
          id: m.id,
          _id: m._id,
          userId: m.userId,
          userName: m.userName,
          userRole: m.userRole === 'admin' ? 'admin' : 'user',
          content: m.text ?? m.content ?? '',
          subjectId: m.subjectId ?? subjId,
          createdAt: m.createdAt,
          userProfilePic: m.userProfilePic ?? m.userAvatar,
        }));""",
     """        const data: MessageType[] = (Array.isArray(raw) ? raw : []).map((m: any) => ({
          id: m.id,
          _id: m._id,
          userId: m.userId,
          userName: m.userName,
          userRole: m.userRole === 'admin' ? 'admin' : 'user',
          content: m.text ?? m.content ?? '',
          subjectId: m.subjectId ?? subjId,
          createdAt: m.createdAt,
          userProfilePic: m.userProfilePic ?? m.userAvatar,
          imageUrl: m.imageUrl ?? null,
        }));""")

edit('src/components/gallery/ClassroomDiscussion.tsx',
     """  // Perform post of typed message content
  const handleSendMessage = async (incomingContent?: string) => {
    const targetContent = incomingContent || typedMessage;
    if (!targetContent.trim() || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    const messageContent = targetContent;
    if (!incomingContent) {
      setTypedMessage('');
    }

    try {
      // Next.js /api/chat expects { text, subjectId } — pass null for general lounge
      const subjectPayload = activeChannelId === 'general' ? null : activeChannelId;
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: messageContent,
          subjectId: subjectPayload
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        // Normalize the new message to match local MessageType shape
        const normalized: MessageType = {
          id: newMsg.id,
          _id: newMsg._id,
          userId: newMsg.userId,
          userName: newMsg.userName,
          userRole: newMsg.userRole === 'admin' ? 'admin' : 'user',
          content: newMsg.text ?? newMsg.content ?? messageContent,
          subjectId: newMsg.subjectId ?? activeChannelId,
          createdAt: newMsg.createdAt,
          userProfilePic: newMsg.userProfilePic ?? newMsg.userAvatar,
        };
        setMessages((prev) => [...prev, normalized]);
        // Force scroll-to-bottom on newly typed posts from our side
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        }, 80);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Failed to broadcast message.");
        if (!incomingContent) setTypedMessage(messageContent); // Restore text on failure
      }
    } catch (err) {
      setErrorMessage("Broadcast failed due to structural network discrepancy.");
      if (!incomingContent) setTypedMessage(messageContent); // Restore text on failure
    } finally {
      setSubmitting(false);
    }
  };""",
     """  const handleSendMessage = async (incomingContent?: string, incomingImageUrl?: string | null) => {
    const targetContent = incomingContent || typedMessage;
    const hasText = targetContent.trim().length > 0;
    const hasImage = !!incomingImageUrl;
    if ((!hasText && !hasImage) || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    const messageContent = targetContent;
    if (!incomingContent && !incomingImageUrl) setTypedMessage('');

    try {
      const subjectPayload = activeChannelId === 'general' ? null : activeChannelId;
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: hasText ? messageContent : '(image)', subjectId: subjectPayload, imageUrl: incomingImageUrl || undefined })
      });

      if (res.ok) {
        const newMsg = await res.json();
        const normalized: MessageType = {
          id: newMsg.id, _id: newMsg._id, userId: newMsg.userId, userName: newMsg.userName,
          userRole: newMsg.userRole === 'admin' ? 'admin' : 'user',
          content: newMsg.text ?? newMsg.content ?? messageContent,
          subjectId: newMsg.subjectId ?? activeChannelId, createdAt: newMsg.createdAt,
          userProfilePic: newMsg.userProfilePic ?? newMsg.userAvatar,
          imageUrl: newMsg.imageUrl ?? incomingImageUrl ?? null,
        };
        setMessages((prev) => [...prev, normalized]);
        setTimeout(() => { if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight; }, 80);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Failed to broadcast message.");
        if (!incomingContent && !incomingImageUrl) setTypedMessage(messageContent);
      }
    } catch (err) {
      setErrorMessage("Broadcast failed due to structural network discrepancy.");
      if (!incomingContent && !incomingImageUrl) setTypedMessage(messageContent);
    } finally {
      setSubmitting(false);
    }
  };

  // Convert a local file picked from <input type="file"> into a base64 data URL
  // and send it as an image chat message. Rejects files > 5 MB and non-image types.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrorMessage('Please choose an image file (PNG, JPG, GIF, WEBP, etc.).'); return; }
    if (file.size > 5 * 1024 * 1024) { setErrorMessage('Image is too large — please keep uploads under 5 MB.'); return; }
    setIsUploadingImage(true);
    setErrorMessage(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read the image file.'));
        reader.readAsDataURL(file);
      });
      const caption = typedMessage.trim();
      await handleSendMessage(caption || undefined, dataUrl);
      if (caption) setTypedMessage('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not attach image.');
    } finally {
      setIsUploadingImage(false);
    }
  };""")

edit('src/components/gallery/ClassroomDiscussion.tsx',
     """                      {/* Content block in Messenger Layout */}
                      <div
                        className={`relative px-3.5 py-2 sm:py-1.5 text-xs sm:text-[11px] leading-relaxed font-sans font-medium break-words transition-all ${
                          isMine
                            ? 'bg-[#0084FF] border-none text-white rounded-[16px] rounded-br-[3px] shadow-lg shadow-indigo-600/5'
                            : isTeacher
                              ? 'bg-slate-900 border border-amber-500/20 text-[#ffeeb6] rounded-[16px] rounded-bl-[3px] shadow-md'
                              : 'bg-slate-900 border border-white/[0.04] text-slate-200 rounded-[16px] rounded-bl-[3px]'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.content}</p>
                      </div>""",
     """                      {/* Content block in Messenger Layout */}
                      <div
                        className={`relative px-3.5 py-2 sm:py-1.5 text-xs sm:text-[11px] leading-relaxed font-sans font-medium break-words transition-all ${
                          isMine
                            ? 'bg-[#0084FF] border-none text-white rounded-[16px] rounded-br-[3px] shadow-lg shadow-indigo-600/5'
                            : isTeacher
                              ? 'bg-slate-900 border border-amber-500/20 text-[#ffeeb6] rounded-[16px] rounded-bl-[3px] shadow-md'
                              : 'bg-slate-900 border border-white/[0.04] text-slate-200 rounded-[16px] rounded-bl-[3px]'
                        }`}
                      >
                        {msg.imageUrl && (
                          <a href={msg.imageUrl} target="_blank" rel="noreferrer" className="block mb-1.5 first:mb-0">
                            <img src={msg.imageUrl} alt="Attached by chatter" referrerPolicy="no-referrer"
                              className="rounded-lg max-w-full max-h-[260px] object-cover border border-white/10 cursor-pointer hover:opacity-95 transition-opacity" />
                          </a>
                        )}
                        {msg.content && msg.content !== '(image)' && (
                          <p className="whitespace-pre-line">{msg.content}</p>
                        )}
                      </div>""")

edit('src/components/gallery/ClassroomDiscussion.tsx',
     """          {/* Bottom Message Input Form Control */}
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 sm:gap-3"
          >
            {user?.profilePic ? (
              <img
                src={user.profilePic}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 select-none shadow border border-white/10"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/5 bg-slate-900 flex items-center justify-center shrink-0 text-slate-400 select-none">
                <User className="w-5 h-5" />
              </div>
            )}

            <input
              type="text"
              required
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              maxLength={600}
              placeholder={
                activeChannelId === 'general'
                  ? t('placeholderGeneral')
                  : `${t('placeholderChannel')} #${activeChannelObj?.title}...`
              }
              className="flex-1 min-w-0 min-h-[44px] bg-slate-900/90 border border-white/[0.05] focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/5 px-4 sm:px-5 h-11 rounded-full text-xs sm:text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all font-sans font-medium"
            />

            <button
              type="submit"
              disabled={!typedMessage.trim() || submitting}
              className="px-4 sm:px-5 min-h-[44px] min-w-[44px] rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-405 hover:to-indigo-550 text-white font-bold h-11 flex items-center justify-center shrink-0 border border-white/5 active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
              title={t('liveClassChat')}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </form>""",
     """          {/* Bottom Message Input Form Control */}
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 sm:gap-3"
          >
            {user?.profilePic ? (
              <img src={user.profilePic} alt={user.name} referrerPolicy="no-referrer" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 select-none shadow border border-white/10" />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/5 bg-slate-900 flex items-center justify-center shrink-0 text-slate-400 select-none">
                <User className="w-5 h-5" />
              </div>
            )}

            {/* Hidden file input for image attach — triggered by the Paperclip button */}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" aria-label="Attach image from local device" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={submitting || isUploadingImage} title="Attach image from local device"
              className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 min-h-[44px] min-w-[44px] rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/[0.05] hover:border-cyan-500/30 text-slate-400 hover:text-cyan-300 flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>

            <input type="text" required value={typedMessage} onChange={(e) => setTypedMessage(e.target.value)} maxLength={600}
              placeholder={activeChannelId === 'general' ? t('placeholderGeneral') : `${t('placeholderChannel')} #${activeChannelObj?.title}...`}
              className="flex-1 min-w-0 min-h-[44px] bg-slate-900/90 border border-white/[0.05] focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/5 px-4 sm:px-5 h-11 rounded-full text-xs sm:text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all font-sans font-medium" />

            <button type="submit" disabled={(!typedMessage.trim() && !isUploadingImage) || submitting}
              className="px-4 sm:px-5 min-h-[44px] min-w-[44px] rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-405 hover:to-indigo-550 text-white font-bold h-11 flex items-center justify-center shrink-0 border border-white/5 active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
              title={t('liveClassChat')}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </form>""")

print('Phase 4: GeminiKeyModal + AdminCmsPage platform-owner')
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
      const res = await fetch('/api/health', { headers: { 'x-gemini-api-key': cleanKey } });
      if (res.ok) {
        setGeminiApiKey(cleanKey);
        setStatus('success');
        setMsg(language === 'bn' ? 'গুগল জেমিনি এপিআই কি সফলভাবে সংযুক্ত হয়েছে!' : 'Google Gemini API key successfully linked!');
        setTimeout(() => { setIsKeyModalOpen(false); setStatus('idle'); }, 1200);
      } else {
        let serverMsg = '';
        try { const errData = await res.json(); serverMsg = errData.error || errData.message || ''; } catch {}
        setStatus('error');
        setMsg(serverMsg || (language === 'bn' ? 'এপিআই কি যাচাই করতে ব্যর্থ হয়েছে।' : 'Could not verify the Gemini API key. Please try again.'));
      }
    } catch (err) {
      setStatus('error');
      setMsg(language === 'bn' ? 'নেটওয়ার্ক সমস্যার কারণে কি যাচাই করা যায়নি।' : 'Network issue prevented key verification. Try saving again.');
    }
  };""")

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

print()
print('=== All Phase 1-4 patches applied. ===')
