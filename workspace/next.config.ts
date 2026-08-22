import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // NOTE: Do NOT set `output: "standalone"` — that's for Docker/VPS self-hosting.
  // Vercel has its own build system and handles output automatically.

  // Enable React Strict Mode to surface latent bugs (double-render in dev only).
  reactStrictMode: true,

  // Do NOT ignore TypeScript build errors in production — surface them at build time.
  typescript: {
    ignoreBuildErrors: false,
  },

  // Allow cross-origin dev requests from the Z.ai preview gateway and local IPs.
  // Without this, Next.js blocks _next/static/chunks/* from preview-*.space-z.ai
  // and the page hangs forever on the loading screen.
  //
  // IMPORTANT: Next.js 16 matches against the bare hostname (no protocol).
  // The preview host changes per chat session (chat_id is in the subdomain),
  // so we include multiple formats for maximum compatibility.
  allowedDevOrigins: [
    "127.0.0.1:3000",
    "localhost:3000",
    "21.0.21.87:3000",
    // Bare hostname (no protocol) — Next.js 16's preferred format
    "preview-chat-3648604d-0a50-4309-90f7-091d34201496.space-z.ai",
    "*.space-z.ai",
    // With protocol — for older Next.js versions / edge cases
    "https://preview-chat-3648604d-0a50-4309-90f7-091d34201496.space-z.ai",
    "http://preview-chat-3648604d-0a50-4309-90f7-091d34201496.space-z.ai",
    "https://*.space-z.ai",
    "http://*.space-z.ai",
  ],

  // Production security headers — relaxed for iframe embedding on Z.ai preview.
  //
  // The Z.ai chat gateway renders the app inside an iframe on
  // https://preview-chat-*.space-z.ai/. Standard security headers like
  // `X-Frame-Options: DENY` or `frame-ancestors 'self'` would block this
  // entirely, showing a blank preview. We:
  //   1. Remove X-Frame-Options entirely (modern browsers ignore it when CSP
  //      frame-ancestors is present, but old browsers honor it).
  //   2. Set `frame-ancestors *` to allow any origin to embed the app.
  //
  // This is acceptable because:
  //   - In dev (localhost), nobody is iframe-embedding your app anyway.
  //   - On Vercel, you control the deploy and can tighten this later.
  //   - Clickjacking risk is minimal for a study portal (no financial flows).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Note: X-Frame-Options intentionally omitted — would conflict with
          // CSP frame-ancestors and break the Z.ai preview iframe.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https:",
              // Allow iframe embedding from ANY origin — required for the
              // Z.ai chat gateway preview (preview-chat-*.space-z.ai).
              "frame-ancestors *",
              "form-action 'self'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sentry wrapper — only active when SENTRY_DSN is set
// ─────────────────────────────────────────────────────────────────────────────
export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
