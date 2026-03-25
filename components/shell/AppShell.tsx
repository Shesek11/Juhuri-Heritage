'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { DialectItem } from '../../types';
import { getDialects } from '../../services/storageService';
import { featureFlagService, FeatureFlagsMap } from '../../services/featureFlagService';
import XPDisplay, { XPNotificationBubble } from '../gamification/XPDisplay';
import FeedbackButton from '../FeedbackButton';
import NotificationBell from './NotificationBell';
import AuthModal from '../AuthModal';
import Footer from '../Footer';
import { AppContext, TranslationModalEntry, WordListModalState } from './AppContext';
import {
  Scroll, Sun, Moon, Plus, HeartHandshake, BookOpen, GraduationCap, Info,
  User as UserIcon, LogOut, Settings, LayoutDashboard, LogIn, ChefHat, Store, TreeDeciduous, Clock
} from 'lucide-react';

// Lazy-loaded modals
const ContributeModal = lazy(() => import('../ContributeModal'));
// AboutModal removed — content merged into /about page
const ProfileModal = lazy(() => import('../ProfileModal'));
const TranslationModal = lazy(() => import('../TranslationModal'));
const WordListModal = lazy(() => import('../WordListModal'));
const AdminDashboard = lazy(() => import('../AdminDashboard'));

const LazyFallback = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
  </div>
);

// ---------------------------------------------------------------------------
// NavTab (Desktop)
// ---------------------------------------------------------------------------
interface NavTabProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  comingSoon?: boolean;
  isActive: boolean;
}

