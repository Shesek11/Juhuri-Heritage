#!/bin/bash
# Clean build script for production

echo "🧹 מנקה build cache..."

# Remove build artifacts
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite

# Remove node_modules and reinstall
echo "📦 מסיר node_modules..."
rm -rf node_modules
rm -f package-lock.json

echo "📥 מתקין dependencies..."
npm install

echo "🔨 בונה את הפרויקט..."
npm run build

echo "✅ Build הושלם!"
echo ""
echo "עכשיו הרץ: pm2 restart all"
