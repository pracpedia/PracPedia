import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { withRetry } from '@/lib/db-retry';

/**
 * GET /api/bookings/[id]/chat?since=ISO_DATE
 * Fetches chat messages for an order.
 * Uses long-polling: if `since` is provided, returns only messages after that date.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: bookingId } = await params;
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    // 1. Verify booking exists
    const booking = await withRetry(() => db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, clientId: true, artistId: true }
    }));

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // 2. Authorization: Must be client, artist, or an assigned assistant
    const isClient = booking.clientId === payload.userId;
    const isArtist = booking.artistId === payload.userId;
    
    let isAssistant = false;
    if (!isClient && !isArtist) {
      const subtask = await withRetry(() => db.subTask.findFirst({
        where: { bookingId, assistantId: payload.userId }
      }));
      isAssistant = !!subtask;
    }

    if (!isClient && !isArtist && !isAssistant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Fetch messages
    const where: any = { bookingId };
    if (since) {
      where.createdAt = { gt: new Date(since) };
    }

    const messages = await withRetry(() => db.orderChat.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 100, // Limit to prevent huge payloads
      include: {
        sender: {
          select: { id: true, name: true, profilePic: true, role: true }
        }
      }
    }));

    return NextResponse.json({ messages, polledAt: new Date().toISOString() });

  } catch (err: any) {
    console.error('GET /api/bookings/[id]/chat error:', err);
    return NextResponse.json({ error: 'Could not fetch messages' }, { status: 500 });
  }
}

/**
 * POST /api/bookings/[id]/chat
 * Send a new message in the order chat.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: bookingId } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // 1. Verify booking
    const booking = await withRetry(() => db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, clientId: true, artistId: true, status: true }
    }));

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot chat on a cancelled order' }, { status: 400 });
    }

    // 2. Authorization
    const isClient = booking.clientId === payload.userId;
    const isArtist = booking.artistId === payload.userId;
    
    let isAssistant = false;
    if (!isClient && !isArtist) {
      const subtask = await withRetry(() => db.subTask.findFirst({
        where: { bookingId, assistantId: payload.userId }
      }));
      isAssistant = !!subtask;
    }

    if (!isClient && !isArtist && !isAssistant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Create message
    const message = await withRetry(() => db.orderChat.create({
      data: {
        bookingId,
        senderId: payload.userId,
        text: String(text).trim().slice(0, 1000), // Max 1000 chars
      },
      include: {
        sender: {
          select: { id: true, name: true, profilePic: true, role: true }
        }
      }
    }));

    return NextResponse.json({ message });

  } catch (err: any) {
    console.error('POST /api/bookings/[id]/chat error:', err);
    return NextResponse.json({ error: 'Could not send message' }, { status: 500 });
  }
}