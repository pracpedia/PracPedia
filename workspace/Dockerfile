# ─────────────────────────────────────────────────────────────────────────────
# PracPedia Production Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build:
#   1. deps  — install production deps only
#   2. build — compile Next.js + generate Prisma client + copy public
#   3. run   — minimal runtime image (~150MB)
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS deps
WORKDIR /app

# Install Bun for fast dependency install (matches dev workflow)
RUN npm install -g bun

# Copy only manifest files for cache-friendly install
COPY package.json bun.lock* ./
COPY prisma ./prisma

# Install with bun (faster than npm/pnpm), then explicitly generate Prisma
RUN bun install --frozen-lockfile || bun install


# ── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

RUN npm install -g bun

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env (no secrets — these are baked into the standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client + build Next.js standalone
RUN bunx prisma generate \
    && bun run build


# ── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS run
WORKDIR /app

# Run as non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy standalone output (Next.js bundles everything needed)
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Prisma needs the schema + client at runtime for migrations
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Create a directory for the SQLite DB (if using SQLite)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Production env defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
# Default to Postgres in production — override with env var
ENV DATABASE_URL="file:/app/data/custom.db"

USER nextjs

EXPOSE 3000

# Health check — pings /api/health every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
