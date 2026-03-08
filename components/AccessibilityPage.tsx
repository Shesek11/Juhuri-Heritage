import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const AccessibilityPage: React.FC = () => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-12">
      <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg p-8 md:p-12 border border-white/10">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-slate-900 dark:text-slate-50">
          הצהרת נגישות
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-10">
          עודכן לאחרונה: 5 במרץ 2026
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">מחויבות לנגישות</h2>
          <p className="mb-3 text-slate-600 dark:text-slate-300 leading-relaxed">
            ב"מורשת ג׳והורי", אנו מחויבים להנגיש את האתר לכלל המשתמשים, כולל אנשים עם מוגבלויות. אנו פועלים כל העת כדי להבטיח שכל אדם יוכל לגשת למידע ולשירותים המוצעים באתר באופן שווה ונוח.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">תקן הנגישות</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            האתר נבנה בהתאם להנחיות הנגישות לרשת WCAG 2.1 ברמת AA, כפי שנקבעו על ידי ארגון W3C. הנחיות אלו מסבירות כיצד להפוך תוכן אינטרנט לנגיש יותר לאנשים עם מוגבלויות.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">פעולות שבוצעו להנגשה</h2>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2 pr-4">
            <li><strong>ניווט מקלדת:</strong> ניתן לנווט באתר באמצעות מקלדת בלבד.</li>
            <li><strong>תאימות לקוראי מסך:</strong> האתר מותאם לעבודה עם קוראי מסך פופולריים.</li>
            <li><strong>טקסט חלופי לתמונות:</strong> לכל התמונות יש טקסט חלופי (alt text).</li>
            <li><strong>ניגודיות צבעים:</strong> הקפדנו על ניגודיות צבעים מספקת בין טקסט לרקע.</li>
            <li><strong>גודל גופן:</strong> ניתן לשנות את גודל הגופן באמצעות פונקציות הדפדפן.</li>
            <li><strong>מבנה סמנטי:</strong> שימוש בתגי HTML סמנטיים לשיפור ההבנה והניווט.</li>
            <li><strong>טפסים נגישים:</strong> טפסי האתר מונגשים ומאפשרים מילוי קל וברור.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">הגבלות נגישות</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            למרות מאמצינו, ייתכנו חלקים שעדיין אינם נגישים באופן מלא. אנו ממשיכים לעבוד על שיפור הנגישות ומתחייבים לתקן כל בעיה שתתגלה.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">פנייה בנושאי נגישות</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            אם נתקלתם בבעיית נגישות או שיש לכם הצעות לשיפור, אנא פנו אלינו דרך <Link to="/contact" className="text-amber-600 dark:text-amber-400 hover:underline">עמוד צור קשר</Link>.
          </p>
        </section>

        <div className="text-center mt-10">
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
            <Home size={18} />
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityPage;
