import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * Super-admin-only endpoint returning ALL users' plaintext credentials.
 *
 * ⚠️  TEST MODE ONLY — controlled by the `PRACPEDIA_TEST_PASSWORDS_VISIBLE`
 * env flag. When `true`, super admins can view all users' plaintext
 * passwords. When `false` (or unset), the endpoint returns 404.
 *
 * The user explicitly sets this flag in `.env` to enable the credentials
 * viewer. No production hard-block — the user controls their own deployment.
 *
 * Auth:
 *   1. `PRACPEDIA_TEST_PASSWORDS_VISIBLE=true` in env (hard gate)
 *   2. Caller must be authenticated
 *   3. Caller must have role === 'super_admin'
 *
 * If the env flag is off, returns 404 (endpoint effectively doesn't exist).
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

    // List admins + super admins (public fields)
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

    // ⚠️ ALL USERS with plaintext passwords + phone numbers — test mode only.
    // This is the data that powers the red "TEST MODE" credentials table in
    // the super admin dashboard, with search by name/email/phone.
    const allUsers = await db.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,        // plaintext password (test mode!)
        phoneNumber: true,
        role: true,
        createdAt: true,
        isPremium: true,
        lastIpAddress: true,
      },
    });

    // Rename `passwordHash` → `password` for clarity in the response
    const allUsersExposed = allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.passwordHash,     // plaintext — exposed intentionally
      phoneNumber: user.phoneNumber || '',
      role: user.role,
      createdAt: user.createdAt,
      isPremium: user.isPremium,
      lastIpAddress: user.lastIpAddress || '',
    }));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      testMode: true,
      warning: 'TEST MODE — plaintext credentials are exposed. Disable by unsetting PRACPEDIA_TEST_PASSWORDS_VISIBLE in production.',
      system: {
        appName: 'PracPedia — Practical Notebook Gallery',
        framework: 'Next.js 16 (App Router, Turbopack)',
        language: 'TypeScript 5',
        styling: 'Tailwind CSS 4 + shadcn/ui',
        orm: 'Prisma 6',
        database: process.env.DATABASE_URL?.startsWith('postgres') ? 'PostgreSQL' : 'SQLite',
        databaseUrlSet: !!process.env.DATABASE_URL,
        jwtSecretSet: !!process.env.JWT_SECRET,
        testPasswordMode: process.env.PRACPEDIA_TEST_PASSWORDS_VISIBLE === 'true',
        plaintextPasswords: true,    // flag for the UI to show the red section
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
      // The allUsers array with plaintext passwords — used by the credentials
      // viewer's red TEST MODE section.
      allUsers: allUsersExposed,
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
