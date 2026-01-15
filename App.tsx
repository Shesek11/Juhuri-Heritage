
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { DictionaryEntry, HistoryItem, DialectItem, User } from './types';
import { searchDictionary, searchByAudio } from './services/geminiService';
import { getDialects } from './services/storageService';
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
import XPDisplay from './components/gamification/XPDisplay';
import RecipesPage from './components/RecipesPage';
import { MarketplacePage } from './components/MarketplacePage';
import { FamilyTreePage } from './components/FamilyTreePage';
import { Mic, Search, Scroll, Sun, Moon, Plus, Loader2, HeartHandshake, BookOpen, GraduationCap, Info, User as UserIcon, LogOut, Settings, LayoutDashboard, Menu, LogIn, ChevronDown, ChefHat, Store, TreeDeciduous } from 'lucide-react'; // Tree Icon


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
      {/* Header / Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">

          <div className="flex items-center gap-4">
            {/* Logo - Text Only for now, simplistic */}
            <span className="text-xl font-bold text-white drop-shadow-md hidden md:block">Juhuri Heritage</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Center: Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('dictionary')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'dictionary' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                <BookOpen size={16} />
                מילון
              </button>
              <button
                onClick={() => setActiveTab('tutor')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'tutor' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                <GraduationCap size={16} />
                מורה פרטי
              </button>
              <button
                onClick={() => setActiveTab('recipes')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'recipes' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                <ChefHat size={16} />
                מתכונים
              </button>
              <button
                onClick={() => setActiveTab('marketplace')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'marketplace' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                <Store size={16} />
                שוק
              </button>

              <button
                onClick={() => setActiveTab('family')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'family' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                <TreeDeciduous size={16} />
                שורשים
              </button>
            </div>

            {/* Right Side: Actions */}
            <div className="flex items-center gap-3 min-w-[200px] justify-end relative">

              {/* Admin Button (Visible only to authorized users) */}
              {user && (user.role === 'admin' || user.role === 'approver') && (
                <>
                  <button
                    onClick={() => setIsMobileAdminOpen(true)}
                    className="hidden sm:flex items-center gap-1 px-2 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors text-sm font-bold"
                    title="ניהול מהיר"
                  >
                    🛡️
                  </button>
                  <button
                    onClick={() => setIsAdminOpen(true)}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-sm font-bold"
                  >
                    <LayoutDashboard size={16} />
                    <span>ניהול</span>
                  </button>
                </>
              )}

              {/* Contribute Button (Contextual) */}
              {activeTab === 'dictionary' && (
                <button
                  onClick={() => setIsContributeOpen(true)}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors text-sm font-bold"
                >
                  <Plus size={16} />
                  <span>הוסף מילה</span>
                </button>
              )}

              {/* XP Display (for authenticated users) */}
              <div className="hidden sm:block">
                <XPDisplay />
              </div>

              {/* Unified Menu Dropdown */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 p-1 pl-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:shadow-md transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 overflow-hidden">
                    {user ? <UserIcon size={18} /> : <Menu size={18} />}
                  </div>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {isMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-60 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1 z-50 text-right animate-in fade-in slide-in-from-top-2 overflow-hidden">
                    {/* User Header */}
                    {user ? (
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <p className="font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    ) : (
                      <div className="p-2">
                        <button
                          onClick={() => { openAuthModal(); setIsMenuOpen(false); }}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-bold flex items-center justify-center gap-2"
                        >
                          <LogIn size={16} /> התחברות / הרשמה
                        </button>
                      </div>
                    )}

                    <div className="py-1">
                      {user && (
                        <button
                          onClick={() => { setIsMenuOpen(false); setIsProfileModalOpen(true); }}
                          className="w-full text-right px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                        >
                          <Settings size={16} className="text-slate-400" /> הגדרות פרופיל
                        </button>
                      )}

                      {/* Mobile: Admin Button in Menu */}
                      {user && (user.role === 'admin' || user.role === 'approver') && (
                        <button
                          onClick={() => { setIsAdminOpen(true); setIsMenuOpen(false); }}
                          className="w-full sm:hidden text-right px-4 py-2.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2"
                        >
                          <LayoutDashboard size={16} /> ממשק ניהול
                        </button>
                      )}

                      {/* Mobile: Contribute Button in Menu */}
                      <button
                        onClick={() => { setIsContributeOpen(true); setIsMenuOpen(false); }}
                        className="w-full sm:hidden text-right px-4 py-2.5 text-sm text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                      >
                        <Plus size={16} /> הוסף מילה
                      </button>

                      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>

                      <button
                        onClick={toggleTheme}
                        className="w-full text-right px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                      >
                        {theme === 'light' ? <Moon size={16} className="text-slate-400" /> : <Sun size={16} className="text-amber-400" />}
                        {theme === 'light' ? 'מצב כהה' : 'מצב בהיר'}
                      </button>

                      <button
                        onClick={() => { setIsAboutOpen(true); setIsMenuOpen(false); }}
                        className="w-full text-right px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                      >
                        <Info size={16} className="text-slate-400" /> אודות ומקורות
                      </button>

                      {user && (
                        <>
                          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                          <button
                            onClick={() => logout()}
                            className="w-full text-right px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <LogOut size={16} /> יציאה מהמערכת
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full relative z-10 flex flex-col items-center pb-20 pt-16" onClick={() => setIsMenuOpen(false)}>

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



              {/* Widgets Grid - Only show if not searching (result is null) and not loading */}
              {!result && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-700 delay-200">
                  <div className="h-64 md:h-80"><WordOfTheDay onSelectWord={(term) => { setQuery(term); handleSearch(undefined, term); }} /></div>
                  <div className="h-64 md:h-80"><CommunityTicker /></div>
                  <div className="h-64 md:h-80"><RecentAdditions onSelectWord={setQuery} /></div>
                </div>
              )}


              {/* Results Container */}
              <div className="w-full max-w-2xl mx-auto mt-8">
                {/* Results */}
                {result && !loading && (
                  <div className="w-full animate-in slide-in-from-bottom-8 duration-500">
                    <ResultCard entry={result} onOpenAuthModal={(reason) => openAuthModal(reason)} />
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
            <RecipesPage />
          </div>
        ) : activeTab === 'marketplace' ? (
          /* --- MARKETPLACE MODE --- */
          <div className="w-full animate-in slide-in-from-right duration-300">
            <MarketplacePage />
          </div>
        ) : (
          /* --- FAMILY TREE MODE --- */
          <div className="w-full animate-in slide-in-from-right duration-300">
            <FamilyTreePage />
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

    </div >
  );
}

export default App;
