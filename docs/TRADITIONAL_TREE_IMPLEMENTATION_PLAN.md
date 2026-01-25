# תוכנית מימוש עץ משפחה מסורתי עם family-chart

## סטטוס: 🟡 מוכן למימוש (תוכנית מגירה)

תוכנית זו מוכנה למימוש מיידי כשתינתן הוראה.

---

## 📋 סקירה כללית

**מטרה:** החלפת הגרף force-directed הנוכחי בעץ משפחה מסורתי היררכי באמצעות ספריית family-chart.

**אופן פעולה:** יצירת קומפוננט חדש `TraditionalFamilyTree.tsx` שישתמש ב-family-chart במקום D3 force simulation.

**שימור:** כל התשתית הקיימת (API, מסד נתונים, עריכה, הרשאות) נשארת ללא שינוי.

---

## 🎯 יעדים

### מה משתנה:
- ✅ ויזואליזציה היררכית במקום force-directed
- ✅ תצוגות מרובות (עץ, מניפה, hourglass)
- ✅ תמיכה RTL לעברית
- ✅ פורמט מוכר למשתמשים (כמו MyHeritage)

### מה נשאר:
- ✅ familyService API
- ✅ EditMemberModal
- ✅ מערכת החיפוש
- ✅ הוספת קשרים
- ✅ מיזוג עצים (merge_suggestions)
- ✅ בקשות קישור (link_requests)
- ✅ כל הלוגיקה הקהילתית

---

## 📦 שלב 1: התקנת תלויות

```bash
npm install family-chart
npm install --save-dev @types/d3
```

**זמן משוער:** 5 דקות

---

## 🏗️ שלב 2: יצירת קומפוננט TraditionalFamilyTree

### קובץ: `components/family/TraditionalFamilyTree.tsx`

```typescript
import React, { useRef, useEffect, useState, useCallback } from 'react';
import f3 from 'family-chart';
import { familyService, FamilyMember } from '../../services/familyService';
import { EditMemberModal } from './EditMemberModal';

interface TreeNode {
    id: string;
    data: {
        first_name: string;
        last_name: string;
        gender: 'male' | 'female' | 'other';
        birth_date?: string;
        death_date?: string;
        photo_url?: string;
        is_alive: boolean;
    };
    rels: {
        spouses?: string[];
        father?: string;
        mother?: string;
        children?: string[];
    };
}

export const TraditionalFamilyTree: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'tree' | 'fan' | 'hourglass'>('tree');

    // Load data from API
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await familyService.getTreeData();
            setMembers(data.members || []);
        } catch (error) {
            console.error('Error loading family tree:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Transform data to family-chart format
    const transformToTreeData = useCallback(() => {
        const nodes: TreeNode[] = members.map(m => ({
            id: String(m.id),
            data: {
                first_name: m.first_name,
                last_name: m.last_name || '',
                gender: m.gender,
                birth_date: m.birth_date,
                death_date: m.death_date,
                photo_url: m.photo_url,
                is_alive: m.is_alive
            },
            rels: {}
        }));

        // TODO: Populate relationships from API data
        // This requires mapping parentChild and partnerships to family-chart format

        return nodes;
    }, [members]);

    // Initialize family-chart
    useEffect(() => {
        if (!containerRef.current || loading || members.length === 0) return;

        const treeData = transformToTreeData();

        const store = f3.createStore({
            data: treeData,
            node_separation: 250,
            level_separation: 150
        });

        const view = f3.d3AnimationView({
            store: store,
            cont: containerRef.current
        });

        // Add RTL support
        containerRef.current.style.direction = 'rtl';

        view.update();

        return () => {
            // Cleanup
        };
    }, [members, loading, transformToTreeData, viewMode]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header with controls */}
            <div className="bg-slate-800 p-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold text-white">עץ משפחה מסורתי</h1>

                    {/* View mode selector */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('tree')}
                            className={viewMode === 'tree' ? 'active' : ''}
                        >
                            עץ
                        </button>
                        <button
                            onClick={() => setViewMode('fan')}
                            className={viewMode === 'fan' ? 'active' : ''}
                        >
                            מניפה
                        </button>
                        <button
                            onClick={() => setViewMode('hourglass')}
                            className={viewMode === 'hourglass' ? 'active' : ''}
                        >
                            שעון חול
                        </button>
                    </div>
                </div>
            </div>

            {/* Tree container */}
            <div ref={containerRef} className="flex-1 bg-slate-900" />

            {/* Edit Modal */}
            <EditMemberModal
                isOpen={isEditModalOpen}
                member={selectedMember}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedMember(null);
                }}
                onSuccess={() => {
                    setIsEditModalOpen(false);
                    setSelectedMember(null);
                    loadData();
                }}
                potentialRelations={members}
            />
        </div>
    );
};
```

**זמן משוער:** 3-4 שעות

---

## 🎨 שלב 3: התאמה אישית לעברית (RTL)

### קובץ: `styles/family-chart-rtl.css`

```css
/* RTL Support for family-chart */
.f3-container {
    direction: rtl;
}

.f3-card {
    direction: rtl;
    text-align: right;
}

.f3-card-name {
    font-family: 'Heebo', 'Rubik', sans-serif;
    text-align: right;
}

/* Mirror tree layout for RTL */
.f3-tree-horizontal {
    transform: scaleX(-1);
}

.f3-tree-horizontal .f3-card {
    transform: scaleX(-1); /* Un-mirror the cards */
}

/* Custom styling */
.f3-card.male {
    border-color: #3b82f6;
    background: #dbeafe;
}

.f3-card.female {
    border-color: #ec4899;
    background: #fce7f3;
}

.f3-connector {
    stroke: #64748b;
    stroke-width: 2;
}

.f3-connector.spouse {
    stroke: #f472b6;
    stroke-width: 3;
}
```

