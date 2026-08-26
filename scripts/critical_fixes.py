#!/usr/bin/env python3
"""Critical fixes — re-applied from scratch after workspace wipe."""
import os, re, sys

ROOT = '/home/z/my-project/workspace'

def edit(path, old, new):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full): print(f'  - skip {path} (not found)'); return
    with open(full, 'r') as f: s = f.read()
    if old not in s: print(f'  - skip {path} (pattern not found)'); return
    with open(full, 'w') as f: f.write(s.replace(old, new, 1))
    print(f'  OK {path}')

def replace_all(path, old, new):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full): return
    with open(full, 'r') as f: s = f.read()
    if old not in s: return
    with open(full, 'w') as f: f.write(s.replace(old, new))
    print(f'  OK replace_all {path}')

def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f: f.write(content)
    print(f'  OK wrote {path}')

print('=== Applying critical fixes ===')

# 1. /api/credentials shorthand bug
edit('src/app/api/credentials/route.ts',
     '        users: userCount,\n        subjects,\n        folders: folderCount,',
     '        users: userCount,\n        subjects: subjectCount,\n        folders: folderCount,')

# 2. Super_admin role checks
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

# 3. auth.ts BufferSource cast
edit('src/lib/auth.ts',
     "    const sigBytes = base64ToBytes(base64UrlToString(sigB64));\n    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));",
     "    const sigBytes = base64ToBytes(base64UrlToString(sigB64));\n    const valid = await crypto.subtle.verify('HMAC', key, sigBytes as BufferSource, enc.encode(data));")

# 4. /api/images POST admin guard
edit('src/app/api/images/route.ts',
     "    const payload = await getUserFromRequest(request);\n    if (!payload) {\n      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });\n    }\n    const body = await request.json();",
     "    const payload = await getUserFromRequest(request);\n    if (!payload) {\n      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });\n    }\n    if (payload.role !== 'admin' && payload.role !== 'super_admin') {\n      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });\n    }\n    const body = await request.json();")

# 5. Layout fix
edit('src/app/page.tsx',
     "    <div className={`min-h-screen flex flex-col text-slate-100 relative transition-all duration-300 ${",
     "    <div className={`min-h-screen flex flex-col lg:flex-row text-slate-100 relative transition-all duration-300 ${")
edit('src/app/page.tsx',
     '      {/* Main dashboard view container */}\n      <div className="flex-1 min-w-0 flex flex-col relative overflow-x-hidden">',
     '      {/* Main dashboard view container */}\n      <div className="flex-1 min-w-0 flex flex-col relative overflow-x-hidden lg:h-screen lg:overflow-y-auto">')

# 6. THE CRITICAL BUG: super_admin blocked from admin view
edit('src/app/page.tsx',
     "    if (view === 'admins' && user?.role !== 'admin') {\n      return;\n    }",
     "    if (view === 'admins' && user?.role !== 'admin' && user?.role !== 'super_admin') {\n      return;\n    }")

# 7. Replace ALL admin-only role checks with admin OR super_admin
replace_all('src/app/page.tsx', "user?.role === 'admin'", "(user?.role === 'admin' || user?.role === 'super_admin')")

# 8. Sidebar fixes
edit('src/components/gallery/Sidebar.tsx',
     "import {\n  Home,\n  LogOut,\n  User,\n  ShieldCheck,\n  FolderPlus,\n  BookOpen,",
     "import { isPlatformOwner } from '@/lib/platform-owner';\nimport {\n  Home,\n  LogOut,\n  User,\n  ShieldCheck,\n  FolderPlus,\n  BookOpen,")

# Add isAdmin helper after useAuth
edit('src/components/gallery/Sidebar.tsx',
     "  const { user, logout, apiFetch, geminiApiKey, setIsKeyModalOpen } = useAuth();",
     "  const { user, logout, apiFetch, geminiApiKey, setIsKeyModalOpen } = useAuth();\n  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';")

# Fix avatar icon + badge
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

# 9. Shared lib files
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

# 10. /api/stats StatsGrid shape
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

# 11. LanguageContext lang key
edit('src/context/LanguageContext.tsx', "safeLocalStorage.getItem('app_language')", "safeLocalStorage.getItem('png_lang')")
edit('src/context/LanguageContext.tsx', "safeLocalStorage.setItem('app_language'", "safeLocalStorage.setItem('png_lang'")

# 12. ClassroomDiscussion window guard + super_admin delete
edit('src/components/gallery/ClassroomDiscussion.tsx',
     "  const [activeUsers, setActiveUsers] = useState<any[]>((window as any).__activeUsers || []);",
     "  const [activeUsers, setActiveUsers] = useState<any[]>(() =>\n    typeof window !== 'undefined' ? (window as any).__activeUsers || [] : [],\n  );")
edit('src/components/gallery/ClassroomDiscussion.tsx',
     "{(isMine || user?.role === 'admin') && dbId && (",
     "{(isMine || user?.role === 'admin' || user?.role === 'super_admin') && dbId && (")

