#!/bin/bash

# ============================================
# Juhuri Heritage - Fast Deployment Script
# Next.js Standalone + xCloud / PM2
# Single tar-pipe transfer (no scp -r)
# ============================================

set -e

SSH_HOST="Juhuri-Production"
REMOTE_PATH="/var/www/jun-juhuri.com"
PM2_NAME="nodejs-jun-juhuri.com"
START_TIME=$SECONDS

echo "=== Deploy started ==="

# 0. Security check
echo "[0/3] Running security audit..."
npm audit --production --audit-level=high 2>/dev/null || echo "WARN: npm audit found issues (non-blocking)"

# 1. Build
echo "[1/3] Building Next.js..."
npx next build

if [ ! -f ".next/standalone/server.js" ]; then
    echo "ERROR: Build failed - .next/standalone/server.js not found"
    exit 1
fi

# Copy static into standalone so we have one directory to tar
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true
echo "      Build done ($(( SECONDS - START_TIME ))s)"

# 2. Backup + tar-pipe upload (one SSH for backup, one for upload)
echo "[2/3] Uploading via tar pipe..."
ssh "$SSH_HOST" "
  mkdir -p $REMOTE_PATH/backup-previous &&
  cp $REMOTE_PATH/server.js $REMOTE_PATH/backup-previous/ 2>/dev/null;
  cp $REMOTE_PATH/package.json $REMOTE_PATH/backup-previous/ 2>/dev/null;
  true
"

# Stop PM2 before upload to prevent crash loops during file replacement
ssh "$SSH_HOST" "pm2 delete $PM2_NAME 2>/dev/null || true"

tar czf - -C .next/standalone --exclude='.env*' . | ssh "$SSH_HOST" "
  cd $REMOTE_PATH &&
  rm -rf .next node_modules server.js &&
  tar xzf -
"
echo "      Upload done ($(( SECONDS - START_TIME ))s)"

# 3. Restart + verify (single SSH)
echo "[3/3] Restarting server..."
RESULT=$(ssh "$SSH_HOST" "
  cd $REMOTE_PATH

  # Robots.txt
  [ -f public/robots.txt ] && cp public/robots.txt robots.txt 2>/dev/null
  [ -f dist/robots.txt ] && cp dist/robots.txt robots.txt 2>/dev/null

  # Uploads symlink
  [ -d uploads ] || ln -sf /var/www/jun-juhuri.com/uploads uploads

  # Start PM2 fresh
  PORT=5000 pm2 start server.js --name $PM2_NAME --cwd $REMOTE_PATH
  pm2 save

  # Wait and verify
  sleep 4
  HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:5000/)
  echo \"HTTP:\$HTTP_CODE\"
")

HTTP_CODE=$(echo "$RESULT" | grep "HTTP:" | sed 's/HTTP://')
ELAPSED=$(( SECONDS - START_TIME ))

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "=== Deploy complete in ${ELAPSED}s ==="
    echo "    Site: https://jun-juhuri.com"
else
    echo ""
    echo "WARNING: Server returned HTTP $HTTP_CODE"
    echo "Check: ssh $SSH_HOST 'pm2 logs $PM2_NAME --lines 20'"
    echo "Rollback: ssh $SSH_HOST 'cp $REMOTE_PATH/backup-previous/server.js $REMOTE_PATH/ && pm2 restart $PM2_NAME'"
    exit 1
fi
