import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * Super-admin-only endpoint returning a system credentials snapshot.
 *
 * SECURITY:
 *   1. Requires `PRACPEDIA_TEST_PASSWORDS_VISIBLE=true` in the env. When this
 *      flag is unset or `false`, the endpoint returns 404 to any caller —
 *      including authenticated super admins. This means in a normal production
 *      deploy the route effectively does not exist.
 *   2. Even with the flag on, the response NO LONGER includes plaintext
 *      passwords. The previous `demoAccounts` array was removed because it
 *      hardcoded `admin123` / `user123` / `artist123` in source — anyone
 *      reading the repo could log in. Passwords are stored as bcrypt hashes
 *      in the DB and are never retrievable in plaintext.
 *   3. The response NO LONGER leaks `DATABASE_URL`. It returns only a boolean
 *      indicating whether the variable is set.
 *
 * What this endpoint DOES still return (with the flag on):
 *   - System metadata (framework, ORM, Node version, uptime)
 *   - Per-table row counts
 *   - Admin / super_admin user list (id, name, email, createdAt — no passwords)
 *   - Endpoint catalog (path list, no auth info)
 *
 * This is sufficient for a QA dashboard without creating a credential leak.
 */
export async function GET(request: NextRequest) {
  // Hard gate — even super admins cannot bypass this without the env flag.
  if (process.env.PRACPEDIA_TEST_PASSWORDS_VISIBLE !== 'true') {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u || u.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access forbidden. Super Admin only.' }, { status: 403 });
    }

    // Per-table counts
    const [
      userCount, subjectCount, folderCount, bookingCount,
      portfolioCount, announcementCount, chatCount, hireCount,
    ] = await Promise.all([
      db.user.count(),
      db.subject.count(),
      db.folder.count(),
      db.booking.count(),
      db.portfolioItem.count(),
      db.announcement.count(),
      db.chatMessage.count(),
      db.hireRequest.count(),
    ]);

    // List admins + super admins (NO passwords — only public fields)
    const [superAdmins, admins] = await Promise.all([
      db.user.findMany({
        where: { role: 'super_admin' },
        select: { id: true, name: true, email: true, role: true, createdAt: true, isPremium: true, studyTime: true },
        orderBy: { createdAt: 'asc' },
      }),
      db.user.findMany({
        where: { role: 'admin' },
        select: { id: true, name: true, email: true, role: true, createdAt: true, isPremium: true, studyTime: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      testMode: true,
      warning: 'TEST MODE — credentials viewer is enabled. Disable by unsetting PRACPEDIA_TEST_PASSWORDS_VISIBLE in production.',
      system: {
        appName: 'PracPedia — Practical Notebook Gallery',
        framework: 'Next.js 16 (App Router, Turbopack)',
        language: 'TypeScript 5',
        styling: 'Tailwind CSS 4 + shadcn/ui',
        orm: 'Prisma 6',
        database: process.env.DATABASE_URL?.startsWith('postgres') ? 'PostgreSQL' : 'SQLite',
        databaseUrlSet: !!process.env.DATABASE_URL,      // boolean only, no value leak
        jwtSecretSet: !!process.env.JWT_SECRET,            // boolean only
        jwtSecretLength: process.env.JWT_SECRET?.length ?? 0,
        testPasswordMode: process.env.PRACPEDIA_TEST_PASSWORDS_VISIBLE === 'true',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: `${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s`,
        env: process.env.NODE_ENV || 'development',
      },
      stats: {
        users: userCount,
        subjects: subjectCount,
        folders: folderCount,
        bookings: bookingCount,
        portfolio: portfolioCount,
        announcements: announcementCount,
        chatMessages: chatCount,
        hireRequests: hireCount,
      },
      roles: {
        superAdmins,
        admins,
      },
      endpoints: [
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
        'POST /api/bookings/[id]/rate',
        'GET  /api/portfolio?artistId=...',
        'POST /api/portfolio',
        'DELETE /api/portfolio/[id]',
        'GET  /api/artists',
        'GET  /api/artists/[id]',
        'POST /api/artists/register',
        'PUT  /api/artists/register',
        'GET  /api/credentials (super admin + test-mode flag)',
        'POST /api/academy/lesson',
        'POST /api/academy/chat',
        'POST /api/academy/mcq',
        'POST /api/academy/cq',
        'GET  /api/health',
      ],
    });
  } catch (err: any) {
    console.error('GET /api/credentials error:', err);
    return NextResponse.json({ error: 'Could not load credentials.' }, { status: 500 });
  }
}