const NavTab: React.FC<NavTabProps> = ({ href, icon, label, comingSoon, isActive }) => (
  <Link
    href={href}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${isActive
      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white border border-amber-500/30 shadow-inner'
      : 'text-slate-300 hover:text-white hover:bg-white/5'
      }`}
  >
    {icon}
    <span>{label}</span>
    {comingSoon && (
      <span className="px-1.5 py-0.5 text-[10px] bg-blue-500 text-white rounded-full font-bold">
        בקרוב
      </span>
    )}
  </Link>
);

// ---------------------------------------------------------------------------
// MobileNavTab
// ---------------------------------------------------------------------------
interface MobileNavTabProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  comingSoon?: boolean;
  isActive: boolean;
}

const MobileNavTab: React.FC<MobileNavTabProps> = ({ href, icon, label, comingSoon, isActive }) => (
  <Link
    href={href}
    className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl text-[11px] font-medium transition-all min-w-[56px] ${isActive
      ? 'bg-amber-500/20 text-white'
      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
      }`}
    title={label}
    aria-current={isActive ? 'page' : undefined}
  >
    <div className="relative">
      {icon}
      {comingSoon && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      )}
    </div>
    <span className="truncate max-w-[48px]">{label}</span>
  </Link>
);

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, refreshUser } = useAuth();
  const pathname = usePathname();

  // Auth State (UI Modals)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<string | undefined>(undefined);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const openAuthModal = (reason?: string) => {
    setAuthModalReason(reason);
    setIsAuthModalOpen(true);
  };

  // Translation Modal State
  const [translationModalEntry, setTranslationModalEntry] = useState<TranslationModalEntry | null>(null);

  // Word List Modal State
  const [wordListModal, setWordListModal] = useState<WordListModalState>({
    isOpen: false,
    category: 'hebrew-only',
    title: '',
    totalCount: 0,
  });

  const openWordListModal = (category: WordListModalState['category'], title: string, totalCount: number, featuredTerm?: string) => {
    setWordListModal({ isOpen: true, category, title, totalCount, featuredTerm });
  };

  // UI State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const isAdminHash = (hash: string) =>
    hash.startsWith('dict_') || hash.startsWith('gen_') || hash.startsWith('seo_') || hash.startsWith('recipe_') || hash.startsWith('family_') || hash.startsWith('market_');

  const [isAdminOpen, setIsAdminOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return isAdminHash(window.location.hash.slice(1));
    }
    return false;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll Detection
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dynamic Dialects
  const [dialects, setDialects] = useState<DialectItem[]>([]);

  // Feature Flags
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagsMap>({});
  const [featureFlagsLoaded, setFeatureFlagsLoaded] = useState(false);

  // Derived
  const isAdmin = user?.role === 'admin' || user?.role === 'approver';

  const isFeatureVisible = (featureKey: string): boolean => {
    const status = featureFlags[featureKey];
    if (!status) return false;
    if (status === 'active') return true;
    if (status === 'coming_soon') return true;
    if (status === 'admin_only') return isAdmin;
    return false;
  };

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
        setFeatureFlags(flags);
        setFeatureFlagsLoaded(true);
      } catch (err) {
        console.error('Failed to load feature flags:', err);
        setFeatureFlagsLoaded(true);
      }
    };

    init();
  }, []);

  // Sync admin open/close with URL hash
  const openAdmin = (section?: string) => {
    const hash = section || 'dict_active';
    window.history.pushState(null, '', `#${hash}`);
    setIsAdminOpen(true);
  };

  const closeAdmin = () => {
    setIsAdminOpen(false);
    // Replace current hash entry so Back doesn't re-open admin
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  // Listen for browser Back/Forward — close admin when hash leaves admin scope
  useEffect(() => {
    const onPopState = () => {
      const hash = window.location.hash.slice(1);
      if (hash && isAdminHash(hash)) {
        setIsAdminOpen(true);
      } else {
        setIsAdminOpen(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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

  // Active route helpers
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Context value
  const appContextValue: import('./AppContext').AppContextType = {
    openAuthModal,
    openContributeModal: () => setIsContributeOpen(true),
    setTranslationModalEntry,
    openWordListModal,
    dialects,
    featureFlags,
    featureFlagsLoaded,
    isAdmin,
  };

  const isHomePage = pathname === '/';
  const isFullScreenPage = pathname === '/';

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="min-h-screen dark bg-[#050B14] text-slate-200 dir-rtl font-rubik relative">
        {/* Skip to content — WCAG 2.4.1 */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:bg-amber-500 focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold">
          דלג לתוכן הראשי
        </a>

        {/* Subtle Premium Background Pattern Overlay */}
        <div
          className="fixed inset-0 pointer-events-none z-0 mix-blend-screen opacity-[0.03]"
          style={{
            backgroundImage: "url('/pattern-juhuri.svg')",
            backgroundRepeat: 'repeat',
            backgroundSize: '100px 100px',
          }}
        />

        {/* Header / Nav */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${isScrolled ? 'bg-[#050B14]/90 backdrop-blur-2xl border-white/10 py-1 shadow-lg' : 'bg-transparent border-transparent py-4'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">

            {/* Right: Logo */}
            <Link href="/" className={`flex items-center gap-3 transition-all duration-300 border ${!isScrolled ? 'bg-[#0d1424]/60 backdrop-blur-md rounded-full pr-1 pl-4 py-1 border-white/5' : 'border-transparent'}`}>
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Scroll size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-white hidden sm:block">{"מורשת ג'והורי"}</span>
            </Link>

            {/* Center: Navigation Tabs (Desktop) */}
            <nav className="hidden md:flex items-center">
              <div className={`flex items-center p-1 rounded-full gap-1 transition-all duration-300 border ${!isScrolled ? 'bg-[#0d1424]/60 backdrop-blur-md border-white/5 shadow-lg' : 'bg-white/5 border-transparent backdrop-blur-sm'}`}>
                <NavTab href="/" icon={<BookOpen size={16} />} label="בית" isActive={isActive('/')} />
                <NavTab href="/dictionary" icon={<BookOpen size={16} />} label="מילון" isActive={isActive('/dictionary') || pathname.startsWith('/word/')} />
                {isFeatureVisible('tutor_module') && (
                  <NavTab href="/tutor" icon={<GraduationCap size={16} />} label="מורה פרטי" isActive={isActive('/tutor')} comingSoon={isComingSoon('tutor_module')} />
                )}
                {isFeatureVisible('recipes_module') && (
                  <NavTab href="/recipes" icon={<ChefHat size={16} />} label="מתכונים" isActive={isActive('/recipes')} comingSoon={isComingSoon('recipes_module')} />
                )}
                {isFeatureVisible('marketplace_module') && (
                  <NavTab href="/marketplace" icon={<Store size={16} />} label="שוק" isActive={isActive('/marketplace')} comingSoon={isComingSoon('marketplace_module')} />
                )}
                {isFeatureVisible('family_tree_module') && (
                  <NavTab href="/family" icon={<TreeDeciduous size={16} />} label="שורשים" isActive={isActive('/family')} comingSoon={isComingSoon('family_tree_module')} />
                )}
              </div>
            </nav>

            {/* Left: Actions */}
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <NotificationBell />
              {/* User Menu */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 pr-2 pl-1 py-1 rounded-full hover:bg-white/10 transition-all"
                >
                  {user ? (
                    <>
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-amber-500/30">
                          {user.name?.charAt(0)}
                        </div>
                        <XPNotificationBubble />
                      </div>
                      <span className="text-sm text-slate-200 font-medium hidden sm:inline">{user.name?.split(' ')[0]}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                        <UserIcon size={16} />
                      </div>
                      <span className="text-sm text-slate-300 hidden sm:inline">התחברות</span>
                    </>
                  )}
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
                      {/* XP Stats inside menu */}
                      {user && (
                        <div className="px-3 py-2 border-b border-slate-700">
                          <XPDisplay variant="menu" />
                        </div>
                      )}

                      {user && (
                        <button
                          onClick={() => { setIsMenuOpen(false); setIsProfileModalOpen(true); }}
                          className="w-full text-right px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 flex items-center gap-2"
                        >
                          <Settings size={14} className="text-slate-400" />
                          הגדרות פרופיל
                        </button>
                      )}

                      {/* Admin */}
                      {user && (user.role === 'admin' || user.role === 'approver') && (
                        <button
                          onClick={() => { openAdmin(); setIsMenuOpen(false); }}
                          className="w-full text-right px-3 py-2 text-sm text-purple-300 hover:bg-purple-500/10 flex items-center gap-2"
                        >
                          <LayoutDashboard size={14} />
                          ממשק ניהול
                        </button>
                      )}

                      {/* Mobile Theme */}
                      <button
                        onClick={toggleTheme}
                        className="w-full sm:hidden text-right px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 flex items-center gap-2"
                      >
                        {theme === 'light' ? <Moon size={14} /> : <Sun size={14} className="text-amber-400" />}
                        {theme === 'light' ? 'מצב כהה' : 'מצב בהיר'}
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
              <MobileNavTab href="/" icon={<BookOpen size={18} />} label="בית" isActive={isActive('/')} />
              <MobileNavTab href="/dictionary" icon={<BookOpen size={18} />} label="מילון" isActive={isActive('/dictionary') || pathname.startsWith('/word/')} />
              {isFeatureVisible('tutor_module') && (
                <MobileNavTab href="/tutor" icon={<GraduationCap size={18} />} label="מורה" isActive={isActive('/tutor')} comingSoon={isComingSoon('tutor_module')} />
              )}
              {isFeatureVisible('recipes_module') && (
                <MobileNavTab href="/recipes" icon={<ChefHat size={18} />} label="מתכונים" isActive={isActive('/recipes')} comingSoon={isComingSoon('recipes_module')} />
              )}
              {isFeatureVisible('marketplace_module') && (
                <MobileNavTab href="/marketplace" icon={<Store size={18} />} label="שוק" isActive={isActive('/marketplace')} comingSoon={isComingSoon('marketplace_module')} />
              )}
              {isFeatureVisible('family_tree_module') && (
                <MobileNavTab href="/family" icon={<TreeDeciduous size={18} />} label="שורשים" isActive={isActive('/family')} comingSoon={isComingSoon('family_tree_module')} />
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          id="main-content"
          className={`w-full relative z-10 flex flex-col items-center min-h-screen ${isFullScreenPage ? '' : 'pb-20 pt-[104px] md:pt-[104px]'}`}
          onClick={() => setIsMenuOpen(false)}
        >
          {/* Extra padding for mobile nav bar (not on homepage) */}
          {!isFullScreenPage && <div className="md:hidden h-12" />}

          {children}
        </main>

        {/* Footer */}
        <Footer />

        {/* Modals */}
        <Suspense fallback={null}>
          <ContributeModal isOpen={isContributeOpen} onClose={() => setIsContributeOpen(false)} user={user} />
        </Suspense>
        {isAdminOpen && user && (
          <Suspense fallback={<LazyFallback />}>
            <AdminDashboard user={user} onClose={closeAdmin} />
          </Suspense>
        )}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => { setIsAuthModalOpen(false); setAuthModalReason(undefined); }}
          onSuccess={() => { refreshUser(); setIsAuthModalOpen(false); setAuthModalReason(undefined); }}
          reason={authModalReason}
        />
        <Suspense fallback={null}>
          {user && (
            <ProfileModal
              isOpen={isProfileModalOpen}
              onClose={() => setIsProfileModalOpen(false)}
              user={user}
              onUpdate={() => refreshUser()}
            />
          )}

          {translationModalEntry && (
            <TranslationModal
              entryId={translationModalEntry.id}
              term={translationModalEntry.term}
              existingTranslation={translationModalEntry.existingTranslation}
              onClose={() => setTranslationModalEntry(null)}
              onSuccess={() => {
                alert(translationModalEntry.existingTranslation ? '\u05D4\u05EA\u05D9\u05E7\u05D5\u05DF \u05E0\u05E9\u05DC\u05D7 \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8! \u05EA\u05D5\u05D3\u05D4 \uD83C\uDF89' : '\u05D4\u05EA\u05E8\u05D2\u05D5\u05DD \u05E0\u05E9\u05DC\u05D7 \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8! \u05EA\u05D5\u05D3\u05D4 \u05E2\u05DC \u05D4\u05EA\u05E8\u05D5\u05DE\u05D4 \uD83C\uDF89');
              }}
            />
          )}

          <WordListModal
            isOpen={wordListModal.isOpen}
            onClose={() => setWordListModal(prev => ({ ...prev, isOpen: false }))}
            title={wordListModal.title}
            category={wordListModal.category}
            totalCount={wordListModal.totalCount}
            featuredTerm={wordListModal.featuredTerm}
            onSelectWord={(entryId: number, term: string) => {
              setWordListModal(prev => ({ ...prev, isOpen: false }));
              setTranslationModalEntry({ id: entryId, term });
            }}
          />
        </Suspense>

        {/* Floating Feedback Button */}
        <FeedbackButton />
      </div>
    </AppContext.Provider>
  );
}
