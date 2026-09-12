import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { withRetry } from '@/lib/db-retry';

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
 *   - The artist's `rating` is recalculated using a BAYESIAN AVERAGE (see below).
 *
 * ── Bayesian Average ──────────────────────────────────────────────────────
 * Unlike a simple mean, the Bayesian average pulls artists with few ratings
 * toward the global mean. This prevents a new artist with one 5-star review
 * from outranking a veteran with 100 4.8-star reviews.
 *
 * Formula:
 *   bayesianRating = (C × m + Σratings) / (m + N)
 *
 * Where:
 *   C = global average rating across ALL rated bookings on the platform
 *   m = minimum ratings needed to "trust" an artist's own average (prior strength)
 *   Σratings = sum of this artist's ratings
 *   N = number of this artist's ratings
 *
 * Example (C=4.2, m=3):
 *   New artist, 1 rating of 5: (4.2×3 + 5) / (3+1) = 4.40
 *   Veteran, 100 ratings avg 4.8: (4.2×3 + 480) / (3+100) = 4.80
 *
 * The veteran now correctly ranks higher than the newcomer.
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

    const booking = await withRetry(() => db.booking.findUnique({ where: { id } }));
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

    await withRetry(() =>
      db.booking.update({
        where: { id },
        data: { artistNotes: newArtistNotes },
      })
    );

    // ── Fetch ALL completed bookings with ratings for this artist ────────────
    const artistBookings = await withRetry(() =>
      db.booking.findMany({
        where: { artistId: booking.artistId, status: 'completed' },
        select: { artistNotes: true },
      })
    );

    const artistRatings: number[] = [];
    for (const b of artistBookings) {
      const match = b.artistNotes?.match(/\[Rating:\s*(\d)/);
      if (match) artistRatings.push(Number(match[1]));
    }

    // ── Compute Bayesian average ────────────────────────────────────────────
    // m = prior strength (how many ratings needed to "trust" the artist's own avg)
    const m = 3;
    // C = global average rating across ALL rated bookings on the platform.
    // Computed dynamically so it stays accurate as the platform grows.
    let C = 4.2; // sensible default if the platform has no ratings yet
    try {
      const allRatedBookings = await withRetry(() =>
        db.booking.findMany({
          where: { status: 'completed' },
          select: { artistNotes: true },
        })
      );
      const allRatings: number[] = [];
      for (const b of allRatedBookings) {
        const match = b.artistNotes?.match(/\[Rating:\s*(\d)/);
        if (match) allRatings.push(Number(match[1]));
      }
      if (allRatings.length > 0) {
        C = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
      }
    } catch (err) {
      // If the global query fails, fall back to the default C — non-fatal
      console.warn('[rate] Could not compute global average, using default C=4.2:', err);
    }

    const N = artistRatings.length;
    const sumRatings = artistRatings.reduce((a, b) => a + b, 0);
    const bayesianRating = (C * m + sumRatings) / (m + N);

    // Round to 1 decimal place (e.g., 4.4, 4.7, 5.0)
    const finalRating = Math.round(bayesianRating * 10) / 10;

    await withRetry(() =>
      db.user.update({
        where: { id: booking.artistId },
        data: { rating: finalRating },
      })
    );

    return NextResponse.json({
      success: true,
      rating,
      avgRating: finalRating,
      rawAvg: N > 0 ? Math.round((sumRatings / N) * 10) / 10 : 0,
      bayesianRating: finalRating,
      totalRatings: N,
      globalAverage: Math.round(C * 100) / 100,
      priorStrength: m,
    });
  } catch (err: any) {
    console.error('POST /api/bookings/[id]/rate error:', err);
    return NextResponse.json({ error: 'Could not submit rating.' }, { status: 500 });
  }
}