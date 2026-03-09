import React, { useState } from 'react';
import { X, Book, Info, ExternalLink, Globe, Library, GraduationCap, History, HelpCircle, MessageCircle, Mic, Search, Layout } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'about' | 'guide' | 'sources'>('about');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-rubik" onClick={onClose}>
      <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10 h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
          <div className="flex items-center gap-2 text-slate-200">
            <Info size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-lg">מרכז מידע ועזרה</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('about')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-b-2 ${activeTab === 'about' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
          >
            <Info size={16} /> אודות המערכת
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-b-2 ${activeTab === 'guide' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
          >
            <HelpCircle size={16} /> מדריך למשתמש
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-b-2 ${activeTab === 'sources' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
          >
            <Library size={16} /> מקורות ידע
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed">

          {/* Tab: About */}
          {activeTab === 'about' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-100 text-lg mb-2">ברוכים הבאים למורשת ג'והורי</h4>
                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                  מיזם דיגיטלי חדשני לשימור, תיעוד והנגשת השפה הג'והורית (יהודית-הררית). המערכת משלבת מחקר אקדמי קפדני עם טכנולוגיות בינה מלאכותית מתקדמות כדי להחיות את שפתם של יהודי ההרים.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm/30">
                  <div className="bg-white/5 backdrop-blur-sm w-10 h-10 rounded-lg flex items-center justify-center shadow-sm mb-3 text-amber-500">
                    <Book size={20} />
                  </div>
                  <h5 className="font-bold text-white mb-1">המילון החכם</h5>
                  <p className="text-sm text-slate-500">מאגר עצום של מילים וביטויים, כולל תרגום משולש (עברית, לטינית, קירילית) וזיהוי ניבים אוטומטי.</p>
                </div>
                <div className="p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm/30">
                  <div className="bg-white/5 backdrop-blur-sm w-10 h-10 rounded-lg flex items-center justify-center shadow-sm mb-3 text-purple-500">
                    <GraduationCap size={20} />
                  </div>
                  <h5 className="font-bold text-white mb-1">המורה הפרטי</h5>
                  <p className="text-sm text-slate-500">מערכת למידה אינטראקטיבית המאפשרת לתרגל את השפה באמצעות שיעורים מובנים ושיחות עם דמויות AI.</p>
                </div>
                <div className="p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm/30">
                  <div className="bg-white/5 backdrop-blur-sm w-10 h-10 rounded-lg flex items-center justify-center shadow-sm mb-3 text-rose-500">
                    <Mic size={20} />
                  </div>
                  <h5 className="font-bold text-white mb-1">חיפוש קולי</h5>
                  <p className="text-sm text-slate-500">ניתן לחפש מילים וביטויים פשוט על ידי דיבור אל המיקרופון, והמערכת תזהה ותתרגם בזמן אמת.</p>
                </div>
                <div className="p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm/30">
                  <div className="bg-white/5 backdrop-blur-sm w-10 h-10 rounded-lg flex items-center justify-center shadow-sm mb-3 text-green-500">
                    <Layout size={20} />
                  </div>
                  <h5 className="font-bold text-white mb-1">ממשק מתקדם</h5>
                  <p className="text-sm text-slate-500">חוויית משתמש מודרנית ונגישה, מותאמת לכל המכשירים, עם תמיכה במצב כהה (Dark Mode).</p>
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
                  <Search size={20} className="text-indigo-500" />
                  איך להשתמש במילון?
                </h4>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="bg-white/10 text-slate-600 dark:text-slate-300 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs">1</span>
                    <div>
                      <p className="font-bold text-slate-200">חיפוש חופשי</p>
                      <p className="text-sm text-slate-500">הקלידו מילה בעברית, בג'והורית (באותיות לטיניות או קיריליות) או אפילו באנגלית. המערכת תזהה את השפה אוטומטית.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="bg-white/10 text-slate-600 dark:text-slate-300 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs">2</span>
                    <div>
                      <p className="font-bold text-slate-200">חיפוש קולי</p>
                      <p className="text-sm text-slate-500">לחצו על סמל המיקרופון <Mic size={14} className="inline mx-1" /> ואמרו מילה. המערכת תתמלל אותה ותציג תוצאות מיד.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="bg-white/10 text-slate-600 dark:text-slate-300 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs">3</span>
                    <div>
                      <p className="font-bold text-slate-200">כרטיס התוצאה</p>
                      <p className="text-sm text-slate-500">לכל מילה תקבלו הגדרה מדויקת, תרגום לניבים שונים, דוגמאות לשימוש במשפט ומדריך הגייה מפורט.</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Tutor Guide */}
              <div className="space-y-4">
                <h4 className="font-bold text-white text-lg flex items-center gap-2 border-b border-white/10 pb-2">
                  <MessageCircle size={20} className="text-emerald-500" />
                  המורה הפרטי ("סבא מרדכי")
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  רוצים לתרגל שיחה? יש לנו מורה פרטי מבוסס AI המדמה את סבא מרדכי, דמות חכמה ולבבית שתשמח ללמד אתכם.
                </p>
                <ul className="space-y-3">
                  <li className="flex gap-4 items-start">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 shrink-0">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">מצב לימוד (Tutor Mode)</p>
                      <p className="text-sm text-slate-500">בחרו "מצב לימוד" בתפריט הצד כדי לגשת לשיעורים מובנים לפי רמות קושי.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 shrink-0">
                      <MessageCircle size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">שיחה חופשית</p>
                      <p className="text-sm text-slate-500">ניתן להתכתב עם סבא מרדכי, לבקש ממנו להסביר דקדוק, או סתם לפטפט ב'והורית.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab: Sources (Original Content) */}
          {activeTab === 'sources' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="text-sm bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-indigo-800 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50">
                למען הדיוק המרבי, המערכת תוכנתה לבצע הצלבת נתונים בין שכבות שונות של מקורות היסטוריים ואקדמיים:
              </div>

              {/* Section 1: Dictionaries */}
              <div>
                <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Library size={16} className="text-amber-600" />
                  מילונים מרכזיים
                </h4>
                <div className="space-y-3">
                  <div className="bg-white/5 backdrop-blur-sm/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                    <p className="font-bold text-slate-900 dark:text-amber-500">המילון הג'והורי-עברי הגדול</p>
                    <p className="text-xs text-slate-500 mb-2">מרדכי אגרונוב (1997) • המקור הראשי לכתיב</p>
                    <a href="https://merhav.nli.org.il/primo-explore/search?query=any,contains,מרדכי%20אגרונוב%20מילון&vid=NLI&lang=he_IL" target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"><ExternalLink size={10} /> הספרייה הלאומית</a>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                    <p className="font-bold text-slate-900 dark:text-amber-500">מילון טאטי-רוסי</p>
                    <p className="text-xs text-slate-500">יעקב אגרונוב ומיכאל דדשוב</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                    <p className="font-bold text-slate-900 dark:text-amber-500">מילון ג'והורי-עברי (פולקלור)</p>
                    <p className="text-xs text-slate-500">חניל (חנה) רפאל ויוסי בן-עמי • דגש על ניב קובה</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Grammar & Research */}
              <div>
                <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <GraduationCap size={16} className="text-emerald-600" />
                  דקדוק ומחקר אקדמי
                </h4>
                <div className="space-y-3">
                  <div className="bg-white/5 backdrop-blur-sm/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                    <p className="font-bold text-slate-900 dark:text-amber-500">דקדוק השפה הג'והורית</p>
                    <p className="text-xs text-slate-500">פרידה יוסופובה • סמכות עליונה להטיות פעלים</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                    <p className="font-bold text-slate-900 dark:text-amber-500">חקר יהדות קווקז</p>
                    <p className="text-xs text-slate-500">גרשון בן-אורן • הקשר תרבותי ודתי</p>
                  </div>
                </div>
              </div>

              {/* Section 3: History */}
              <div>
                <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <History size={16} className="text-rose-600" />
                  מחקר היסטורי (ארכאי)
                </h4>
                <div className="bg-white/5 backdrop-blur-sm/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                  <p className="font-bold text-slate-900 dark:text-amber-500">חומרים לחקר השפה היהודית-טאטית (1892)</p>
                  <p className="text-xs text-slate-500">וילהלם מילר (Vs. Miller) • תיעוד היסטורי מוקדם</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <a
                  href="https://stmegi.com/gorskie_evrei/juhuri/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 hover:bg-white/10/50 rounded-lg transition-colors group"
                >
                  <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Globe size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">מרכז המורשת STMEGI</p>
                    <p className="text-xs text-slate-500">לעיון במקורות הדיגיטליים</p>
                  </div>
                  <ExternalLink size={14} className="mr-auto text-slate-400" />
                </a>
              </div>

              <div className="text-[10px] text-slate-400 border-t border-white/10 pt-2 text-center">
                <p>ט.ל.ח • המערכת משתמשת בבינה מלאכותית ומבצעת סינתזה של המקורות הנ"ל.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AboutModal;