import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Super-admin-only endpoint returning a system credentials snapshot.
// Used by the /creds view accessible from the Super Admin CMS dashboard.
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u || u.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access forbidden. Super Admin only.' }, { status: 403 });
    }

    // Pull environment-derived / DB-derived credentials
    const userCount = await db.user.count();
    const subjectCount = await db.subject.count();
    const folderCount = await db.folder.count();
    const bookingCount = await db.booking.count();
    const portfolioCount = await db.portfolioItem.count();
    const announcementCount = await db.announcement.count();
    const chatCount = await db.chatMessage.count();
    const hireCount = await db.hireRequest.count();

    // List all admins and super admins
    const superAdmins = await db.user.findMany({
      where: { role: 'super_admin' },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const admins = await db.user.findMany({
      where: { role: 'admin' },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      system: {
        appName: 'PracPedia — Practical Notebook Gallery',
        framework: 'Next.js 16 (App Router, Turbopack)',
        language: 'TypeScript 5',
        styling: 'Tailwind CSS 4 + shadcn/ui',
        orm: 'Prisma 6',
        database: 'SQLite',
        databaseUrl: process.env.DATABASE_URL || '(not set)',
        jwtSecretSet: !!process.env.JWT_SECRET,
        zAiSdkInstalled: true,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: `${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s`,
      },
      stats: {
        users: userCount,
        subjects,
        folders: folderCount,
        bookings: bookingCount,
        portfolio: portfolioCount,
        announcements: announcementCount,
        chatMessages: chatCount,
        hireRequests: hireCount,
      },
      roles: {
        superAdmins: superAdmins.map((s) => ({ ...s, id: s.id })),
        admins: admins.map((a) => ({ ...a, id: a.id })),
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
      ],
      demoAccounts: [
        { email: 'admin@gallery.com', password: 'admin123', role: 'super_admin' },
        { email: 'admin2@gallery.com', password: 'admin123', role: 'admin' },
        { email: 'student@gallery.com', password: 'user123', role: 'user' },
        { email: 'sajid@draw.com', password: 'artist123', role: 'artist' },
        { email: 'nadia@draw.com', password: 'artist123', role: 'artist' },
        { email: 'tanvir@draw.com', password: 'artist123', role: 'artist' },
      ],
    });
  } catch (err: any) {
    console.error('GET /api/credentials error:', err);
    return NextResponse.json({ error: 'Could not load credentials.' }, { status: 500 });
  }
}
