#!/bin/bash

# ============================================
# Juhuri Heritage - Deployment Script
# For xCloud / Node.js Server
# ============================================

set -e  # Exit on any error

SSH_HOST="Juhuri-Production"
REMOTE_PATH="/var/www/jun-juhuri.com"
PM2_NAME="nodejs-jun-juhuri.com"

echo "🚀 Starting deployment..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# 2. Build frontend (Vite SPA — production server uses Express + dist/)
echo "🔨 Building frontend..."
npm run build:old

# 3. Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist folder not found"
    exit 1
fi

echo "✅ Build complete!"

# 4. Upload to server
echo "📤 Uploading dist/ to server..."
scp -r dist/* "$SSH_HOST:$REMOTE_PATH/dist/"

echo "📤 Uploading server/ to server..."
scp -r server/* "$SSH_HOST:$REMOTE_PATH/server/"

echo "📤 Uploading package.json..."
scp package.json "$SSH_HOST:$REMOTE_PATH/package.json"

# 5. Copy robots.txt to site root (Nginx serves from there)
echo "📋 Copying robots.txt..."
ssh "$SSH_HOST" "cp $REMOTE_PATH/dist/robots.txt $REMOTE_PATH/robots.txt 2>/dev/null || true"

# 6. Install production dependencies on server
echo "📦 Installing server dependencies..."
ssh "$SSH_HOST" "cd $REMOTE_PATH && npm install --production"

# 7. Restart PM2 with correct environment
echo "🔄 Restarting PM2..."
ssh "$SSH_HOST" "cd $REMOTE_PATH && pm2 restart $PM2_NAME --update-env && pm2 save"

# 8. Verify server is responding
echo "🔍 Verifying server..."
sleep 2
HTTP_CODE=$(ssh "$SSH_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Server responding (HTTP $HTTP_CODE)"
else
    echo "⚠️  Server returned HTTP $HTTP_CODE — check logs with: ssh $SSH_HOST 'pm2 logs $PM2_NAME --lines 20'"
fi

echo ""
echo "🎉 Deployment complete!"
