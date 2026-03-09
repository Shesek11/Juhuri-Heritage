
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { DialectItem } from './types';
import { getDialects } from './services/storageService';
import { featureFlagService, FeatureFlagsMap } from './services/featureFlagService';
import XPDisplay from './components/gamification/XPDisplay';
import FeedbackButton from './components/FeedbackButton';
import { FeatureRoute } from './components/routing/FeatureRoute';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import DictionaryPage from './components/DictionaryPage';
import { SEOHead, WEBSITE_JSONLD, ORGANIZATION_JSONLD } from './components/seo/SEOHead';

// Lazy-loaded heavy components (tab pages & modals)
const HomePage = lazy(() => import('./components/HomePage'));
const TutorMode = lazy(() => import('./components/TutorMode'));
const RecipesPage = lazy(() => import('./components/RecipesPage'));
const MarketplacePage = lazy(() => import('./components/MarketplacePage').then(m => ({ default: m.MarketplacePage })));
const CommunityGraph = lazy(() => import('./components/family/CommunityGraph').then(m => ({ default: m.CommunityGraph })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const MobileAdminPanel = lazy(() => import('./components/admin/MobileAdminPanel'));
const ContributeModal = lazy(() => import('./components/ContributeModal'));
const AboutModal = lazy(() => import('./components/AboutModal'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));
const TranslationModal = lazy(() => import('./components/TranslationModal'));
const WordListModal = lazy(() => import('./components/WordListModal'));
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';

const LazyFallback = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
  </div>
);

import { Scroll, Sun, Moon, Plus, HeartHandshake, BookOpen, GraduationCap, Info, User as UserIcon, LogOut, Settings, LayoutDashboard, Menu, LogIn, ChevronDown, ChefHat, Store, TreeDeciduous, BarChart, Clock } from 'lucide-react';

// NavTab Component for Desktop Navigation using NavLink
interface NavTabProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  comingSoon?: boolean;
}

