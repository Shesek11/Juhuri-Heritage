import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const AboutPage: React.FC = () => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-12">
      <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg p-8 md:p-12 border border-white/10">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-slate-900 dark:text-slate-50">
          אודות מורשת ג׳והורי
        </h1>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">המשימה שלנו</h2>
          <p className="mb-4 text-slate-600 dark:text-slate-300 leading-relaxed">
            מורשת ג׳והורי הוקמה מתוך אהבה עמוקה לשפת הג׳והורי הייחודית ולתרבות העשירה של יהודי ההרים בקווקז. אנו מאמינים ששפה היא נשמתה של קהילה, ושימורה חיוני להבטחת העברת המורשת מדור לדור.
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            מטרתנו היא לספק פלטפורמה דיגיטלית מקיפה ונגישה, שתשמש כמרכז ללימוד, תיעוד וחגיגת כל היבטי התרבות הג׳והורית. אנו שואפים לאגד את הידע, הסיפורים, המתכונים והמנגינות, ולאפשר לכל אדם, בכל מקום בעולם, להתחבר לשורשיו.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-slate-100">הצוות שלנו</h2>
          <p className="mb-4 text-slate-600 dark:text-slate-300 leading-relaxed">
            מאחורי מורשת ג׳והורי עומד צוות מסור של בלשנים, מפתחים, מעצבים, ואנשי קהילה, כולם מחויבים למטרה המשותפת. אנו פועלים מתוך שאיפה להעצים את הקהילה הג׳והורית ולחלוק את יופייה עם העולם.
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            אנו תמיד מחפשים מתנדבים חדשים. אם יש לכם ידע בשפה, בסיפורי עם, בהיסטוריה, או כישורי פיתוח ועיצוב - נשמח לשמוע מכם!
            בקרו ב<Link to="/contact" className="text-amber-600 dark:text-amber-400 hover:underline">עמוד צור קשר</Link>.
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

export default AboutPage;
