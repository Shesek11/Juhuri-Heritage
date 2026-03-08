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

const TranslationModal: React.FC<TranslationModalProps> = ({ entryId, term, onClose, onSuccess, existingTranslation }) => {
    const isCorrection = !!existingTranslation;

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

    useEffect(() => {
        // Fetch dialects
        apiService.get<{ dialects: { id: number; name: string; description?: string }[] }>('/dialects')
            .then(res => setDialects(res.dialects || []))
            .catch(() => setDialects([{ id: 6, name: 'General', description: 'כללי (ללא ניב ספציפי)' }]));
    }, []);

    // Cleanup audio URL on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    // Audio recording functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
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

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('לא ניתן להקליט. יש לאשר גישה למיקרופון.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const togglePlayback = () => {
        if (!audioRef.current || !audioUrl) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
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
            // If audio is recorded, use FormData; otherwise use JSON
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-rubik">
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`p-4 text-white flex justify-between items-center ${isCorrection ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`}>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {isCorrection ? <Edit3 size={24} /> : <Languages size={24} />}
                        {isCorrection ? `הצע תיקון: ${term}` : `תרגום מילה: ${term}`}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            ניב
                        </label>
                        <select
                            value={selectedDialect}
                            onChange={(e) => setSelectedDialect(e.target.value)}
                            className="w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                        >
                            {dialects.map(d => (
                                <option key={d.id} value={d.name}>
                                    {d.description || (d.name === 'General' ? 'כללי (ללא ניב ספציפי)' : d.name)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            תרגום בעברית *
                        </label>
                        <input
                            type="text"
                            value={hebrew}
                            onChange={(e) => setHebrew(e.target.value)}
                            className="w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                            placeholder="הזן תרגום בעברית..."
                            dir="rtl"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                                תעתיק לטיני
                            </label>
                            <input
                                type="text"
                                value={latin}
                                onChange={(e) => setLatin(e.target.value)}
                                className="w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                placeholder="Latin..."
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                                קירילית
                            </label>
                            <input
                                type="text"
                                value={cyrillic}
                                onChange={(e) => setCyrillic(e.target.value)}
                                className="w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                placeholder="Кириллица..."
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            הערות (אופציונלי)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white resize-none"
                            rows={2}
                            placeholder="מקור המידע, הערות נוספות..."
                            dir="rtl"
                        />
                    </div>

                    {/* Audio Recording Section */}
                    <div className="bg-white/5 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Mic size={16} />
                                הקלט הגייה (אופציונלי)
                            </h4>
                            <span className="text-xs text-slate-400">{formatTime(recordingTime)}</span>
                        </div>

                        <div className="flex items-center justify-center gap-3">
                            {!audioUrl ? (
                                // Recording mode
                                <button
                                    type="button"
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${isRecording
                                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                                        : 'bg-amber-500 hover:bg-amber-600'
                                        } text-white`}
                                >
                                    {isRecording ? <Square size={20} /> : <Mic size={24} />}
                                </button>
                            ) : (
                                // Playback mode
                                <>
                                    <button
                                        type="button"
                                        onClick={resetRecording}
                                        className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
                                        title="הקלט מחדש"
                                    >
                                        <RotateCcw size={18} className="text-slate-600 dark:text-slate-300" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={togglePlayback}
                                        className="w-12 h-12 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center transition-colors text-white shadow-lg"
                                    >
                                        {isPlaying ? <Pause size={20} /> : <Play size={20} className="mr-[-2px]" />}
                                    </button>

                                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                        ✓ הוקלט
                                    </span>
                                </>
                            )}
                        </div>

                        {isRecording && (
                            <p className="text-center text-sm text-red-500 animate-pulse">מקליט...</p>
                        )}

                        {audioUrl && (
                            <audio
                                ref={audioRef}
                                src={audioUrl}
                                onEnded={() => setIsPlaying(false)}
                                className="hidden"
                            />
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-300 transition-colors font-medium"
                        >
                            ביטול
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !hebrew.trim()}
                            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex justify-center items-center gap-2 transition-colors font-medium disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="animate-spin" size={18} /> שולח...</>
                            ) : (
                                <><Send size={18} /> שלח לאישור</>
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-slate-400 text-center">
                        התרגום יישלח לאישור מנהלים לפני הוספה למאגר
                    </p>
                </form>
            </div>
        </div>
    );
};

export default TranslationModal;
