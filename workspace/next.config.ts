import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix "package-lock.json outside Git repository" warning.
  // Tells Turbopack to use the project root, ignoring parent .git dirs.
  turbopack: {
    root: __dirname,
  },

  // Disable React Strict Mode in dev to halve memory pressure (Strict Mode
  // double-renders every component in dev, which doubles heap usage during
  // route compilation — fatal on memory-constrained hosts). Re-enable only
  // when you have ≥8GB RAM available for the dev server.
  reactStrictMode: false,

  // Do NOT ignore TypeScript build errors in production — surface them at build time.
  typescript: {
    ignoreBuildErrors: false,
  },

  // Allow cross-origin dev requests from the Z.ai preview gateway and local IPs.
  allowedDevOrigins: [
    "127.0.0.1:3000",
    "localhost:3000",
    "*.space-z.ai",
  ],

  // Production security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
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

export default nextConfig;
