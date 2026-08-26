#!/bin/bash
# PracPedia dev server startup script
# Always loads env vars from .env file — prevents stale shell env overrides

cd /home/z/my-project/workspace

# Kill any existing dev server
pkill -f "next dev" 2>/dev/null
pkill -f "bun.*dev" 2>/dev/null
sleep 2

# Unset any stale env vars from the shell
unset DATABASE_URL
unset JWT_SECRET
unset PRACPEDIA_TEST_PASSWORDS_VISIBLE

# Load env vars from .env file (overrides shell env)
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✓ Loaded .env"
  echo "  DATABASE_URL: ${DATABASE_URL:0:50}..."
  echo "  PRACPEDIA_TEST_PASSWORDS_VISIBLE: $PRACPEDIA_TEST_PASSWORDS_VISIBLE"
else
  echo "✗ No .env file found! Run: cp .env.example .env"
  exit 1
fi

# Start the dev server
echo ""
echo "Starting dev server..."
rm -f dev.log
nohup bun run dev > dev.log 2>&1 &
sleep 8

# Verify
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
  echo "✓ Server running at http://localhost:3000"
  echo ""
  echo "Demo logins:"
  echo "  Super Admin: admin@gallery.com / admin123"
  echo "  Student:     student@gallery.com / user123"
  echo "  Artist:      sajid@draw.com / artist123"
else
  echo "✗ Server failed to start — check dev.log"
  tail -20 dev.log
fi
