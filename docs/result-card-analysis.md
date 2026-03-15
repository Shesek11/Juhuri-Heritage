# ניתוח רכיבי מסך תוצאות חיפוש — מילון ג'והורי

תאריך: 2026-03-11

## רשימת רכיבים

| # | רכיב | תוכן | מקור נתונים | ניתן לעריכה? |
|---|-------|-------|-------------|-------------|
| **1** | **Header Badges** | שפה (עברית/ג'והורי), מקור (AI/קהילה/מאגר), חלק דיבר | `entry.detectedLanguage`, `entry.source`, `entry.partOfSpeech` | חלק דיבר — כן (FieldEditButton) |
| **2** | **שם המילה (Term)** | כותרת גדולה (h2) | `entry.term` | לא |
| **3** | **מדריך הגייה** | תעתיק פונטי | `entry.pronunciationGuide` | כן (FieldEditButton) |
| **4** | **כפתורי פעולה** | בחירת קול (גבר/אישה), השמעה (TTS), העתקה | Gemini TTS / SpeechSynthesis | — |
| **5** | **הגדרות** | הגדרת המילה | `entry.definitions[]` | כן (FieldEditButton + ConfirmAiButton) |
| **6** | **רוסית** | תרגום רוסי | `entry.russian` | כן (FieldEditButton + ConfirmAiButton) |
| **7** | **תרגומים** | עברית + לטיני + קירילי + ניב | `entry.translations[]` (.hebrew, .latin, .cyrillic, .dialect) | כן — כל שדה בנפרד (FieldEditButton + ConfirmAiButton) |
| **8** | **הצבעות** | thumbs up/down לכל תרגום | `translation.upvotes/downvotes` | כן (vote API) |
| **9** | **הצע תיקון** | פותח מודל תיקון | — | כן |
| **10** | **הקלטת קול** | VoiceRecorder component | `entry.id` | כן (הקלטה + שם) |
| **11** | **דוגמאות שימוש** | משפטים עם TTS | `entry.examples[]` (origin, translated, transliteration) | לא ישירות, אבל "הוסף פתגם" |
| **12** | **פתגמים קהילתיים** | תרומות קהילה | `/community-examples` API | כן (הוספה) |
| **13** | **לייק + תגובות** | heart + comments | `entry.likesCount`, `/comments` API | כן |

## בעיות שזוהו

1. **חיפוש איטי (קריטי)** — `await geminiApi.enrich()` ב-`geminiService.ts:25` חוסם 5-6 שניות
2. **Hover גלובלי** — כל כפתורי העריכה/אישור מופיעים ביחד על hover של הכרטיס כולו (class `group` על הקונטיינר)
3. **תוצאה בודדת** — אין רשימת תוצאות, מיד מנווט ל-`/word/` של התוצאה הראשונה (השרת מחזיר `results[]` עם עד 5 תוצאות, אבל הקליינט מתעלם)
4. **הודעות loading מטעות** — "בודק במקורות ההיסטוריים..." / "מנתח ניבים..." — בפועל זה סתם ממתין ל-Gemini

## קבצים רלוונטיים

- `components/DictionaryPage.tsx` — דף המילון הראשי
- `components/ResultCard.tsx` — כרטיס תוצאה (~700 שורות)
- `services/geminiService.ts` — searchDictionary + enrich logic
- `server/routes/dictionary.js` — search API endpoint
