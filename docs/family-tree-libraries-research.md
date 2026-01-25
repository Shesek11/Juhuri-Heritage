# מחקר ספריות עץ משפחה - 2026

## סיכום מנהלים

**המלצה עיקרית: family-chart by donatso** ⭐

- קוד פתוח (MIT License)
- עדכני (נובמבר 2025)
- מבוסס D3.js
- תצוגת עץ מסורתית
- תמיכה ב-React/TypeScript

**חלופה מסחרית: BALKAN FamilyTreeJS** (אם יש תקציב: $129-299/שנה)

---

## 1. BALKAN FamilyTreeJS ⭐ פתרון מסחרי

**GitHub:** [BALKANGraph/FamilyTreeJS](https://github.com/BALKANGraph/FamilyTreeJS)
**NPM:** `@balkangraph/familytree.js`

### סטטיסטיקות
- ⭐ GitHub Stars: 78
- 📦 Weekly Downloads: לא גלוי לציבור
- 🔄 Last Update: פעיל (2025-2026)
- 📜 License: **Proprietary/Commercial**

### תכונות עיקריות
✅ תצוגת עץ היררכית מסורתית
✅ אפשרויות התאמה אישית נרחבות
✅ אינטראקטיבי: zoom, pan, drag, edit forms
✅ Lazy loading לעצים גדולים
✅ ניווט מקלדת
✅ חיפוש מתקדם
✅ תיעוד מצוין + דמואים
✅ תמיכה ב-React

### מחירים (2026)
- **Professional:** דומיין אחד
- **Premium:** $129-$299/שנה - דומיינים בלתי מוגבלים
- **Enterprise:** פתרונות on-premises
- ניסיון חינם זמין

### מגבלות
❌ לא קוד פתוח - דורש רישיון מסחרי
❌ יקר יחסית לחלופות חינמיות
❌ רישיון מותאם עשוי לא להתאים לכל פרויקט
❌ תמיכה RTL לא מתועדת

### מתאים ל
פרויקטים מסחריים עם תקציב לפיצ'רים פרימיום ותמיכה מקצועית

---

## 2. family-chart by donatso ⭐ בחירה מומלצת (קוד פתוח)

**GitHub:** [donatso/family-chart](https://github.com/donatso/family-chart)
**NPM:** `family-chart`
**דוקומנטציה:** https://donatso.github.io/family-chart-doc/

### סטטיסטיקות
- ⭐ GitHub Stars: **612**
- 📦 Weekly Downloads: **643**
- 🔄 Last Update: **חודשיים** (נובמבר 2025)
- 📜 License: **MIT** (קוד פתוח מלא)
- 📦 Package Size: קטן
- 🏷️ Latest Version: 0.9.0

### תכונות עיקריות
✅ מבוסס D3.js לויזואליזציה עוצמתית
✅ תצוגות עץ מסורתיות + סוגי תרשימים מרובים
✅ אינטראקטיבי: zoom, pan, navigation
✅ Framework agnostic - עובד עם React, Vue, Angular, Svelte, vanilla JS
✅ תמיכה מלאה ב-TypeScript עם type definitions
✅ פאנל קונפיגורציה מלא להתאמה אישית
✅ יצירת קוד ל-React, Vue, HTML, JSON
✅ סטיילינג ניתן להתאמה (צבעים, פונטים, layouts)
✅ אינטגרציה עם WikiData
✅ תמיכה במבני משפחה מורכבים

### מגבלות
❌ קהילה קטנה יותר מ-react-d3-tree
❌ אימוץ נמוך יותר (643 לעומת 185k של react-d3-tree)
❌ תיעוד יכול להיות מקיף יותר
❌ תמיכה RTL לא מוזכרת (דורש מימוש מותאם)

### מורכבות אינטגרציה
בינונית - דורש ידע D3 להתאמה מתקדמת

### מתאים ל
פרויקטים הדורשים תצוגות עץ משפחה מסורתיות עם תמיכה React/TypeScript

### דוגמת שימוש בסיסית

```javascript
import f3 from "family-chart";

const store = f3.createStore({
  data: familyData,
  node_separation: 250,
  level_separation: 150
});

const view = f3.d3AnimationView({
  store: store,
  cont: document.querySelector("#tree")
});

view.update();
```

---

## 3. relatives-tree + react-family-tree

**GitHub:** [SanichKotikov/relatives-tree](https://github.com/SanichKotikov/relatives-tree)
**NPM:** `relatives-tree`

### סטטיסטיקות
- ⭐ relatives-tree: **825** stars
- 📦 Weekly Downloads: **46**
- 🔄 Last Update: 10 חודשים (מרץ 2025)
- 📜 License: **MIT**
- 📦 Package Size: זעיר מאוד (~3.23 kB br)

### תכונות עיקריות
✅ קל משקל ביותר - מנוע חישוב בלבד
✅ רינדור צמתים וחיבורים
✅ רינדור גמיש - תומך Canvas, SVG, React, SolidJS
✅ ארכיטקטורה ממוקדת ביצועים
✅ רינדור צמתים ניתן להתאמה
✅ תמיכה TypeScript
✅ דמו חי

### מגבלות
❌ **react-family-tree wrapper לא מתוחזק** (עדכון אחרון 2022)
❌ אימוץ נמוך מאוד (46 הורדות שבועיות)
❌ תיעוד מוגבל
❌ דורש מימוש רינדור מותאם
❌ אין תמיכה RTL מובנית
❌ תמיכה בקשרים מורכבים לא ברורה

### מורכבות אינטגרציה
גבוהה - דורש מימוש מותאם משמעותי

### מתאים ל
מפתחים הזקוקים למנוע חישוב קל משקל ורוצים שליטה מלאה ברינדור

---

## 4. d3-dtree (dTree) by ErikGartner

**GitHub:** [ErikGartner/dTree](https://github.com/ErikGartner/dTree)
**NPM:** `d3-dtree`

### סטטיסטיקות
- ⭐ GitHub Stars: **544**
- 📦 Weekly Downloads: בינוני
- 🔄 Last Update: 2.4.1 (2019)
- 📜 License: **MIT**

### תכונות עיקריות
✅ מיועד במיוחד לעצי משפחה עם מספר הורים
✅ מבוסס D3.js
✅ מטפל במבנים גנאלוגיים מורכבים
✅ תצוגת עץ מסורתית
✅ צופה מקוון זמין (Treehouse)
✅ זמין דרך NPM, Bower, Yarn, CDN

### מגבלות
❌ לא מתוחזק באופן פעיל (עדכון אחרון 2019)
❌ אינטגרציית React מודרנית מוגבלת
❌ תיעוד מיושן במקצת
❌ אין תמיכה RTL מפורשת
❌ עשוי לדרוש התאמה משמעותית

### מורכבות אינטגרציה
בינונית-גבוהה

### מתאים ל
פרויקטים הדורשים ויזואליזציה של אילן יוחסין רב-הורי

---

## 5. react-d3-tree by bkrem

**GitHub:** [bkrem/react-d3-tree](https://github.com/bkrem/react-d3-tree)
**NPM:** `react-d3-tree`

### סטטיסטיקות
- ⭐ GitHub Stars: **1,182**
- 📦 Weekly Downloads: **185,855** (הגבוה ביותר!)
- 🔄 Last Update: שנה
- 📜 License: **MIT**
- 🏷️ Latest Version: 3.6.5

### תכונות עיקריות
✅ ספריית עץ React הפופולרית ביותר
✅ תיעוד מצוין
✅ גרפים אינטראקטיביים של D3 עם הגדרה מינימלית
✅ תצוגה היררכית (לא force-directed)
✅ תמיכה TypeScript
✅ אפשרויות התאמה אישית נרחבות
✅ קהילה פעילה

### מגבלות - קריטי!
❌ **לא מותאם לעצי משפחה** - מיועד לתרשימים ארגוניים
❌ מגבלת הורה יחיד - **לא יכול לטפל באילן יוחסין עם שני הורים**
❌ עצי D3 לא תומכים בקריסת אילן יוחסין (התכנסות אבות)
❌ אין תמיכה מובנית בנישואין, גירושין, בני זוג מרובים
❌ לא מתאים לקשרי משפחה מורכבים

### מורכבות אינטגרציה
נמוכה-בינונית

### מתאים ל
תצוגות היררכיות פשוטות, תרשימים ארגוניים, **לא מומלץ לעצי משפחה מסורתיים עם נישואין**

---

## 6. Topola Genealogy Viewer by PeWu

**GitHub:** [PeWu/topola](https://github.com/PeWu/topola)
**NPM:** `topola`
**אתר:** https://pewu.github.io/topola-viewer/

### סטטיסטיקות
- ⭐ GitHub Stars: **219** (topola-viewer)
- 📦 Weekly Downloads: מוגבל
- 🔄 Last Update: תחזוקה פעילה
- 📜 License: **Apache-2.0**

### תכונות עיקריות
✅ ספריית TypeScript/JavaScript לעצי גנאלוגיה
✅ משתמש ב-D3 לרינדור SVG
✅ סוגי תרשימים מרובים לויזואליזציה גנאלוגית
✅ תמיכה בקבצי GEDCOM (תקן תעשייתי)
✅ צופה אינטראקטיבי עם zoom/pan
✅ תוסף Webtrees זמין
✅ מיועד במיוחד לגנאלוגיה

### מגבלות
❌ קהילה קטנה יותר
❌ תיעוד פחות מחלופות מסחריות
❌ רישיון Apache (מגביל יותר מ-MIT)
❌ דוגמאות React מוגבלות

### מורכבות אינטגרציה
בינונית

### מתאים ל
אפליקציות גנאלוגיה מבוססות GEDCOM

---

## 7. d3-pedigree-tree by solgenomics

**GitHub:** [solgenomics/d3-pedigree-tree](https://github.com/solgenomics/d3-pedigree-tree)
**NPM:** `@solgenomics/d3-pedigree-tree`

### סטטיסטיקות
- 📜 License: **MIT**
- 🔄 Last Update: פעילות עדכנית (2026)

### תכונות עיקריות
✅ פריסת D3.js במיוחד לעצי אילן יוחסין
✅ מטפל בעצים רב-הוריים (DAGs)
✅ מקבץ אחים באמצעות אלגוריתם hill-climbing
✅ מיועד לאילני יוחסין מדעיים/גידול

### מגבלות
❌ מיקוד מדעי (גידול/גנטיקה) לא גנאלוגיה
❌ תיעוד מוגבל לשימוש כללי
❌ קהילה קטנה
❌ עשוי לחסוך את כל תכונות עץ המשפחה (נישואין, גירושין)

### מורכבות אינטגרציה
גבוהה

### מתאים ל
ויזואליזציה מדעית של אילן יוחסין, תוכניות גידול

---

## 8. React Flow Family Tree Implementations

**דוגמה:** [harrykhh/react-flow-family-tree](https://github.com/harrykhh/react-flow-family-tree)

### סטטיסטיקות
- ⭐ React Flow Stars: גבוהות מאוד (הספרייה הראשית פופולרית)
- מימושים מותאמים משתנים
- 📜 License: **MIT** (React Flow)

### תכונות עיקריות
✅ מבוסס על React Flow (ספריית UI node-based עוצמתית)
✅ תמיכה בקשרים מורכבים: גירושין, ילדים משותפים, בני זוג מרובים
✅ קצוות משפחתיים בקידוד צבע לענפים שונים
✅ קצוות שלא מתנגשים
✅ תמיכה בתמונות פורטרט
✅ דורות נשמרים ויזואלית
✅ ניהול צמתים אינטראקטיבי

### מגבלות
❌ לא ספרייה ייעודית לעץ משפחה (דורש מימוש מותאם)
❌ כל מימוש שונה
❌ אין פתרון סטנדרטי
❌ דורש עבודת פיתוח משמעותית
❌ תיעוד משתנה לפי מימוש

### מורכבות אינטגרציה
גבוהה מאוד - דורש בנייה מאפס

### מתאים ל
פרויקטים מותאמים שבהם נדרשת גמישות ושליטה מקסימלית

---

## ניתוח תמיכה RTL (עברית)

**ממצא חשוב:** אף אחת מהספריות הנסקרות לא מפרסמת תמיכה מובנית ב-RTL או עברית.

**עם זאת:**
- Material UI ו-React Native מספקים frameworks RTL שניתן לשלב
- מימוש RTL מותאם יידרש על ידי:
  - הגדרת `dir="rtl"` על אלמנטי container
  - היפוך לוגיקת פריסה ברינדור
  - שיקוף קואורדינטות SVG/Canvas
  - התאמת יישור טקסט

**אופציות מומלצות להתאמה RTL:**
1. **family-chart** - Framework agnostic, קל יותר להתאמה
2. **relatives-tree** - מנוע רינדור גמיש מאפשר לוגיקת RTL מותאמת
3. **React Flow** - שליטה מלאה על מיקום צמתים

---

## תמיכה בקשרים מורכבים

**תמיכה מיטבית בקשרי משפחה מורכבים:**

1. **BALKAN FamilyTreeJS** - הכי מקיף (מסחרי)
2. **מימושי React Flow** - מטפלים מפורשות בגירושין, בני זוג מרובים, ילדים משותפים
3. **family-chart** - תמיכה טובה במבנים מורכבים
4. **d3-dtree/d3-pedigree-tree** - תמיכה רב-הורית

**תמיכה מוגבלת:**
- react-d3-tree - היררכיה חד-הורית בלבד
- relatives-tree - תיעוד לא ברור על קשרים מורכבים

---

## המלצות TOP 2

### 🥇 #1 המלצה: family-chart by donatso

**למה זו הבחירה הטובה ביותר:**

✅ **תצוגת עץ מסורתית** - בנוי במיוחד לעצי משפחה, לא force-directed
✅ **קוד פתוח** - רישיון MIT, ללא הגבלות מסחריות
✅ **תחזוקה פעילה** - עודכן לפני חודשיים (נובמבר 2025)
✅ **קשרים מורכבים** - מטפל בסוגי תרשימים ומבנים מרובים
✅ **תואם React** - Framework agnostic עם יצירת קוד
✅ **תמיכה TypeScript** - הגדרות type מלאות כלולות
✅ **תכונות אינטראקטיביות** - Zoom, pan, navigation, צמתים ניתנים להתאמה
✅ **תיעוד טוב** - פאנל קונפיגורציה ודוגמאות
✅ **מופעל D3.js** - ספריית ויזואליזציה סטנדרטית בתעשייה
✅ **ניתן להתאמה** - יכול למימוש RTL עם שינויי CSS/layout

**השתמש ב-family-chart כאשר:**
- אתה צריך פתרון שלם מוכן לייצור
- קוד פתוח עם רישיון MIT נדרש
- אתה רוצה תצוגות עץ משפחה מסורתיות
- אינטגרציית React/TypeScript חשובה
- אתה צריך תיעוד ודוגמאות טובות

**מורכבות אינטגרציה:** בינונית
**זמן לייצור:** 1-2 שבועות

---

### 🥈 #2 המלצה: BALKAN FamilyTreeJS (אם התקציב מאפשר)

**למה זו חלופה חזקה:**

✅ **הכי עשיר בתכונות** - ספרייה ברמה מקצועית
✅ **תיעוד מצוין** - מסמכים ודוגמאות מקיפות
✅ **תחזוקה פעילה** - נתמך מסחרית
✅ **תצוגות מסורתיות** - סוגי תרשימים ותבניות מרובות
✅ **תמיכה React** - אינטגרציית React רשמית
✅ **תכונות אינטראקטיביות** - עריכה מתקדמת, חיפוש, lazy loading
✅ **תמיכה מקצועית** - תמיכה טכנית כלולה ברישיון
✅ **נבדק בקרב** - משמש באפליקציות ייצור

⚠️ **שיקולים:**
- **רישיון קנייני** - דורש רישוי מסחרי
- **עלות** - $129-$299/שנה לרמת Premium
- **לא קוד פתוח** - לא ניתן לשנות קוד מקור

**השתמש ב-BALKAN FamilyTreeJS כאשר:**
- תקציב זמין לתוכנה מסחרית
- תמיכה מקצועית נדרשת
- תכונות מתקדמות מצדיקות את העלות
- קוד פתוח אינו דרישה
- אתה צריך את הפתרון המלוטש ביותר

**מורכבות אינטגרציה:** נמוכה-בינונית
**זמן לייצור:** שבוע אחד

---

## המלצות חלופיות לפי מקרה שימוש

### להתאמה אישית ושליטה מקסימלית
**React Flow** + מימוש מותאם
דורש זמן פיתוח משמעותי אך מספק שליטה מלאה

### לביצועים קלי משקל
**relatives-tree** עם רינדור מותאם
הטוב ביותר לפרויקטים שבהם גודל bundle קריטי

### לקבצי GEDCOM/גנאלוגיה סטנדרטיים
**Topola Genealogy Viewer**
אידיאלי לעבודה עם נתוני גנאלוגיה קיימים

### לאילני יוחסין רב-הוריים (מדעי)
**d3-pedigree-tree** או **d3-dtree**
מתמחה באפליקציות גידול/גנטיקה

---

## אסטרטגיית מימוש מומלצת

**על בסיס דרישות פרויקט Juhuri Heritage (תמיכה עברית, קשרים מורכבים, תצוגה מסורתית):**

### הגישה המומלצת:

**שלב 1: התחל עם family-chart**
1. מימוש עץ משפחה בסיסי באמצעות ספריית family-chart
2. מינוף רישיון MIT להתאמה אישית
3. שימוש ב-TypeScript לבטיחות סוג
4. יצירת רכיבי wrapper React

**שלב 2: הוסף תמיכה RTL**
1. עטיפת container family-chart עם הקשר RTL
2. שימוש בטרנספורמציות CSS לשיקוף פריסה לעברית
3. מימוש לוגיקת מיקום מותאמת במידת הצורך
4. בדיקה עם רינדור טקסט עברי

**שלב 3: שפר קשרים מורכבים**
1. הרחבת מודל הנתונים של family-chart לגירושין, נישואין חוזרים
2. הוספת אינדיקטורים ויזואליים לאימוץ, קשרי חורג
3. מימוש מחברים מותאמים לתרחישים מורכבים
4. יצירת UI עריכה לניהול קשרים

**תוכנית חלופית:** אם family-chart יתברר כלא מספיק לעברית/קשרים מורכבים, שקול שדרוג ל-BALKAN FamilyTreeJS (אם יש תקציב) או בניית פתרון מותאם עם React Flow.

---

## מקורות ולינקים

### BALKAN FamilyTreeJS
- [React - Docs | BALKAN FamilyTree JS](https://balkan.app/FamilyTreeJS/Docs/React)
- [GitHub - BALKANGraph/FamilyTreeJS](https://github.com/BALKANGraph/FamilyTreeJS)
- [Pricing | BALKAN FamilyTree JS](https://balkan.app/FamilyTreeJS/Pricing)

### family-chart
- [GitHub - donatso/family-chart](https://github.com/donatso/family-chart)
- [Family Chart Documentation](https://donatso.github.io/family-chart-doc/)
- [family-chart - npm](https://www.npmjs.com/package/family-chart)

### relatives-tree & react-family-tree
- [GitHub - SanichKotikov/relatives-tree](https://github.com/SanichKotikov/relatives-tree)
- [relatives-tree - npm](https://www.npmjs.com/package/relatives-tree)
- [FamilyTree demo](https://sanichkotikov.github.io/react-family-tree-example/)

### react-d3-tree
- [GitHub - bkrem/react-d3-tree](https://github.com/bkrem/react-d3-tree)
- [react-d3-tree Documentation](https://bkrem.github.io/react-d3-tree/docs/)

### d3-dtree (dTree)
- [GitHub - ErikGartner/dTree](https://github.com/ErikGartner/dTree)
- [d3-dtree - npm](https://www.npmjs.com/package/d3-dtree)

### Topola Genealogy Viewer
- [GitHub - PeWu/topola](https://github.com/PeWu/topola)
- [Topola Genealogy Viewer](https://pewu.github.io/topola-viewer/)

### d3-pedigree-tree
- [GitHub - solgenomics/d3-pedigree-tree](https://github.com/solgenomics/d3-pedigree-tree)

### React Flow Family Trees
- [GitHub - harrykhh/react-flow-family-tree](https://github.com/harrykhh/react-flow-family-tree)
- [A Family Tree Project built with React flow](https://reactjsexample.com/a-family-tree-project-built-with-react-flow/)

---

## סיכום והמלצה סופית

**לפרויקט Juhuri Heritage, ההמלצה הסופית היא:**

**התחל עם family-chart** כפתרון הראשוני:
- מאוזן טוב בין תכונות, קלות שימוש ומחיר (חינם)
- קוד פתוח מאפשר התאמות מלאות לעברית
- תחזוקה פעילה מבטיחה תמיכה עתידית
- קהילה גדלה ותיעוד משופר

**שקול שדרוג ל-BALKAN FamilyTreeJS אם:**
- התקציב מאפשר ($129-299/שנה)
- צריך תכונות מתקדמות מיד ללא פיתוח
- תמיכה מקצועית קריטית לפרויקט
- זמן פיתוח מוגבל

**מעקב והערכה:**
- בצע POC (Proof of Concept) עם family-chart
- הערך את יכולות RTL והתאמה אישית
- תעדף את זמן הפיתוח לעומת עלות הרישיון
- שמור על גמישות למעבר לפתרון אחר במידת הצורך

---

*דוח זה עודכן בינואר 2026 על בסיס מחקר מקיף של ספריות עץ משפחה זמינות.*