# 13. AdminCmsPage platform-owner
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     "import { CredentialsView } from '@/components/gallery/pages/CredentialsView';",
     "import { CredentialsView } from '@/components/gallery/pages/CredentialsView';\nimport { isPlatformOwner } from '@/lib/platform-owner';")
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     "  const isMainOwner = user?.email?.toLowerCase() === 'mahabubrahmanakash275@gmail.com';",
     "  const isMainOwner = isPlatformOwner(user?.email);")
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     "                  const isRowMainOwner = adm.email?.toLowerCase() === 'mahabubrahmanakash275@gmail.com';",
     "                  const isRowMainOwner = isPlatformOwner(adm.email);")

# 14. ArtistDashboard reopen + notes-save fix
edit('src/app/api/bookings/[id]/route.ts',
     "    // Cannot modify a cancelled or completed booking\n    if (booking.status === 'cancelled' || booking.status === 'completed') {\n      return NextResponse.json({ error: `Booking already ${booking.status}.` }, { status: 400 });\n    }",
     "    const isReopen = booking.status === 'cancelled' && newStatus === 'pending' && (isArtist || isSuperAdmin || isAdmin);\n    const isNotesOnly = newStatus === undefined && (artistNotes !== undefined || clientNotes !== undefined);\n    if ((booking.status === 'cancelled' || booking.status === 'completed') && !isReopen && !isNotesOnly) {\n      return NextResponse.json({ error: `Booking already ${booking.status}.` }, { status: 400 });\n    }")

# 15. Fix track-time overflow
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

# 16. /admin/login route
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

# 17. /login route
write('src/app/login/page.tsx', """'use client';
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthPage } from '@/components/gallery/pages/AuthPage';
import { useRouter } from 'next/navigation';
export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  React.useEffect(() => { if (isAuthenticated && !isLoading) router.replace('/'); }, [isAuthenticated, isLoading, router]);
  if (isLoading) return (<div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center gap-4 text-slate-300 font-sans p-4"><div className="w-9 h-9 rounded-full border-t-2 border-b-2 border-cyan-400 animate-spin"/><p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Loading session...</p></div>);
  if (isAuthenticated) return null;
  return <AuthPage onSuccess={() => router.replace('/')} onGoBack={() => router.push('/')} />;
}
""")

# 18. AuthPage prefill props
edit('src/components/gallery/pages/AuthPage.tsx',
     "interface AuthPageProps {\n  onSuccess: () => void;\n  onGoBack: () => void;\n}\n\nexport const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onGoBack }) => {",
     "interface AuthPageProps {\n  onSuccess: () => void;\n  onGoBack: () => void;\n  initialEmail?: string;\n  initialPassword?: string;\n}\n\nexport const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onGoBack, initialEmail = '', initialPassword = '' }) => {")
edit('src/components/gallery/pages/AuthPage.tsx',
     "  const [email, setEmail] = useState('');\n  const [password, setPassword] = useState('');",
     "  const [email, setEmail] = useState(initialEmail);\n  const [password, setPassword] = useState(initialPassword);")

# 19. LandingPage onAdminLogin prop + footer button
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

# 20. Wire onAdminLogin in page.tsx
edit('src/app/page.tsx',
     "  const [viewAuth, setViewAuth] = useState(false);\n\n  // Suppress",
     "  const [viewAuth, setViewAuth] = useState(false);\n  const [adminPrefill, setAdminPrefill] = useState(false);\n\n  // Suppress")

edit('src/app/page.tsx',
     "  if (viewAuth && !isAuthenticated) {\n    return (\n      <AuthPage\n        onSuccess={() => {\n          setViewAuth(false);\n        }}\n        onGoBack={() => setViewAuth(false)}\n      />\n    );\n  }",
     "  if (viewAuth && !isAuthenticated) {\n    return (\n      <AuthPage\n        onSuccess={() => { setViewAuth(false); setAdminPrefill(false); }}\n        onGoBack={() => { setViewAuth(false); setAdminPrefill(false); }}\n        initialEmail={adminPrefill ? 'admin@gallery.com' : ''}\n        initialPassword={adminPrefill ? 'admin123' : ''}\n      />\n    );\n  }")

edit('src/app/page.tsx',
     "        setViewAuth(true);\n      }}\n      isAuthenticated={isAuthenticated}\n      onGoToDashboard={() => {\n        if (isAuthenticated) {\n          return;\n        }\n        setViewAuth(true);\n      }}\n      subjects={[]}",
     "        setAdminPrefill(false); setViewAuth(true);\n      }}\n      isAuthenticated={isAuthenticated}\n      onGoToDashboard={() => {\n        if (isAuthenticated) return;\n        setAdminPrefill(false); setViewAuth(true);\n      }}\n      onAdminLogin={() => { setAdminPrefill(true); setViewAuth(true); }}\n      subjects={[]}")

print('\n=== All critical fixes applied. ===')
