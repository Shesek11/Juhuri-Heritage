'use client';

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/src/i18n/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { DialectItem } from '../../types';
import { getDialects } from '../../services/storageService';
import { featureFlagService, FeatureFlagsMap, FeatureFlag } from '../../services/featureFlagService';
import XPDisplay, { XPNotificationBubble } from '../gamification/XPDisplay';
import FeedbackButton from '../FeedbackButton';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import AuthModal from '../AuthModal';
import Footer from '../Footer';
import { AppContext, TranslationModalEntry, WordListModalState } from './AppContext';
import {
  Sun, Moon, Plus, HeartHandshake, BookOpen, GraduationCap, Info, Home,
  User as UserIcon, LogOut, Settings, LayoutDashboard, LogIn, ChefHat, Store, TreeDeciduous, Clock, Music
} from 'lucide-react';

// Lazy-loaded modals
const ContributeModal = lazy(() => import('../ContributeModal'));
// AboutModal removed — content merged into /about page
const ProfileModal = lazy(() => import('../ProfileModal'));
const TranslationModal = lazy(() => import('../TranslationModal'));
const WordListModal = lazy(() => import('../WordListModal'));
// AdminDashboard removed — admin is now at /admin route

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

const NavTab: React.FC<NavTabProps & { comingSoonLabel?: string }> = ({ href, icon, label, comingSoon, isActive, comingSoonLabel }) => (
  <Link
    href={href}
    className={`group/tab relative flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap overflow-hidden ${
      comingSoon ? 'opacity-60 hover:opacity-100' : ''
    } ${isActive
      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white border border-amber-500/30 shadow-inner'
      : 'text-slate-300 hover:text-white hover:bg-white/5'
      }`}
  >
    {icon}
    <span>{label}</span>
    {comingSoon && (
      <>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0 group-hover/tab:opacity-0 transition-opacity" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-blue-600/90 backdrop-blur-sm text-[11px] text-white font-bold opacity-0 group-hover/tab:opacity-100 transition-opacity duration-200">
          {comingSoonLabel}
        </span>
      </>
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
    className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-2.5 rounded-xl text-xs font-medium transition-all min-w-[46px] ${isActive
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
    <span className="truncate max-w-[44px]">{label}</span>
  </Link>
);

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, refreshUser } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('shell');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isRtl = locale === 'he';

  // Get localized feature name from DB columns (name_en, name_ru) with fallback to Hebrew name
  const getFeatureName = (f: { name: string; name_en?: string | null; name_ru?: string | null }) => {
    if (locale === 'en' && f.name_en) return f.name_en;
    if (locale === 'ru' && f.name_ru) return f.name_ru;
    return f.name;
  };

  // Auth State (UI Modals)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<string | undefined>(undefined);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const openAuthModal = (reason?: string) => {
    setAuthModalReason(reason);
    setIsAuthModalOpen(true);
  };

  // Google One Tap — show the floating prompt when user is not logged in
  const handleOneTapCredential = useCallback(async (response: any) => {
    try {
      const res = await fetch('/api/auth/google/credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: response.credential }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('One Tap error:', err);
    }
  }, []);

  useEffect(() => {
    if (user) return; // Already logged in
    const timer = setTimeout(async () => {
      // Load GIS script if not already loaded
      if (!(window as any).google?.accounts?.id) {
        if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          document.head.appendChild(script);
          await new Promise<void>(r => { script.onload = () => r(); setTimeout(r, 3000); });
        }
        // Wait for google object
        await new Promise<void>(r => {
          const check = setInterval(() => {
            if ((window as any).google?.accounts?.id) { clearInterval(check); r(); }
          }, 100);
          setTimeout(() => { clearInterval(check); r(); }, 3000);
        });
      }
      const google = (window as any).google;
      if (!google?.accounts?.id) return;

      google.accounts.id.initialize({
        client_id: '471499434690-a0q7daito126hiubeu7djqkb71liq3k6.apps.googleusercontent.com',
        callback: handleOneTapCredential,
        auto_select: true,
        cancel_on_tap_outside: true,
      });
      google.accounts.id.prompt();
    }, 2000); // Delay 2s so page loads first

    return () => clearTimeout(timer);
  }, [user, handleOneTapCredential]);

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
  // Admin is now a route (/admin/*), no modal state needed
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
  const [orderedFeatures, setOrderedFeatures] = useState<FeatureFlag[]>([]);
  const [featureFlagsLoaded, setFeatureFlagsLoaded] = useState(false);

  // Branding
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  // Icon map for dynamic features
  const iconMap: Record<string, React.ReactNode> = {
    BookOpen: <BookOpen size={16} />,
    GraduationCap: <GraduationCap size={16} />,
    ChefHat: <ChefHat size={16} />,
    Store: <Store size={16} />,
    Users: <TreeDeciduous size={16} />,
    TreeDeciduous: <TreeDeciduous size={16} />,
    Music: <Music size={16} />,
  };

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
        if (process.env.NODE_ENV === 'development') console.error('Failed to load dialects:', err);
      }

      // Branding
      try {
        const res = await fetch('/api/branding');
        if (res.ok) {
          const data = await res.json();
          if (data.siteLogo) setSiteLogo(data.siteLogo);
        }
      } catch {}

      // Feature Flags
      try {
        const flags = await featureFlagService.getPublicFeatureFlags();
        setFeatureFlags(flags);
        const features = await featureFlagService.getOrderedFeatures();
        setOrderedFeatures(features);
        setFeatureFlagsLoaded(true);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to load feature flags:', err);
        setFeatureFlagsLoaded(true);
      }
    };

    init();
  }, []);

  // Reload dialects when navigating away from admin
  useEffect(() => {
    if (!pathWithoutLocale.startsWith('/admin')) {
      getDialects().then(setDialects).catch(() => {});
    }
  }, [pathname]);

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

  // Active route helpers — pathname includes locale prefix (e.g., /he/dictionary)
  const stripLocale = (p: string) => {
    const match = p.match(/^\/(he|en|ru)(\/.*)?$/);
    return match ? (match[2] || '/') : p;
  };
  const pathWithoutLocale = stripLocale(pathname);

  const isActive = (href: string) => {
    if (href === '/') return pathWithoutLocale === '/';
    return pathWithoutLocale.startsWith(href);
  };

  // Context value
  const appContextValue: import('./AppContext').AppContextType = {
    openAuthModal,
    openContributeModal: () => setIsContributeOpen(true),
    setTranslationModalEntry,
    openWordListModal,
    dialects,
    featureFlags,
    orderedFeatures,
    featureFlagsLoaded,
    isAdmin,
    siteLogo,
  };

  const isHomePage = pathWithoutLocale === '/';
  const isFullScreenPage = pathWithoutLocale === '/';
  const isAdminPage = pathWithoutLocale.startsWith('/admin');

  // Admin pages have their own full layout — skip AppShell chrome
  if (isAdminPage) {
    return (
      <AppContext.Provider value={appContextValue}>
        {children}
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={appContextValue}>
      <div className={`min-h-screen dark bg-[#050B14] text-slate-200 font-rubik relative ${isRtl ? 'dir-rtl' : 'dir-ltr'}`}>
        {/* Skip to content — WCAG 2.4.1 */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:bg-amber-500 focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold">
          {t('skipToContent')}
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

        {/* Header / Nav — single row */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${isScrolled ? 'bg-[#050B14]/95 backdrop-blur-2xl border-white/10 shadow-lg py-1' : 'bg-transparent border-transparent py-3'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">

            {/* Logo */}
            <Link href="/" className={`flex items-center gap-2.5 shrink-0 transition-all ${!isScrolled ? 'bg-[#0d1424]/60 backdrop-blur-md rounded-full ps-1 pe-3 py-1 border border-white/5' : ''}`}>
              <img src={siteLogo || '/images/logo-transparent.png'} alt={t('logo')} className="w-9 h-9 object-contain" />
              <span className="text-lg font-bold text-white hidden xl:block">{t('logo')}</span>
            </Link>

            {/* Desktop nav — single row */}
            <nav className="hidden md:flex items-center flex-1 min-w-0 justify-center" aria-label={t('mainNav')}>
              <div className="flex items-center p-1 rounded-full gap-0.5 bg-white/5 backdrop-blur-sm border border-white/5">
                <NavTab href="/" icon={<Home size={16} />} label={t('home')} isActive={isActive('/')} />
                {orderedFeatures.filter(f => f.show_in_nav !== false).map(f => (
                  <NavTab
                    key={f.feature_key}
                    href={f.link || '#'}
                    icon={iconMap[f.icon || ''] || <BookOpen size={16} />}
                    label={getFeatureName(f)}
                    isActive={isActive(f.link || '') || (f.link === '/dictionary' && pathWithoutLocale.startsWith('/word/'))}
                    comingSoon={f.status === 'coming_soon'}
                    comingSoonLabel={tc('comingSoon')}
                  />
                ))}
              </div>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <LanguageSwitcher />
              <NotificationBell />
              {/* User Menu */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label={user ? t('userMenu') : t('login')}
                  aria-expanded={isMenuOpen ? "true" : "false"}
                  aria-haspopup="true"
                  className="flex items-center gap-2 ps-2 pe-1 py-1 rounded-full hover:bg-white/10 transition-all"
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
                      <span className="text-sm text-slate-300 hidden sm:inline">{t('login')}</span>
                    </>
                  )}
                </button>

                {isMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    {user ? (
                      <div className="px-3 py-2.5 bg-slate-900/50 border-b border-slate-700">
                        <p className="font-bold text-white text-sm truncate">{user.name}</p>
                        <p className="text-xs text-slate-300 truncate">{user.email}</p>
                      </div>
                    ) : (
                      <div className="p-2 border-b border-slate-700">
                        <button
                          onClick={() => { openAuthModal(); setIsMenuOpen(false); }}
                          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg py-2 text-sm font-bold flex items-center justify-center gap-2"
                        >
                          <LogIn size={14} />
                          {t('login')}
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
                          className="w-full text-start px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 flex items-center gap-2"
                        >
                          <Settings size={14} className="text-slate-300" />
                          {t('profileSettings')}
                        </button>
                      )}

                      {/* Admin */}
                      {user && (user.role === 'admin' || user.role === 'approver') && (
                        <Link
                          href="/admin"
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full text-start px-3 py-2 text-sm text-purple-300 hover:bg-purple-500/10 flex items-center gap-2"
                        >
                          <LayoutDashboard size={14} />
                          {t('adminPanel')}
                        </Link>
                      )}

                      {/* Mobile Theme */}
                      <button
                        onClick={toggleTheme}
                        className="w-full sm:hidden text-start px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 flex items-center gap-2"
                      >
                        {theme === 'light' ? <Moon size={14} /> : <Sun size={14} className="text-amber-400" />}
                        {theme === 'light' ? t('darkMode') : t('lightMode')}
                      </button>

                      {user && (
                        <>
                          <div className="h-px bg-slate-700 my-1" />
                          <button
                            onClick={() => { logout(); setIsMenuOpen(false); }}
                            className="w-full text-start px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                          >
                            <LogOut size={14} />
                            {t('logout')}
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
          <nav className="md:hidden border-t border-white/10 bg-[#050B14]/95 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#050B14]/80" aria-label={t('mainNav')}>
            <div className="flex justify-around overflow-x-auto py-1 px-1 gap-0 scrollbar-hide">
              <MobileNavTab href="/" icon={<Home size={18} />} label={t('home')} isActive={isActive('/')} />
              {orderedFeatures.filter(f => f.show_in_nav !== false).map(f => (
                <MobileNavTab
                  key={f.feature_key}
                  href={f.link || '#'}
                  icon={iconMap[f.icon || ''] || <BookOpen size={18} />}
                  label={getFeatureName(f)}
                  isActive={isActive(f.link || '') || (f.link === '/dictionary' && pathWithoutLocale.startsWith('/word/'))}
                  comingSoon={f.status === 'coming_soon'}
                />
              ))}
            </div>
          </nav>
        </header>

        {/* Main Content Area */}
        <main
          id="main-content"
          className={`w-full relative z-10 flex flex-col items-center min-h-screen overflow-x-hidden ${isFullScreenPage ? '' : 'pb-20 pt-[104px] md:pt-[104px]'}`}
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
