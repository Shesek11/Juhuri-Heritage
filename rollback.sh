#!/bin/bash

# ============================================
# Juhuri Heritage - ROLLBACK Script
# Restores the previous Express SPA deployment
# ============================================

set -e

SSH_HOST="Juhuri-Production"
REMOTE_PATH="/var/www/jun-juhuri.com"
PM2_NAME="nodejs-jun-juhuri.com"

# Determine backup path
if [ -n "$1" ]; then
    BACKUP_DIR="$1"
elif [ -f ".last-backup-path" ]; then
    BACKUP_DIR=$(cat .last-backup-path)
else
    echo "Usage: bash rollback.sh [backup-path]"
    echo ""
    echo "No backup path provided and .last-backup-path not found."
    echo "List available backups on server:"
    echo "  ssh $SSH_HOST 'ls -d /var/www/jun-juhuri.com.bak-*'"
    exit 1
fi

echo "====================================="
echo "  ROLLBACK — jun-juhuri.com"
echo "====================================="
echo ""
echo "  Restoring from: $BACKUP_DIR"
echo "  Target: $REMOTE_PATH"
echo ""

# Verify backup exists on server
ssh "$SSH_HOST" "test -d $BACKUP_DIR" || {
    echo "ERROR: Backup directory not found on server: $BACKUP_DIR"
    echo ""
    echo "Available backups:"
    ssh "$SSH_HOST" "ls -d /var/www/jun-juhuri.com.bak-* 2>/dev/null || echo '  (none found)'"
    exit 1
}

# Confirm
read -p "Restore from backup? This will replace the current deployment. [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "[1/4] Stopping PM2 process..."
ssh "$SSH_HOST" "pm2 stop $PM2_NAME 2>/dev/null || true"

echo "[2/4] Replacing current deployment with backup..."
ssh "$SSH_HOST" "rm -rf $REMOTE_PATH && mv $BACKUP_DIR $REMOTE_PATH"

echo "[3/4] Restarting PM2..."
ssh "$SSH_HOST" "cd $REMOTE_PATH && pm2 restart $PM2_NAME --update-env && pm2 save"

echo "[4/4] Verifying server..."
sleep 3
HTTP_CODE=$(ssh "$SSH_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/")
if [ "$HTTP_CODE" = "200" ]; then
    echo "  Server responding (HTTP $HTTP_CODE)"
else
    echo "  WARNING: Server returned HTTP $HTTP_CODE"
    echo "  Check logs: ssh $SSH_HOST 'pm2 logs $PM2_NAME --lines 20'"
fi

echo ""
echo "====================================="
echo "  Rollback complete!"
echo "  Express SPA is back online."
echo "====================================="
