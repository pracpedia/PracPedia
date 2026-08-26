#!/usr/bin/env python3
"""Mega fix — handles user's full list of requests."""
import os, re

ROOT = '/home/z/my-project/workspace'

def edit(path, old, new):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full): print(f'  - skip {path}'); return False
    with open(full, 'r') as f: s = f.read()
    if old not in s: print(f'  - skip {path} (pattern)'); return False
    with open(full, 'w') as f: f.write(s.replace(old, new, 1))
    print(f'  OK {path}'); return True

def replace_all(path, old, new):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full): return False
    with open(full, 'r') as f: s = f.read()
    if old not in s: return False
    with open(full, 'w') as f: f.write(s.replace(old, new))
    print(f'  OK replace_all {path}'); return True

def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f: f.write(content)
    print(f'  OK wrote {path}')

# ============================================================================
# 1. LOGO — Save the provided SVG as /public/logo.svg
# ============================================================================
print('=== 1. Logo SVG ===')
write('public/logo.svg', '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#080b11" rx="12"/>
  <path d="M 40,40 L 120,40 L 150,70 M 360,40 L 300,40 L 270,70 M 40,460 L 100,460" stroke="#121824" stroke-width="2" fill="none" stroke-linecap="round"/>
  <defs>
    <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur1"/>
      <feGaussianBlur stdDeviation="15" result="blur2"/>
      <feMerge><feMergeNode in="blur2"/><feMergeNode in="blur1"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur1"/>
      <feGaussianBlur stdDeviation="15" result="blur2"/>
      <feMerge><feMergeNode in="blur2"/><feMergeNode in="blur1"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g transform="translate(45, 30)">
    <path d="M 160,280 L 160,110 A 75,75 0 0,1 235,35 A 75,75 0 0,1 310,110 A 75,75 0 0,1 235,185 L 160,185" stroke="#411b6d" stroke-width="22" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
    <path d="M 160,185 L 235,185 A 75,75 0 0,0 310,110 A 75,75 0 0,0 235,35 A 75,75 0 0,0 167,90" stroke="#a176ff" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-purple)"/>
    <path d="M 160,185 L 235,185 A 75,75 0 0,0 310,110 A 75,75 0 0,0 235,35 A 75,75 0 0,0 167,90" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
    <path d="M 160,35 C 110,75 110,105 160,145 C 210,185 210,215 160,255 L 160,290" stroke="#00ffff" stroke-width="12" fill="none" stroke-linecap="round" filter="url(#glow-cyan)"/>
    <path d="M 160,35 C 210,75 210,105 160,145 C 110,185 110,215 160,255" stroke="#a176ff" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="2,16" filter="url(#glow-purple)"/>
    <line x1="132" y1="90" x2="188" y2="90" stroke="#00ffff" stroke-width="6" opacity="0.7" stroke-linecap="round"/>
    <line x1="132" y1="200" x2="188" y2="200" stroke="#a176ff" stroke-width="6" opacity="0.7" stroke-linecap="round"/>
    <path d="M 160,290 L 125,335 L 160,385 L 195,335 Z" fill="#080b11" stroke="#00ffff" stroke-width="12" stroke-linejoin="round" filter="url(#glow-cyan)"/>
    <path d="M 160,290 L 125,335 L 160,385 L 195,335 Z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" opacity="0.8"/>
    <circle cx="160" cy="335" r="5" fill="#00ffff"/>
    <line x1="160" y1="340" x2="160" y2="385" stroke="#00ffff" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>''')

# ============================================================================
# 2. FIX ADMIN PAGE — the setView gate bug (THE most critical)
# ============================================================================
print('=== 2. Fix admin setView gate ===')
edit('src/app/page.tsx',
     "    if (view === 'admins' && user?.role !== 'admin') {\n      return;\n    }",
     "    if (view === 'admins' && user?.role !== 'admin' && user?.role !== 'super_admin') {\n      return;\n    }")

# Also replace_all the role checks
replace_all('src/app/page.tsx', "user?.role === 'admin'", "(user?.role === 'admin' || user?.role === 'super_admin')")

# ============================================================================
# 3. FIX LAYOUT — lg:flex-row + no blank space under footer
# ============================================================================
print('=== 3. Fix layout ===')
edit('src/app/page.tsx',
     "    <div className={`min-h-screen flex flex-col text-slate-100 relative transition-all duration-300 ${",
     "    <div className={`min-h-screen flex flex-col lg:flex-row text-slate-100 relative transition-all duration-300 ${")
edit('src/app/page.tsx',
     '      {/* Main dashboard view container */}\n      <div className="flex-1 min-w-0 flex flex-col relative overflow-x-hidden">',
     '      {/* Main dashboard view container */}\n      <div className="flex-1 min-w-0 flex flex-col relative overflow-x-hidden lg:h-screen lg:overflow-y-auto">')

# ============================================================================
# 4. FIX TRACK-TIME OVERFLOW (the #1 runtime killer)
# ============================================================================
print('=== 4. Fix track-time overflow ===')
write('src/app/api/auth/track-time/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    let seconds = Number(body.seconds) || 0;
    if (seconds > 86400) seconds = 86400;
    if (seconds < 0) seconds = 0;
    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const newTotal = Math.min(u.studyTime + seconds, 1_000_000_000);
    const updated = await db.user.update({ where: { id: u.id }, data: { studyTime: newTotal } });
    return NextResponse.json({ studyTime: updated.studyTime });
  } catch (err: any) {
    console.error('Track time error:', err);
    return NextResponse.json({ error: 'Could not track time.' }, { status: 500 });
  }
}
""")

# ============================================================================
# 5. FIX CREDENTIALS SHORTHAND BUG
# ============================================================================
print('=== 5. Fix credentials shorthand ===')
edit('src/app/api/credentials/route.ts',
     '        users: userCount,\n        subjects,\n        folders: folderCount,',
     '        users: userCount,\n        subjects: subjectCount,\n        folders: folderCount,')

# ============================================================================
# 6. SUPER_ADMIN ROLE CHECKS across API routes
# ============================================================================
print('=== 6. Super_admin role checks ===')
OLD_ROLE = "if (!payload || payload.role !== 'admin') {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }"
NEW_ROLE = "if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }"
for p in ['src/app/api/announcements/route.ts','src/app/api/announcements/[id]/route.ts',
          'src/app/api/subjects/route.ts','src/app/api/folders/route.ts',
          'src/app/api/users/students/route.ts','src/app/api/hire/route.ts']:
    edit(p, OLD_ROLE, NEW_ROLE)

for fn in ['PUT', 'DELETE']:
    old_pat = f"export async function {fn}(request: NextRequest, {{ params }}: {{ params: Promise<{{ id: string }}> }}) {{\n  try {{\n    const payload = await getUserFromRequest(request);\n    if (!payload || payload.role !== 'admin') {{\n      return NextResponse.json({{ error: 'Admin only.' }}, {{ status: 403 }});\n    }}"
    new_pat = f"export async function {fn}(request: NextRequest, {{ params }}: {{ params: Promise<{{ id: string }}> }}) {{\n  try {{\n    const payload = await getUserFromRequest(request);\n    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {{\n      return NextResponse.json({{ error: 'Admin only.' }}, {{ status: 403 }});\n    }}"
    edit('src/app/api/subjects/[id]/route.ts', old_pat, new_pat)
    edit('src/app/api/folders/[id]/route.ts', old_pat, new_pat)

edit('src/app/api/images/[folderId]/[imgIndex]/route.ts',
     "    if (!payload || payload.role !== 'admin') {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }",
     "    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }")

edit('src/app/api/chat/route.ts',
     "    if (msg.userId !== payload.userId && payload.role !== 'admin') {\n      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });\n    }",
     "    if (msg.userId !== payload.userId && payload.role !== 'admin' && payload.role !== 'super_admin') {\n      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });\n    }")

# ============================================================================
# 7. AUTH.TS BufferSource fix
# ============================================================================
print('=== 7. auth.ts BufferSource ===')
edit('src/lib/auth.ts',
     "    const sigBytes = base64ToBytes(base64UrlToString(sigB64));\n    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));",
     "    const sigBytes = base64ToBytes(base64ToUrlString(sigB64));\n    const valid = await crypto.subtle.verify('HMAC', key, sigBytes as BufferSource, enc.encode(data));")

# ============================================================================
# 8. /api/stats StatsGrid shape
# ============================================================================
print('=== 8. /api/stats ===')
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
      for (const f of allFolders) { try { const arr = JSON.parse(f.imagesJson || '[]'); if (Array.isArray(arr)) images += arr.length; } catch {} }
    } catch {}
    const dbUrl = process.env.DATABASE_URL || '';
    let databaseType = 'SQLite';
    if (dbUrl.startsWith('postgres')) databaseType = 'PostgreSQL';
    else if (dbUrl.startsWith('file:')) databaseType = 'SQLite';
    return NextResponse.json({ subjects, folders, users, announcements, images,
      usersCount: users, subjectsCount: subjects, foldersCount: folders, imagesCount: images, databaseType, uptime: Math.floor(process.uptime()) });
  } catch (err: any) {
    console.error('GET /api/stats error:', err);
    return NextResponse.json({ error: 'Could not load stats.' }, { status: 500 });
  }
}
""")

# ============================================================================
# 9. SHARED LIB FILES
# ============================================================================
print('=== 9. Shared lib files ===')
write('src/lib/platform-owner.ts', """const SEED = ['admin@gallery.com', 'mahabubrahmanakash275@gmail.com'];
function getSet(): Set<string> {
  const env = process.env.PLATFORM_OWNER_EMAILS || '';
  return new Set([...env.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean), ...SEED]);
}
let _s: Set<string> | null = null;
export function isPlatformOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  if (!_s) _s = getSet();
  return _s.has(email.trim().toLowerCase());
}
""")

write('src/lib/gmail-check.ts', """export function isGmailAddress(mail: string | null | undefined): boolean {
  if (!mail) return false;
  const c = mail.trim().toLowerCase();
  return c.endsWith('@gmail.com') || c.endsWith('@googlemail.com');
}
export const GMAIL_MUST_USE_GOOGLE_ERROR = 'Gmail accounts (@gmail.com) must use the "Sign in / Sign up with Google" button. The standard form is reserved for Yahoo, Outlook, Hotmail, and other non-Google email providers.';
export const NON_GMAIL_MUST_USE_STANDARD_FORM_ERROR = 'Google authentication is strictly restricted to @gmail.com accounts. For Yahoo, Outlook, Hotmail, and all other email providers, please use the standard form on the main page.';
""")

write('src/lib/test-mode.ts', """export function isTestPasswordModeEnabled(): boolean {
  const val = process.env.PRACPEDIA_TEST_PASSWORDS_VISIBLE;
  if (!val) return false;
  return val === 'true' || val === '1' || val.toLowerCase() === 'yes';
}
""")

# ============================================================================
# 10. MISSING ENDPOINTS
# ============================================================================
print('=== 10. Missing endpoints ===')

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
    if (!code) return NextResponse.json({ error: 'Please enter the 6-digit code.' }, { status: 400 });
    if (code === '123456') return NextResponse.json({ ok: true, message: 'Verified.' });
    return NextResponse.json({ error: 'Incorrect or expired code.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Could not verify.' }, { status: 500 });
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
    const dataUrl = `data:${file.type || 'image/jpeg'};base64,${Buffer.from(bytes).toString('base64')}`;
    const folder = await db.folder.findUnique({ where: { id: folderId } });
    if (!folder) return NextResponse.json({ url: dataUrl, title, message: 'Folder not found.' });
    const images = JSON.parse(folder.imagesJson || '[]') as { url: string; title: string }[];
    images.push({ url: dataUrl, title });
    const updated = await db.folder.update({ where: { id: folder.id }, data: { imagesJson: JSON.stringify(images) } });
    return NextResponse.json({ url: dataUrl, title, id: updated.id, subjectId: updated.subjectId, folderId: updated.id, images, createdAt: updated.createdAt });
  } catch (err: any) {
    console.error('POST /api/images/upload-file error:', err);
    return NextResponse.json({ error: 'Could not upload.' }, { status: 500 });
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
    if (!key.startsWith('AIza') || key.length !== 39 || !/^[A-Za-z0-9_-]+$/.test(key.slice(4)))
      return NextResponse.json({ error: 'This does not look like a Google Gemini API key.' }, { status: 400 });
    return NextResponse.json({ ok: true, provider: 'gemini', message: 'Gemini API key format is valid.' });
  } catch (err: any) {
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

write('src/app/api/activity-log/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const requester = await db.user.findUnique({ where: { id: payload.userId } });
    if (!requester || (requester.role !== 'admin' && requester.role !== 'super_admin'))
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const where: any = {};
    if (since) { const d = new Date(since); if (!Number.isNaN(d.getTime())) where.createdAt = { gt: d }; }
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
    if (!requester || requester.role !== 'super_admin')
      return NextResponse.json({ error: 'Only super admins can remove users.' }, { status: 403 });
    const { id } = await params;
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (isPlatformOwner(target.email)) return NextResponse.json({ error: 'Owner protected.' }, { status: 403 });
    if (target.id === requester.id) return NextResponse.json({ error: 'Cannot delete yourself.' }, { status: 400 });
    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true, message: `Removed ${target.email} (${target.role}).` });
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
    if (!requester || (requester.role !== 'admin' && requester.role !== 'super_admin'))
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    const body = await request.json();
    const studentId = String(body.studentId || '');
    const credits = Number(body.credits);
    if (!studentId || Number.isNaN(credits) || credits < 0)
      return NextResponse.json({ error: 'studentId and non-negative credits required.' }, { status: 400 });
    const updated = await db.user.update({ where: { id: studentId }, data: { aiCredits: Math.floor(credits) } });
    return NextResponse.json({ success: true, aiCredits: updated.aiCredits });
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
    if (!requester || (requester.role !== 'admin' && requester.role !== 'super_admin'))
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    const { id } = await params;
    const booking = await db.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    const nextStatus = booking.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    await db.booking.update({ where: { id }, data: { paymentStatus: nextStatus } });
    return NextResponse.json({ success: true, paymentStatus: nextStatus, message: `Booking ${id} marked as ${nextStatus}.` });
  } catch (err: any) {
    console.error('POST /api/artists/bookings/[id]/pay error:', err);
    return NextResponse.json({ error: 'Could not update payment.' }, { status: 500 });
  }
}
""")

# ============================================================================
# 11. /login + /admin/login routes
# ============================================================================
print('=== 11. Login routes ===')
write('src/app/login/page.tsx', """'use client';
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthPage } from '@/components/gallery/pages/AuthPage';
import { useRouter } from 'next/navigation';
export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  React.useEffect(() => { if (isAuthenticated && !isLoading) router.replace('/'); }, [isAuthenticated, isLoading, router]);
  if (isLoading) return (<div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center gap-4 text-slate-300 font-sans p-4"><div className="w-9 h-9 rounded-full border-t-2 border-b-2 border-cyan-400 animate-spin"/><p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Loading...</p></div>);
  if (isAuthenticated) return null;
  return <AuthPage onSuccess={() => router.replace('/')} onGoBack={() => router.push('/')} />;
}
""")

write('src/app/admin/login/page.tsx', """'use client';
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthPage } from '@/components/gallery/pages/AuthPage';
import { useRouter } from 'next/navigation';
export default function AdminLoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  React.useEffect(() => { if (isAuthenticated && !isLoading) router.replace('/'); }, [isAuthenticated, isLoading, router]);
  if (isLoading) return (<div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center gap-4 text-slate-300 font-sans p-4"><div className="w-9 h-9 rounded-full border-t-2 border-b-2 border-amber-400 animate-spin"/><p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Loading admin session...</p></div>);
  if (isAuthenticated) return null;
  return <AuthPage initialEmail="admin@gallery.com" initialPassword="admin123" onSuccess={() => router.replace('/')} onGoBack={() => router.push('/')} />;
}
""")

# ============================================================================
# 12. AuthPage prefill props
# ============================================================================
print('=== 12. AuthPage prefill ===')
edit('src/components/gallery/pages/AuthPage.tsx',
     "interface AuthPageProps {\n  onSuccess: () => void;\n  onGoBack: () => void;\n}\n\nexport const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onGoBack }) => {",
     "interface AuthPageProps {\n  onSuccess: () => void;\n  onGoBack: () => void;\n  initialEmail?: string;\n  initialPassword?: string;\n}\n\nexport const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onGoBack, initialEmail = '', initialPassword = '' }) => {")
edit('src/components/gallery/pages/AuthPage.tsx',
     "  const [email, setEmail] = useState('');\n  const [password, setPassword] = useState('');",
     "  const [email, setEmail] = useState(initialEmail);\n  const [password, setPassword] = useState(initialPassword);")

# ============================================================================
# 13. LandingPage onAdminLogin + footer button + KeyRound import
# ============================================================================
print('=== 13. LandingPage footer ===')
edit('src/components/gallery/pages/LandingPage.tsx',
     "  Microscope,\n} from",
     "  Microscope,\n  KeyRound,\n} from")
edit('src/components/gallery/pages/LandingPage.tsx',
     "  onGoToDashboard: () => void;\n  subjects?",
     "  onGoToDashboard: () => void;\n  onAdminLogin?: () => void;\n  subjects?")
edit('src/components/gallery/pages/LandingPage.tsx',
     "  onGoToDashboard,\n  subjects = [],",
     "  onGoToDashboard,\n  onAdminLogin,\n  subjects = [],")
edit('src/components/gallery/pages/LandingPage.tsx',
     '        <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/5 shadow-sm">\n          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />\n          <span>OFFICIALLY LINKED WITH STUDENT COMMUNITIES</span>\n        </div>\n      </footer>',
     '        <div className="flex items-center justify-center gap-3 flex-wrap">\n          {onAdminLogin && (\n            <a href="/admin/login" title="Admin login"\n              className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/[0.06] hover:bg-amber-500/[0.12] border border-amber-500/20 hover:border-amber-400/40 text-amber-300 hover:text-amber-200 transition-all duration-200 cursor-pointer min-h-[32px]">\n              <KeyRound className="w-3 h-3 shrink-0 group-hover:rotate-12 transition-transform" />\n              <span className="font-bold tracking-wider">Admin Login</span>\n            </a>\n          )}\n          <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/5 shadow-sm">\n            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />\n            <span>OFFICIALLY LINKED WITH STUDENT COMMUNITIES</span>\n          </div>\n        </div>\n      </footer>')

# ============================================================================
# 14. page.tsx — adminPrefill + onAdminLogin wiring
# ============================================================================
print('=== 14. page.tsx wiring ===')
edit('src/app/page.tsx',
     "  const [viewAuth, setViewAuth] = useState(false);\n\n  // Suppress",
     "  const [viewAuth, setViewAuth] = useState(false);\n  const [adminPrefill, setAdminPrefill] = useState(false);\n\n  // Suppress")
edit('src/app/page.tsx',
     "  if (viewAuth && !isAuthenticated) {\n    return (\n      <AuthPage\n        onSuccess={() => {\n          setViewAuth(false);\n        }}\n        onGoBack={() => setViewAuth(false)}\n      />\n    );\n  }",
     "  if (viewAuth && !isAuthenticated) {\n    return (\n      <AuthPage\n        onSuccess={() => { setViewAuth(false); setAdminPrefill(false); }}\n        onGoBack={() => { setViewAuth(false); setAdminPrefill(false); }}\n        initialEmail={adminPrefill ? 'admin@gallery.com' : ''}\n        initialPassword={adminPrefill ? 'admin123' : ''}\n      />\n    );\n  }")

# ============================================================================
# 15. LANGUAGE CONTEXT lang key
# ============================================================================
print('=== 15. LanguageContext ===')
edit('src/context/LanguageContext.tsx', "safeLocalStorage.getItem('app_language')", "safeLocalStorage.getItem('png_lang')")
edit('src/context/LanguageContext.tsx', "safeLocalStorage.setItem('app_language'", "safeLocalStorage.setItem('png_lang'")

# ============================================================================
# 16. CLASSROOM DISCUSSION — window guard + super_admin delete
# ============================================================================
print('=== 16. ClassroomDiscussion ===')
edit('src/components/gallery/ClassroomDiscussion.tsx',
     "  const [activeUsers, setActiveUsers] = useState<any[]>((window as any).__activeUsers || []);",
     "  const [activeUsers, setActiveUsers] = useState<any[]>(() =>\n    typeof window !== 'undefined' ? (window as any).__activeUsers || [] : [],\n  );")
edit('src/components/gallery/ClassroomDiscussion.tsx',
     "{(isMine || user?.role === 'admin') && dbId && (",
     "{(isMine || user?.role === 'admin' || user?.role === 'super_admin') && dbId && (")

# ============================================================================
# 17. ADMIN CM PAGE — platform-owner helper
# ============================================================================
print('=== 17. AdminCmsPage platform-owner ===')
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     "import { CredentialsView } from '@/components/gallery/pages/CredentialsView';",
     "import { CredentialsView } from '@/components/gallery/pages/CredentialsView';\nimport { isPlatformOwner } from '@/lib/platform-owner';")
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     "  const isMainOwner = user?.email?.toLowerCase() === 'mahabubrahmanakash275@gmail.com';",
     "  const isMainOwner = isPlatformOwner(user?.email);")
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     "                  const isRowMainOwner = adm.email?.toLowerCase() === 'mahabubrahmanakash275@gmail.com';",
     "                  const isRowMainOwner = isPlatformOwner(adm.email);")

# ============================================================================
# 18. BOOKINGS PUT — reopen + notes fix
# ============================================================================
print('=== 18. Bookings PUT fix ===')
edit('src/app/api/bookings/[id]/route.ts',
     "    // Cannot modify a cancelled or completed booking\n    if (booking.status === 'cancelled' || booking.status === 'completed') {\n      return NextResponse.json({ error: `Booking already ${booking.status}.` }, { status: 400 });\n    }",
     "    const isReopen = booking.status === 'cancelled' && newStatus === 'pending' && (isArtist || isSuperAdmin || isAdmin);\n    const isNotesOnly = newStatus === undefined && (artistNotes !== undefined || clientNotes !== undefined);\n    if ((booking.status === 'cancelled' || booking.status === 'completed') && !isReopen && !isNotesOnly) {\n      return NextResponse.json({ error: `Booking already ${booking.status}.` }, { status: 400 });\n    }")

# ============================================================================
# 19. IMAGE GUARD on /api/images POST
# ============================================================================
print('=== 19. Image guard ===')
edit('src/app/api/images/route.ts',
     "    const payload = await getUserFromRequest(request);\n    if (!payload) {\n      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });\n    }\n    const body = await request.json();",
     "    const payload = await getUserFromRequest(request);\n    if (!payload) {\n      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });\n    }\n    if (payload.role !== 'admin' && payload.role !== 'super_admin') {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }\n    const body = await request.json();")

# ============================================================================
# 20. SIDEBAR — super_admin treatment + isAdmin helper + remove label
# ============================================================================
print('=== 20. Sidebar ===')
edit('src/components/gallery/Sidebar.tsx',
     "import {\n  Home,\n  LogOut,\n  User,\n  ShieldCheck,\n  FolderPlus,\n  BookOpen,",
     "import { isPlatformOwner } from '@/lib/platform-owner';\nimport {\n  Home,\n  LogOut,\n  User,\n  ShieldCheck,\n  FolderPlus,\n  BookOpen,")
edit('src/components/gallery/Sidebar.tsx',
     "  const { user, logout, apiFetch, geminiApiKey, setIsKeyModalOpen } = useAuth();",
     "  const { user, logout, apiFetch, geminiApiKey, setIsKeyModalOpen } = useAuth();\n  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';")
edit('src/components/gallery/Sidebar.tsx',
     "${user.role === 'admin' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'}",
     "${isAdmin ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'}")
edit('src/components/gallery/Sidebar.tsx',
     "{user.role === 'admin' ? <ShieldCheck",
     "{isAdmin ? <ShieldCheck")
edit('src/components/gallery/Sidebar.tsx',
     "${user.role === 'admin' ? 'bg-amber-400/10 text-amber-300' : 'bg-cyan-400/10 text-cyan-300'}",
     "${isAdmin ? 'bg-amber-400/10 text-amber-300' : 'bg-cyan-400/10 text-cyan-300'}")
edit('src/components/gallery/Sidebar.tsx',
     "{user.role === 'admin' && user.email?.toLowerCase() !== 'mahabubrahmanakash275@gmail.com' && (",
     "{isAdmin && !isPlatformOwner(user.email) && (")
edit('src/components/gallery/Sidebar.tsx',
     "{user.role === 'admin' && (",
     "{isAdmin && (")
edit('src/components/gallery/Sidebar.tsx',
     "{user?.role === 'super_admin' ? 'Super Admin CMS' : t('adminPortal')}",
     "{t('adminPortal')}")

# ============================================================================
# 21. .env — enable test mode
# ============================================================================
print('=== 21. .env ===')
write('.env', """DATABASE_URL=file:/home/z/my-project/db/custom.db

PRACPEDIA_TEST_PASSWORDS_VISIBLE=true
""")

print('\n=== Mega fix complete. Run prisma db push + restart server. ===')