const NavTab: React.FC<NavTabProps> = ({ to, icon, label, comingSoon }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${isActive
        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-inner'
        : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`
    }
  >
    {icon}
    <span>{label}</span>
    {comingSoon && (
      <span className="px-1.5 py-0.5 text-[9px] bg-blue-500 text-white rounded-full font-bold">
        בקרוב
      </span>
    )}
  </NavLink>
);

// MobileNavTab Component for Mobile Navigation using NavLink
interface MobileNavTabProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  comingSoon?: boolean;
}

const MobileNavTab: React.FC<MobileNavTabProps> = ({ to, icon, label, comingSoon }) => (
  <NavLink
    to={to}
    end={to === '/'}
    className={({ isActive }) =>
      `flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl text-[10px] font-medium transition-all min-w-[56px] ${isActive
        ? 'bg-amber-500/20 text-amber-400'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
      }`
    }
    title={label}
  >
    <div className="relative">
      {icon}
      {comingSoon && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      )}
    </div>
    <span className="truncate max-w-[48px]">{label}</span>
  </NavLink>
);

// Helper: check if a path is the dictionary/home route
function isDictionaryRoute(pathname: string) {
  return pathname === '/' || pathname.startsWith('/word/');
}

function App() {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();

  // Auth State (UI Modals)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<string | undefined>(undefined);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileAdminOpen, setIsMobileAdminOpen] = useState(false);

  const openAuthModal = (reason?: string) => {
    setAuthModalReason(reason);
    setIsAuthModalOpen(true);
  };

  // Translation Modal State
  const [translationModalEntry, setTranslationModalEntry] = useState<{
    id: number;
    term: string;
    existingTranslation?: { id?: number; dialect: string; hebrew: string; latin: string; cyrillic: string }
  } | null>(null);

  // Word List Modal State
  const [wordListModal, setWordListModal] = useState<{
    isOpen: boolean;
    category: 'hebrew-only' | 'juhuri-only' | 'missing-dialects' | 'missing-audio';
    title: string;
    totalCount: number;
  }>({ isOpen: false, category: 'hebrew-only', title: '', totalCount: 0 });

  const openWordListModal = (category: typeof wordListModal.category, title: string, totalCount: number) => {
    setWordListModal({ isOpen: true, category, title, totalCount });
  };

  // UI State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll Detection Effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dynamic Dialects
  const [dialects, setDialects] = useState<DialectItem[]>([]);

  // Feature Flags
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagsMap>({});

  // Derived: is current user an admin?
  const isAdmin = user?.role === 'admin' || user?.role === 'approver';

  // Helper: Check if a feature should be visible in header
  const isFeatureVisible = (featureKey: string): boolean => {
    const status = featureFlags[featureKey];
    if (!status) return false;
    if (status === 'active') return true;
    if (status === 'coming_soon') return true;
    if (status === 'admin_only') return isAdmin;
    return false;
  };

  // Helper: Check if feature should show "בקרוב!" badge
  const isComingSoon = (featureKey: string): boolean => {
    return featureFlags[featureKey] === 'coming_soon';
  };

  // Initialization
  useEffect(() => {
    const init = async () => {
      // Theme
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }

      // Dialects
      try {
        const dialectsList = await getDialects();
        setDialects(dialectsList);
      } catch (err) {
        console.error('Failed to load dialects:', err);
      }

      // Feature Flags
      try {
        const flags = await featureFlagService.getPublicFeatureFlags();
        console.log('Scaled Feature Flags:', flags);
        setFeatureFlags(flags);
        // Make available to FeatureRoute
        (window as any).__featureFlags = flags;
      } catch (err) {
        console.error('Failed to load feature flags:', err);
      }
    };

    init();
  }, []);

  // Reload dialects when admin closes
  useEffect(() => {
    if (!isAdminOpen) {
      getDialects().then(setDialects).catch(console.error);
    }
  }, [isAdminOpen]);

  // Update theme class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen dark bg-[#050B14] text-slate-200 dir-rtl font-rubik relative">
      {/* Subtle Premium Background Pattern Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 mix-blend-screen opacity-[0.03]"
        style={{
          backgroundImage: "url('/pattern-juhuri.svg')",
          backgroundRepeat: 'repeat',
          backgroundSize: '100px 100px'
        }}
      />
      {/* Global structured data */}
      <SEOHead jsonLd={[WEBSITE_JSONLD, ORGANIZATION_JSONLD]} />

      {/* Header / Nav */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${isScrolled ? 'bg-[#050B14]/90 backdrop-blur-2xl border-white/10 py-1 shadow-lg' : 'bg-transparent border-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">

          {/* Right: Logo */}
          <NavLink to="/" className={`flex items-center gap-3 transition-all duration-300 border ${!isScrolled ? 'bg-[#0d1424]/60 backdrop-blur-md rounded-full pr-1 pl-4 py-1 border-white/5' : 'border-transparent'}`}>
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Scroll size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white hidden sm:block">מורשת ג'והורי</span>
          </NavLink>

          {/* Center: Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center">
            <div className={`flex items-center p-1 rounded-full gap-1 transition-all duration-300 border ${!isScrolled ? 'bg-[#0d1424]/60 backdrop-blur-md border-white/5 shadow-lg' : 'bg-white/5 border-transparent backdrop-blur-sm'}`}>
              <NavTab
                to="/"
                icon={<BookOpen size={16} />}
                label="בית"
              />
              <NavTab
                to="/dictionary"
                icon={<BookOpen size={16} />}
                label="מילון"
              />
              <NavTab
                to="/tutor"
                icon={<GraduationCap size={16} />}
                label="מורה פרטי"
              />
              {isFeatureVisible('recipes_module') && (
                <NavTab
                  to="/recipes"
                  icon={<ChefHat size={16} />}
                  label="מתכונים"
                  comingSoon={isComingSoon('recipes_module')}
                />
              )}
              {isFeatureVisible('marketplace_module') && (
                <NavTab
                  to="/marketplace"
                  icon={<Store size={16} />}
                  label="שוק"
                  comingSoon={isComingSoon('marketplace_module')}
                />
              )}
              {isFeatureVisible('family_tree_module') && (
                <NavTab
                  to="/family"
                  icon={<TreeDeciduous size={16} />}
                  label="שורשים"
                  comingSoon={isComingSoon('family_tree_module')}
                />
              )}
            </div>
          </nav>

          {/* Left: Actions */}
          <div className={`flex items-center gap-2 transition-all duration-300 border ${!isScrolled ? 'bg-[#0d1424]/60 backdrop-blur-md rounded-full px-2 py-1 border-white/5 shadow-lg' : 'border-transparent'}`}>
            {/* XP Display (Desktop) */}
            <div className="hidden sm:block">
              <XPDisplay />
            </div>

            {/* Admin Dropdown */}
            {user && (user.role === 'admin' || user.role === 'approver') && (
              <div className="hidden sm:block relative group">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all text-sm font-medium">
                  <LayoutDashboard size={14} />
                  <span className="hidden lg:inline">ניהול</span>
                  <ChevronDown size={12} className="opacity-60 group-hover:rotate-180 transition-transform" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-44 bg-slate-800 rounded-xl shadow-xl border border-slate-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <button
                    onClick={() => setIsAdminOpen(true)}
                    className="w-full text-right px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 flex items-center gap-2"
                  >
                    <LayoutDashboard size={14} className="text-purple-400" />
                    ממשק ניהול
                  </button>
                  <button
                    onClick={() => setIsMobileAdminOpen(true)}
                    className="w-full text-right px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 flex items-center gap-2"
                  >
                    <BarChart size={14} className="text-emerald-400" />
                    ניהול מהיר
                  </button>
                </div>
              </div>
            )}

            {/* Theme Toggle (Hidden for Premium Dark Theme) */}
            {/* 
            <button
              onClick={toggleTheme}
              className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all"
              title={theme === 'light' ? 'מצב כהה' : 'מצב בהיר'}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button> 
            */}

            {/* User Menu */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg hover:bg-slate-700 transition-all"
              >
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white">
                  {user ? <UserIcon size={14} /> : <Menu size={14} />}
                </div>
                <ChevronDown size={12} className="text-slate-500 hidden sm:block" />
              </button>

              {isMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  {user ? (
                    <div className="px-3 py-2.5 bg-slate-900/50 border-b border-slate-700">
                      <p className="font-bold text-white text-sm truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                  ) : (
                    <div className="p-2 border-b border-slate-700">
                      <button
                        onClick={() => { openAuthModal(); setIsMenuOpen(false); }}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg py-2 text-sm font-bold flex items-center justify-center gap-2"
                      >
                        <LogIn size={14} />
                        התחברות
                      </button>
                    </div>
                  )}

                  <div className="py-1">
                    {user && (
                      <button
                        onClick={() => { setIsMenuOpen(false); setIsProfileModalOpen(true); }}
                        className="w-full text-right px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 flex items-center gap-2"
                      >
                        <Settings size={14} className="text-slate-400" />
                        הגדרות פרופיל
                      </button>
                    )}

                    {/* Mobile Admin */}
                    {user && (user.role === 'admin' || user.role === 'approver') && (
                      <button
                        onClick={() => { setIsAdminOpen(true); setIsMenuOpen(false); }}
                        className="w-full sm:hidden text-right px-3 py-2 text-sm text-purple-300 hover:bg-purple-500/10 flex items-center gap-2"
                      >
                        <LayoutDashboard size={14} />
                        ממשק ניהול
                      </button>
                    )}

                    <div className="h-px bg-slate-700 my-1" />

                    {/* Mobile Theme */}
                    <button
                      onClick={toggleTheme}
                      className="w-full sm:hidden text-right px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 flex items-center gap-2"
                    >
                      {theme === 'light' ? <Moon size={14} /> : <Sun size={14} className="text-amber-400" />}
                      {theme === 'light' ? 'מצב כהה' : 'מצב בהיר'}
                    </button>

                    <button
                      onClick={() => { setIsAboutOpen(true); setIsMenuOpen(false); }}
                      className="w-full text-right px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 flex items-center gap-2"
                    >
                      <Info size={14} className="text-slate-400" />
                      אודות
                    </button>

                    {user && (
                      <>
                        <div className="h-px bg-slate-700 my-1" />
                        <button
                          onClick={() => { logout(); setIsMenuOpen(false); }}
                          className="w-full text-right px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                        >
                          <LogOut size={14} />
                          יציאה
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden border-t border-white/10 bg-[#050B14]/95 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#050B14]/80">
          <div className="flex justify-around overflow-x-auto py-1 px-1 gap-0 scrollbar-hide">
            <MobileNavTab
              to="/"
              icon={<BookOpen size={18} />}
              label="בית"
            />
            <MobileNavTab
              to="/dictionary"
              icon={<BookOpen size={18} />}
              label="מילון"
            />
            <MobileNavTab
              to="/tutor"
              icon={<GraduationCap size={18} />}
              label="מורה"
            />
            {isFeatureVisible('recipes_module') && (
              <MobileNavTab
                to="/recipes"
                icon={<ChefHat size={18} />}
                label="מתכונים"
                comingSoon={isComingSoon('recipes_module')}
              />
            )}
            {isFeatureVisible('marketplace_module') && (
              <MobileNavTab
                to="/marketplace"
                icon={<Store size={18} />}
                label="שוק"
                comingSoon={isComingSoon('marketplace_module')}
              />
            )}
            {isFeatureVisible('family_tree_module') && (
              <MobileNavTab
                to="/family"
                icon={<TreeDeciduous size={18} />}
                label="שורשים"
                comingSoon={isComingSoon('family_tree_module')}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={`w-full relative z-10 flex flex-col items-center min-h-screen ${location.pathname === '/' ? '' : 'pb-20 pt-[104px] md:pt-[104px]'}`}
        onClick={() => setIsMenuOpen(false)}
      >
        {/* Extra padding for mobile nav bar (not on homepage) */}
        {location.pathname !== '/' && <div className="md:hidden h-12" />}

        <Routes>
          {/* Homepage */}
          <Route path="/" element={
            <Suspense fallback={<LazyFallback />}>
              <HomePage
                featureFlags={featureFlags}
                onOpenAuthModal={openAuthModal}
                isAdmin={isAdmin}
              />
            </Suspense>
          } />

          {/* Dictionary */}
          <Route path="/dictionary" element={
            <DictionaryPage
              dialects={dialects}
              onOpenContribute={() => setIsContributeOpen(true)}
              onOpenAuthModal={openAuthModal}
              onOpenTranslationModal={setTranslationModalEntry}
              onOpenWordListModal={openWordListModal}
            />
          } />
          <Route path="/word/:term" element={
            <DictionaryPage
              dialects={dialects}
              onOpenContribute={() => setIsContributeOpen(true)}
              onOpenAuthModal={openAuthModal}
              onOpenTranslationModal={setTranslationModalEntry}
              onOpenWordListModal={openWordListModal}
            />
          } />

          {/* Tutor */}
          <Route path="/tutor" element={
            <div className="w-full animate-in slide-in-from-right duration-300">
              <Suspense fallback={<LazyFallback />}>
                <TutorMode />
              </Suspense>
            </div>
          } />

          {/* Recipes */}
          <Route path="/recipes" element={
            <FeatureRoute feature="recipes_module">
              <div className="w-full animate-in slide-in-from-right duration-300">
                <Suspense fallback={<LazyFallback />}><RecipesPage /></Suspense>
              </div>
            </FeatureRoute>
          } />
          <Route path="/recipes/:id" element={
            <FeatureRoute feature="recipes_module">
              <div className="w-full animate-in slide-in-from-right duration-300">
                <Suspense fallback={<LazyFallback />}><RecipesPage /></Suspense>
              </div>
            </FeatureRoute>
          } />

          {/* Marketplace */}
          <Route path="/marketplace" element={
            <FeatureRoute feature="marketplace_module">
              <div className="w-full animate-in slide-in-from-right duration-300">
                <Suspense fallback={<LazyFallback />}><MarketplacePage /></Suspense>
              </div>
            </FeatureRoute>
          } />
          <Route path="/marketplace/:slug" element={
            <FeatureRoute feature="marketplace_module">
              <div className="w-full animate-in slide-in-from-right duration-300">
                <Suspense fallback={<LazyFallback />}><MarketplacePage /></Suspense>
              </div>
            </FeatureRoute>
          } />

          {/* Family Tree */}
          <Route path="/family" element={
            <FeatureRoute feature="family_tree_module">
              <div className="w-full animate-in slide-in-from-right duration-300">
                <Suspense fallback={<LazyFallback />}><CommunityGraph /></Suspense>
              </div>
            </FeatureRoute>
          } />

          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals */}
      <Suspense fallback={null}>
        <ContributeModal isOpen={isContributeOpen} onClose={() => setIsContributeOpen(false)} user={user} />
        <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      </Suspense>
      {isAdminOpen && user && <Suspense fallback={<LazyFallback />}><AdminDashboard user={user} onClose={() => setIsAdminOpen(false)} /></Suspense>}
      {isMobileAdminOpen && <Suspense fallback={<LazyFallback />}><MobileAdminPanel onClose={() => setIsMobileAdminOpen(false)} /></Suspense>}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => { setIsAuthModalOpen(false); setAuthModalReason(undefined); }}
        onSuccess={(u) => { refreshUser(); setIsAuthModalOpen(false); setAuthModalReason(undefined); }}
        reason={authModalReason}
      />
      <Suspense fallback={null}>
        {user && (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            user={user}
            onUpdate={(updated) => refreshUser()}
          />
        )}

        {/* Translation Modal */}
        {translationModalEntry && (
          <TranslationModal
            entryId={translationModalEntry.id}
            term={translationModalEntry.term}
            existingTranslation={translationModalEntry.existingTranslation}
            onClose={() => setTranslationModalEntry(null)}
            onSuccess={() => {
              alert(translationModalEntry.existingTranslation ? 'התיקון נשלח לאישור! תודה \u{1F389}' : 'התרגום נשלח לאישור! תודה על התרומה \u{1F389}');
            }}
          />
        )}

        {/* Word List Modal */}
        <WordListModal
          isOpen={wordListModal.isOpen}
          onClose={() => setWordListModal(prev => ({ ...prev, isOpen: false }))}
          title={wordListModal.title}
          category={wordListModal.category}
          totalCount={wordListModal.totalCount}
          onSelectWord={(entryId, term) => {
            setWordListModal(prev => ({ ...prev, isOpen: false }));
            setTranslationModalEntry({ id: entryId, term });
          }}
        />
      </Suspense>

      {/* Floating Feedback Button */}
      <FeedbackButton />

    </div >
  );
}

export default App;
