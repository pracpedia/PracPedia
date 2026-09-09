import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';

/**
 * GET /api/announcements
 * Returns announcements visible to the caller:
 *   - Admins see ALL announcements (including targeted ones)
 *   - Regular users see: broadcast (targetUserId=null) + targeted to them
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let where: any = {};
    // Non-admins only see broadcasts + announcements targeted to them
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      where = {
        OR: [
          { targetUserId: null },
          { targetUserId: payload.userId },
        ],
      };
    }

    const announcements = await db.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      announcements.map((a) => ({ ...a, id: a.id })),
    );
  } catch (err: any) {
    console.error('GET /api/announcements error:', err);
    return NextResponse.json({ error: 'Could not load announcements.' }, { status: 500 });
  }
}

/**
 * POST /api/announcements
 * Admin/super_admin creates an announcement with optional file attachment + targeted sharing.
 *
 * Body: {
 *   title, content, deadline?,
 *   fileUrl?, fileName?, fileSize?,  // downloadable file attachment
 *   targetUserId?,                   // null = broadcast to all; user ID = targeted share
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const denied = await requirePermission(request, 'manage_announcements');
    if (denied) return NextResponse.json({ error: 'Forbidden — requires permission: manage_announcements' }, { status: 403 });
    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, content, deadline, fileUrl, fileName, fileSize, targetUserId } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content required.' }, { status: 400 });
    }

    // Validate targetUserId if provided
    if (targetUserId) {
      const targetUser = await db.user.findUnique({ where: { id: String(targetUserId) } });
      if (!targetUser) {
        return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
      }
    }

    const created = await db.announcement.create({
      data: {
        title: String(title).slice(0, 200),
        content: String(content).slice(0, 5000),
        deadline: deadline ? String(deadline) : null,
        fileUrl: fileUrl ? String(fileUrl).slice(0, 70000000) : null, // 50MB file → ~67MB base64
        fileName: fileName ? String(fileName).slice(0, 255) : null,
        fileSize: Number(fileSize) || 0,
        targetUserId: targetUserId ? String(targetUserId) : null,
        createdById: u.id,
        createdByName: u.name,
      },
    });

    return NextResponse.json({ ...created, id: created.id });
  } catch (err: any) {
    console.error('POST /api/announcements error:', err);
    return NextResponse.json({ error: 'Could not create announcement.' }, { status: 500 });
  }
}
