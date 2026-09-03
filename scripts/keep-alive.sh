#!/bin/bash
# Keep-alive watchdog for the Next.js dev server.
# Restarts the server if it dies, so the preview stays up.
cd /home/z/my-project/workspace
while true; do
  if ! ss -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "[$(date)] Starting Next.js dev server..."
    npx next dev -p 3000 -H 0.0.0.0 > /tmp/next-dev.log 2>&1 &
    NEXT_PID=$!
    echo "[$(date)] Started PID $NEXT_PID"
    # Wait for ready
    for i in $(seq 1 30); do
      if grep -q "Ready" /tmp/next-dev.log 2>/dev/null; then
        echo "[$(date)] Server ready"
        break
      fi
      sleep 1
    done
    # Wait for the process to exit (it will be killed by sandbox or crash)
    wait $NEXT_PID 2>/dev/null
    echo "[$(date)] Server process exited, restarting in 2s..."
    sleep 2
  else
    sleep 5
  fi
done
