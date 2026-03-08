# ניתוח תהליך החיפוש במילון - מרץ 2026

## הסבר פשוט

### מה קורה כשמחפשים מילה?

1. **המשתמש מקליד ושולח** - אין המתנה (debounce), כל שליחה הולכת ישר לשרת
2. **השרת מחפש במאגר המקומי** - מחפש בשדות: מילה בג'והורית, תרגום עברי, רוסית
3. **אם נמצא** - מחזיר עד 5 תוצאות (1 ראשית + 4 נוספות), ובודק ברקע אם חסרים שדות ומשלים עם AI
4. **אם לא נמצא** - פונה ל-Gemini AI שמנסה לתרגם, עם cache של 7 ימים

### למה החיפוש איטי?

דמיינו ספריה עם 26,000 כרטיסיות. במקום להשתמש באינדקס (כמו א-ב-ג), השרת עובר על **כל** כרטיסייה אחת אחת ובודק אם המילה מופיעה **באמצע** המילה. זה כמו לחפש "בית" ולעבור על כל 26,000 הכרטיסיות כדי לראות אם "בית" מופיע איפשהו בתוך כל מילה.

### למה תוצאות לא עקביות?

כשלמילה יש כמה תרגומים (ניבים שונים), המערכת בוחרת אחד **באקראי** במקום לבחור לפי כלל ברור. אז אותו חיפוש יכול להחזיר תרגום שונה בכל פעם.

### למה חיפוש ברוסית לא עובד טוב?

המערכת מחפשת ברוסית, אבל כשהיא מסדרת את התוצאות לפי רלוונטיות, היא מתעלמת מרוסית. אז התאמה מדויקת ברוסית מקבלת אותו דירוג כמו התאמה חלקית.

---

## ניתוח טכני מפורט

### זרימת החיפוש

```
קלט משתמש
    |
[Frontend] DictionaryPage.tsx
    |
performSearch() -> searchDictionary(term)
    |
    +-- ניסיון 1: GET /api/dictionary/search?q=term (מאגר מקומי)
    |   +-- נמצא -> מחזיר תוצאה ראשית + 4 נוספות
    |   |           -> בודק שדות חסרים -> מעשיר עם Gemini ברקע
    |   +-- לא נמצא -> fallback ל-Gemini AI
    |
    +-- ניסיון 2: POST /api/gemini/search (AI)
        +-- בודק cache (SHA256 hash, תוקף 7 ימים)
        +-- קורא ל-Gemini API (3 מודלים ב-fallback)
```

### השאילתה המרכזית (server/routes/dictionary.js)

```sql
SELECT de.*, u.name as contributor_name, a.name as approver_name
FROM dictionary_entries de
LEFT JOIN users u ON de.contributor_id = u.id
LEFT JOIN users a ON de.approved_by = a.id
LEFT JOIN translations t ON de.id = t.entry_id
WHERE de.status = 'active'
  AND (de.term LIKE '%term%' OR t.hebrew LIKE '%term%' OR de.russian LIKE '%term%')
GROUP BY de.id
ORDER BY
  CASE
    WHEN de.term = 'term' THEN 0          -- התאמה מדויקת term
    WHEN t.hebrew = 'term' THEN 1         -- התאמה מדויקת hebrew
    WHEN de.term LIKE 'term%' THEN 2      -- prefix ב-term
    WHEN t.hebrew LIKE 'term%' THEN 3     -- prefix ב-hebrew
    ELSE 4                                -- שאר ה-LIKE
  END,
  de.created_at DESC
LIMIT 10
```

### סדר עדיפויות בתוצאות

| עדיפות | סוג התאמה | דוגמה (חיפוש: "בית") |
|---------|-----------|----------------------|
| 0 | התאמה מדויקת ב-term | term = "בית" |
| 1 | התאמה מדויקת ב-hebrew | hebrew = "בית" |
| 2 | prefix ב-term | term = "ביתא..." |
| 3 | prefix ב-hebrew | hebrew = "ביתא..." |
| 4 | LIKE כללי (כולל רוסית) | כל שאר ההתאמות |

**בעיה:** רוסית לא מקבלת עדיפות משלה - נכללת רק ב-WHERE אבל לא ב-ORDER BY.

### שאילתות נוספות אחרי מציאת תוצאה

לכל תוצאה ראשית רצות 4 שאילתות במקביל:
1. **תרגומים** - כולל שם ניב (COALESCE ל-"לא ידוע")
2. **הגדרות** - definitions
3. **דוגמאות** - examples
4. **מקורות שדות** - field_sources (AI/import/community/manual)

### סכמת מסד הנתונים

**טבלאות מעורבות בחיפוש:**

