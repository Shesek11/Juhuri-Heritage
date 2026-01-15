
import React, { useState, useEffect } from 'react';
import { TutorConfig, ChatMessage, Dialect, ProficiencyLevel, DialectItem, LessonUnit } from '../types';
import { getTutorResponse, generateSpeech } from '../services/geminiService';
import { getDialects } from '../services/storageService';
import { getCurrentUser, updateUserProgress } from '../services/authService';
import { CURRICULUM_UNITS } from '../services/curriculumService';
import { playBase64Audio } from '../utils/audioUtils';
import LessonView from './LessonView';
import { Send, Volume2, Sparkles, GraduationCap, Settings2, Hand, Users, Utensils, Clock, Coffee, Scroll, Lock, CheckCircle, MessageCircle, Play } from 'lucide-react';

const TutorMode: React.FC = () => {
    const [config, setConfig] = useState<TutorConfig | null>(null);
    const [mode, setMode] = useState<'map' | 'chat' | 'lesson'>('map');
    const [activeUnit, setActiveUnit] = useState<LessonUnit | null>(null);
    const [user, setUser] = useState(getCurrentUser());

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState<string | null>(null);

    // Refresh user data on mount
    useEffect(() => {
        setUser(getCurrentUser());
    }, []);

    const handleStart = (dialect: Dialect, level: ProficiencyLevel) => {
        const newConfig: TutorConfig = { dialect, level };
        setConfig(newConfig);
        setMode('map');
    };

    const handleUnitClick = (unit: LessonUnit) => {
        if (isLocked(unit)) return;
        setActiveUnit(unit);
        setMode('lesson');
    };

    const handleLessonComplete = (score: number) => {
        if (activeUnit && user) {
            // Update Progress
            const xp = score;
            // Note: updateUserProgress might be async or sync depending on implementation. 
            // In apiService.ts it returns a Promise.
            updateUserProgress(user.id, xp, activeUnit.id).then(updatedUser => {
                if (updatedUser) setUser(updatedUser);
            });
        }
        setActiveUnit(null);
        setMode('map');
    };

    const isLocked = (unit: LessonUnit) => {
        if (!user) return unit.order > 1; // Guest: only first unit open
        if (unit.order === 1) return false;
        const prevUnit = CURRICULUM_UNITS.find(u => u.order === unit.order - 1);
        if (!prevUnit) return false;
        return !user.completedUnits?.includes(prevUnit.id);
    };

    const isCompleted = (unit: LessonUnit) => {
        return user?.completedUnits?.includes(unit.id);
    };

    // --- Render Icons Helper ---
    const getIcon = (name: string, size: number) => {
        switch (name) {
            case 'Hand': return <Hand size={size} />;
            case 'Users': return <Users size={size} />;
            case 'Utensils': return <Utensils size={size} />;
            case 'Clock': return <Clock size={size} />;
            case 'Coffee': return <Coffee size={size} />;
            case 'Scroll': return <Scroll size={size} />;
            default: return <Sparkles size={size} />;
        }
    };

    // --- Chat Functions ---
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || !config) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await getTutorResponse(messages, config, input);
            const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: response.content, audioText: response.audioText, timestamp: Date.now() };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: "אוי, נראה שיש בעיה בתקשורת כרגע.", timestamp: Date.now() };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
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

    // --- Views ---

    if (!config) {
        return (
            <div className="w-full max-w-2xl mx-auto mt-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700 font-rubik">
                <div className="text-center mb-8">
                    <div className="inline-block p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4 text-indigo-600 dark:text-indigo-400">
                        <GraduationCap size={48} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">שיעור פרטי בג'והורי</h2>
                    <p className="text-slate-600 dark:text-slate-400">בחר ניב ורמה, והתחל את המסע במפת הלימוד האינטראקטיבית.</p>
                    {!user && (
                        <div className="mt-4 p-3 bg-amber-50 text-amber-800 text-sm rounded-lg inline-block">
                            מומלץ להתחבר כדי לשמור את ההתקדמות שלך!
                        </div>
                    )}
                </div>
                <SetupForm onStart={handleStart} />
            </div>
        );
    }

    // Active Lesson View
    if (mode === 'lesson' && activeUnit) {
        return (
            <LessonView
                unit={activeUnit}
                dialect={config.dialect}
                level={config.level}
                onComplete={handleLessonComplete}
                onBack={() => setMode('map')}
            />
        );
    }

    // Free Chat View
    if (mode === 'chat') {
        return (
            <div className="w-full max-w-2xl mx-auto mt-8 h-[600px] flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 font-rubik">
                <div className="bg-indigo-600 p-4 flex justify-between items-center text-white shadow-md z-10">
                    <div className="flex items-center gap-3">
                        <MessageCircle />
                        <h3 className="font-bold">שיחה חופשית עם סבא מרדכי</h3>
                    </div>
                    <button onClick={() => setMode('map')} className="text-sm bg-indigo-700 hover:bg-indigo-800 px-3 py-1 rounded">חזרה למפה</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 scroll-smooth">
                    {messages.length === 0 && <p className="text-center text-slate-400 mt-10">התחל שיחה... נסה להגיד "שלום"</p>}
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'}`}>
                                {msg.content}
                                {msg.audioText && (
                                    <button onClick={() => handlePlayAudio(msg.audioText!, msg.id)} className={`mt-2 flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 ${isPlaying === msg.id ? 'animate-pulse' : ''}`}>
                                        <Volume2 size={14} /> השמע
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="כתוב הודעה..." className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-900 rounded-xl outline-none dark:text-white" disabled={loading} />
                    <button type="submit" disabled={loading || !input.trim()} className="p-3 bg-indigo-600 text-white rounded-xl"><Send size={20} /></button>
                </form>
            </div>
        );
    }

    // Default: Map View
    return (
        <div className="w-full max-w-2xl mx-auto mt-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 font-rubik flex flex-col h-[600px]">
            {/* Header Stats */}
            <div className="bg-slate-900 text-white p-4 shadow-md z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                        {user ? user.level : '1'}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">רמה {user ? user.level : '1'}</h3>
                        <p className="text-xs text-slate-400">{user ? user.xp : 0} XP</p>
                    </div>
                </div>

                <div className="flex gap-4 text-sm font-bold">
                    <div className="flex items-center gap-1 text-orange-400">
                        <Sparkles size={16} fill="currentColor" />
                        <span>{user ? user.currentStreak : 0} ימים</span>
                    </div>
                    <button onClick={() => setConfig(null)} className="text-slate-400 hover:text-white"><Settings2 size={18} /></button>
                </div>
            </div>

            {/* Map Scroll Area */}
            <div className="flex-1 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50 dark:bg-slate-900 p-8 relative">
                <div className="absolute inset-0 bg-slate-50/90 dark:bg-slate-900/90 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center gap-8 py-8">
                    {CURRICULUM_UNITS.map((unit, idx) => {
                        const locked = isLocked(unit);
                        const completed = isCompleted(unit);

                        return (
                            <div key={unit.id} className="relative group w-full max-w-xs flex justify-center">
                                {/* Connector Line */}
                                {idx < CURRICULUM_UNITS.length - 1 && (
                                    <div className="absolute top-16 w-1 h-12 bg-slate-200 dark:bg-slate-700 -z-10"></div>
                                )}

                                <button
                                    onClick={() => handleUnitClick(unit)}
                                    disabled={locked}
                                    className={`
                                    relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-b-4 transition-all transform
                                    ${locked
                                            ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400 cursor-not-allowed'
                                            : completed
                                                ? 'bg-yellow-400 border-yellow-600 text-white hover:scale-110'
                                                : 'bg-indigo-500 border-indigo-700 text-white hover:scale-110'
                                        }
                                `}
                                >
                                    {completed ? <CheckCircle size={32} /> : locked ? <Lock size={24} /> : getIcon(unit.icon, 32)}

                                    {/* Floating Label */}
                                    <div className="absolute top-full mt-3 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg shadow-md border border-slate-100 dark:border-slate-700 whitespace-nowrap z-20 transition-opacity">
                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{unit.title}</p>
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-center">
                <button
                    onClick={() => setMode('chat')}
                    className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-6 py-3 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                    <MessageCircle size={20} />
                    תרגול חופשי בצ'אט
                </button>
            </div>
        </div>
    );
};

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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">בחר ניב ללימוד</label>
                <div className="grid grid-cols-2 gap-3">
                    {dialects.map((d) => (
                        <button key={d.id} onClick={() => setDialect(d.name)} className={`p-3 rounded-lg border text-sm font-medium transition-all text-right ${dialect === d.name ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-400' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                            {d.description}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">רמת ידע נוכחית</label>
                <div className="flex gap-3">
                    {[{ val: 'Beginner', label: 'מתחיל' }, { val: 'Intermediate', label: 'בינוני' }, { val: 'Advanced', label: 'מתקדם' }].map((opt) => (
                        <button key={opt.val} onClick={() => setLevel(opt.val as ProficiencyLevel)} className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-all ${level === opt.val ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-400' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
            <button onClick={() => onStart(dialect, level)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
                <Play size={24} />
                התחל מסע
            </button>
        </div>
    );
}

export default TutorMode;
