# 📚 Dictionary Import System

מערכת לייבוא מילון מקבצים מעורבים (Excel, PDF, תמונות) למילון ג'והורי.

## תכונות

- 📊 קריאת Excel (xlsx, xls, csv)
- 📄 קריאת PDF (טקסט + OCR לסרוקים)
- 🖼️ קריאת תמונות עם OCR (Gemini Vision)
- 🤖 זיהוי שפה אוטומטי
- 🌐 תרגום רוסית → עברית
- 🔤 Transliteration ג'והורי → Latin
- ✅ דדופליקציה וולידציה
- 📦 Batch import ל-DB

---

## התקנה

### 1. התקנת Packages

```bash
npm install xlsx pdf-parse @google/generative-ai axios dotenv
```

### 2. הגדרת .env

הוסף ל-`.env`:

```bash
# Gemini API (לOCR ותרגום)
GEMINI_API_KEY=your-gemini-api-key-here

# Admin credentials (לייבוא ל-DB)
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=your-password

# API URL (אופציונלי, ברירת מחדל localhost:5000)
API_BASE_URL=http://localhost:5000
```

**איך להשיג Gemini API Key:**
1. לך ל-https://ai.google.dev/
2. לחץ על "Get API Key"
3. צור פרויקט חדש או בחר קיים
4. העתק את המפתח ל-.env

---

## תהליך שימוש

### Phase 1: העלאת קבצים

העתק את כל הקבצים שלך לתיקייה:

```bash
# Windows
copy C:\Users\...\dictionary-files\* data\raw\

# Mac/Linux
cp ~/Desktop/dictionary-files/* data/raw/
```

הקבצים הנתמכים:
- ✅ Excel: `.xlsx`, `.xls`, `.csv`
- ✅ PDF: `.pdf` (טקסט או סרוק)
- ✅ תמונות: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

---

### Phase 2: קריאת קבצים

```bash
node scripts/import-dictionary-files.js
```

**מה זה עושה:**
- סורק את `data/raw/`
- מנתב כל קובץ לפרסר המתאים
- מפיק JSON ביניים ל-`data/intermediate/raw-{timestamp}.json`

**פלט לדוגמה:**
```
📚 Dictionary Import - Phase 1: Reading Files

📂 Scanning: data/raw

Found 3 file(s):

============================================================
📄 Processing: dictionary1.xlsx
============================================================

📊 Type: Excel
   Detected columns: { juhuri: 0, hebrew: 1, russian: 2 }
   ✓ Extracted 245 entries

✅ Success: 245 entries extracted

============================================================
📄 Processing: scanned-page.jpg
============================================================

🖼️  Type: Image (OCR)
   🔍 Using OCR (Gemini Vision)...
   ✓ Extracted 18 entries

✅ Success: 18 entries extracted

============================================================
📊 IMPORT SUMMARY
============================================================

✅ Files processed: 3
❌ Files failed:    0
📚 Total entries:   350

By source:
   📊 Excel:  245
   📄 PDF:    87
   🖼️  Images: 18

💾 Results saved to:
   data/intermediate/raw-2024-01-26T10-30-00-000Z.json

✨ Next step: Run process-dictionary-data.js to clean and validate
```

---

### Phase 3: עיבוד וניקוי

```bash
node scripts/process-dictionary-data.js data/intermediate/raw-2024-01-26T10-30-00-000Z.json
```

