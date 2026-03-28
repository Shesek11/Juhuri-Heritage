import React, { useState, useEffect } from 'react';
import { Volume2, Plus, Send, Loader2, X as XIcon, Users, Info } from 'lucide-react';
import { DictionaryEntry, Example } from '../../types';
import apiService from '../../services/apiService';
import EnrichmentSkeleton from './EnrichmentSkeleton';

interface ExamplesSectionProps {
  entry: DictionaryEntry;
  isPlaying: string | null;
  onPlay: (text: string, id: string) => void;
  enrichmentLoading?: boolean;
  enrichedExamples?: Example[];
}

const ExamplesSection: React.FC<ExamplesSectionProps> = ({
  entry,
  isPlaying,
  onPlay,
  enrichmentLoading = false,
  enrichedExamples,
}) => {
  const [communityExamples, setCommunityExamples] = useState<any[]>([]);
  const [communityExamplesLoaded, setCommunityExamplesLoaded] = useState(false);
  const [showProverbForm, setShowProverbForm] = useState(false);
  const [proverbOrigin, setProverbOrigin] = useState('');
  const [proverbTranslated, setProverbTranslated] = useState('');
  const [proverbTranslit, setProverbTranslit] = useState('');
  const [proverbSubmitting, setProverbSubmitting] = useState(false);
  const [proverbMessage, setProverbMessage] = useState('');

  useEffect(() => {
    if (entry.id && !communityExamplesLoaded) {
      apiService.get<{ directExamples: any[]; linkedExamples: any[] }>(`/dictionary/entries/${entry.id}/community-examples`)
        .then(res => {
          setCommunityExamples([...(res.directExamples || []), ...(res.linkedExamples || [])]);
          setCommunityExamplesLoaded(true);
        })
        .catch(() => setCommunityExamplesLoaded(true));
    }
  }, [entry.id]);

  const submitProverb = async () => {
    if (!proverbOrigin.trim() || !entry.id) return;
    setProverbSubmitting(true);
    setProverbMessage('');
    try {
      await apiService.post(`/dictionary/entries/${entry.id}/suggest-example`, {
        origin: proverbOrigin.trim(),
        translated: proverbTranslated.trim() || undefined,
        transliteration: proverbTranslit.trim() || undefined,
      });
      setProverbMessage('הפתגם נשלח לאישור. תודה!');
      setProverbOrigin('');
      setProverbTranslated('');
      setProverbTranslit('');
      setTimeout(() => { setShowProverbForm(false); setProverbMessage(''); }, 2500);
    } catch {
      setProverbMessage('שגיאה בשליחת הפתגם');
    } finally {
      setProverbSubmitting(false);
    }
  };

  // Combine DB + enriched examples
  const displayExamples = entry.examples.length > 0 ? entry.examples : (enrichedExamples || []);
  const hasExamples = displayExamples.length > 0 || communityExamples.length > 0;
  const isEnrichedExamples = entry.examples.length === 0 && enrichedExamples && enrichedExamples.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase tracking-wider text-slate-400 dark:text-slate-400 font-bold">פתגמים וברכות</h3>
        {entry.id && (
          <button
            type="button"
            onClick={() => setShowProverbForm(!showProverbForm)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
            title="הוסף פתגם או ברכה"
          >
            <Plus size={14} />
            הוסף פתגם
          </button>
        )}
      </div>

      {/* AI Enrichment loading */}
      {!hasExamples && enrichmentLoading && (
        <EnrichmentSkeleton label="AI מחפש דוגמאות..." size="lg" />
      )}

      {/* Empty state */}
      {!hasExamples && !enrichmentLoading && (
        <p className="text-sm text-slate-400 dark:text-slate-400">אין עדיין פתגמים למילה זו. היה הראשון להוסיף!</p>
      )}

      {/* AI Disclosure */}
      {displayExamples.length > 0 && (entry.source !== 'קהילה' || isEnrichedExamples) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300 mb-3 border border-amber-100 dark:border-amber-800/30">
          <Info size={14} className="shrink-0" />
          <span>המשפטים נוצרו בעזרת AI ועשויים להכיל אי-דיוקים. יש לכם הצעה טובה יותר? לחצו על "הוסף פתגם".</span>
        </div>
      )}

      {/* Examples list */}
      {displayExamples.length > 0 && (
        <div className={`space-y-3 ${isEnrichedExamples ? 'animate-in fade-in duration-500' : ''}`}>
          {displayExamples.map((ex, idx) => (
            <div key={idx} className="border-s-4 border-indigo-200 dark:border-indigo-900 ps-4 py-2 bg-white/5 rounded-s-lg">
              <div className="flex justify-between items-start mb-1">
                <p className="text-lg font-medium text-slate-200">{ex.origin}</p>
                <button onClick={() => onPlay(ex.origin, `ex-orig-${idx}`)} className={`text-slate-300 hover:text-indigo-500 transition-colors ${isPlaying === `ex-orig-${idx}` ? 'text-indigo-500 animate-pulse' : ''}`}>
                  <Volume2 size={16} />
                </button>
              </div>
              {ex.transliteration && <p className="text-sm text-slate-400 font-mono mb-1 dir-ltr text-start">{ex.transliteration}</p>}
              <p className="text-slate-600 dark:text-slate-400">{ex.translated}</p>
            </div>
          ))}
        </div>
      )}

      {/* Community proverbs */}
      {communityExamples.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1">
            <Users size={12} /> פתגמים מהקהילה
          </p>
          <div className="space-y-3">
            {communityExamples.map((ex) => (
              <div key={ex.id} className="border-s-4 border-indigo-200 dark:border-indigo-900 ps-4 py-2 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-s-lg">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-lg font-medium text-slate-200">{ex.origin}</p>
                  <button onClick={() => onPlay(ex.origin, `comm-${ex.id}`)} className={`text-slate-300 hover:text-indigo-500 transition-colors ${isPlaying === `comm-${ex.id}` ? 'text-indigo-500 animate-pulse' : ''}`}>
                    <Volume2 size={16} />
                  </button>
                </div>
                {ex.transliteration && <p className="text-sm text-slate-400 font-mono mb-1 dir-ltr text-start">{ex.transliteration}</p>}
                {ex.translated && <p className="text-slate-600 dark:text-slate-400">{ex.translated}</p>}
                <p className="text-[11px] text-slate-400 mt-1">תרומה: {ex.user_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add proverb form */}
      {showProverbForm && (
        <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">הוסף פתגם, ברכה או דוגמת שימוש</p>
            <button type="button" onClick={() => setShowProverbForm(false)} className="text-slate-400 hover:text-slate-600" title="סגור">
              <XIcon size={14} />
            </button>
          </div>
          <input type="text" value={proverbOrigin} onChange={e => setProverbOrigin(e.target.value)} placeholder="הפתגם / הברכה בשפת המקור..." className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none" dir="auto" />
          <input type="text" value={proverbTranslated} onChange={e => setProverbTranslated(e.target.value)} placeholder="תרגום (אופציונלי)" className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none" dir="auto" />
          <input type="text" value={proverbTranslit} onChange={e => setProverbTranslit(e.target.value)} placeholder="תעתיק לטיני (אופציונלי)" className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none" dir="ltr" />
          <div className="flex items-center gap-2">
            <button type="button" onClick={submitProverb} disabled={proverbSubmitting || !proverbOrigin.trim()} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
              {proverbSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              שלח פתגם
            </button>
            {proverbMessage && <span className={`text-xs ${proverbMessage.includes('שגיאה') ? 'text-red-500' : 'text-green-600'}`}>{proverbMessage}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamplesSection;
