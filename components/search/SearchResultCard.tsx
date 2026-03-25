import React, { useState } from 'react';
import { ArrowLeft, ThumbsUp, AlertTriangle, Shield, Users, Sparkles, Star, Plus, Copy } from 'lucide-react';
import { DictionaryEntry } from '../../types';
import { partOfSpeechHebrew } from '../../utils/pos';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

interface SearchResultCardProps {
  entry: DictionaryEntry;
  isBestMatch?: boolean;
  searchQuery: string;
  onReport: () => void;
  onNavigate: () => void;
  onSuggestMerge?: (entry: DictionaryEntry) => void;
}

const verificationConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  verified: { icon: <Shield className="w-3.5 h-3.5" />, label: 'מאומת', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  community: { icon: <Users className="w-3.5 h-3.5" />, label: 'קהילתי', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  ai: { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'AI', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
};

// Check if a string starts with Hebrew characters
const isHebrew = (s: string) => /^[\u0590-\u05FF]/.test(s);
const isCyrillic = (s: string) => /^[\u0400-\u04FF]/.test(s);

const SearchResultCard: React.FC<SearchResultCardProps> = ({ entry, isBestMatch, searchQuery, onReport, onNavigate, onSuggestMerge }) => {
  const { isAuthenticated } = useAuth();
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(entry.translations[0]?.upvotes || 0);

  const primaryTranslation = entry.translations[0];
  const hebrewTranslation = primaryTranslation?.hebrew || '';
  const latinText = primaryTranslation?.latin || '';
  const cyrillicText = primaryTranslation?.cyrillic || '';
  const dialect = primaryTranslation?.dialect;
  const pos = entry.partOfSpeech;
  const score = entry.communityScore;
  const verification = entry.verificationLevel;
  const verificationInfo = verification ? verificationConfig[verification] : null;

  // Determine what to show as the primary title:
  // If `term` is in Hebrew script → use it directly (it's the Juhuri word in Hebrew chars)
  // If `term` is in Cyrillic → that goes below, title should be Hebrew transliteration if available
  const termIsHebrew = isHebrew(entry.term);
  const termIsCyrillic = isCyrillic(entry.term);

  // Primary title: Hebrew-script Juhuri term
  const primaryTitle = termIsHebrew ? entry.term : null;
  // If term is Cyrillic, it goes to secondary line
  const secondaryTerm = termIsCyrillic ? entry.term : (cyrillicText || null);
  // Missing Hebrew title
  const missingHebrewTitle = !primaryTitle;

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const translationId = primaryTranslation?.id;
    if (!translationId) return;

    const newVote = upvoted ? null : 'up';
    setUpvoted(!upvoted);
    setUpvoteCount(prev => upvoted ? prev - 1 : prev + 1);

    try {
      await apiService.post(`/dictionary/translations/${translationId}/vote`, { voteType: newVote });
    } catch {
      setUpvoted(upvoted);
      setUpvoteCount(prev => upvoted ? prev + 1 : prev - 1);
    }
  };

  return (
    <div
      className={`group relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl border p-4 sm:p-5 transition-all duration-300 hover:border-amber-500/30 hover:bg-[#0d1424]/80 font-rubik cursor-pointer ${
        isBestMatch ? 'border-amber-500/20 shadow-lg shadow-amber-500/5' : 'border-white/10'
      }`}
      onClick={onNavigate}
      role="article"
      dir="rtl"
    >
      {isBestMatch && (
        <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-[11px] font-bold rounded-full border border-amber-500/30">
          התאמה מיטבית
        </div>
      )}

      {/* Top row: Juhuri term (Hebrew script) + badges */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          {primaryTitle ? (
            <h3 className="text-lg sm:text-xl font-bold text-white leading-tight truncate">
              {primaryTitle}
            </h3>
          ) : (
            /* Missing Hebrew transliteration — show placeholder */
            <div className="flex items-center gap-1.5 px-3 py-1 border border-dashed border-slate-600/50 rounded-lg text-slate-400 text-sm">
              <Plus size={12} />
              <span>חסר תעתיק עברי</span>
            </div>
          )}

          {pos && (
            <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 font-medium">
              {partOfSpeechHebrew(pos)}
            </span>
          )}

          {dialect && dialect !== 'General' && dialect !== 'לא ידוע' && (
            <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 font-medium">
              {dialect}
            </span>
          )}

          {verificationInfo && (
            <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${verificationInfo.color}`}>
              {verificationInfo.icon}
              {verificationInfo.label}
            </span>
          )}
        </div>

        {typeof score === 'number' && score > 0 && (
          <div className="shrink-0 flex items-center gap-1 text-amber-400 text-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span className="font-medium">{score}</span>
          </div>
        )}
      </div>

      {/* Secondary line: Latin first, then Cyrillic */}
      <div className="flex items-center gap-3 flex-wrap mb-1">
        {latinText && (
          <span className="text-slate-400 text-sm font-mono" dir="ltr">{latinText}</span>
        )}
        {secondaryTerm && (
          <span className="text-slate-400 text-xs font-serif" dir="ltr">{secondaryTerm}</span>
        )}
      </div>

      {/* Hebrew translation (what the user searched for) */}
      <div className="mb-3">
        <p className="text-slate-200 text-base leading-relaxed">{hebrewTranslation}</p>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleUpvote}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            upvoted
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:bg-white/5 border border-transparent'
          }`}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${upvoted ? 'fill-emerald-400' : ''}`} />
          <span>{upvoteCount > 0 ? upvoteCount : ''} נכון</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onReport(); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:bg-white/5 rounded-lg text-sm transition-colors border border-transparent"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>לא מדויק</span>
        </button>

        {entry.hasDuplicates && onSuggestMerge && (
          <button
            onClick={(e) => { e.stopPropagation(); onSuggestMerge(entry); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-orange-300/70 hover:bg-orange-500/10 rounded-lg text-xs transition-colors border border-transparent"
          >
            <Copy className="w-3 h-3" />
            <span>נראה כפול?</span>
          </button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(); }}
          className="mr-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-indigo-300 hover:bg-indigo-500/10 rounded-lg text-sm transition-colors border border-transparent"
        >
          <span>פרטים</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default SearchResultCard;
