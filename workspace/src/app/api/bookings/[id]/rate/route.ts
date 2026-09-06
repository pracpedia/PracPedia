import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * POST /api/bookings/[id]/rate
 *
 * Client rates an artist 1-5 stars after order completion.
 *
 * Body: { rating: 1-5, review?: string }
 *
 * Rules:
 *   - Only the booking client can rate
 *   - Only completed bookings can be rated
 *   - Rating is stored as a marker in `artistNotes`:
 *     `[Rating: 4/5 — "Optional review text"]`
 *   - The artist's average `rating` is recalculated from all their completed
 *     bookings that have the marker.
 *
 * The marker-in-artistNotes approach is a pragmatic choice for SQLite (no
 * schema migration needed). On Postgres, you'd add a dedicated `ratings`
 * table with foreign keys.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
    const review = body.review ? String(body.review).slice(0, 500) : null;

    const booking = await db.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });

    // Only the client can rate
    if (booking.clientId !== payload.userId) {
      return NextResponse.json({ error: 'Only the client can rate this order.' }, { status: 403 });
    }

    // Only completed bookings can be rated
    if (booking.status !== 'completed') {
      return NextResponse.json({ error: 'Only completed orders can be rated.' }, { status: 400 });
    }

    // Check if already rated (marker exists in artistNotes)
    const existingRatingMatch = booking.artistNotes?.match(/\[Rating:\s*\d/);
    if (existingRatingMatch) {
      return NextResponse.json({ error: 'You have already rated this order.' }, { status: 409 });
    }

    // Append the rating marker to artistNotes
    const marker = `[Rating: ${rating}/5${review ? ` — "${review}"` : ''}]`;
    const newArtistNotes = `${booking.artistNotes || ''}\n${marker}`.trim();

    await db.booking.update({
      where: { id },
      data: { artistNotes: newArtistNotes },
    });

    // Recalculate the artist's average rating from all completed bookings
    const allBookings = await db.booking.findMany({
      where: { artistId: booking.artistId, status: 'completed' },
      select: { artistNotes: true },
    });

    const ratings: number[] = [];
    for (const b of allBookings) {
      const match = b.artistNotes?.match(/\[Rating:\s*(\d)/);
      if (match) ratings.push(Number(match[1]));
    }

    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 5.0;

    await db.user.update({
      where: { id: booking.artistId },
      data: { rating: Math.round(avgRating * 10) / 10 },
    });

    return NextResponse.json({
      success: true,
      rating,
      avgRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings.length,
    });
  } catch (err: any) {
    console.error('POST /api/bookings/[id]/rate error:', err);
    return NextResponse.json({ error: 'Could not submit rating.' }, { status: 500 });
  }
}
