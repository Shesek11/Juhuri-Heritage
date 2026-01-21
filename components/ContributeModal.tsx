import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, CheckCircle, AlertCircle, Feather, Mic, Square, Play, Pause, RotateCcw } from 'lucide-react';
import { verifySuggestion } from '../services/geminiService';
import { addCustomEntry, getDialects } from '../services/storageService';
import { DictionaryEntry, DialectItem, User } from '../types';
import { incrementContribution } from '../services/authService';
import apiService from '../services/apiService';

interface ContributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const ContributeModal: React.FC<ContributeModalProps> = ({ isOpen, onClose, user }) => {
  const [term, setTerm] = useState('');
  const [hebrew, setHebrew] = useState('');
  const [latin, setLatin] = useState('');
  const [cyrillic, setCyrillic] = useState('');
  const [dialect, setDialect] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');
  const [dialects, setDialects] = useState<DialectItem[]>([]);

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
    if (isOpen) {
      getDialects().then(d => setDialects(d || [])).catch(() => setDialects([]));
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [isOpen]);

  if (!isOpen) return null;

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
      setFeedback('לא ניתן להקליט. יש לאשר גישה למיקרופון.');
      setStatus('error');
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
    setLoading(true);
    setStatus('idle');

    try {
      const result = await verifySuggestion({ term, translation: hebrew, dialect });
      if (result.isValid) {
        // Construct Entry Object
        const entry: DictionaryEntry = {
          term: term,
          detectedLanguage: 'Hebrew',
          translations: [{
            dialect: dialect || 'General',
            hebrew: hebrew,
            latin: latin,
            cyrillic: cyrillic
          }],
          definitions: [`User contribution: ${hebrew}`],
          examples: [],
          source: 'User',
          status: 'pending',
          contributorId: user?.id
        };

        // Save to DB (with audio if present)
        if (audioBlob) {
          const formData = new FormData();
          formData.append('entry', JSON.stringify(entry));
          formData.append('audio', audioBlob, 'pronunciation.webm');
          await apiService.postFormData('/dictionary/entries/contribute', formData);
        } else {
          addCustomEntry(entry);
        }

        // Update user stats
        if (user) {
          incrementContribution(user.id);
        }

        setStatus('success');
        setFeedback("תודה! התרומה נשלחה לאישור ותתווסף בהקדם.");
        setTimeout(() => {
          onClose();
          resetForm();
        }, 2500);
      } else {
        setStatus('error');
        setFeedback(result.feedback || "המערכת זיהתה אי-התאמה. אנא ודאו שהפרטים מדויקים.");
      }
    } catch (error) {
      setStatus('error');
      setFeedback("אירעה שגיאה בשמירת התרומה.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTerm('');
    setHebrew('');
    setLatin('');
    setCyrillic('');
    setDialect('');
    setStatus('idle');
    resetRecording();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-rubik">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <Feather size={22} />
            <h3 className="font-bold text-lg">הוספת מילה חדשה</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            עזרו לנו לתעד את השפה. הוסיפו מילה, פתגם או ביטוי שחסר במילון.
          </p>

          {/* Term */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              המילה / הביטוי <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              placeholder="למשל: מזל טוב"
            />
          </div>

          {/* Translation - Hebrew */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              התרגום/פירוש בעברית <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={hebrew}
              onChange={(e) => setHebrew(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              placeholder="מה זה אומר?"
            />
          </div>

          {/* Latin & Cyrillic Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                כתיב לטיני
              </label>
              <input
                type="text"
                value={latin}
                onChange={(e) => setLatin(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
                placeholder="Mazal tov"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                כתיב קירילי
              </label>
              <input
                type="text"
                value={cyrillic}
                onChange={(e) => setCyrillic(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
                placeholder="Мазал тов"
                dir="ltr"
              />
            </div>
          </div>

          {/* Dialect */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ניב / מקור</label>
            <select
              value={dialect}
              onChange={(e) => setDialect(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            >
              <option value="">כללי / לא ידוע</option>
              {dialects.map(d => (
                <option key={d.id} value={d.name}>{d.description || d.name}</option>
              ))}
            </select>
          </div>

          {/* Audio Recording Section */}
          <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              🎙️ הקלטת הגייה (אופציונלי)
            </label>

            {!audioBlob ? (
              <div className="flex items-center justify-center gap-4">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg shadow-red-500/20"
                  >
                    <Mic size={18} />
                    התחל הקלטה
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-red-500 animate-pulse">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="font-mono font-bold">{formatTime(recordingTime)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-full transition-colors"
                    >
                      <Square size={16} />
                      סיים הקלטה
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlayback}
                    className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    הקלטה מוכנה ({formatTime(recordingTime)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetRecording}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="הקלט מחדש"
                >
                  <RotateCcw size={18} />
                </button>
                <audio
                  ref={audioRef}
                  src={audioUrl || ''}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* User notice */}
          {!user && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
              💡 אתה תורם כאורח. התחבר כדי לקבל קרדיט ולעקוב אחרי התרומות שלך.
            </p>
          )}

          {/* Status Messages */}
          {status === 'success' && (
            <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg flex items-start gap-2 text-sm">
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !term || !hebrew}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />}
              {loading ? 'שולח לאישור...' : 'שלח לאישור'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContributeModal;
