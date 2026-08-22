import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// SQLite INT column maxes out at 2,147,483,647 (~68 years of seconds).
// We clamp to 2,000,000,000 to leave headroom and prevent Prisma's
// "Inconsistent column data" error that breaks every authenticated request
// when studyTime overflows.
const MAX_STUDY_TIME = 2_000_000_000;
// Single update can't add more than a day (prevents accidental huge jumps)
const MAX_SINGLE_INCREMENT = 86_400;

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Clamp incoming seconds to [0, 86400] — a negative or huge value is a bug
    const seconds = Math.max(0, Math.min(MAX_SINGLE_INCREMENT, Number(body.seconds) || 0));

    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Compute new value, clamped to MAX_STUDY_TIME
    const newValue = Math.min(MAX_STUDY_TIME, (u.studyTime || 0) + seconds);

    const updated = await db.user.update({
      where: { id: u.id },
      data: { studyTime: newValue },
    });

    return NextResponse.json({ studyTime: updated.studyTime });
  } catch (err: any) {
    console.error('Track time error:', err);
    return NextResponse.json({ error: 'Could not track time.' }, { status: 500 });
  }
}
