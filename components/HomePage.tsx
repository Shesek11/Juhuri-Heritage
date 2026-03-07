import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BookOpen, GraduationCap, ChefHat, Store, TreeDeciduous, Search,
  HeartHandshake, Users, Globe, Scroll, Sparkles, Compass
} from 'lucide-react';

interface HomePageProps {
  featureFlags: Record<string, string>;
  onOpenAuthModal: (reason?: string) => void;
  isAdmin: boolean;
}

const featureCards = [
  {
    key: null,
    icon: BookOpen,
    title: 'מילון ג׳והורי',
    description: 'חקרו את אוצר המילים העשיר עם תרגומים והקלטות קוליות.',
    link: '/dictionary',
    gradient: 'from-amber-400 to-yellow-600',
  },
  {
    key: null,
    icon: GraduationCap,
    title: 'מורה פרטי',
    description: 'למדו בקצב שלכם עם שיעורים מונחי בינה מלאכותית.',
    link: '/tutor',
    gradient: 'from-amber-300 to-amber-500',
  },
  {
    key: 'recipes_module',
    icon: ChefHat,
    title: 'מתכוני העדה',
    description: 'גלו את המטבח הקווקזי המסורתי דרך מתכונים אותנטיים.',
    link: '/recipes',
    gradient: 'from-yellow-400 to-amber-500',
  },
  {
    key: 'marketplace_module',
    icon: Store,
    title: 'שוק מקומי',
    description: 'מוצרים ייחודיים ומאכלים ביתיים של בני העדה.',
    link: '/marketplace',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    key: 'family_tree_module',
    icon: TreeDeciduous,
    title: 'אילן יוחסין',
    description: 'התחברו לשורשים וגלו קרובי משפחה ברחבי העולם.',
    link: '/family',
    gradient: 'from-orange-400 to-amber-600',
  },
];

const stats = [
  { icon: Scroll, value: '5,000+', label: 'מילים במילון' },
  { icon: Users, value: '150+', label: 'תורמים פעילים' },
  { icon: Globe, value: '8', label: 'ניבים שונים' },
  { icon: HeartHandshake, value: '3,000+', label: 'חברי קהילה' },
];

