import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { sendOrderPlacedEmails } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    let where: any = {};
    if (scope === 'client') {
      where.clientId = payload.userId;
    } else if (scope === 'artist') {
      where.artistId = payload.userId;
    } else {
      if (payload.role !== 'super_admin' && payload.role !== 'admin') {
        where = {
          OR: [{ clientId: payload.userId }, { artistId: payload.userId }],
        };
      }
    }

    const bookings = await db.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, email: true, profilePic: true } },
        artist: { select: { id: true, name: true, email: true, profilePic: true, rating: true, completedOrders: true } },
      },
    });

    return NextResponse.json(bookings.map((b) => ({
      ...b,
      id: b.id,
      referenceImages: safeJsonParseArray(b.referenceImagesJson),
      client: { ...b.client, id: b.client.id },
      artist: { ...b.artist, id: b.artist.id },
    })));
  } catch (err: any) {
    console.error('GET /api/bookings error:', err);
    return NextResponse.json({ error: 'Could not load bookings.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Support both single object and { items: [...] } for bulk orders
    const itemsToCreate = Array.isArray(body.items) ? body.items : [body];

    if (itemsToCreate.length === 0) {
      return NextResponse.json({ error: 'No items to order.' }, { status: 400 });
    }

    // Validate first item to get artistId (assuming all items are for the same artist)
    const firstItem = itemsToCreate[0];
    const artistId = firstItem.artistId;
    
    if (!artistId) {
      return NextResponse.json({ error: 'Artist ID is required.' }, { status: 400 });
    }

    const artist = await db.user.findUnique({ where: { id: String(artistId) } });
    if (!artist || artist.role !== 'artist') {
      return NextResponse.json({ error: 'Artist not found.' }, { status: 404 });
    }
    if (!artist.isAvailable) {
      return NextResponse.json({ error: 'This artist is currently unavailable for new commissions.' }, { status: 400 });
    }

        const createdBookings: any[] = [];

    for (const item of itemsToCreate) {
      const { serviceType, notebookProvider, subject, description, referenceImages, clientNotes, deadline } = item;

      if (!subject || !description) {
        return NextResponse.json({ error: `Item missing subject or description.` }, { status: 400 });
      }

      const validServiceTypes = ['drawing_only', 'drawing_writing'];
      const svc = validServiceTypes.includes(serviceType) ? serviceType : 'drawing_only';
      const np = notebookProvider === 'artist' ? 'artist' : 'client';

      let deadlineDate: Date | null = null;
      if (deadline && typeof deadline === 'string') {
        const parsed = new Date(deadline);
        if (!isNaN(parsed.getTime())) {
          const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
          if (parsed < oneHourFromNow) {
            return NextResponse.json({ error: 'Deadline must be at least 1 hour from now.' }, { status: 400 });
          }
          deadlineDate = parsed;
        }
      }

      const basePrice = svc === 'drawing_only' ? artist.rateDrawingOnly : artist.rateDrawingWriting;
      const notebookExtra = np === 'artist' ? (artist.notebookCost || 0) : 0;
      const price = basePrice + notebookExtra;

      const booking = await db.booking.create({
        data: {
          clientId: payload.userId,
          artistId: artist.id,
          serviceType: svc,
          notebookProvider: np,
          subject: String(subject),
          description: String(description),
          referenceImagesJson: JSON.stringify(Array.isArray(referenceImages) ? referenceImages : []),
          price,
          clientNotes: clientNotes ? String(clientNotes) : null,
          status: 'pending',
          paymentStatus: 'unpaid',
          ...(deadlineDate ? { deadline: deadlineDate } : {}),
        },
      });

      createdBookings.push(booking);

      await logActivity({
        userId: payload.userId,
        userName: payload.email,
        userRole: payload.role,
        action: 'booking_created',
        category: 'marketplace',
        detail: `${payload.email} hired ${artist.name} for ${svc === 'drawing_only' ? 'Drawing Only' : 'Drawing + Writing'} — ${subject} — ৳${price}`,
        metadata: {
          bookingId: booking.id,
          clientId: payload.userId,
          clientEmail: payload.email,
          artistId: artist.id,
          artistName: artist.name,
          serviceType: svc,
          notebookProvider: np,
          subject,
          price,
          deadline: deadlineDate ? deadlineDate.toISOString() : null,
        },
        request,
      });
    }

    // Send transactional emails (fire-and-forget)
    const client = await db.user.findUnique({
      where: { id: payload.userId },
      select: { name: true, email: true },
    });
    
    if (client?.email && artist.email) {
      for (const booking of createdBookings) {
        void sendOrderPlacedEmails({
          bookingId: booking.id,
          serviceType: booking.serviceType,
          notebookProvider: booking.notebookProvider,
          subject: booking.subject,
          description: booking.description,
          price: booking.price,
          clientName: client.name,
          clientEmail: client.email,
          artistName: artist.name,
          artistEmail: artist.email,
          artistRating: artist.rating,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://pracpedia.vercel.app',
        }).catch((e) => console.error('[email] order_placed send failed:', e));
      }
    }

    return NextResponse.json({
      success: true,
      count: createdBookings.length,
      bookings: createdBookings.map(b => ({
        ...b,
        id: b.id,
        referenceImages: safeJsonParseArray(b.referenceImagesJson),
      })),
    });
  } catch (err: any) {
    console.error('POST /api/bookings error:', err);
    return NextResponse.json({ error: 'Could not create booking.' }, { status: 500 });
  }
}