#!/bin/bash
# Keep-alive watchdog — restarts the server if it dies
cd /home/z/my-project/workspace
export DATABASE_URL="postgresql://neondb_owner:npg_wMxoizRH02OW@ep-spring-moon-ax91e98c-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"
export PRACPEDIA_TEST_PASSWORDS_VISIBLE=true
export CLOUDINARY_URL="cloudinary://837648449352654:pC9LGOA38gYYGXpe60n8pYXviy4@tn1bzkyj"

while true; do
  # Check if port 3000 is listening
  if ! ss -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "[$(date)] Server down — restarting..."
    npx next dev -p 3000 -H 0.0.0.0 > /tmp/next-dev.log 2>&1 &
    NEXT_PID=$!
    echo "[$(date)] Started PID $NEXT_PID"
    # Wait for ready
    for i in $(seq 1 20); do
      if grep -q "Ready" /tmp/next-dev.log 2>/dev/null; then
        echo "[$(date)] Server ready"
        break
      fi
      sleep 1
    done
    # Keep pinging every 5 seconds to prevent sandbox from killing it
    while kill -0 $NEXT_PID 2>/dev/null; do
      curl -s -o /dev/null --max-time 5 http://localhost:3000/ 2>/dev/null
      sleep 3
    done
    echo "[$(date)] Server process exited, restarting in 2s..."
    sleep 2
  else
    # Server is running — ping to keep alive
    curl -s -o /dev/null --max-time 5 http://localhost:3000/ 2>/dev/null
    sleep 3
  fi
done