**זמן משוער:** 2-3 שעות (בדיקות RTL)

---

## 🔧 שלב 4: שילוב עם Router

### קובץ: `App.tsx` (או Routes.tsx)

הוספת route חדש:

```typescript
import { TraditionalFamilyTree } from './components/family/TraditionalFamilyTree';

// בתוך ה-Routes:
<Route path="/family/traditional" element={<TraditionalFamilyTree />} />

// אפשר גם להחליף את הנוכחי:
<Route path="/family/tree" element={<TraditionalFamilyTree />} />
```

**זמן משוער:** 15 דקות

---

## 🧪 שלב 5: בדיקות ותיקוני באגים

### משימות:
1. ✅ בדיקת טעינת נתונים מה-API
2. ✅ בדיקת המרת נתונים לפורמט family-chart
3. ✅ בדיקת RTL - טקסט עברי מיושר נכון
4. ✅ בדיקת zoom ו-pan
5. ✅ בדיקת לחיצה על נוד ופתיחת EditModal
6. ✅ בדיקת שלושת מצבי התצוגה (tree, fan, hourglass)
7. ✅ בדיקת הוספת אדם חדש
8. ✅ בדיקת עריכת קשרים
9. ✅ בדיקה על מסכים שונים (desktop, tablet, mobile)

**זמן משוער:** 4-6 שעות

---

## 🚀 שלב 6: Deploy ובדיקה סופית

1. Build ייצור:
   ```bash
   npm run build
   ```

2. בדיקת bundle size

3. העלאה לשרת staging

4. בדיקת ביצועים עם נתונים אמיתיים

5. איסוף feedback מהמשתמש

**זמן משוער:** 2-3 שעות

---

## ⏱️ הערכת זמן כוללת

| שלב | זמן משוער |
|-----|-----------|
| התקנת תלויות | 5 דקות |
| יצירת קומפוננט בסיסי | 3-4 שעות |
| התאמה RTL וסטיילינג | 2-3 שעות |
| שילוב Router | 15 דקות |
| בדיקות ותיקונים | 4-6 שעות |
| Deploy ובדיקה | 2-3 שעות |
| **סה"כ** | **12-16 שעות** |

**פריסה על זמן:** 2-3 ימי עבודה

---

## ⚠️ סיכונים ואתגרים

### סיכונים זוהרים:
1. **תמיכה RTL לא מושלמת** - family-chart לא נבנה לעברית
   - פתרון: CSS transforms + custom styling

2. **מבנה נתונים לא תואם** - צורת הנתונים שלנו שונה מ-family-chart
   - פתרון: שכבת המרה (transform function)

3. **קשרים מורכבים** - גירושין, נישואין חוזרים, אימוץ
   - פתרון: בדיקת יכולות הספרייה + fallback לתצוגה פשוטה

4. **ביצועים עם עצים גדולים** - family-chart עשוי להיות איטי עם 1000+ צמתים
   - פתרון: lazy loading, pagination, או limiting של עומק העץ

---

## 🔄 תהליך העברה מ-CommunityGraph

### אופציה 1: החלפה מלאה
```typescript
// בקובץ Routes
<Route path="/family/tree" element={<TraditionalFamilyTree />} />
```

### אופציה 2: מעבר הדרגתי
```typescript
// שתי תצוגות במקביל
<Route path="/family/network" element={<CommunityGraph />} />
<Route path="/family/tree" element={<TraditionalFamilyTree />} />

// עם toggle בממשק
<button>תצוגת רשת | תצוגת עץ</button>
```

### אופציה 3: A/B Testing
- 50% משתמשים רואים CommunityGraph
- 50% רואים TraditionalFamilyTree
- מדידת engagement ו-feedback

---

## 📊 קריטריונים להצלחה

לאחר מימוש, נעריך על פי:

1. ✅ **שימושיות** - האם המשתמשים מצליחים לנווט בעץ?
2. ✅ **בהירות** - האם הקשרים ברורים יותר מאשר ב-force layout?
3. ✅ **RTL** - האם העברית נראית תקינה?
4. ✅ **ביצועים** - האם הטעינה מהירה?
5. ✅ **כיף לעבוד** - האם תחזוקת הקוד קלה יותר?

אם 4/5 מהקריטריונים מתקיימים → **הצלחה, נעבור לעץ מסורתי**

אם פחות → **נשאר עם CommunityGraph ונשפר אותו**

---

## 🎬 איך להתחיל?

כשתרצה למימוש, פשוט תגיד:

**"אופציה B"** או **"בוא נתחיל עם family-chart"**

ואני אתחיל מיד לממש לפי התוכנית הזו.

---

## 📚 משאבים

- [family-chart GitHub](https://github.com/donatso/family-chart)
- [family-chart Documentation](https://donatso.github.io/family-chart-doc/)
- [D3 RTL Support](https://observablehq.com/@d3/right-to-left-support)
- [דוח מחקר מלא](./family-tree-libraries-research.md)

---

*תוכנית זו מוכנה למימוש מיידי ומתעדכנת לפי צרכי הפרויקט.*
