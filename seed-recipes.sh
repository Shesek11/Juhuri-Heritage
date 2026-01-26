#!/bin/bash
# Script to seed demo recipes into the database

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection details from .env
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USERNAME:-${DB_USER:-root}}
DB_NAME=${DB_DATABASE:-${DB_NAME}}

echo "🌱 מכניס נתוני דמו למסד נתונים..."
echo "📍 שרת: $DB_HOST:$DB_PORT"
echo "💾 מסד נתונים: $DB_NAME"
echo "👤 משתמש: $DB_USER"
echo ""

# Check if seed file exists
if [ ! -f "seed-recipes.sql" ]; then
    echo "❌ שגיאה: קובץ seed-recipes.sql לא נמצא"
    exit 1
fi

# Run the SQL file
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < seed-recipes.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ נתוני הדמו הוכנסו בהצלחה!"
    echo "📊 נוספו:"
    echo "   • 5 מתכונים מסורתיים"
    echo "   • 8 תגיות"
    echo "   • הערות ולייקים לדוגמה"
    echo ""
    echo "🎉 המערכת מוכנה לשימוש!"
else
    echo ""
    echo "❌ שגיאה בהכנסת הנתונים"
    exit 1
fi
