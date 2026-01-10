#!/bin/bash

# ============================================
# Juhuri Heritage - Deployment Script
# For xCloud / Node.js Server
# ============================================

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# 2. Build frontend
echo "🔨 Building frontend..."
npm run build

# 3. Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist folder not found"
    exit 1
fi

echo "✅ Build complete!"
echo ""
echo "📋 Next steps on your xCloud server:"
echo "1. Make sure environment variables are set:"
echo "   - DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD"
echo "   - JWT_SECRET"
echo "   - GEMINI_API_KEY"
echo "   - ADMIN_EMAIL"
echo "   - NODE_ENV=production"
echo "   - CORS_ORIGINS=https://juhuri.shesek.xyz"
echo ""
echo "2. Run the database schema:"
echo "   mysql -u \$DB_USERNAME -p \$DB_DATABASE < schema.sql"
echo ""
echo "3. Start the server:"
echo "   npm start"
echo ""
echo "🎉 Deployment prepared successfully!"
