'use client';

import React from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';

/*
 * HIDDEN TABS — preserved for future use:
 * - 'guide' (מדריך למשתמש): Dictionary usage guide, tutor guide ("סבא מרדכי")
 * - 'sources' (מקורות ידע): Academic sources, dictionaries list (Agronov, Yusupova, etc.), STMEGI link
 * - Feature grid (4 cards): המילון החכם, המורה הפרטי, חיפוש קולי, ממשק מתקדם
 * See git history for full content.
 */

const AboutPage: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12">
      <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden">

        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/10 text-center bg-white/5">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-2">
            אודות
          </h1>
          <p className="text-slate-400 text-sm">
            כל מה שצריך לדעת על מורשת ג׳והורי
          </p>
        </div>

        {/* Content */}
        <div className="p-6 md:p-10 space-y-8 text-slate-300 leading-relaxed">
          {/* Welcome */}
          <div className="bg-amber-900/20 p-5 rounded-2xl border border-amber-900/50">
            <h4 className="font-bold text-amber-100 text-lg mb-2">ברוכים הבאים למורשת ג׳והורי</h4>
            <p className="text-sm text-amber-200/80">
              מיזם דיגיטלי חדשני לשימור, תיעוד והנגשת השפה הג׳והורית (יהודית-הררית). המערכת משלבת מחקר אקדמי קפדני עם טכנולוגיות בינה מלאכותית מתקדמות כדי להחיות את שפתם של יהודי ההרים.
            </p>
          </div>

          {/* Mission & Team */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-3">המשימה שלנו</h3>
              <p className="text-slate-300 leading-relaxed mb-3">
                מורשת ג׳והורי הוקמה מתוך אהבה עמוקה לשפת הג׳והורי הייחודית ולתרבות העשירה של יהודי ההרים בקווקז. אנו מאמינים ששפה היא נשמתה של קהילה, ושימורה חיוני להבטחת העברת המורשת מדור לדור.
              </p>
              <p className="text-slate-300 leading-relaxed">
                מטרתנו היא לספק פלטפורמה דיגיטלית מקיפה ונגישה, שתשמש כמרכז ללימוד, תיעוד וחגיגת כל היבטי התרבות הג׳והורית.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-3">הצוות שלנו</h3>
              <p className="text-slate-300 leading-relaxed">
                מאחורי מורשת ג׳והורי עומד צוות מסור של בלשנים, מפתחים, מעצבים, ואנשי קהילה. אנו תמיד מחפשים מתנדבים חדשים — בקרו ב<Link href="/contact" className="text-amber-400 hover:underline">עמוד צור קשר</Link>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
            <Home size={18} />
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
