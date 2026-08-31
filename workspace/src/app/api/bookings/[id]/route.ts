import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true, profilePic: true } },
        artist: { select: { id: true, name: true, email: true, profilePic: true, rating: true, completedOrders: true } },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    // Only client, artist, or admins can view
    if (
      booking.clientId !== payload.userId &&
      booking.artistId !== payload.userId &&
      payload.role !== 'admin' &&
      payload.role !== 'super_admin'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({
      ...booking,
      id: booking.id,
      referenceImages: JSON.parse(booking.referenceImagesJson || '[]'),
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const booking = await db.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, paymentStatus, artistNotes, clientNotes, commissionPercent } = body;

    // Authorization rules
    const isClient = booking.clientId === payload.userId;
    const isArtist = booking.artistId === payload.userId;
    const isSuperAdmin = payload.role === 'super_admin';
    const isAdmin = payload.role === 'admin';

    // Status transition validation
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    const newStatus = status !== undefined ? String(status) : undefined;
    if (newStatus && !validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    // Client can only cancel (not change to other statuses) or update clientNotes
    if (!isArtist && !isSuperAdmin && !isAdmin) {
      if (isClient) {
        if (newStatus && newStatus !== 'cancelled') {
          return NextResponse.json({ error: 'Clients can only cancel bookings.' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Cannot modify a cancelled or completed booking (except admin setting commission)
    const isCommissionUpdate = commissionPercent !== undefined && (isSuperAdmin || isAdmin);
    if ((booking.status === 'cancelled' || booking.status === 'completed') && !isCommissionUpdate) {
      return NextResponse.json({ error: `Booking already ${booking.status}.` }, { status: 400 });
    }

    const updateData: any = {};
    if (newStatus) updateData.status = newStatus;
    // paymentStatus can ONLY be set by an admin/artist (after a payment
    // webhook confirms the payment). Clients cannot self-mark their own
    // booking as paid — there's no payment gateway integration, so the
    // previous version allowed anyone to forge a paid booking.
    if (paymentStatus !== undefined && (isArtist || isSuperAdmin || isAdmin)) {
      const validPaymentStatuses = ['unpaid', 'paid', 'refunded'];
      const ps = String(paymentStatus);
      if (validPaymentStatuses.includes(ps)) {
        updateData.paymentStatus = ps;
      }
    }
    if (artistNotes !== undefined && isArtist) updateData.artistNotes = String(artistNotes);
    if (clientNotes !== undefined && isClient) updateData.clientNotes = String(clientNotes);

    // Admin commission imposer — sets commission % on the booking
    if (isCommissionUpdate) {
      const pct = Math.max(0, Math.min(100, Number(commissionPercent) || 0));
      const totalPrice = booking.price || 0;
      const commAmount = Math.round((totalPrice * pct) / 100);
      updateData.commissionPercent = pct;
      updateData.commissionAmount = commAmount;
      updateData.artistEarnings = totalPrice - commAmount;
    }

    const updated = await db.booking.update({ where: { id }, data: updateData });

    // If status changed to 'completed', increment artist's completedOrders
    if (newStatus === 'completed' && booking.status !== 'completed') {
      await db.user.update({
        where: { id: booking.artistId },
        data: { completedOrders: { increment: 1 } },
      });
    }
    // If rolling back from completed (rare), decrement
    if (booking.status === 'completed' && newStatus && newStatus !== 'completed') {
      await db.user.update({
        where: { id: booking.artistId },
        data: { completedOrders: { decrement: 1 } },
      });
    }

    // Log status/payment changes to activity feed
    if (newStatus || paymentStatus !== undefined) {
      const parts: string[] = [];
      if (newStatus) parts.push(`status → ${newStatus}`);
      if (paymentStatus !== undefined) parts.push(`payment → ${paymentStatus}`);
      if (isCommissionUpdate) parts.push(`commission → ${commissionPercent}%`);

      // Fetch client + artist names for the log
      const client = await db.user.findUnique({ where: { id: booking.clientId }, select: { name: true, email: true } });
      const artist = await db.user.findUnique({ where: { id: booking.artistId }, select: { name: true } });

      await logActivity({
        userId: payload.userId,
        userName: payload.email,
        userRole: payload.role,
        action: 'booking_updated',
        category: 'marketplace',
        detail: `Booking #${id.slice(-8)}: ${parts.join(', ')} — ${client?.name || 'Unknown'} → ${artist?.name || 'Unknown'} — ৳${booking.price}`,
        metadata: { bookingId: id, newStatus, paymentStatus, commissionPercent, price: booking.price },
        request,
      }).catch(() => {}); // non-blocking
    }

    return NextResponse.json({
      ...updated,
      id: updated.id,
      referenceImages: JSON.parse(updated.referenceImagesJson || '[]'),
    });
  } catch (err: any) {
    console.error('PUT /api/bookings/[id] error:', err);
    return NextResponse.json({ error: 'Could not update booking.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const booking = await db.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    // Client, artist, or admin/super_admin can cancel (sets status=cancelled)
    if (
      booking.clientId !== payload.userId &&
      booking.artistId !== payload.userId &&
      payload.role !== 'admin' &&
      payload.role !== 'super_admin'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Booking already cancelled.' }, { status: 400 });
    }
    if (booking.status === 'completed') {
      return NextResponse.json({ error: 'Cannot cancel a completed booking.' }, { status: 400 });
    }
    const updated = await db.booking.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    return NextResponse.json({
      ...updated,
      id: updated.id,
      referenceImages: JSON.parse(updated.referenceImagesJson || '[]'),
    });
  } catch (err: any) {
    console.error('DELETE /api/bookings/[id] error:', err);
    return NextResponse.json({ error: 'Could not cancel booking.' }, { status: 500 });
  }
}
