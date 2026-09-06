import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const subjects = await db.subject.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(
      subjects.map((s) => ({ ...s, id: s.id })),
    );
  } catch (err: any) {
    console.error('GET /api/subjects error:', err);
    return NextResponse.json({ error: 'Could not load subjects.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const denied = await requirePermission(request, 'manage_subjects');
    if (denied) return NextResponse.json({ error: 'Forbidden — requires permission: manage_subjects' }, { status: 403 });
    const body = await request.json();
    const { title, description } = body;
    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }
    const created = await db.subject.create({
      data: { title: String(title), description: String(description || '') },
    });
    return NextResponse.json({ ...created, id: created.id });
  } catch (err: any) {
    console.error('POST /api/subjects error:', err);
    return NextResponse.json({ error: 'Could not create subject.' }, { status: 500 });
  }
}
