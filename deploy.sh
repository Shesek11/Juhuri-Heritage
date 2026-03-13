#!/bin/bash

# ============================================
# Juhuri Heritage - Deployment Script
# Next.js Standalone + xCloud / PM2
# ============================================

set -e  # Exit on any error

SSH_HOST="Juhuri-Production"
REMOTE_PATH="/var/www/jun-juhuri.com"
PM2_NAME="nodejs-jun-juhuri.com"

echo "Starting deployment..."

# 1. Install dependencies (need devDeps for build)
echo "Installing dependencies..."
npm install

# 2. Build Next.js (creates .next/standalone/)
echo "Building Next.js..."
npx next build

# 3. Verify standalone output
if [ ! -f ".next/standalone/server.js" ]; then
    echo "ERROR: Build failed - .next/standalone/server.js not found"
    exit 1
fi

echo "Build complete!"

# 4. Backup current production
echo "Backing up current production..."
ssh "$SSH_HOST" "
  mkdir -p $REMOTE_PATH/backup-previous
  cp $REMOTE_PATH/server.js $REMOTE_PATH/backup-previous/ 2>/dev/null || true
  cp $REMOTE_PATH/package.json $REMOTE_PATH/backup-previous/ 2>/dev/null || true
  cp -r $REMOTE_PATH/.next $REMOTE_PATH/backup-previous/.next 2>/dev/null || true
"

# 5. Upload standalone build
echo "Uploading standalone server..."
scp .next/standalone/server.js "$SSH_HOST:$REMOTE_PATH/server.js"
scp .next/standalone/package.json "$SSH_HOST:$REMOTE_PATH/package.json"

echo "Uploading .next build..."
ssh "$SSH_HOST" "rm -rf $REMOTE_PATH/.next"
ssh "$SSH_HOST" "mkdir -p $REMOTE_PATH/.next"
scp -r .next/standalone/.next/* "$SSH_HOST:$REMOTE_PATH/.next/"

echo "Uploading static assets..."
ssh "$SSH_HOST" "mkdir -p $REMOTE_PATH/.next/static"
scp -r .next/static/* "$SSH_HOST:$REMOTE_PATH/.next/static/"

echo "Uploading node_modules (standalone subset)..."
ssh "$SSH_HOST" "rm -rf $REMOTE_PATH/node_modules"
scp -r .next/standalone/node_modules "$SSH_HOST:$REMOTE_PATH/node_modules"

echo "Uploading public files..."
scp -r public/* "$SSH_HOST:$REMOTE_PATH/public/"

# 6. Symlink uploads directory (if not already linked)
ssh "$SSH_HOST" "
  [ -d $REMOTE_PATH/uploads ] || ln -sf /var/www/jun-juhuri.com/uploads $REMOTE_PATH/uploads
"

# 7. Generate static robots.txt (Nginx serves from site root)
echo "Generating robots.txt..."
ssh "$SSH_HOST" "
  cd $REMOTE_PATH
  PORT=5000 node -e \"
    const http = require('http');
    const next = require('next');
    const app = next({ dev: false });
    app.prepare().then(() => {
      const handle = app.getRequestHandler();
      const server = http.createServer(handle);
      server.listen(5099, () => {
        http.get('http://localhost:5099/robots.txt', (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            require('fs').writeFileSync('robots.txt', data);
            server.close();
            process.exit(0);
          });
        });
      });
    });
  \" 2>/dev/null || echo 'robots.txt generation skipped (using existing)'
"

# 8. Restart PM2
echo "Restarting PM2..."
ssh "$SSH_HOST" "
  pm2 delete $PM2_NAME 2>/dev/null || true
  cd $REMOTE_PATH && PORT=5000 pm2 start server.js --name $PM2_NAME --cwd $REMOTE_PATH
  pm2 save
"

# 9. Verify server is responding
echo "Verifying server..."
sleep 3
HTTP_CODE=$(ssh "$SSH_HOST" "curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:5000/")
if [ "$HTTP_CODE" = "200" ]; then
    echo "Server responding (HTTP $HTTP_CODE)"
else
    echo "WARNING: Server returned HTTP $HTTP_CODE"
    echo "Check logs: ssh $SSH_HOST 'pm2 logs $PM2_NAME --lines 20'"
    echo ""
    echo "To rollback to previous version:"
    echo "  ssh $SSH_HOST 'cp $REMOTE_PATH/backup-previous/server.js $REMOTE_PATH/ && cp -r $REMOTE_PATH/backup-previous/.next $REMOTE_PATH/ && pm2 restart $PM2_NAME'"
    exit 1
fi

# 10. Verify SSR is working
SSR_CHECK=$(ssh "$SSH_HOST" "curl -s http://localhost:5000/ | grep -c '__NEXT'")
if [ "$SSR_CHECK" -gt "0" ]; then
    echo "SSR verified (Next.js rendering)"
else
    echo "WARNING: SSR check failed - page may not be rendering with Next.js"
fi

echo ""
echo "Deployment complete!"
echo "Site: https://jun-juhuri.com"
