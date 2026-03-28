'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Home } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
  const t = useTranslations('pages');
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12">
      <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg p-8 md:p-12 border border-white/10">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-slate-900 dark:text-slate-50">
          {t('privacyTitle')}
        </h1>
        <p className="text-sm text-slate-400 dark:text-slate-400 text-center mb-10">
          {t('lastUpdated', { date: '5 במרץ 2026' })}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">1. איסוף מידע אישי</h2>
          <p className="mb-3 text-slate-600 dark:text-slate-300 leading-relaxed">
            אנו אוספים מידע אישי שאתם מספקים לנו מרצונכם בעת הרשמה לשירותים שלנו, יצירת קשר, או תרומה לפרויקט. מידע זה עשוי לכלול שם, כתובת דוא"ל, פרטי קשר, וכל מידע אחר שתבחרו לשתף.
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            בנוסף, אנו אוספים מידע לא אישי, כגון כתובת IP, סוג דפדפן, מערכת הפעלה, ודפים שבהם ביקרתם, לצורך שיפור חווית המשתמש.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">2. שימוש במידע</h2>
          <p className="mb-3 text-slate-600 dark:text-slate-300 leading-relaxed">המידע הנאסף משמש למטרות הבאות:</p>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1 pr-4">
            <li>מתן ותחזוקת השירותים שלנו.</li>
            <li>שיפור ותאום אישי של חווית המשתמש.</li>
            <li>תקשורת איתכם, כולל מענה לשאלות ומתן עדכונים.</li>
            <li>אבטחת האתר ומניעת הונאות.</li>
            <li>עמידה בדרישות חוקיות ורגולטוריות.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">3. קובצי Cookie</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            אנו משתמשים בקובצי Cookie ובטכנולוגיות דומות כדי לאסוף מידע, לזכור את העדפותיכם ולשפר את חווית השימוש. אתם יכולים להגדיר את הדפדפן לדחות קובצי Cookie, אך ייתכן שחלקים מסוימים מהשירותים לא יפעלו כראוי.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">4. שיתוף מידע עם צדדים שלישיים</h2>
          <p className="mb-3 text-slate-600 dark:text-slate-300 leading-relaxed">
            אנו לא מוכרים, סוחרים או משכירים את המידע האישי שלכם לצדדים שלישיים. אנו עשויים לשתף מידע עם ספקי שירותים חיצוניים לצורך הפעלת האתר ומתן השירותים. ספקים אלה מחויבים לשמור על סודיות המידע.
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            אנו עשויים לחשוף מידע אישי אם נידרש לכך על פי חוק, צו בית משפט, או כדי להגן על זכויותינו.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">5. אבטחת מידע</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            אנו נוקטים באמצעי אבטחה סבירים כדי להגן על המידע האישי שלכם. עם זאת, אין שיטת שידור באינטרנט מאובטחת ב-100%, ולכן איננו יכולים להבטיח אבטחה מוחלטת.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">6. זכויותיכם</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            יש לכם זכות לדרוש גישה למידע האישי שלכם, לתקן אותו, למחוק אותו או להגביל את עיבודו. לבקשות כאלה, אנא פנו אלינו דרך <Link href="/contact" className="text-amber-600 dark:text-amber-400 hover:underline">עמוד צור קשר</Link>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">7. שינויים במדיניות</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            אנו שומרים לעצמנו את הזכות לעדכן מדיניות זו מעת לעת. כל שינוי יפורסם בדף זה. אנו ממליצים לבדוק דף זה באופן קבוע.
          </p>
        </section>

        <div className="text-center mt-10">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
            <Home size={18} />
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
