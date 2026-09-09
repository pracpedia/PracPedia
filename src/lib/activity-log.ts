/**
 * Activity log helper — call `logActivity()` from any API route to record an
 * event in the admin real-time activity feed.
 *
 * Usage:
 *   import { logActivity } from '@/lib/activity-log';
 *
 *   await logActivity({
 *     userId: payload.userId,
 *     userName: u.name,
 *     userRole: u.role,
 *     action: 'login',
 *     category: 'auth',
 *     detail: `User logged in: ${u.email}`,
 *     request,  // optional — extracts IP from headers
 *   });
 *
 * Categories:
 *   - auth        — login, register, logout
 *   - user        — profile updates, role changes
 *   - content     — subject/folder/image CRUD
 *   - marketplace — booking created, status changed, rating submitted
 *   - chat        — message posted, deleted
 *   - system      — server start, errors, admin actions
 */

import { db } from '@/lib/db';

export interface ActivityLogInput {
  userId?: string | null;
  userName?: string;
  userRole?: string;
  action: string;
  category?: string;
  detail?: string;
  metadata?: Record<string, any>;
  request?: Request;  // pass the NextRequest to extract IP
}

/**
 * Log an activity event. Non-blocking — never throws (fails silently).
 * This is intentional: if activity logging breaks, the actual API request
 * should still succeed.
 */
export async function logActivity(input: ActivityLogInput): Promise<void> {
  try {
    const ipAddress = input.request ? getClientIp(input.request) : null;

    await db.activityLog.create({
      data: {
        userId: input.userId || null,
        userName: input.userName || 'Anonymous',
        userRole: input.userRole || 'user',
        action: String(input.action).slice(0, 100),
        category: input.category || 'user',
        detail: String(input.detail || '').slice(0, 500),
        metadataJson: JSON.stringify(input.metadata || {}),
        ipAddress,
      },
    });
  } catch (err) {
    // Don't let logging failures break the actual request
    console.error('[activity-log] Failed to log:', err);
  }
}

function getClientIp(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();
  return null;
}