| טבלה | שדות חיפוש | אינדקסים |
|-------|-----------|----------|
| dictionary_entries | term, russian | idx_term, FULLTEXT idx_term (לא בשימוש!) |
| translations | hebrew | idx_translations_hebrew(100), FULLTEXT ft_hebrew (לא בשימוש!) |
| definitions | - | - |
| examples | - | - |
| field_sources | - | idx_entry_field |

**מספר רשומות:** ~26,038 תרגומים

### בעיות ביצועים קריטיות

#### 1. LIKE עם wildcard בהתחלה (חומרה: קריטית)
```sql
de.term LIKE '%term%'  -- סריקת טבלה מלאה, אינדקס לא עוזר
```
**פתרון:** להשתמש ב-FULLTEXT search שכבר קיים אבל לא מנוצל:
```sql
MATCH(de.term) AGAINST('term' IN BOOLEAN MODE)
```

#### 2. GROUP BY ללא aggregation (חומרה: גבוהה)
```sql
GROUP BY de.id  -- כשיש כמה תרגומים, בוחר שורה אקראית
```
**בעיה:** תוצאות לא דטרמיניסטיות - אותו חיפוש מחזיר תרגום שונה בכל פעם.
**פתרון:** להשתמש ב-subquery או aggregation מפורש.

#### 3. LIMIT 10 שרירותי (חומרה: בינונית)
```sql
LIMIT 10  -- חותך תוצאות, רק 5 מוצגות בסוף (1 ראשית + 4 נוספות)
```

#### 4. אין debounce בפרונטאנד (חומרה: בינונית)
כל הקשה על Enter שולחת בקשה חדשה לשרת. צריך 300-500ms השהייה.

#### 5. חיפוש רוסית ללא תעדוף (חומרה: נמוכה)
רוסית נכללת ב-WHERE אבל לא ב-ORDER BY CASE. התאמה מדויקת ברוסית מקבלת אותו ציון כמו LIKE חלקי.

#### 6. אינדקס prefix בלבד על hebrew (חומרה: בינונית)
```sql
idx_translations_hebrew (hebrew(100))  -- רק 100 תווים ראשונים
```

### Endpoint נוספים רלוונטיים

| Endpoint | תיאור | שאילתה |
|----------|--------|--------|
| GET /api/dictionary/entry/:term | חיפוש ישיר לפי URL | WHERE term = ? (מהיר, אינדקס) |
| GET /api/dictionary/word-of-day | מילת היום | OFFSET דטרמיניסטי לפי יום |
| GET /api/dictionary/recent | מילים אחרונות | ORDER BY created_at DESC |
| GET /api/dictionary/entries | רשימת אדמין | עם pagination ו-search |
| GET /api/dictionary/missing-dialects | ניבים חסרים | GROUP BY עם COUNT |

### Gemini AI Fallback

- **מודלים (לפי עדיפות):** gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash
- **Cache:** SHA256 hash של השאילתה, 7 ימים
- **Timeout:** 15 שניות לכל מודל
- **הוראות:** תשובה בעברית בלבד, מודע לניבים

### מצב הניבים (נכון למרץ 2026)

6 ניבים מוגדרים: Quba, Derbent, Madjalis, Vartashen, North Caucasus, General.
**כל 26,038 התרגומים עם dialect_id = NULL** (ניב לא ידוע).

---

## תיקונים שבוצעו (מרץ 2026)

### v1 - FULLTEXT עם OR (נכשל - 1,029ms)
החלפנו LIKE ב-FULLTEXT אבל שמרנו על מבנה OR אחד. MariaDB לא מצליח לאופטמז OR עם subqueries ו-FULLTEXT יחד.

### v2 - UNION ALL (הצלחה - 42ms, שיפור x25)
פיצלנו לשלוש שאילתות עצמאיות ב-UNION ALL:
1. FULLTEXT על `term` (0.6ms)
2. FULLTEXT על `hebrew` דרך JOIN (0.4ms)
3. LIKE על `russian` (59ms)

Dedup + sort מתבצעים ב-JavaScript.

**שינויים נוספים:**
- הוסר GROUP BY - כל שאילתה מחזירה שורות ייחודיות
- תעדוף רוסית: rank 2 (exact), rank 5 (prefix)
- הגנה מלחיצות כפולות בפרונטאנד
- FULLTEXT index חדש על `russian`
- FULLTEXT על admin search endpoint
- LIMIT הוגדל ל-20

### נותר לתקן (עדיפות נמוכה)
1. חיפוש פונטי (לווריאציות כתיב)
2. הרחבת מילים נרדפות
3. cache layer לסטטיסטיקות widgets
