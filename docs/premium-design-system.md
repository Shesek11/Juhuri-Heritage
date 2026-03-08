# מע' העיצוב (Design System) — Premium Homepage Redesign

מסמך זה מאגד את עקרונות העיצוב החדשים של אתר **מורשת ג'והורי**, כפי שיושמו בעיצוב המחודש של מסך הבית. המסמך נועד לשמש כרפרנס לשמירה על אחידות עיצובית (Consistency) בכל האתר ובסשנים עתידיים.

## 1. קונספט עיצובי (Visual Concept)
הסגנון העיצובי מבוסס על מראה "Premium Night" / "Cinematic":
- **יומן מסע / תערוכת אומנות:** תחושה יוקרתית, מכובדת ועמוקה שנותנת כבוד למורשת (Heritage).
- **Layering & Depth (שכבות ועומק):** שימוש בטיפוגרפיה ענקית כרקע, רקעים כהים מרובדים (Gradients) וקומפוזיציות תלת-ממדיות דמויות קולאז'.
- **Glassmorphism:** שימוש באובייקטים "זכוכיתיים" שקופים-למחצה (רקע כהה עם Backdrop Blur, גבולות דקים זוהרים), במקום צורות סולידיות כבדות.
- **מוטיבים גאומטריים / קווקזיים (Subtle Tradition):** שילוב אלמנטים מסורתיים נקיים מאוד, כמו "בוטה" כשכבת אטימות אפסית (0.03%), הילות זהב או גבולות מעויינים המזכירים שטיחים אותנטיים, אבל בצורה אלגנטית ומרומזת בלבד.

## 2. פלטת צבעים (Color Palette)

התבססות על מראה של כחול-לילה עמוק (Deep Night Blue) בשילוב הילות זהב:

*   **Background (Primary):** `#050B14` (Deep Night Blue) — צבע הרקע הראשי של גוף האתר (Body). תמיד שזור עם מעברי צבע או הילות.
*   **Surface (Cards/Glass panels):** שילוב של `#0d1424` (כחול מעט בהיר יותר) באטימות (למשל `bg-[#0d1424]/90` או `bg-[#050B14]/70` עם `backdrop-blur-xl`).
*   **Accents (Gold/Amber):** Tailwind's `amber-400`, `amber-500`, `yellow-500`, `yellow-600`.
    *   **Gradients:** `bg-gradient-to-r from-amber-500 to-yellow-600`.
    *   **Text gradients:** `bg-clip-text text-transparent bg-gradient-to-l from-amber-200 via-amber-400 to-yellow-500/600`.
*   **Text (Typography):**
    *   **Primary text:** לבן מלא (`text-white`) לכותרות.
    *   **Secondary text:** אפור קריר בהיר (`text-slate-200/90` או `text-slate-300`).
*   **Borders:** גבולות עדינים ככלי עזר ל-Glassmorphism — `border-white/10` או `border-amber-500/20`.

## 3. טיפוגרפיה (Typography)
- פונט רשמי: **Rubik** (פונט סנס-סריפי מעוגל וברור שמתאים לטקסטורה עדינה).
- **כותרות ראשיות (H1):** משקל כבד מאוד (`font-black`), צפוף מאוד (`tracking-tight / tracking-tighter`), לרוב עם אפקט צללית חזק להבלטה (`drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]`).
- **טיפוגרפיית רקע (Ghost Text):** מילים ענקיות מאחורי פריטים (`text-[10rem]` ומעלה), באטימות מזערית (כגון `text-white/[0.08]`), ללא בחירת טקסט (`select-none`).
- **טקסט קריאה (Body):** משקל דק ואלגנטי (`font-light`), עם מרווח שורות הולם (`leading-relaxed`).

## 4. עקרונות UI מרכזיים (Key UI Patterns)

### כרטיסיות (Premium Feature Cards)
כרטיס לא צבוע בצבע אחיד, אלא משמש כחלון זכוכית:
```jsx
// תבנית לכרטיס (Card)
<div className="relative group overflow-hidden bg-[#0d1424]/40 border border-slate-700/50 hover:border-amber-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_-10px_rgba(245,158,11,0.2)]">
  {/* הילה פנימית */}
  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-colors duration-500" />
</div>
```

### שורות חיפוש וכפתורי הנעה לפעולה (Search / CTA)
חיבור של Glow אחורי (אפקט בוהק) סביב האלמנט הפנימי:
```jsx
// תבנית לשורת חיפוש
<div className="relative group mx-auto">
  <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/50 to-yellow-600/50 rounded-[2rem] blur-md opacity-40 group-hover:opacity-70 transition duration-500"></div>
  <div className="relative flex items-center bg-[#050B14]/70 border border-white/10 backdrop-blur-2xl ...">
</div>
```

### הילות ואווירה גלובלית
פיזור של מוקדי תאורה (Glow blobs) ברחבי האתר ליצירת עומק:
```jsx
<div className="fixed top-0 left-[-10%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
```

## 5. Mobile First
- הדגש המרכזי בעיצוב הוא שהקומפוזיציה המורכבת תישמר גם במובייל (`375px`), תוך שינוי סדרי החלוקה והטקסטורה כדי להתאים המסך באופן מושלם ללא שבירות.
- שימוש כבד ב-Tailwind responsive prefixes (`sm:`, `md:`, `lg:`). אלמנטים דקורטיביים שגוזלים מקום מוגבל במובייל לרוב יוסתרו לחלוטין (`hidden sm:block`) או יעוצבו מחדש לאנכיות.
