'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Info, HelpCircle, Library, Book, GraduationCap,
  Mic, Layout, Search, MessageCircle, History,
  Globe, ExternalLink, Home
} from 'lucide-react';

type Tab = 'about' | 'guide' | 'sources';

const AboutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('about');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'about', label: 'אודות המערכת', icon: <Info size={16} /> },
    { id: 'guide', label: 'מדריך למשתמש', icon: <HelpCircle size={16} /> },
    { id: 'sources', label: 'מקורות ידע', icon: <Library size={16} /> },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12">
      <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden">

        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/10 text-center bg-white/5">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-2">
            מרכז מידע ועזרה
          </h1>
          <p className="text-slate-400 text-sm">
            כל מה שצריך לדעת על מורשת ג׳והורי
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-b-2 ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-500 hover:bg-white/5'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 md:p-10 space-y-8 text-slate-300 leading-relaxed">

          {/* Tab: About */}
          {activeTab === 'about' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="bg-amber-900/20 p-5 rounded-2xl border border-amber-900/50">
                <h4 className="font-bold text-amber-100 text-lg mb-2">ברוכים הבאים למורשת ג׳והורי</h4>
                <p className="text-sm text-amber-200/80">
                  מיזם דיגיטלי חדשני לשימור, תיעוד והנגשת השפה הג׳והורית (יהודית-הררית). המערכת משלבת מחקר אקדמי קפדני עם טכנולוגיות בינה מלאכותית מתקדמות כדי להחיות את שפתם של יהודי ההרים.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-white/10 rounded-xl bg-white/5">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-amber-500 bg-amber-500/10">
                    <Book size={20} />
                  </div>
                  <h5 className="font-bold text-white mb-1">המילון החכם</h5>
                  <p className="text-sm text-slate-400">מאגר עצום של מילים וביטויים, כולל תרגום משולש (עברית, לטינית, קירילית) וזיהוי ניבים אוטומטי.</p>
                </div>
                <div className="p-4 border border-white/10 rounded-xl bg-white/5">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-purple-500 bg-purple-500/10">
                    <GraduationCap size={20} />
                  </div>
                  <h5 className="font-bold text-white mb-1">המורה הפרטי</h5>
                  <p className="text-sm text-slate-400">מערכת למידה אינטראקטיבית המאפשרת לתרגל את השפה באמצעות שיעורים מובנים ושיחות עם דמויות AI.</p>
                </div>
                <div className="p-4 border border-white/10 rounded-xl bg-white/5">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-rose-500 bg-rose-500/10">
                    <Mic size={20} />
                  </div>
                  <h5 className="font-bold text-white mb-1">חיפוש קולי</h5>
                  <p className="text-sm text-slate-400">ניתן לחפש מילים וביטויים פשוט על ידי דיבור אל המיקרופון, והמערכת תזהה ותתרגם בזמן אמת.</p>
                </div>
                <div className="p-4 border border-white/10 rounded-xl bg-white/5">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-green-500 bg-green-500/10">
                    <Layout size={20} />
                  </div>
                  <h5 className="font-bold text-white mb-1">ממשק מתקדם</h5>
                  <p className="text-sm text-slate-400">חוויית משתמש מודרנית ונגישה, מותאמת לכל המכשירים, עם תמיכה במצב כהה (Dark Mode).</p>
                </div>
              </div>

              {/* Mission & Team */}
              <div className="space-y-6 border-t border-white/10 pt-8">
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
          )}

          {/* Tab: Guide */}
          {activeTab === 'guide' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Dictionary Guide */}
              <div className="space-y-4">
                <h4 className="font-bold text-white text-lg flex items-center gap-2 border-b border-white/10 pb-2">
                  <Search size={20} className="text-amber-500" />
                  איך להשתמש במילון?
                </h4>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="bg-amber-500/20 text-amber-400 font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs">1</span>
                    <div>
                      <p className="font-bold text-slate-200">חיפוש חופשי</p>
                      <p className="text-sm text-slate-400">הקלידו מילה בעברית, בג׳והורית (באותיות לטיניות או קיריליות) או אפילו באנגלית. המערכת תזהה את השפה אוטומטית.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="bg-amber-500/20 text-amber-400 font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs">2</span>
                    <div>
                      <p className="font-bold text-slate-200">חיפוש קולי</p>
                      <p className="text-sm text-slate-400">לחצו על סמל המיקרופון <Mic size={14} className="inline mx-1" /> ואמרו מילה. המערכת תתמלל אותה ותציג תוצאות מיד.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="bg-amber-500/20 text-amber-400 font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs">3</span>
                    <div>
                      <p className="font-bold text-slate-200">כרטיס התוצאה</p>
                      <p className="text-sm text-slate-400">לכל מילה תקבלו הגדרה מדויקת, תרגום לניבים שונים, דוגמאות לשימוש במשפט ומדריך הגייה מפורט.</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Tutor Guide */}
              <div className="space-y-4">
                <h4 className="font-bold text-white text-lg flex items-center gap-2 border-b border-white/10 pb-2">
                  <MessageCircle size={20} className="text-emerald-500" />
                  המורה הפרטי (&quot;סבא מרדכי&quot;)
                </h4>
                <p className="text-sm text-slate-400">
                  רוצים לתרגל שיחה? יש לנו מורה פרטי מבוסס AI המדמה את סבא מרדכי, דמות חכמה ולבבית שתשמח ללמד אתכם.
                </p>
                <ul className="space-y-3">
                  <li className="flex gap-4 items-start">
                    <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-500 shrink-0">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">מצב לימוד (Tutor Mode)</p>
                      <p className="text-sm text-slate-400">לחצו על &quot;מורה פרטי&quot; בתפריט כדי לגשת לשיעורים מובנים לפי רמות קושי.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-500 shrink-0">
                      <MessageCircle size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">שיחה חופשית</p>
                      <p className="text-sm text-slate-400">ניתן להתכתב עם סבא מרדכי, לבקש ממנו להסביר דקדוק, או סתם לפטפט בג׳והורית.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab: Sources */}
          {activeTab === 'sources' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="text-sm bg-amber-900/20 p-4 rounded-xl text-amber-200/80 border border-amber-900/50">
                למען הדיוק המרבי, המערכת תוכנתה לבצע הצלבת נתונים בין שכבות שונות של מקורות היסטוריים ואקדמיים:
              </div>

              {/* Dictionaries */}
              <div>
                <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Library size={16} className="text-amber-500" />
                  מילונים מרכזיים
                </h4>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                    <p className="font-bold text-amber-400">המילון הג׳והורי-עברי הגדול</p>
                    <p className="text-xs text-slate-500 mb-2">מרדכי אגרונוב (1997) — המקור הראשי לכתיב</p>
                    <a href="https://merhav.nli.org.il/primo-explore/search?query=any,contains,%D7%9E%D7%A8%D7%93%D7%9B%D7%99%20%D7%90%D7%92%D7%A8%D7%95%D7%A0%D7%95%D7%91%20%D7%9E%D7%99%D7%9C%D7%95%D7%9F&vid=NLI&lang=he_IL" target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-500 hover:underline flex items-center gap-1"><ExternalLink size={10} /> הספרייה הלאומית</a>
                  </div>
                  <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                    <p className="font-bold text-amber-400">מילון טאטי-רוסי</p>
                    <p className="text-xs text-slate-500">יעקב אגרונוב ומיכאל דדשוב</p>
                  </div>
                  <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                    <p className="font-bold text-amber-400">מילון ג׳והורי-עברי (פולקלור)</p>
                    <p className="text-xs text-slate-500">חניל (חנה) רפאל ויוסי בן-עמי — דגש על ניב קובה</p>
                  </div>
                </div>
              </div>

              {/* Grammar & Research */}
              <div>
                <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <GraduationCap size={16} className="text-emerald-500" />
                  דקדוק ומחקר אקדמי
                </h4>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                    <p className="font-bold text-amber-400">דקדוק השפה הג׳והורית</p>
                    <p className="text-xs text-slate-500">פרידה יוסופובה — סמכות עליונה להטיות פעלים</p>
                  </div>
                  <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                    <p className="font-bold text-amber-400">חקר יהדות קווקז</p>
                    <p className="text-xs text-slate-500">גרשון בן-אורן — הקשר תרבותי ודתי</p>
                  </div>
                </div>
              </div>

              {/* History */}
              <div>
                <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <History size={16} className="text-rose-500" />
                  מחקר היסטורי (ארכאי)
                </h4>
                <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <p className="font-bold text-amber-400">חומרים לחקר השפה היהודית-טאטית (1892)</p>
                  <p className="text-xs text-slate-500">וילהלם מילר (Vs. Miller) — תיעוד היסטורי מוקדם</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <a
                  href="https://stmegi.com/gorskie_evrei/juhuri/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors group"
                >
                  <div className="bg-amber-500/10 p-2 rounded-lg text-amber-500">
                    <Globe size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors">מרכז המורשת STMEGI</p>
                    <p className="text-xs text-slate-500">לעיון במקורות הדיגיטליים</p>
                  </div>
                  <ExternalLink size={14} className="mr-auto text-slate-400" />
                </a>
              </div>

              <div className="text-[10px] text-slate-500 border-t border-white/10 pt-2 text-center">
                <p>ט.ל.ח — המערכת משתמשת בבינה מלאכותית ומבצעת סינתזה של המקורות הנ&quot;ל.</p>
              </div>
            </div>
          )}
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
