# 🚀 מדריך העלאה לשרת - מערכת השוק הקהילתי

## 📋 סקירה כללית

מערכת שוק קהילתי מלאה עם כל התכונות מלבד תשלום:
- ✅ מערכת הזמנות מלאה
- ✅ שעות פתיחה חכמות
- ✅ מערכת התראות בזמן אמת
- ✅ סטטיסטיקות מתקדמות
- ✅ העלאת תמונות
- ✅ גיאוקודינג אוטומטי

---

## 🗄️ שלב 1: עדכון מסד הנתונים

### הכן את קובץ .env

```bash
# עבור לתיקיית הפרויקט
cd /var/www/juhuri.shesek.xyz

# ודא שקובץ .env קיים ומכיל את פרטי ההתחברות ל-DB
nano .env

# ודא שיש לך שורות אלו:
DB_HOST=localhost
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=juhuri_heritage
```

### הרצת מיגרציות

**אופציה A: סקריפט JavaScript (מומלץ - קורא מ-.env)**
```bash
# הרץ את הסקריפט
node scripts/run-marketplace-migrations.js

# הסקריפט יקרא אוטומטית את הפרטים מ-.env
# ויריץ את שתי המיגרציות בסדר הנכון
```

**אופציה B: ידנית עם MySQL CLI**
```bash
mysql -u your_username -p juhuri_heritage < migrations/012_marketplace_system.sql
mysql -u your_username -p juhuri_heritage < migrations/013_marketplace_orders.sql
```

### בדיקה
הסקריפט JavaScript יבדוק אוטומטית שכל הטבלאות נוצרו.
אם הרצת ידנית, תוכל לבדוק עם:

```bash
mysql -u your_username -p juhuri_heritage -e "SHOW TABLES LIKE 'marketplace_%';"

# צריך להציג 12 טבלאות:
# - marketplace_vendors
# - marketplace_menu_items
# - marketplace_hours
# - marketplace_closures
# - marketplace_reviews
# - marketplace_updates
# - marketplace_reports
# - marketplace_cart_items
# - marketplace_vendor_stats
# - marketplace_orders
# - marketplace_order_items
# - marketplace_notifications
```

---

## 📦 שלב 2: התקנת תלויות

```bash
# אם אתה משתמש ב-npm
npm install multer

# אם אתה משתמש ב-yarn
yarn add multer
```

**הערה:** multer כבר אמור להיות מותקן, אבל ודא שהגרסה עדכנית.

---

## 📁 שלב 3: יצירת תיקיית uploads

```bash
# צור תיקייה להעלאת תמונות
mkdir -p uploads
chmod 755 uploads

# ודא שתיקיית uploads נגישה לשרת
ls -la uploads/
```

**חשוב:** ודא ש-nginx/apache מוגדרים להגיש קבצים מתיקיית `/uploads`.

### דוגמת הגדרת nginx:
```nginx
location /uploads/ {
    alias /path/to/juhuri-heritage/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

---

## 🔄 שלב 4: הפעלת השרת מחדש

```bash
# אם משתמש ב-pm2
pm2 restart juhuri-heritage
pm2 logs juhuri-heritage --lines 50

# אם משתמש ב-systemd
sudo systemctl restart juhuri-heritage
sudo journalctl -u juhuri-heritage -f

# אם משתמש ב-node ישירות
# עצור את התהליך הנוכחי והפעל מחדש:
npm run start
```

---

## ✅ שלב 5: בדיקות

### 1. בדוק את ה-API
```bash
# בדוק שהשרת עובד
curl http://localhost:3000/api/marketplace/vendors

# צריך להחזיר [] או רשימת vendors
```

### 2. בדוק את העלאת תמונות
```bash
# נסה להעלות תמונה (דרך Postman או דפדפן)
# POST /api/upload
# עם file בשם 'file'
```

### 3. בדוק את הממשק
- פתח את האתר בדפדפן
- עבור לעמוד השוק
- בדוק שהמפה נטענת
- בדוק שניתן ליצור vendor חדש
- בדוק שההעלאה עובדת

---

## 🔐 שלב 6: הרשאות והגבלות

### הגדר הרשאות לתיקיית uploads
```bash
# ודא שהשרת יכול לכתוב לתיקייה
sudo chown -R www-data:www-data uploads/  # או המשתמש של השרת שלך
chmod -R 755 uploads/
```

### הגבל גודל העלאות ב-nginx (אופציונלי)
```nginx
client_max_body_size 15M;
```

---

## 🌍 שלב 7: הגדרות סביבה (אופציונלי)

אם יש צורך להגדיר משתני סביבה:

```bash
# ערוך את .env (אם קיים)
nano .env

