
import React, { useState, useEffect, useCallback } from 'react';
import { TutorConfig, ChatMessage, Dialect, ProficiencyLevel, DialectItem, LessonUnit, Exercise, TutorWord, UnitMasteryInfo, TutorProgress } from '../types';
import { getTutorResponse, generateSpeech } from '../services/geminiService';
import { getDialects } from '../services/storageService';
import { getCurrentUser } from '../services/authService';
import { CURRICULUM_SECTIONS, CURRICULUM_UNITS, EXERCISES_BY_MASTERY } from '../services/curriculumService';
import { generateLesson } from '../services/exerciseGenerator';
import { playBase64Audio } from '../utils/audioUtils';
import LessonEngine from './tutor/LessonEngine';
import LearningPath from './tutor/LearningPath';
import DailyGoalRing from './tutor/DailyGoalRing';
import CelebrationScreen from './tutor/CelebrationScreen';
import WeeklySummary from './tutor/WeeklySummary';
import { Send, Volume2, Sparkles, GraduationCap, Settings2, MessageCircle, Play, BarChart3, Target, X } from 'lucide-react';
import { SEOHead } from './seo/SEOHead';

const TutorMode: React.FC = () => {
  const [config, setConfig] = useState<TutorConfig | null>(null);
  const [mode, setMode] = useState<'map' | 'chat' | 'lesson' | 'celebration' | 'review' | 'weekly' | 'goal'>('map');
  const [activeUnit, setActiveUnit] = useState<LessonUnit | null>(null);
  const [user, setUser] = useState(getCurrentUser());
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingLesson, setLoadingLesson] = useState(false);

  // Progress state
  const [progress, setProgress] = useState<TutorProgress>({
    unitMastery: {},
    totalWordsLearned: 0,
    wordsDueForReview: 0,
    dailyXpEarned: 0,
    dailyXpGoal: 10,
    weeklyStats: [],
  });

  // Celebration state
  const [celebrationData, setCelebrationData] = useState<{
    score: number; accuracy: number; xpEarned: number;
    masteryLevel: number; wordsLearned: number;
    milestone: { count: number; label: string } | null;
  } | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  // Load progress on mount
  useEffect(() => {
    setUser(getCurrentUser());
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const res = await fetch('/api/tutor/mastery');
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      }
    } catch (e) {
      console.error('Failed to load progress:', e);
    }
  };

  // --- Unit Click → Load Exercises ---
  const handleUnitClick = async (unit: LessonUnit) => {
    setActiveUnit(unit);
    setLoadingLesson(true);
    try {
      const res = await fetch(`/api/tutor/words?unitId=${unit.id}`);
      const data = await res.json();
      const words: TutorWord[] = (data.words || []).map((w: any) => ({
        id: w.id, term: w.term, hebrew: w.hebrew || '', latin: w.latin || '',
        pronunciation: w.pronunciation || '', example: w.example || '',
        exampleTranslation: w.exampleTranslation || '',
      }));

      if (words.length < 3) {
        alert('אין מספיק מילים ביחידה זו. נדרשות לפחות 3 מילים.');
        setLoadingLesson(false);
        return;
      }

      const mastery = progress.unitMastery[unit.id];
      const currentLevel = (mastery?.masteryLevel || 0) + 1;
      const exerciseTypes = EXERCISES_BY_MASTERY[Math.min(currentLevel, 5)] || EXERCISES_BY_MASTERY[1];

      let reviewWords: TutorWord[] = [];
      try {
        const srsRes = await fetch('/api/tutor/srs');
        if (srsRes.ok) {
          const srsData = await srsRes.json();
          reviewWords = (srsData.words || []).slice(0, 3).map((w: any) => ({
            id: w.id, term: w.term, hebrew: w.hebrew || '', latin: w.latin || '',
            pronunciation: w.pronunciation || '',
          }));
        }
      } catch {}

      const generatedExercises = generateLesson(words, exerciseTypes, 12, reviewWords);
      setExercises(generatedExercises);
      setMode('lesson');
    } catch (e) {
      console.error('Failed to load lesson:', e);
      alert('שגיאה בטעינת השיעור');
    } finally {
      setLoadingLesson(false);
    }
  };

  // --- Lesson Complete ---
  const handleLessonComplete = async (score: number, accuracy: number, wordsLearned: number) => {
    if (!activeUnit) return;
    try {
      const res = await fetch('/api/tutor/mastery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: activeUnit.id, score, accuracy, wordsLearned, wordsReviewed: 0 }),
      });
      const result = await res.json();

      const totalAfter = progress.totalWordsLearned + wordsLearned;
      const milestones = [25, 50, 100, 200, 300, 500];
      let milestone = null;
      for (const m of milestones) {
        if (progress.totalWordsLearned < m && totalAfter >= m) {
          milestone = { count: m, label: `${m} מילים!` };
          break;
        }
      }

      setCelebrationData({
        score, accuracy, xpEarned: result.xpEarned || 10,
        masteryLevel: result.newMasteryLevel || 1, wordsLearned, milestone,
      });
      setMode('celebration');
      await loadProgress();
      setUser(getCurrentUser());
    } catch (e) {
      console.error('Failed to save progress:', e);
      setMode('map');
    }
  };

  // --- Review Mode ---
  const handleReviewClick = async () => {
    setLoadingLesson(true);
    try {
      const res = await fetch('/api/tutor/srs');
      if (!res.ok) throw new Error('Failed to fetch SRS words');
      const data = await res.json();
      const words: TutorWord[] = (data.words || []).map((w: any) => ({
        id: w.id, term: w.term, hebrew: w.hebrew || '', latin: w.latin || '',
        pronunciation: w.pronunciation || '',
      }));

      if (words.length === 0) {
        alert('אין מילים לחזרה כרגע! חזור מאוחר יותר.');
        setLoadingLesson(false);
        return;
      }

      const reviewTypes = EXERCISES_BY_MASTERY[2];
      const generatedExercises = generateLesson(words, reviewTypes, Math.min(words.length * 2, 12));
      setExercises(generatedExercises);
      setActiveUnit({ id: 'review', title: 'חזרה על מילים', description: '', icon: 'RotateCcw', order: 0, sectionId: '' });
      setMode('lesson');
    } catch (e) {
      console.error('Failed to load review:', e);
    } finally {
      setLoadingLesson(false);
    }
  };

  // --- Set Daily Goal ---
  const handleSetGoal = async (targetXp: number) => {
    try {
      await fetch('/api/tutor/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetXp }),
      });
      setProgress(prev => ({ ...prev, dailyXpGoal: targetXp }));
      setMode('map');
    } catch {}
  };

  // --- Chat Functions ---
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !config) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);

    try {
      const response = await getTutorResponse(messages, config, input);
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: response.content, audioText: response.audioText, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: 'אוי, נראה שיש בעיה בתקשורת כרגע.', timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePlayAudio = async (text: string, id: string) => {
    if (isPlaying) return;
    setIsPlaying(id);
    try {
      const audio = await generateSpeech(text, 'Fenrir');
      await playBase64Audio(audio);
    } catch (e) { console.error(e); } finally { setIsPlaying(null); }
  };

  // ==========================================
  // VIEWS — each is a full-page takeover
  // ==========================================

  // Setup — centered card (only screen that uses card layout)
  if (!config) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-10 font-rubik">
        <SEOHead
          title="מורה פרטי - לימוד ג'והורי"
          description="למד ג'והורי עם מורה פרטי אינטראקטיבי. 15 יחידות לימוד, 12 סוגי תרגילים, מערכת חזרה חכמה."
          canonicalPath="/tutor"
        />
        <div className="w-full max-w-md bg-[#0d1424]/70 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sm:p-10 border border-white/10">
          <div className="text-center mb-8">
            <div className="inline-block p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-5 text-amber-500">
              <GraduationCap size={48} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">שיעור פרטי בג'והורי</h2>
            <p className="text-sm text-slate-400">15 יחידות לימוד · 12 סוגי תרגילים · חזרה חכמה</p>
            {!user && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm rounded-lg inline-block">
                מומלץ להתחבר כדי לשמור את ההתקדמות שלך!
              </div>
            )}
          </div>
          <SetupForm onStart={(dialect, level) => { setConfig({ dialect, level }); setMode('map'); }} />
        </div>
      </div>
    );
  }

  // Loading
  if (loadingLesson) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 font-rubik">
        <Sparkles className="text-amber-500 animate-pulse mb-4" size={56} />
        <h3 className="text-xl font-bold text-slate-100 mb-2">מכין את השיעור...</h3>
        <p className="text-sm text-slate-500">טוען מילים ותרגילים</p>
      </div>
    );
  }

  // Lesson — full-page exercise
  if (mode === 'lesson' && activeUnit && exercises.length > 0) {
    return (
      <div className="font-rubik">
        <LessonEngine
          exercises={exercises}
          unitTitle={activeUnit.title}
          onComplete={(score, accuracy, wordsLearned) => {
            if (activeUnit.id === 'review') {
              setMode('map');
              loadProgress();
            } else {
              handleLessonComplete(score, accuracy, wordsLearned);
            }
          }}
          onBack={() => { setMode('map'); setActiveUnit(null); }}
        />
      </div>
    );
  }

  // Celebration — full-page
  if (mode === 'celebration' && celebrationData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-10 font-rubik">
        <CelebrationScreen
          {...celebrationData}
          onContinue={() => { setCelebrationData(null); setMode('map'); }}
        />
      </div>
    );
  }

  // Weekly Summary — modal overlay
  if (mode === 'weekly') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-10 font-rubik">
        <div className="w-full max-w-2xl">
          <WeeklySummary
            stats={progress.weeklyStats as any}
            totals={progress.weeklyStats.reduce((acc: any, s: any) => ({
              xpEarned: (acc.xpEarned || 0) + (s.xp_earned || 0),
              wordsLearned: (acc.wordsLearned || 0) + (s.words_learned || 0),
              wordsReviewed: (acc.wordsReviewed || 0) + (s.words_reviewed || 0),
              lessonsCompleted: (acc.lessonsCompleted || 0) + (s.lessons_completed || 0),
            }), { xpEarned: 0, wordsLearned: 0, wordsReviewed: 0, lessonsCompleted: 0 })}
            streak={user?.currentStreak || 0}
            totalWordsLearned={progress.totalWordsLearned}
            onClose={() => setMode('map')}
          />
        </div>
      </div>
    );
  }

  // Daily Goal Selector — centered modal
  if (mode === 'goal') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-10 font-rubik">
        <div className="w-full max-w-sm bg-[#0d1424]/70 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10">
          <div className="text-center mb-6">
            <Target size={40} className="text-amber-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-slate-100">בחר יעד יומי</h3>
            <p className="text-sm text-slate-400 mt-1">כמה XP ביום?</p>
          </div>
          <div className="space-y-3">
            {[
              { xp: 5, label: 'קליל', desc: '~2 דקות ביום' },
              { xp: 10, label: 'רגיל', desc: '~5 דקות ביום' },
              { xp: 15, label: 'רציני', desc: '~8 דקות ביום' },
              { xp: 20, label: 'אינטנסיבי', desc: '~10 דקות ביום' },
            ].map(opt => (
              <button
                type="button"
                key={opt.xp}
                onClick={() => handleSetGoal(opt.xp)}
                className={`w-full p-4 rounded-xl border-2 flex justify-between items-center transition-all ${
                  progress.dailyXpGoal === opt.xp
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-amber-500/30'
                }`}
              >
                <div>
                  <span className="font-bold">{opt.label}</span>
                  <span className="text-xs text-slate-500 mr-2"> — {opt.desc}</span>
                </div>
                <span className="text-lg font-bold">{opt.xp} XP</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setMode('map')} className="w-full mt-5 py-2.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">ביטול</button>
        </div>
      </div>
    );
  }

  // Chat View — full-page chat
  if (mode === 'chat') {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] max-h-[800px] font-rubik mx-auto w-full max-w-3xl px-4">
        <div className="bg-[#0d1424]/70 backdrop-blur-xl rounded-t-2xl border border-white/10 border-b-0 px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 text-amber-500">
            <MessageCircle size={22} />
            <h3 className="font-bold text-base">שיחה חופשית עם סבא מרדכי</h3>
          </div>
          <button type="button" onClick={() => setMode('map')} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#0d1424]/40 border-x border-white/10 p-5 space-y-4 scroll-smooth">
          {messages.length === 0 && <p className="text-center text-slate-400 mt-16 text-sm">התחל שיחה... נסה להגיד &quot;שלום&quot;</p>}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] sm:max-w-[65%] rounded-2xl px-5 py-3.5 shadow-sm text-sm sm:text-base ${msg.role === 'user' ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-[#050B14] font-medium rounded-br-none' : 'bg-white/10 backdrop-blur-md text-white border border-white/10 rounded-bl-none'}`}>
                {msg.content}
                {msg.audioText && (
                  <button type="button" onClick={() => handlePlayAudio(msg.audioText!, msg.id)} className={`mt-2.5 flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 ${isPlaying === msg.id ? 'animate-pulse' : ''}`}>
                    <Volume2 size={14} /> השמע
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage} className="bg-[#0d1424]/70 backdrop-blur-xl rounded-b-2xl border border-white/10 border-t-0 p-4 flex gap-3">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="כתוב הודעה..." className="flex-1 px-5 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white text-sm sm:text-base focus:border-amber-500/30 transition-colors" disabled={chatLoading} />
          <button type="submit" disabled={chatLoading || !input.trim()} className="px-5 py-3 bg-gradient-to-br from-amber-400 to-orange-600 text-[#050B14] rounded-xl hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] disabled:opacity-50 transition-all font-bold" title="שלח" aria-label="שלח הודעה"><Send size={20} /></button>
        </form>
      </div>
    );
  }

  // ==========================================
  // DEFAULT: Learning Path — FULL PAGE layout
  // Uses flex layout with fixed height so header/footer stay in place
  // and only the learning path scrolls. No sticky needed.
  // Heights account for AppShell's fixed navbar:
  //   Mobile: 104px padding + 48px mobile-nav spacer = 152px
  //   Desktop (md+): 104px padding only
  // ==========================================
  return (
    <div className="font-rubik flex flex-col h-[calc(100dvh-152px)] md:h-[calc(100dvh-104px)]">
      {/* ===== FIXED HEADER (non-scrolling) ===== */}
      <div className="shrink-0 bg-[#050B14]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          {/* Left: Daily Goal Ring */}
          <DailyGoalRing
            earned={progress.dailyXpEarned}
            goal={progress.dailyXpGoal}
            streak={user?.currentStreak || 0}
          />

          {/* Center: Total words learned (desktop only) */}
          <div className="hidden md:flex items-center gap-3 text-slate-400">
            <div className="text-center">
              <span className="text-lg font-bold text-slate-200">{progress.totalWordsLearned}</span>
              <span className="text-xs mr-1.5">מילים נלמדו</span>
            </div>
          </div>

          {/* Right: Level + Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right">
              <h3 className="font-bold text-sm sm:text-base text-slate-100 leading-tight">רמה {user?.level || 1}</h3>
              <p className="text-xs text-slate-500">{user?.xp || 0} XP</p>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex gap-1">
              <button type="button" onClick={() => setMode('goal')} className="p-2 text-slate-500 hover:text-amber-400 transition-colors rounded-lg hover:bg-white/5" title="יעד יומי">
                <Target size={18} />
              </button>
              <button type="button" onClick={() => setMode('weekly')} className="p-2 text-slate-500 hover:text-amber-400 transition-colors rounded-lg hover:bg-white/5" title="סיכום שבועי">
                <BarChart3 size={18} />
              </button>
              <button type="button" onClick={() => setConfig(null)} className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5" title="הגדרות">
                <Settings2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== LEARNING PATH — fills viewport ===== */}
      <LearningPath
        unitMastery={progress.unitMastery}
        completedUnits={Object.keys(progress.unitMastery).filter(k => (progress.unitMastery[k]?.masteryLevel || 0) >= 1)}
        onUnitClick={handleUnitClick}
        onReviewClick={handleReviewClick}
        wordsDueForReview={progress.wordsDueForReview}
      />

      {/* ===== FIXED BOTTOM BAR (non-scrolling) ===== */}
      <div className="shrink-0 bg-[#050B14]/90 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-center">
          <button
            type="button"
            onClick={() => setMode('chat')}
            className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-500 px-6 py-3 rounded-xl font-bold text-sm sm:text-base hover:bg-amber-500/20 hover:border-amber-500/30 transition-all"
          >
            <MessageCircle size={20} />
            צ'אט עם סבא מרדכי
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Setup Form ---
const SetupForm: React.FC<{ onStart: (d: Dialect, l: ProficiencyLevel) => void }> = ({ onStart }) => {
  const [dialect, setDialect] = useState<string>('');
  const [level, setLevel] = useState<ProficiencyLevel>('Beginner');
  const [dialects, setDialects] = useState<DialectItem[]>([]);

  useEffect(() => {
    const loadDialects = async () => {
      const loaded = await getDialects();
      setDialects(loaded);
      if (loaded.length > 0) setDialect(loaded[0].name);
    };
    loadDialects();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">בחר ניב ללימוד</label>
        <div className="grid grid-cols-2 gap-3">
          {dialects.map(d => (
            <button type="button" key={d.id} onClick={() => setDialect(d.name)} className={`p-3.5 rounded-xl border text-sm font-medium transition-all text-right ${dialect === d.name ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-white/10 hover:border-amber-500/30 text-slate-300'}`}>
              {d.description}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">רמת ידע נוכחית</label>
        <div className="flex gap-3">
          {[{ val: 'Beginner', label: 'מתחיל' }, { val: 'Intermediate', label: 'בינוני' }, { val: 'Advanced', label: 'מתקדם' }].map(opt => (
            <button type="button" key={opt.val} onClick={() => setLevel(opt.val as ProficiencyLevel)} className={`flex-1 p-3.5 rounded-xl border text-sm font-medium transition-all ${level === opt.val ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-white/10 hover:border-amber-500/30 text-slate-300'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <button type="button" onClick={() => onStart(dialect, level)} className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-600 text-[#050B14] font-bold text-lg rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2">
        <Play size={24} />
        התחל מסע
      </button>
    </div>
  );
};

export default TutorMode;
