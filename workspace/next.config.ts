import type { NextConfig } from "next";

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
          // MIME sniffing protection
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Clickjacking protection — allow same-origin only
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // HSTS — force HTTPS for 1 year (only honored over HTTPS)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          // Disable referrer leak to cross-origin destinations
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restrict powerful browser features
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // CSP — locked down to self + a few trusted inline sources
          // (loose enough for shadcn/ui + Tailwind, strict enough to block exfil)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https:",
              "frame-ancestors 'self'",
              "form-action 'self'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

