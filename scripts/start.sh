#!/bin/bash
# Start script — always uses the correct Neon DATABASE_URL
# Run: bash scripts/start.sh

# Unset any stale DATABASE_URL from the shell (e.g. old SQLite path)
unset DATABASE_URL

# Set the correct Neon PostgreSQL URL (without channel_binding=require
# which breaks Prisma's URL parser)
export DATABASE_URL="postgresql://neondb_owner:npg_wMxoizRH02OW@ep-spring-moon-ax91e98c-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"
export PRACPEDIA_TEST_PASSWORDS_VISIBLE=true

cd /home/z/my-project/workspace

echo "Starting Next.js dev server on port 3000..."
echo "DATABASE_URL: ${DATABASE_URL:0:50}..."
echo ""

npx next dev -p 3000 -H 0.0.0.0
