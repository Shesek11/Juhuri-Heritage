
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { DictionaryEntry, HistoryItem, DialectItem, User } from './types';
import { searchDictionary, searchByAudio } from './services/geminiService';
import { getDialects } from './services/storageService';
import { featureFlagService, FeatureFlagsMap } from './services/featureFlagService';
import apiService from './services/apiService';
import { blobToBase64 } from './utils/audioUtils';
import ResultCard from './components/ResultCard';
import HistoryPanel from './components/HistoryPanel';
import ContributeModal from './components/ContributeModal';
import AboutModal from './components/AboutModal';
import TutorMode from './components/TutorMode';
import AdminDashboard from './components/AdminDashboard';
import MobileAdminPanel from './components/admin/MobileAdminPanel';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import HeroSection from './components/HeroSection';
import WordOfTheDay from './components/widgets/WordOfTheDay';
import CommunityTicker from './components/widgets/CommunityTicker';
import RecentAdditions from './components/widgets/RecentAdditions';
import NeedsTranslation from './components/widgets/NeedsTranslation';
import MissingDialects from './components/widgets/MissingDialects';
import PendingApprovals from './components/widgets/PendingApprovals';
import TranslationModal from './components/TranslationModal';
import XPDisplay from './components/gamification/XPDisplay';
import RecipesPage from './components/RecipesPage';
import { MarketplacePage } from './components/MarketplacePage';
import { CommunityGraph } from './components/family/CommunityGraph';
import { Mic, Search, Scroll, Sun, Moon, Plus, Loader2, HeartHandshake, BookOpen, GraduationCap, Info, User as UserIcon, LogOut, Settings, LayoutDashboard, Menu, LogIn, ChevronDown, ChefHat, Store, TreeDeciduous, BarChart, Clock } from 'lucide-react';

// NavTab Component for Desktop Navigation
interface NavTabProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color?: string;
  comingSoon?: boolean;
}

