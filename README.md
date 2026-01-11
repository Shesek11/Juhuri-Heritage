<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# מורשת ג'והורי — Juhuri Heritage Dictionary

> מילון דיגיטלי אינטראקטיבי לשפת הג'והורית (יהודית-הררית), שפת יהודי ההרים מקווקז.

## 🌟 תכונות עיקריות

### 📖 מילון חכם
- **חיפוש AI מתקדם** — מופעל על ידי Gemini 3 Flash עם fallback אוטומטי
- **תמיכה בניבים** — קובה, דרבנט, וורטשן (אוגוז) וניבים מותאמים אישית
- **שלוש כתיבות** — עברית, לטינית וקירילית
- **חיפוש קולי** — הקלטה ותמלול אוטומטי
- **מטמון חכם** — תגובות מהירות עם cache ל-7 ימים
- **היסטוריית חיפושים** — שמירה מקומית של חיפושים אחרונים

### 🎓 מורה פרטי AI
- **שיחות אינטראקטיביות** — למידה דרך דיאלוג עם "סבא מרדכי"
- **התאמה לרמה** — מתחיל, בינוני, מתקדם
- **התאמה לניב** — לימוד ממוקד לפי ניב נבחר

### 🎮 מסלול למידה (Tutor Mode)
- **שיעורים מובנים** — יחידות לימוד עם התקדמות
- **מגוון סוגי תרגילים** — רב-ברירה, כרטיסיות, תרגום
- **מעקב התקדמות** — XP, רמות ולוח מובילים
- **יצירת שיעורים AI** — הפקת תרגילים אוטומטית לפי נושא

### 👥 ניהול משתמשים
- **הרשמה והתחברות** — מערכת אימות מאובטחת
- **פרופיל אישי** — עריכת פרטים והעדפות ניב
- **תפקידים** — משתמש, מאשר תוכן, מנהל מערכת
- **תרומה למילון** — הוספת מילים על ידי קהילה

### 🛠️ ממשק ניהול (Admin Dashboard)
- **מאגר מילים** — צפייה, חיפוש ומחיקה
- **אישור תרומות** — מודרציה של מילים בהמתנה
- **ניהול משתמשים** — שינוי תפקידים, איפוס סיסמאות
- **ניהול ניבים** — הוספה ומחיקה של ניבים
- **עורך טבלאי** — ייבוא מסיבי בסגנון Excel עם paste
- **יצירת AI** — הפקת מילים אוטומטית לפי נושא
- **יומן אירועים** — מעקב פעולות מערכת

## 🏗️ ארכיטקטורה

```
juhuri-heritage/
├── App.tsx                 # קומפוננט ראשי
├── components/
│   ├── AdminDashboard.tsx  # ממשק ניהול
│   ├── AuthModal.tsx       # התחברות/הרשמה
│   ├── TutorMode.tsx       # מסלול למידה
│   ├── LessonView.tsx      # תצוגת שיעור
│   ├── ContributeModal.tsx # תרומת מילה
│   ├── ProfileModal.tsx    # פרופיל משתמש
│   ├── ResultCard.tsx      # כרטיס תוצאה
│   └── ...
├── services/
│   ├── geminiService.ts    # אינטגרציית Gemini AI
│   ├── apiService.ts       # קריאות API לשרת
│   ├── authService.ts      # אימות משתמשים
│   └── storageService.ts   # ניהול נתונים
├── server/
│   ├── index.js            # שרת Express
│   ├── routes/
│   │   ├── gemini.js       # API למילון AI
│   │   ├── auth.js         # API אימות
│   │   ├── dictionary.js   # API מילון
│   │   ├── dialects.js     # API ניבים
│   │   ├── users.js        # API משתמשים
│   │   ├── progress.js     # API התקדמות
│   │   └── logs.js         # API יומן
│   └── config/db.js        # חיבור MariaDB
└── schema.sql              # סכמת מסד נתונים
```

## 🚀 התקנה והפעלה

### דרישות מקדימות
- Node.js 18+
- MariaDB / MySQL
- Gemini API Key

### התקנה מקומית

```bash
# 1. שכפול הפרויקט
git clone https://github.com/Shesek11/juhuri-heritage.git
cd juhuri-heritage

# 2. התקנת תלויות
npm install

# 3. הגדרת משתני סביבה
cp .env.example .env.local
# ערוך את .env.local והוסף את המפתחות שלך

# 4. יצירת מסד נתונים
mysql -u root -p < schema.sql

# 5. הפעלת השרת
npm run dev
```

### משתני סביבה

```env
GEMINI_API_KEY=your_gemini_api_key
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=juhuri_db
JWT_SECRET=your_jwt_secret
```

## 🧠 מודלי AI

המערכת משתמשת ב-Gemini API עם fallback אוטומטי:

1. **gemini-3-flash-preview** — ראשי
2. **gemini-2.5-flash-preview-05-20** — Fallback
3. **gemini-2.0-flash** — Fallback יציב

אופטימיזציות:
- `temperature: 0` — תגובות עקביות ומהירות
- `maxOutputTokens: 2048` — הגבלת גודל תשובה
- Timeout 30 שניות — מעבר אוטומטי למודל הבא

## 📱 תאימות

- דפדפנים מודרניים (Chrome, Firefox, Safari, Edge)
- רספונסיבי למובייל
- תמיכה ב-Dark Mode

## 📜 רישיון

MIT License

## 🤝 תרומה

נשמח לקבל תרומות! אנא פתחו Issue או Pull Request.

---

<div align="center">
<strong>🕎 לשימור ולהנחלת שפת הג'והורי לדורות הבאים 🕎</strong>
</div>