const HomePage: React.FC<HomePageProps> = ({ featureFlags, onOpenAuthModal, isAdmin }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/dictionary?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const getCardVisibility = (featureKey: string | null) => {
    if (featureKey === null) return { visible: true, comingSoon: false, clickable: true };
    const status = featureFlags[featureKey];
    if (!status || status === 'disabled') return { visible: false, comingSoon: false, clickable: false };
    if (status === 'coming_soon') return { visible: true, comingSoon: true, clickable: false };
    if (status === 'admin_only') return { visible: isAdmin, comingSoon: false, clickable: isAdmin };
    return { visible: true, comingSoon: false, clickable: true };
  };

  return (
    <div className="w-full bg-[#050B14] min-h-screen text-slate-200 selection:bg-amber-500/30">
      {/* Background with Buta Pattern Overlay */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-juhuri-pattern"
        style={{
          transform: `translateY(${scrollY * 0.1}px)`
        }}
      />

      {/* Subtle Glow Effects */}
      <div className="fixed top-0 left-[-10%] sm:left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-amber-600/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-[-10%] sm:right-1/4 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-blue-900/20 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />

      {/* ====== HERO SECTION ====== */}
      <section className="relative z-10 min-h-[90vh] flex flex-col items-center justify-center px-4 pt-24 pb-12">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center text-center space-y-8 animate-hero-fade-in mt-[-10vh]">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-2 backdrop-blur-md">
            <Sparkles size={16} />
            <span>הבית של יהדות קווקז ברשת</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight leading-[1.1] drop-shadow-2xl">
            מורשת <br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-200 via-amber-400 to-yellow-600">
              ג׳והורי
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300/90 max-w-2xl font-light leading-relaxed drop-shadow-md pb-4">
            פלטפורמה אקסקלוסיבית לשימור השפה והתרבות הענפה של יהדות קווקז
          </p>

          {/* Premium Search Bar (Glassmorphism) */}
          <form onSubmit={handleSearch} className="w-full max-w-xl">
            <div className="relative group mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative flex items-center bg-[#0d1424]/90 border border-slate-700/50 hover:border-amber-500/50 rounded-[2rem] p-2 pl-4 pr-2 transition-all duration-300 shadow-2xl backdrop-blur-xl">
                <input
                  type="text"
                  placeholder="חפשו במילון המורשת..."
                  className="w-full bg-transparent text-white placeholder-slate-400 border-none outline-none text-xl px-4 h-12"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  type="submit"
                  aria-label="חיפוש במילון"
                  title="חיפוש במילון"
                  className="flex items-center justify-center min-w-[3.5rem] w-14 h-14 bg-gradient-to-br from-amber-400 to-yellow-600 text-[#050B14] rounded-3xl hover:scale-105 transition-transform duration-300 shadow-lg"
                >
                  <Search size={24} className="stroke-[2.5]" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* ====== PREMIUM FEATURE CARDS ====== */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-10 justify-center text-center">
            <Compass className="text-amber-500" size={28} />
            <h2 className="text-3xl font-bold text-white">מחקר ולמידה</h2>
            <div className="w-16 h-[1px] bg-gradient-to-l from-amber-500 to-transparent mr-4 hidden sm:block"></div>
            <div className="w-16 h-[1px] bg-gradient-to-r from-amber-500 to-transparent ml-4 hidden sm:block"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((card) => {
              const { visible, comingSoon, clickable } = getCardVisibility(card.key);
              if (!visible) return null;

              const Icon = card.icon;
              const cardContent = (
                <div className={`relative h-full flex flex-col p-8 rounded-[2rem] border border-slate-800 bg-[#0d1424]/60 backdrop-blur-lg overflow-hidden group transition-all duration-500
                    ${clickable ? 'hover:-translate-y-2 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] cursor-pointer' : 'cursor-default'}`}
                >
                  {/* Subtle top gradient line */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />

                  <div className="mb-8 flex justify-between items-start">
                    <div className={`p-5 rounded-2xl bg-gradient-to-br ${card.gradient} shadow-[0_0_20px_rgba(245,158,11,0.3)]`}>
                      <Icon size={28} className="text-[#050B14] stroke-[2.5]" />
                    </div>
                    {comingSoon && (
                      <span className="px-3 py-1 bg-slate-900/80 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-full shadow-inner">
                        בקרוב
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-amber-400 transition-colors duration-300">{card.title}</h3>
                  <p className="text-slate-400 leading-relaxed font-light text-base">{card.description}</p>
                </div>
              );

              return clickable ? (
                <Link key={card.title} to={card.link} className="block h-full">
                  {cardContent}
                </Link>
              ) : (
                <div key={card.title} className="h-full">{cardContent}</div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====== ELEGANT STATS ====== */}
      <section className="relative z-10 py-24 px-4 mt-8 bg-gradient-to-b from-transparent via-[#0d1424]/40 to-transparent">
        <div className="max-w-5xl mx-auto relative">
          <div className="absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          <div className="absolute inset-x-10 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 py-10">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="flex flex-col items-center text-center group">
                  <div className="mb-6 text-amber-500/60 group-hover:text-amber-400 transition-colors duration-300 group-hover:-translate-y-2 transform">
                    <Icon size={36} strokeWidth={1.5} />
                  </div>
                  <p className="text-4xl md:text-5xl font-light text-white mb-3 tracking-tight">{stat.value}</p>
                  <p className="text-sm tracking-widest text-slate-400 uppercase font-medium">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====== CTA SECTION ====== */}
      <section className="relative z-10 py-32 px-4 text-center overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-20">
          <div className="absolute inset-0 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">הצטרפו למעגל השומרים</h2>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            תרמו מהידע שלכם, שתפו מילים מהבית, בניית עץ משפחה ומסורת ארוכת שנים. יחד נשמר את שפת הג׳והורי חיה ופועמת.
          </p>
          <button
            onClick={() => onOpenAuthModal('join_community')}
            className="px-12 py-5 bg-[#0d1424] border border-amber-500/50 text-amber-400 font-bold rounded-full overflow-hidden relative group hover:text-[#050B14] transition-all duration-500 shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out z-0" />
            <span className="relative z-10 text-xl font-medium tracking-wide">כניסה לקהילה</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
