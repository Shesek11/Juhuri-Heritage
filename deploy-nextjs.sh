#!/bin/bash

# ============================================
# Juhuri Heritage - Next.js Deployment Script
# For xCloud / PM2 Server
# ============================================
# ROLLBACK: If anything goes wrong, run:
#   bash rollback.sh
# ============================================

set -e  # Exit on any error

SSH_HOST="Juhuri-Production"
REMOTE_PATH="/var/www/jun-juhuri.com"
PM2_NAME="nodejs-jun-juhuri.com"
BACKUP_DIR="/var/www/jun-juhuri.com.bak-$(date +%Y%m%d-%H%M%S)"

echo "====================================="
echo "  Next.js Deployment — jun-juhuri.com"
echo "====================================="

# -------------------------------------------------------
# 0. BACKUP current production (Express SPA) on server
# -------------------------------------------------------
echo ""
echo "[0/13] Backing up current production to $BACKUP_DIR ..."
ssh "$SSH_HOST" "cp -a $REMOTE_PATH $BACKUP_DIR"
echo "  Backup created at $BACKUP_DIR"
echo "  To rollback: bash rollback.sh  (or manually: ssh $SSH_HOST 'rm -rf $REMOTE_PATH && mv $BACKUP_DIR $REMOTE_PATH && cd $REMOTE_PATH && pm2 restart $PM2_NAME')"

# Save backup path for rollback script
echo "$BACKUP_DIR" > .last-backup-path

# -------------------------------------------------------
# 1. Build locally
# -------------------------------------------------------
echo ""
echo "[1/13] Installing dependencies..."
npm install --production=false

echo "[2/13] Building Next.js..."
npm run build

# 3. Verify build output
if [ ! -d ".next/standalone" ]; then
    echo "Build failed - .next/standalone/ not found"
    exit 1
fi
echo "[3/13] Build verified (.next/standalone exists)"

# -------------------------------------------------------
# 4-10. Upload to server
# -------------------------------------------------------
echo ""
echo "[4/13] Uploading standalone server..."
scp -r .next/standalone/* "$SSH_HOST:$REMOTE_PATH/"

echo "[5/13] Uploading static assets..."
ssh "$SSH_HOST" "mkdir -p $REMOTE_PATH/.next/static"
scp -r .next/static/* "$SSH_HOST:$REMOTE_PATH/.next/static/"

echo "[6/13] Uploading public files..."
ssh "$SSH_HOST" "mkdir -p $REMOTE_PATH/public"
scp -r public/* "$SSH_HOST:$REMOTE_PATH/public/"

echo "[7/13] Uploading server.js..."
scp server.js "$SSH_HOST:$REMOTE_PATH/server.js"

echo "[8/13] Uploading package.json..."
scp package.json "$SSH_HOST:$REMOTE_PATH/package.json"

# 9. Upload .env (if exists locally — usually already on server)
if [ -f ".env" ]; then
    echo "[9/13] Uploading .env..."
    scp .env "$SSH_HOST:$REMOTE_PATH/.env"
else
    echo "[9/13] Skipping .env (not found locally, using server copy)"
fi

# 10. Upload schema.sql for DB init
if [ -f "schema.sql" ]; then
    echo "[10/13] Uploading schema.sql..."
    scp schema.sql "$SSH_HOST:$REMOTE_PATH/schema.sql"
else
    echo "[10/13] Skipping schema.sql (not found)"
fi

# -------------------------------------------------------
# 11. Install deps & restart
# -------------------------------------------------------
echo ""
echo "[11/13] Installing server dependencies..."
ssh "$SSH_HOST" "cd $REMOTE_PATH && npm install --production"

echo "[12/13] Restarting PM2..."
ssh "$SSH_HOST" "cd $REMOTE_PATH && pm2 restart $PM2_NAME --update-env && pm2 save"

# -------------------------------------------------------
# 13. Health check
# -------------------------------------------------------
echo ""
echo "[13/13] Verifying server (waiting 5s for startup)..."
sleep 5

HTTP_CODE=$(ssh "$SSH_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/")
if [ "$HTTP_CODE" = "200" ]; then
    echo "  Server responding (HTTP $HTTP_CODE)"
else
    echo ""
    echo "  WARNING: Server returned HTTP $HTTP_CODE"
    echo "  Check logs: ssh $SSH_HOST 'pm2 logs $PM2_NAME --lines 30'"
    echo ""
    echo "  To rollback immediately: bash rollback.sh"
    exit 1
fi

# Quick SSR verification — check that HTML has real content
echo ""
echo "Verifying SSR output..."
SSR_CHECK=$(ssh "$SSH_HOST" "curl -s http://localhost:5000/ | grep -c '<html' || true")
if [ "$SSR_CHECK" -gt 0 ]; then
    echo "  SSR output verified (HTML present)"
else
    echo "  WARNING: SSR output may be empty — check manually"
fi

echo ""
echo "====================================="
echo "  Deployment complete!"
echo "  Backup: $BACKUP_DIR"
echo "  Rollback: bash rollback.sh"
echo "====================================="