**מה זה עושה:**
- זיהוי שפה (ג'והורי/עברית/רוסית)
- תרגום אוטומטי של רוסית → עברית (אם חסר)
- Transliteration של ג'והורי → Latin
- המרה לקירילית
- דדופליקציה (מסיר כפילויות)
- ולידציה (בדיקת שדות חובה)
- פלט: `data/processed/dictionary-import-{timestamp}.json`

**פלט לדוגמה:**
```
📚 Dictionary Import - Phase 2: Processing & Cleaning

📂 Reading: data/intermediate/raw-2024-01-26T10-30-00-000Z.json

Found 350 entries

============================================================

[1/350] Processing: סובə...
   ✓ Processed successfully

[2/350] Processing: חונə...
   🔄 Translating Russian → Hebrew...
   ✓ Added Hebrew: בית
   🔄 Transliterating Juhuri → Latin...
   ✓ Added Latin: xune
   ✓ Processed successfully

[3/350] Processing: סובə...
   ⚠️  Duplicate - skipping

...

============================================================
📊 PROCESSING SUMMARY
============================================================

📥 Input entries:        350
✅ Successfully processed: 320
🗑️  Duplicates removed:  25
❌ Validation failed:    5

AI Enhancements:
   🌐 Translations added:      42
   🔤 Transliterations added:  187

💾 Results saved to:
   data/processed/dictionary-import-2024-01-26T11-00-00-000Z.json

✨ Next step: Run import-to-database.js to import to DB
```

---

### Phase 4: ייבוא ל-DB

```bash
node scripts/import-to-database.js data/processed/dictionary-import-2024-01-26T11-00-00-000Z.json
```

**דרישות:**
- ✅ השרת רץ (`npm run dev` או PM2)
- ✅ `.env` מוגדר עם ADMIN_EMAIL ו-ADMIN_PASSWORD

**מה זה עושה:**
- מתחבר ל-API עם הפרטי admin
- שולח batches של 100 entries
- מייבא ל-DB עם status "active"

**פלט לדוגמה:**
```
📚 Dictionary Import - Phase 3: Database Import

📂 Reading: data/processed/dictionary-import-2024-01-26T11-00-00-000Z.json

Found 320 entries
Batch size: 100

============================================================

🔐 Authenticating as admin@example.com...
✅ Authentication successful

Sending 4 batches...

[1/4] Sending batch of 100 entries...
   ✅ Imported 100 entries

[2/4] Sending batch of 100 entries...
   ✅ Imported 100 entries

[3/4] Sending batch of 100 entries...
   ✅ Imported 100 entries

[4/4] Sending batch of 20 entries...
   ✅ Imported 20 entries

============================================================
📊 IMPORT SUMMARY
============================================================

📥 Total entries:     320
✅ Successfully imported: 320
❌ Failed:            0
📦 Batches sent:      4

✨ Import complete! Entries are set to "active" status.

Next steps:
  1. Review imported entries in the admin dashboard
  2. Verify translations and make corrections if needed
  3. Entries are immediately visible in the dictionary
```

---

## מבנה קבצים

```
juhuri-heritage/
├── scripts/
│   ├── import-dictionary-files.js    # Phase 1: קריאת קבצים
│   ├── process-dictionary-data.js    # Phase 2: עיבוד וניקוי
│   ├── import-to-database.js         # Phase 3: ייבוא ל-DB
│   └── utils/
│       ├── gemini-helper.js          # Gemini AI integration
│       ├── excel-parser.js           # Excel parser
│       └── pdf-parser.js             # PDF parser + OCR
│
├── data/
│   ├── raw/                          # קבצים גולמיים (אתה מעלה)
│   ├── intermediate/                 # JSON ביניים
│   ├── processed/                    # JSON מעובד
│   └── logs/                         # לוגים
│
└── .env                              # הגדרות (GEMINI_API_KEY, וכו')
```

---

## פורמט נתונים

### Intermediate JSON (אחרי Phase 1)

```json
{
  "timestamp": "2024-01-26T10:30:00.000Z",
  "files_processed": 3,
  "total_entries": 350,
  "entries": [
    {
      "juhuri": "סובə",
      "hebrew": "מים",
      "russian": "вода",
      "latin": "sovu",
      "dialect": "Quba",
      "definition": "",
      "notes": "",
      "confidence": 0.95,
      "source_file": "dictionary1.xlsx",
      "source_type": ".xlsx"
    }
  ]
}
```

### Processed JSON (אחרי Phase 2)

```json
{
  "timestamp": "2024-01-26T11:00:00.000Z",
  "ready_for_import": 320,
  "duplicates_removed": 25,
  "validation_failed": 5,
  "entries": [
    {
      "juhuri": "סובə",
      "hebrew": "מים",
      "russian": "вода",
      "latin": "sovu",
      "dialect": "Quba",
      "definition": "",
      "examples": [],
      "notes": "",
      "confidence": 0.95,
      "source_file": "dictionary1.xlsx",
      "translation_source": "Original"
    }
  ]
}
```

---

## טיפול בבעיות

### בעיה: "GEMINI_API_KEY not found"

**פתרון:**
```bash
# הוסף ל-.env
GEMINI_API_KEY=your-api-key-here
```

### בעיה: "Authentication failed"

**פתרון:**
```bash
# וודא שיש לך משתמש admin במערכת
# הוסף ל-.env
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=your-password
```

### בעיה: "Directory not found: data/raw"

**פתרון:**
```bash
mkdir -p data/raw
# או
md data\raw  # Windows
```

### בעיה: OCR לא מדויק

**פתרון:**
- וודא איכות תמונה טובה (לפחות 300 DPI)
- PDF סרוק - נסה להמיר לתמונה ב-PNG
- בדוק confidence score - אם נמוך, בדוק ידנית

### בעיה: תרגומים לא נכונים

**פתרון:**
- תרגומי AI מסומנים ב-`translation_source: "AI"`
- כל ה-entries מיובאים עם status "active"
- תקן ידנית בממשק ה-admin

---

## טיפים

### ריצה מהירה של כל התהליך

```bash
# 1. העלה קבצים
cp ~/Desktop/dictionary-files/* data/raw/

# 2. קרא קבצים
node scripts/import-dictionary-files.js

# 3. עבד (שנה את התאריך לפי הפלט של שלב 2)
node scripts/process-dictionary-data.js data/intermediate/raw-*.json

# 4. ייבא (שנה את התאריך לפי הפלט של שלב 3)
node scripts/import-to-database.js data/processed/dictionary-import-*.json
```

### בדיקה לפני ייבוא גדול

רוץ על קובץ קטן תחילה:
```bash
# העתק רק קובץ אחד קטן
cp ~/Desktop/test.xlsx data/raw/

# רוץ את כל התהליך
# ...

# בדוק את התוצאות במילון
# אם הכל טוב, רוץ על כל הקבצים
```

### שמירת גיבוי לפני ייבוא

```bash
# גבה את ה-DB לפני ייבוא גדול
mysqldump -u username -p database_name > backup-before-import.sql
```

---

## סטטוס המימוש

- ✅ Phase 1: קריאת קבצים - **מוכן**
- ✅ Phase 2: עיבוד וניקוי - **מוכן**
- ✅ Phase 3: ייבוא ל-DB - **מוכן**
- ✅ תיעוד - **מוכן**

---

## שאלות נפוצות

**ש: האם זה בטוח? האם יש סיכון למחוק מילים קיימות?**

ת: כן, זה בטוח. הסקריפט משתמש ב-`ON DUPLICATE KEY UPDATE term = term` - כלומר אם המילה כבר קיימת, היא לא תוחלף.

**ש: כמה זמן לוקח לייבא 1000 מילים?**

ת: בערך 2-3 דקות (10 batches של 100, עם 500ms delay בין כל batch).

**ש: האם אפשר לבטל ייבוא?**

ת: לא באופן אוטומטי. אבל אם שמרת גיבוי, תוכל לשחזר. אפשר גם למחוק entries לפי source:
```sql
DELETE FROM dictionary_entries WHERE source LIKE 'Import (dictionary1.xlsx)%';
```

**ש: מה קורה עם entries שנכשלו?**

ת: הם מדווחים ב-log file ב-`data/logs/`. תוכל לבדוק ולתקן ידנית.

**ש: האם Gemini API חינמי?**

ת: יש quota חינמי נדיב (60 requests per minute). לשימוש רגיל זה יספיק.

---

**נוצר ב-2024 עבור פרויקט Juhuri Heritage** 🇮🇱