# הוסף:
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=15728640  # 15MB in bytes
```

---

## 📊 שלב 8: בדיקות פונקציונליות מלאות

### בדוק כל פיצ'ר:

1. **יצירת Vendor**
   - [ ] יצירת vendor חדש עם תמונות
   - [ ] גיאוקודינג אוטומטי של כתובת
   - [ ] הצגה במפה עם marker ירוק/אדום

2. **הזמנות**
   - [ ] הוספת מנות לסל
   - [ ] יצירת הזמנה חדשה
   - [ ] קבלת התראה למוכר
   - [ ] עדכון סטטוס הזמנה
   - [ ] קבלת התראה ללקוח

3. **שעות פתיחה**
   - [ ] הגדרת שעות פתיחה
   - [ ] סגירות מיוחדות
   - [ ] בדיקת סטטוס חי במפה
   - [ ] הודעות "פתוח עד..." / "נפתח ב..."

4. **סטטיסטיקות**
   - [ ] טאב סטטיסטיקה בדשבורד
   - [ ] הצגת כרטיסי overview
   - [ ] גרף הזמנות יומי
   - [ ] טבלת מנות פופולריות

5. **התראות**
   - [ ] התראות מופיעות בזמן אמת
   - [ ] סמן כנקרא
   - [ ] סמן הכל כנקרא

6. **העלאת תמונות**
   - [ ] העלאת לוגו
   - [ ] העלאת תמונת about
   - [ ] העלאת תמונות מנות
   - [ ] תצוגה מקדימה

---

## 🐛 פתרון בעיות נפוצות

### בעיה: "Cannot POST /api/upload"
**פתרון:**
```bash
# ודא ש-multer מותקן
npm list multer
npm install multer --save
pm2 restart juhuri-heritage
```

### בעיה: תמונות לא מוצגות
**פתרון:**
```bash
# בדוק הרשאות
ls -la uploads/
chmod -R 755 uploads/

# בדוק nginx config
nginx -t
sudo systemctl reload nginx
```

### בעיה: "Table doesn't exist"
**פתרון:**
```bash
# הרץ מיגרציות שוב
mysql -u username -p database_name < migrations/012_marketplace_system.sql
mysql -u username -p database_name < migrations/013_marketplace_orders.sql
```

### בעיה: גיאוקודינג לא עובד
**פתרון:**
- בדוק חיבור אינטרנט מהשרת
- ודא שהשרת יכול לגשת ל-nominatim.openstreetmap.org
- בדוק firewall rules

---

## 🔄 גרסאות ותאימות

- **Node.js:** >= 14.x
- **MariaDB/MySQL:** >= 10.3 / >= 5.7
- **npm:** >= 6.x
- **multer:** >= 1.4.x

---

## 📝 רשימת בדיקה סופית

- [ ] מיגרציות רצו בהצלחה
- [ ] תיקיית uploads קיימת עם הרשאות נכונות
- [ ] multer מותקן
- [ ] שרת אתחל מחדש
- [ ] nginx/apache מוגדר נכון להגשת uploads
- [ ] ממשק נטען ללא שגיאות console
- [ ] כל 6 הפיצ'רים עובדים

---

## 🎉 סיום

אחרי ביצוע כל השלבים, המערכת אמורה לעבוד במלואה!

### קישורים שימושיים:
- **Pull Request:** https://github.com/Shesek11/Juhuri-Heritage/pull/new/feature/marketplace-advanced-features
- **דוקומנטציה:** README_MARKETPLACE.md (אם קיים)

### תמיכה:
אם נתקלת בבעיות, בדוק:
1. Logs של השרת (`pm2 logs` או `journalctl`)
2. Console של הדפדפן (F12)
3. MySQL error log
4. nginx/apache error log

---

**נוצר על ידי Claude Sonnet 4.5** 🤖
**תאריך:** 26/01/2026