const NavTab: React.FC<NavTabProps> = ({ active, onClick, icon, label, comingSoon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${active
      ? 'bg-white/10 text-white shadow-sm'
      : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
  >
    {icon}
    <span>{label}</span>
    {comingSoon && (
      <span className="px-1.5 py-0.5 text-[9px] bg-blue-500 text-white rounded-full font-bold">
        בקרוב
      </span>
    )}
  </button>
);

// MobileNavTab Component for Mobile Navigation
interface MobileNavTabProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  comingSoon?: boolean;
}

const MobileNavTab: React.FC<MobileNavTabProps> = ({ active, onClick, icon, label, comingSoon }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl text-[10px] font-medium transition-all min-w-[56px] ${active
      ? 'bg-amber-500/20 text-amber-400'
      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
      }`}
    title={label}
  >
    <div className="relative">
      {icon}
      {comingSoon && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      )}
    </div>
    <span className="truncate max-w-[48px]">{label}</span>
  </button>
);

const STORAGE_KEY = 'juhuri_history';

function App() {
  const { user, login, logout, isAuthenticated, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'dictionary' | 'tutor' | 'recipes' | 'marketplace' | 'family'>('dictionary');

  // Note: 'user' is now fully managed by AuthContext, no need for local state sync




  // Auth State (UI Modals)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<string | undefined>(undefined);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileAdminOpen, setIsMobileAdminOpen] = useState(false);

  const openAuthModal = (reason?: string) => {
    setAuthModalReason(reason);
    setIsAuthModalOpen(true);
  };

  // Translation Modal State (can include existing translation for correction mode)
  const [translationModalEntry, setTranslationModalEntry] = useState<{
    id: number;
    term: string;
    existingTranslation?: { id?: number; dialect: string; hebrew: string; latin: string; cyrillic: string }
  } | null>(null);

  // Dictionary State
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DictionaryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Dynamic Dialects
  const [dialects, setDialects] = useState<DialectItem[]>([]);

  // Feature Flags
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagsMap>({});

  // Derived: is current user an admin?
  const isAdmin = user?.role === 'admin' || user?.role === 'approver';

  // Helper: Check if a feature should be visible in header
  const isFeatureVisible = (featureKey: string): boolean => {
    const status = featureFlags[featureKey];
    if (!status) return false; // disabled or not in response
    if (status === 'active') return true;
    if (status === 'coming_soon') return true;
    if (status === 'admin_only') return isAdmin;
    return false;
  };

  // Helper: Check if feature should show "בקרוב!" badge
  const isComingSoon = (featureKey: string): boolean => {
    return featureFlags[featureKey] === 'coming_soon';
  };

  // Helper: Check if user can access the real content (not just coming soon page)
  const canAccessFeatureContent = (featureKey: string): boolean => {
    const status = featureFlags[featureKey];
    if (status === 'active') return true;
    if (status === 'coming_soon') return isAdmin; // Only admins see real content
    if (status === 'admin_only') return isAdmin;
    return false;
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialization
  useEffect(() => {
    const init = async () => {
      // 1. History (still localStorage - local cache only)
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));

      // 2. Theme
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }

      // 3. Dialects (now async API)
      try {
        const dialectsList = await getDialects();
        setDialects(dialectsList);
      } catch (err) {
        console.error('Failed to load dialects:', err);
      }

      // 4. Feature Flags
      try {
        const flags = await featureFlagService.getPublicFeatureFlags();
        console.log('Scaled Feature Flags:', flags);
        setFeatureFlags(flags);
      } catch (err) {
        console.error('Failed to load feature flags:', err);
      }

      // 4. Auth is now handled by usage of useAuth0 hook outside this effect
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

  // Loading Messages
  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    if (loading) {
      setLoadingMessage('מחפש במילון...');
      timers.push(setTimeout(() => setLoadingMessage('בודק במקורות ההיסטוריים...'), 2000));
      timers.push(setTimeout(() => setLoadingMessage('מנתח ניבים והקשרים תרבותיים...'), 4500));
      timers.push(setTimeout(() => setLoadingMessage('כבר מסיימים, תודה על הסבלנות...'), 8000));
    } else {
      setLoadingMessage('');
    }
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const addToHistory = (entry: DictionaryEntry) => {
    const newItem: HistoryItem = { ...entry, timestamp: Date.now(), id: Date.now().toString() };
    const updated = [newItem, ...history.filter(h => h.term !== entry.term)].slice(0, 10);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSearch = async (e?: React.FormEvent, specificTerm?: string) => {
    if (e) e.preventDefault();
    const termToSearch = specificTerm || query;
    if (!termToSearch.trim()) return;

    if (specificTerm && specificTerm !== query) {
      setQuery(specificTerm);
    }

    setLoading(true);
    setError(null);
    try {
      const data = await searchDictionary(query);
      setResult(data);
      addToHistory(data);
    } catch (err) {
      setError('לא הצלחנו למצוא תרגום במאגר המסורתי. נסה שוב או נסח אחרת.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const base64Audio = await blobToBase64(audioBlob);

        setLoading(true);
        setError(null);
        try {
          const data = await searchByAudio(base64Audio, 'audio/webm');
          setResult(data);
          addToHistory(data);
          setQuery(data.term);
        } catch (err) {
          setError('לא הצלחנו לזהות את הדיבור. נסה שוב, בקול ברור.');
          console.error(err);
        } finally {
          setLoading(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('נדרשת גישה למיקרופון כדי להקליט.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    setIsMenuOpen(false); // Optional: close menu after toggle
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-slate-900' : 'bg-slate-50'} dir-rtl font-rubik transition-colors duration-300`}>
      {/* Header / Nav - Clean Modern Design */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Right: Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Scroll size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white hidden sm:block">מורשת ג'והורי</span>
          </div>

          {/* Center: Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center">
            <div className="flex bg-slate-800/80 p-1 rounded-xl gap-0.5">
              <NavTab
                active={activeTab === 'dictionary'}
                onClick={() => setActiveTab('dictionary')}
                icon={<BookOpen size={16} />}
                label="מילון"
              />
              <NavTab
                active={activeTab === 'tutor'}
                onClick={() => setActiveTab('tutor')}
                icon={<GraduationCap size={16} />}
                label="מורה פרטי"
              />
              {isFeatureVisible('recipes_module') && (
                <NavTab
                  active={activeTab === 'recipes'}
                  onClick={() => setActiveTab('recipes')}
                  icon={<ChefHat size={16} />}
                  label="מתכונים"
                  comingSoon={isComingSoon('recipes_module')}
                />
              )}
              {isFeatureVisible('marketplace_module') && (
                <NavTab
                  active={activeTab === 'marketplace'}
                  onClick={() => setActiveTab('marketplace')}
                  icon={<Store size={16} />}
                  label="שוק"
                  comingSoon={isComingSoon('marketplace_module')}
                />
              )}
              {isFeatureVisible('family_tree_module') && (
                <NavTab
                  active={activeTab === 'family'}
                  onClick={() => setActiveTab('family')}
                  icon={<TreeDeciduous size={16} />}
                  label="שורשים"
                  comingSoon={isComingSoon('family_tree_module')}
                />
              )}
            </div>
          </nav>

          {/* Left: Actions */}
          <div className="flex items-center gap-2">
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

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all"
              title={theme === 'light' ? 'מצב כהה' : 'מצב בהיר'}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

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
        <div className="md:hidden border-t border-slate-800 bg-slate-900/95">
          <div className="flex justify-around overflow-x-auto py-1 px-1 gap-0 scrollbar-hide">
            <MobileNavTab
              active={activeTab === 'dictionary'}
              onClick={() => setActiveTab('dictionary')}
              icon={<BookOpen size={18} />}
              label="מילון"
            />
            <MobileNavTab
              active={activeTab === 'tutor'}
              onClick={() => setActiveTab('tutor')}
              icon={<GraduationCap size={18} />}
              label="מורה"
            />
            {isFeatureVisible('recipes_module') && (
              <MobileNavTab
                active={activeTab === 'recipes'}
                onClick={() => setActiveTab('recipes')}
                icon={<ChefHat size={18} />}
                label="מתכונים"
                comingSoon={isComingSoon('recipes_module')}
              />
            )}
            {isFeatureVisible('marketplace_module') && (
              <MobileNavTab
                active={activeTab === 'marketplace'}
                onClick={() => setActiveTab('marketplace')}
                icon={<Store size={18} />}
                label="שוק"
                comingSoon={isComingSoon('marketplace_module')}
              />
            )}
            {isFeatureVisible('family_tree_module') && (
              <MobileNavTab
                active={activeTab === 'family'}
                onClick={() => setActiveTab('family')}
                icon={<TreeDeciduous size={18} />}
                label="שורשים"
                comingSoon={isComingSoon('family_tree_module')}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full relative z-10 flex flex-col items-center pb-20 pt-14 md:pt-14" onClick={() => setIsMenuOpen(false)}>
        {/* Extra padding for mobile nav bar */}
        <div className="md:hidden h-12" />

        {activeTab === 'dictionary' ? (
          /* --- DICTIONARY MODE --- */
          <>
            {/* HERO SECTION */}
            <HeroSection dialects={dialects} showBottomContent={!result}>
              <div className="w-full relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                <form onSubmit={handleSearch} className="relative flex bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden p-2 ring-1 ring-slate-900/5 dark:ring-white/10">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="חפש מילה, פתגם או ברכה..."
                    className="flex-1 bg-transparent px-4 py-3 text-lg outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    disabled={loading}
                  />
                  <div className="flex items-center border-r border-slate-100 dark:border-slate-700 pr-2 gap-1">
                    <button
                      type="button"
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onTouchStart={startRecording}
                      onTouchEnd={stopRecording}
                      onMouseLeave={stopRecording}
                      className={`p-3 rounded-lg transition-all duration-200 ${isRecording
                        ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30'
                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-amber-600'
                        }`}
                      title="לחיצה ארוכה להקלטה"
                    >
                      <Mic size={24} className={isRecording ? 'animate-pulse' : ''} />
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-lg transition-colors shadow-md shadow-amber-500/20 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
                    </button>
                  </div>
                </form>
              </div>
              {/* Progressive Loading Feedback */}
              {loading && (
                <div className="text-white font-medium animate-pulse text-sm mt-4 text-center flex items-center justify-center gap-2">
                  <span>{loadingMessage}</span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/80 backdrop-blur text-white p-3 rounded-xl text-center animate-in fade-in slide-in-from-top-2 mt-4 mx-auto max-w-lg shadow-lg">
                  {error}
                </div>
              )}

              {/* History Panel */}
              {!result && !loading && (
                <div className="mt-4 w-full">
                  <HistoryPanel
                    history={history}
                    onClear={clearHistory}
                    onSelect={(item) => {
                      setQuery(item.term);
                      handleSearch(undefined, item.term);
                    }}
                  />
                </div>
              )}
            </HeroSection>

            <div className="w-full max-w-6xl mx-auto px-4 mt-0 relative z-20">

              {/* Floating CTA: Add Word Button */}
              <button
                onClick={() => setIsContributeOpen(true)}
                className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 transition-all font-bold text-sm group"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                <span className="hidden sm:inline">הוסף מילה</span>
              </button>

              {/* Widgets Grid - Only show if not searching (result is null) and not loading */}
              {!result && !loading && (
                <>
                  {/* Community Contribution Widgets - New Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-700 mb-6">
                    <div className="h-56 md:h-64">
                      <NeedsTranslation
                        onTranslate={(entryId, term) => setTranslationModalEntry({ id: entryId, term })}
                        onOpenAuthModal={openAuthModal}
                      />
                    </div>
                    <div className="h-56 md:h-64">
                      <MissingDialects
                        onAddDialect={(entryId, term, missing) => setTranslationModalEntry({ id: entryId, term })}
                        onOpenAuthModal={openAuthModal}
                      />
                    </div>
                    <div className="h-56 md:h-64">
                      <PendingApprovals
                        onViewDetails={(suggestionId) => { console.log('View suggestion:', suggestionId); /* TODO: Open suggestion modal */ }}
                      />
                    </div>
                  </div>

                  {/* Original Widgets Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-700 delay-200">
                    <div className="h-64 md:h-80"><WordOfTheDay onSelectWord={(term) => { setQuery(term); handleSearch(undefined, term); }} /></div>
                    <div className="h-64 md:h-80"><CommunityTicker /></div>
                    <div className="h-64 md:h-80"><RecentAdditions onSelectWord={setQuery} /></div>
                  </div>
                </>
              )}


              {/* Results Container */}
              <div className="w-full max-w-2xl mx-auto mt-8">
                {/* Results */}
                {result && !loading && (
                  <div className="w-full animate-in slide-in-from-bottom-8 duration-500">
                    <ResultCard
                      entry={result}
                      onOpenAuthModal={(reason) => openAuthModal(reason)}
                      onSuggestCorrection={(translation, entryId, term) => {
                        setTranslationModalEntry({
                          id: Number(entryId),
                          term,
                          existingTranslation: {
                            id: translation.id,
                            dialect: translation.dialect,
                            hebrew: translation.hebrew,
                            latin: translation.latin,
                            cyrillic: translation.cyrillic
                          }
                        });
                      }}
                    />
                  </div>
                )}

              </div>

            </div>
          </>
        ) : activeTab === 'tutor' ? (
          /* --- TUTOR MODE --- */
          <div className="w-full animate-in slide-in-from-right duration-300">
            <TutorMode />
          </div>
        ) : activeTab === 'recipes' ? (
          /* --- RECIPES MODE --- */
          <div className="w-full animate-in slide-in-from-right duration-300">
            {canAccessFeatureContent('recipes_module') ? (
              <RecipesPage />
            ) : (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-500/30 animate-pulse">
                  <ChefHat className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">
                  מתכונים - בקרוב! 🍲
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md mb-4">
                  אוסף המתכונים הקווקזיים שלנו בפיתוח. בקרוב תוכלו לגלות מתכונים מסורתיים!
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span>הפיצ'ר בשלבי פיתוח אחרונים</span>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'marketplace' ? (
          /* --- MARKETPLACE MODE --- */
          <div className="w-full animate-in slide-in-from-right duration-300">
            {canAccessFeatureContent('marketplace_module') ? (
              <MarketplacePage />
            ) : (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30 animate-pulse">
                  <Store className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">
                  שוק - בקרוב! 🛒
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md mb-4">
                  השוק הקהילתי שלנו בפיתוח. בקרוב תוכלו למצוא עסקים ומוכרים מהקהילה!
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span>הפיצ'ר בשלבי פיתוח אחרונים</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* --- FAMILY TREE MODE --- */
          <div className="w-full animate-in slide-in-from-right duration-300">
            {canAccessFeatureContent('family_tree_module') ? (
              <CommunityGraph />
            ) : (
              /* Coming Soon Placeholder */
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 animate-pulse">
                  <TreeDeciduous className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">
                  שורשים - בקרוב! 🌳
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md mb-4">
                  עץ המשפחה שלנו בפיתוח. בקרוב תוכלו לחקור ולבנות את עץ השורשים של משפחתכם!
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span>הפיצ'ר בשלבי פיתוח אחרונים</span>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modals */}
      <ContributeModal isOpen={isContributeOpen} onClose={() => setIsContributeOpen(false)} user={user} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      {isAdminOpen && user && <AdminDashboard user={user} onClose={() => setIsAdminOpen(false)} />}
      {isMobileAdminOpen && <MobileAdminPanel onClose={() => setIsMobileAdminOpen(false)} />}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => { setIsAuthModalOpen(false); setAuthModalReason(undefined); }}
        onSuccess={(u) => { refreshUser(); setIsAuthModalOpen(false); setAuthModalReason(undefined); }}
        reason={authModalReason}
      />
      {
        user && (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            user={user}
            onUpdate={(updated) => refreshUser()}
          />
        )
      }

      {/* Translation Modal */}
      {
        translationModalEntry && (
          <TranslationModal
            entryId={translationModalEntry.id}
            term={translationModalEntry.term}
            existingTranslation={translationModalEntry.existingTranslation}
            onClose={() => setTranslationModalEntry(null)}
            onSuccess={() => {
              alert(translationModalEntry.existingTranslation ? 'התיקון נשלח לאישור! תודה 🎉' : 'התרגום נשלח לאישור! תודה על התרומה 🎉');
            }}
          />
        )
      }

    </div >
  );
}

export default App;
