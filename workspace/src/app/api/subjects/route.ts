import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

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
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }
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
