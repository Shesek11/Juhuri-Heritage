#!/bin/bash

# ============================================
# Juhuri Heritage - Next.js Deployment Script
# For xCloud / PM2 Server
# ============================================

set -e  # Exit on any error

SSH_HOST="Juhuri-Production"
REMOTE_PATH="/var/www/jun-juhuri.com"
PM2_NAME="nodejs-jun-juhuri.com"

echo "Starting Next.js deployment..."

# 1. Install dependencies
echo "Installing dependencies..."
npm install --production=false

# 2. Build Next.js (standalone output)
echo "Building Next.js..."
npm run build

# 3. Verify build output
if [ ! -d ".next/standalone" ]; then
    echo "Build failed - .next/standalone/ not found"
    exit 1
fi

echo "Build complete!"

# 4. Upload standalone server
echo "Uploading standalone server..."
scp -r .next/standalone/* "$SSH_HOST:$REMOTE_PATH/"

# 5. Upload static assets
echo "Uploading static assets..."
ssh "$SSH_HOST" "mkdir -p $REMOTE_PATH/.next/static"
scp -r .next/static/* "$SSH_HOST:$REMOTE_PATH/.next/static/"

# 6. Upload public files
echo "Uploading public files..."
ssh "$SSH_HOST" "mkdir -p $REMOTE_PATH/public"
scp -r public/* "$SSH_HOST:$REMOTE_PATH/public/"

# 7. Upload custom server wrapper
echo "Uploading server.js..."
scp server.js "$SSH_HOST:$REMOTE_PATH/server.js"

# 8. Upload package.json for any native deps
scp package.json "$SSH_HOST:$REMOTE_PATH/package.json"

# 9. Upload .env (if not already on server)
if [ -f ".env" ]; then
    echo "Uploading .env..."
    scp .env "$SSH_HOST:$REMOTE_PATH/.env"
fi

# 10. Upload schema.sql for DB init
if [ -f "schema.sql" ]; then
    scp schema.sql "$SSH_HOST:$REMOTE_PATH/schema.sql"
fi

# 11. Install production dependencies on server (for native bindings like mysql2)
echo "Installing server dependencies..."
ssh "$SSH_HOST" "cd $REMOTE_PATH && npm install --production"

# 12. Restart PM2
echo "Restarting PM2..."
ssh "$SSH_HOST" "cd $REMOTE_PATH && pm2 restart $PM2_NAME --update-env && pm2 save"

# 13. Verify server is responding
echo "Verifying server..."
sleep 3
HTTP_CODE=$(ssh "$SSH_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/")
if [ "$HTTP_CODE" = "200" ]; then
    echo "Server responding (HTTP $HTTP_CODE)"
else
    echo "Server returned HTTP $HTTP_CODE - check logs: ssh $SSH_HOST 'pm2 logs $PM2_NAME --lines 20'"
fi

echo ""
echo "Deployment complete!"
