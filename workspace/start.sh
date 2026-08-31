#!/bin/bash
# PracPedia — start the production server.
#
# This builds (if .next/ is missing) and starts `next start` (the production
# server) instead of `next dev` (the development server). Why?
#
#   - `next dev` compiles each route on-demand with webpack/Turbopack. Each
#     route adds 200-500MB to the parent process. On a 4GB / no-swap sandbox
#     the kernel SIGKILLs the dev server after 1-2 route compiles.
#   - `next start` serves pre-built static bundles from `.next/`. Memory
#     footprint is ~150MB regardless of how many routes you visit. Response
#     times are 3-50ms instead of 5-15s. No OOM crashes.
#
# Trade-off: code changes require `bun run build` (or `npm run build`) and a
# server restart. Edit this script to switch back to `next dev` if you want
# hot-reload during development (requires ≥8GB RAM).

set -e
cd /home/z/my-project/workspace

# Load env vars from .env (if present)
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

export NODE_OPTIONS="--max-old-space-size=512"
export NEXT_TELEMETRY_DISABLED=1

# Build if .next/ is missing or BUILD_ID is absent
if [ ! -f .next/BUILD_ID ]; then
  echo "→ No build found. Running 'next build' first..."
  NODE_OPTIONS="--max-old-space-size=2048" npx next build
fi

# Kill any existing server on port 3000
pkill -f "next start" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 2

# Start the production server (detached)
( exec node /home/z/my-project/workspace/node_modules/.bin/next start -p 3000 > /tmp/pracpedia-prod.log 2>&1 & )

echo "✓ Production server starting at http://localhost:3000"
echo "  PID: $(pgrep -f 'next-server' | head -1)"
echo "  Log: /tmp/pracpedia-prod.log"
echo ""
echo "To stop: pkill -f 'next start' && pkill -f 'next-server'"
echo "To rebuild after code changes: bun run build && ./start.sh"
