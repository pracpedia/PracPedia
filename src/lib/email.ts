/**
 * Resend email integration — transactional emails for booking lifecycle.
 *
 * Free tier: 100 emails/day, 3000/month — plenty for PracPedia's volume.
 * Signup: https://resend.com
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

interface ResendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  reply_to?: string;
}

export async function sendEmail(payload: ResendEmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = payload.from || process.env.EMAIL_FROM || 'PracPedia <onboarding@resend.dev>';

  if (!apiKey) {
    console.log('[email] RESEND_API_KEY not set — skipping email send to:', payload.to);
    return false;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.reply_to || 'pracpedia@gmail.com',
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[email] Resend API error ${res.status}:`, errText.slice(0, 300));
      return false;
    }

    const data = await res.json().catch(() => ({}));
    console.log('[email] Sent to:', payload.to, '| id:', data.id || '(unknown)');
    return true;
  } catch (err: any) {
    console.error('[email] Send failed (non-fatal):', err?.message || err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface BookingEmailContext {
  bookingId: string;
  serviceType: string;
  notebookProvider: string;
  subject: string;
  description: string;
  price: number;
  clientName: string;
  clientEmail: string;
  artistName: string;
  artistEmail: string;
  artistRating?: number;
  appUrl: string;
}

function formatBDT(amount: number): string {
  return `৳${Number(amount || 0).toLocaleString('en-US')}`;
}

function serviceLabel(s: string): string {
  if (s === 'drawing_only') return 'Drawing Only';
  if (s === 'drawing_writing') return 'Drawing + Writing';
  return s;
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function emailShell(innerContent: string, appUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PracPedia</title>
</head>
<body style="margin:0;padding:0;background:#05070e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#05070e;min-height:100vh;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#0d121f;border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.06);background:linear-gradient(135deg,rgba(6,182,212,0.08),rgba(99,102,241,0.04));">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size:18px;font-weight:900;color:#fff;letter-spacing:-0.02em;">
                    Prac<span style="color:#22d3ee;">Pedia</span>
                  </td>
                  <td align="right" style="font-size:10px;font-family:monospace;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">
                    HSC Practical Notebook Gallery
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${innerContent}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.01);">
              <p style="margin:0;font-size:11px;color:#64748b;line-height:1.6;">
                You received this email because you have a PracPedia account.
                <a href="${appUrl}" style="color:#22d3ee;text-decoration:none;">Visit your dashboard</a> to manage notifications.
              </p>
              <p style="margin:8px 0 0;font-size:10px;color:#475569;font-family:monospace;">
                © ${new Date().getFullYear()} PracPedia · Made with care in Bangladesh 🇧🇩
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function orderDetailsTable(ctx: BookingEmailContext): string {
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="font-size:10px;font-family:monospace;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Subject</span><br>
        <span style="font-size:14px;color:#e2e8f0;font-weight:600;">${escapeHtml(ctx.subject)}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="font-size:10px;font-family:monospace;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Service Type</span><br>
        <span style="font-size:14px;color:#e2e8f0;">${serviceLabel(ctx.serviceType)}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="font-size:10px;font-family:monospace;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Notebook</span><br>
        <span style="font-size:14px;color:#e2e8f0;">${ctx.notebookProvider === 'artist' ? 'Artist provides' : 'Client provides'}</span>
      </td>
    </tr>
    ${ctx.description ? `
    <tr>
      <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="font-size:10px;font-family:monospace;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Description</span><br>
        <span style="font-size:13px;color:#94a3b8;line-height:1.5;">${escapeHtml(ctx.description)}</span>
      </td>
    </tr>
    ` : ''}
    <tr>
      <td style="padding:14px 18px;background:rgba(34,211,238,0.04);">
        <span style="font-size:10px;font-family:monospace;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Total Price</span><br>
        <span style="font-size:18px;color:#22d3ee;font-weight:800;">${formatBDT(ctx.price)}</span>
      </td>
    </tr>
  </table>
  `.trim();
}

function ctaButton(label: string, url: string): string {
  return `
  <a href="${url}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:linear-gradient(135deg,#06b6d4,#6366f1);color:#fff;font-size:13px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.02em;">
    ${escapeHtml(label)}
  </a>
  `.trim();
}

export async function sendOrderPlacedEmails(ctx: BookingEmailContext): Promise<void> {
  const clientHtml = emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff;">Order Placed ✅</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;line-height:1.6;">
      Hi ${escapeHtml(ctx.clientName)},<br>
      Your order with <strong style="color:#fbbf24;">${escapeHtml(ctx.artistName)}</strong> has been placed successfully.
      The artist will review your request and accept it shortly.
    </p>
    ${orderDetailsTable(ctx)}
    <p style="margin:16px 0 0;font-size:12px;color:#64748b;">
      Artist: ${escapeHtml(ctx.artistName)}${ctx.artistRating ? ` (★ ${ctx.artistRating.toFixed(1)})` : ''}<br>
      Order ID: <code style="font-family:monospace;color:#475569;">${escapeHtml(ctx.bookingId)}</code>
    </p>
    ${ctaButton('View Your Order', `${ctx.appUrl}/?view=bookings`)}
  `, ctx.appUrl);

  const artistHtml = emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff;">New Order Request 🛎️</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;line-height:1.6;">
      Hi ${escapeHtml(ctx.artistName)},<br>
      <strong style="color:#22d3ee;">${escapeHtml(ctx.clientName)}</strong> just placed an order for your sketch services.
      Review the details below and accept it when you're ready to start.
    </p>
    ${orderDetailsTable(ctx)}
    <p style="margin:16px 0 0;font-size:12px;color:#64748b;">
      Client: ${escapeHtml(ctx.clientName)} (${escapeHtml(ctx.clientEmail)})<br>
      Order ID: <code style="font-family:monospace;color:#475569;">${escapeHtml(ctx.bookingId)}</code>
    </p>
    ${ctaButton('Review Order', `${ctx.appUrl}/?view=artist_dashboard`)}
  `, ctx.appUrl);

  await Promise.allSettled([
    sendEmail({ to: ctx.clientEmail, subject: `🎨 Order Placed — ${serviceLabel(ctx.serviceType)} for ${ctx.subject}`, html: clientHtml }),
    sendEmail({ to: ctx.artistEmail, subject: `🛎️ New Order Request from ${ctx.clientName}`, html: artistHtml }),
  ]);
}

export async function sendOrderAcceptedEmail(ctx: BookingEmailContext): Promise<void> {
  const html = emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff;">Order Accepted ✅</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;line-height:1.6;">
      Hi ${escapeHtml(ctx.clientName)},<br>
      Good news! <strong style="color:#fbbf24;">${escapeHtml(ctx.artistName)}</strong> accepted your order and has started working on it.
      You'll receive another email when the work is delivered.
    </p>
    ${orderDetailsTable(ctx)}
    <p style="margin:16px 0 0;font-size:12px;color:#64748b;">
      Estimated delivery depends on the artist's workload. You can check the status anytime from your dashboard.
    </p>
    ${ctaButton('Track Your Order', `${ctx.appUrl}/?view=bookings`)}
  `, ctx.appUrl);

  await sendEmail({ to: ctx.clientEmail, subject: `✅ Your order has been accepted by ${ctx.artistName}!`, html });
}

export async function sendOrderDeliveredEmail(ctx: BookingEmailContext): Promise<void> {
  const html = emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff;">Order Delivered 📦</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;line-height:1.6;">
      Hi ${escapeHtml(ctx.clientName)},<br>
      Your order from <strong style="color:#fbbf24;">${escapeHtml(ctx.artistName)}</strong> has been marked as delivered.
      Please review the work and rate your experience with the artist.
    </p>
    ${orderDetailsTable(ctx)}
    <div style="margin:20px 0;padding:16px;background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.2);border-radius:10px;">
      <p style="margin:0;font-size:13px;color:#fbbf24;font-weight:700;">⭐ How was your experience?</p>
      <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
        Your rating helps other students find trustworthy artists. It takes 10 seconds.
      </p>
    </div>
    ${ctaButton('Rate Your Artist', `${ctx.appUrl}/?view=bookings`)}
  `, ctx.appUrl);

  await sendEmail({ to: ctx.clientEmail, subject: `📦 Order Delivered — Please rate your experience with ${ctx.artistName}`, html });
}