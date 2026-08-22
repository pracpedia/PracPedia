import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",

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
  // Note: Next.js only accepts string entries here (no regex). We add the specific
  // preview host pattern as a wildcard-ish string. If you have multiple preview
  // subdomains, add them explicitly.
  allowedDevOrigins: [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://21.0.21.87:3000",
    "https://preview-chat-3648604d-0a50-4309-90f7-091d34201496.space-z.ai",
    "https://*.space-z.ai",
    "http://*.space-z.ai",
  ],

  // Production security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Allow iframe embedding from space-z.ai preview subdomains. The Z.ai
          // chat gateway renders the app inside an iframe — SAMEORIGIN would
          // block the preview entirely. CSP frame-ancestors is the modern
          // mechanism; X-Frame-Options is a legacy fallback.
          { key: "X-Frame-Options", value: "ALLOWALL" },
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
              // Allow embedding from any space-z.ai preview subdomain (the Z.ai
              // chat gateway renders the app inside an iframe). Without this,
              // `frame-ancestors 'self'` would block the preview entirely.
              "frame-ancestors 'self' https://*.space-z.ai http://*.space-z.ai",
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
  // Only activate Sentry when the auth token is present (avoids build errors
  // when SENTRY_AUTH_TOKEN is not set — e.g. local dev or non-Sentry deploys)
  silent: true,
  // Disable source map upload when no auth token (avoids build failure)
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Tree-shake Sentry in production to reduce bundle size
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
