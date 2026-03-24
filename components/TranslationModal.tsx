import React, { useState, useEffect, useRef } from 'react';
import { X, Languages, Loader2, Send, Mic, Square, Play, Pause, RotateCcw, Edit3 } from 'lucide-react';
import apiService from '../services/apiService';

interface ExistingTranslation {
    id?: number;
    dialect: string;
    hebrew: string;
    latin: string;
    cyrillic: string;
}

interface TranslationModalProps {
    entryId: number;
    term: string;
    onClose: () => void;
    onSuccess: () => void;
    existingTranslation?: ExistingTranslation;
}

interface EntryDetails {
    term: string;
    partOfSpeech?: string;
    pronunciationGuide?: string;
    translations: {
        hebrew?: string;
        latin?: string;
        cyrillic?: string;
        dialect?: string;
    }[];
}

const TranslationModal: React.FC<TranslationModalProps> = ({ entryId, term, onClose, onSuccess, existingTranslation }) => {
    const isCorrection = !!existingTranslation;

    // Entry details fetched from API
    const [entryDetails, setEntryDetails] = useState<EntryDetails | null>(null);
    const [loadingEntry, setLoadingEntry] = useState(true);

    const [dialects, setDialects] = useState<{ id: number; name: string; description?: string }[]>([]);
    const [selectedDialect, setSelectedDialect] = useState(existingTranslation?.dialect || 'General');
    const [hebrew, setHebrew] = useState(existingTranslation?.hebrew || '');
    const [latin, setLatin] = useState(existingTranslation?.latin || '');
    const [cyrillic, setCyrillic] = useState(existingTranslation?.cyrillic || '');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch entry details + dialects on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [entryRes, dialectRes] = await Promise.all([
                    apiService.get<{ entry: EntryDetails }>(`/dictionary/entry/${encodeURIComponent(term)}`),
                    apiService.get<{ dialects: { id: number; name: string; description?: string }[] }>('/dialects'),
                ]);

                const entry = entryRes.entry || entryRes;
                setEntryDetails(entry as EntryDetails);
                setDialects(dialectRes.dialects || [{ id: 6, name: 'General', description: 'כללי' }]);

                // Pre-fill from existing entry data if not a correction
                if (!isCorrection && entry) {
                    const t = (entry as EntryDetails).translations?.[0];
                    if (t) {
                        if (t.hebrew && !hebrew) setHebrew(t.hebrew);
                        if (t.latin && !latin) setLatin(t.latin);
                        if (t.cyrillic && !cyrillic) setCyrillic(t.cyrillic);
                        if (t.dialect) setSelectedDialect(t.dialect);
                    }
                }
            } catch {
                setDialects([{ id: 6, name: 'General', description: 'כללי' }]);
            } finally {
                setLoadingEntry(false);
            }
        };
        fetchData();
    }, [entryId, term]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch {
            setError('לא ניתן להקליט. יש לאשר גישה למיקרופון.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        }
    };

    const togglePlayback = () => {
        if (!audioRef.current || !audioUrl) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const resetRecording = () => {
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setRecordingTime(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hebrew.trim()) {
            setError('חובה להזין תרגום בעברית');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            if (audioBlob) {
                const formData = new FormData();
                formData.append('dialect', selectedDialect);
                formData.append('hebrew', hebrew.trim());
                formData.append('latin', latin.trim());
                formData.append('cyrillic', cyrillic.trim());
                formData.append('reason', reason.trim());
                formData.append('audio', audioBlob, 'pronunciation.webm');
                formData.append('audioDuration', String(recordingTime));

                await fetch(`/api/dictionary/entries/${entryId}/suggest`, {
                    method: 'POST',
                    body: formData
                }).then(res => {
                    if (!res.ok) throw new Error('שגיאה בשליחת התרגום');
                    return res.json();
                });
            } else {
                await apiService.post(`/dictionary/entries/${entryId}/suggest`, {
                    dialect: selectedDialect,
                    hebrew: hebrew.trim(),
                    latin: latin.trim(),
                    cyrillic: cyrillic.trim(),
                    reason: reason.trim()
                });
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'שגיאה בשליחת התרגום');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Build display info from entry details
    const displayTerm = entryDetails?.term || term;
    const firstTrans = entryDetails?.translations?.[0];
    const displayLatin = firstTrans?.latin;
    const displayCyrillic = firstTrans?.cyrillic;
    const displayHebrew = firstTrans?.hebrew;
    const pos = entryDetails?.partOfSpeech;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-rubik" onClick={onClose}>
            <div className="bg-[#0d1424] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header with entry info */}
                <div className="p-5 border-b border-white/10 shrink-0">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                {isCorrection ? <Edit3 size={18} /> : <Languages size={18} />}
                            </div>
                            <span className="text-sm text-slate-400 font-medium">
                                {isCorrection ? 'הצע תיקון' : 'השלם תרגום'}
                            </span>
                        </div>
                        <button type="button" onClick={onClose} title="סגור" className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Entry details */}
                    {loadingEntry ? (
                        <div className="flex items-center gap-2 text-slate-500">
                            <Loader2 className="animate-spin" size={16} />
                            <span className="text-sm">טוען פרטי מילה...</span>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">{displayTerm}</h2>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                {displayLatin && <span className="text-slate-400 font-mono" dir="ltr">{displayLatin}</span>}
                                {displayCyrillic && <span className="text-slate-500 font-mono" dir="ltr">{displayCyrillic}</span>}
                                {pos && (
                                    <span className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                                        {pos}
                                    </span>
                                )}
                            </div>
                            {displayHebrew && (
                                <div className="text-slate-300 mt-1">{displayHebrew}</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                    {error && (
                        <div className="bg-red-900/30 border border-red-800 text-red-400 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">ניב</label>
                        <select
                            value={selectedDialect}
                            onChange={(e) => setSelectedDialect(e.target.value)}
                            title="בחר ניב"
                            className="w-full p-2.5 border border-white/10 rounded-lg bg-white/5 text-white"
                        >
                            {dialects.map(d => (
                                <option key={d.id} value={d.name}>
                                    {d.description || (d.name === 'General' ? 'כללי' : d.name)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">תרגום בעברית *</label>
                        <input
                            type="text"
                            value={hebrew}
                            onChange={(e) => setHebrew(e.target.value)}
                            className="w-full p-2.5 border border-white/10 rounded-lg bg-white/5 text-white placeholder-slate-500"
                            placeholder="הזן תרגום בעברית..."
                            dir="rtl"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-300">תעתיק לטיני</label>
                            <input
                                type="text"
                                value={latin}
                                onChange={(e) => setLatin(e.target.value)}
                                className="w-full p-2.5 border border-white/10 rounded-lg bg-white/5 text-white placeholder-slate-500"
                                placeholder="Latin..."
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-300">קירילית</label>
                            <input
                                type="text"
                                value={cyrillic}
                                onChange={(e) => setCyrillic(e.target.value)}
                                className="w-full p-2.5 border border-white/10 rounded-lg bg-white/5 text-white placeholder-slate-500"
                                placeholder="Кириллица..."
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">הערות (אופציונלי)</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-2.5 border border-white/10 rounded-lg bg-white/5 text-white resize-none placeholder-slate-500"
                            rows={2}
                            placeholder="מקור המידע, הערות נוספות..."
                            dir="rtl"
                        />
                    </div>

                    {/* Audio Recording */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <Mic size={16} />
                                הקלט הגייה (אופציונלי)
                            </h4>
                            <span className="text-xs text-slate-500">{formatTime(recordingTime)}</span>
                        </div>

                        <div className="flex items-center justify-center gap-3">
                            {!audioUrl ? (
                                <button
                                    type="button"
                                    title={isRecording ? 'עצור הקלטה' : 'התחל הקלטה'}
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${isRecording
                                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                                        : 'bg-amber-500 hover:bg-amber-600'
                                    } text-white`}
                                >
                                    {isRecording ? <Square size={20} /> : <Mic size={24} />}
                                </button>
                            ) : (
                                <>
                                    <button type="button" onClick={resetRecording} title="הקלט מחדש"
                                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                        <RotateCcw size={18} className="text-slate-300" />
                                    </button>
                                    <button type="button" onClick={togglePlayback} title="נגן"
                                        className="w-12 h-12 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center transition-colors text-white shadow-lg">
                                        {isPlaying ? <Pause size={20} /> : <Play size={20} className="mr-[-2px]" />}
                                    </button>
                                    <span className="text-sm text-green-400 font-medium">✓ הוקלט</span>
                                </>
                            )}
                        </div>

                        {isRecording && <p className="text-center text-sm text-red-400 animate-pulse">מקליט...</p>}
                        {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-slate-300 transition-colors font-medium">
                            ביטול
                        </button>
                        <button type="submit" disabled={isSubmitting || !hebrew.trim()}
                            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex justify-center items-center gap-2 transition-colors font-medium disabled:opacity-50">
                            {isSubmitting ? (
                                <><Loader2 className="animate-spin" size={18} /> שולח...</>
                            ) : (
                                <><Send size={18} /> שלח לאישור</>
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 text-center">
                        התרגום יישלח לאישור מנהלים לפני הוספה למאגר
                    </p>
                </form>
            </div>
        </div>
    );
};

export default TranslationModal;
