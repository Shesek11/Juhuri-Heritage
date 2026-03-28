import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SearchX, Plus, Users, Check, Loader2, Bell } from 'lucide-react';
import { FuzzySuggestion } from '../../types';
import FuzzyMatchBanner from './FuzzyMatchBanner';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

interface EmptyResultsCTAProps {
  query: string;
  suggestions?: FuzzySuggestion[];
  onAddWord: () => void;
  onRequestTranslation: () => void;
  onSelectSuggestion?: (term: string) => void;
  onOpenAuthModal?: (reason?: string) => void;
}

const EmptyResultsCTA: React.FC<EmptyResultsCTAProps> = ({
  query,
  suggestions,
  onAddWord,
  onSelectSuggestion,
  onOpenAuthModal,
}) => {
  const t = useTranslations('search');
  const { isAuthenticated } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [isGuest, setIsGuest] = useState(false);

  const handleRequestTranslation = async () => {
    if (requesting || requested) return;
    setRequesting(true);
    try {
      const res = await apiService.post<{
        success: boolean;
        alreadyExists?: boolean;
        watching?: boolean;
        isGuest?: boolean;
        message: string;
      }>('/dictionary/entries/add-untranslated', { term: query });

      setRequested(true);
      setIsGuest(!!res.isGuest);

      if (res.watching) {
        setRequestMessage(t('wordAdded'));
      } else if (res.alreadyExists) {
        setRequestMessage(t('wordExists'));
      } else {
        setRequestMessage(t('wordAddedCommunity'));
      }
    } catch {
      setRequestMessage(t('submitError'));
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8 font-rubik" dir="rtl">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-700/50 flex items-center justify-center">
          <SearchX className="w-7 h-7 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-white">
          {t('emptyTitle', { query })}
        </h2>
        <p className="text-slate-400 text-sm max-w-md">
          {t('emptyDescription')}
        </p>
      </div>

      {/* Fuzzy suggestions */}
      {suggestions && suggestions.length > 0 && onSelectSuggestion && (
        <div className="w-full max-w-lg">
          <FuzzyMatchBanner suggestions={suggestions} onSelect={onSelectSuggestion} />
        </div>
      )}

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onAddWord}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addWithTranslation')}</span>
        </button>

        <button
          type="button"
          onClick={handleRequestTranslation}
          disabled={requesting || requested}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg transition-colors text-sm border ${
            requested
              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
              : 'border-white/10 text-slate-300 hover:bg-white/5'
          } disabled:cursor-not-allowed`}
        >
          {requesting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>{t('submitting')}</span></>
          ) : requested ? (
            <><Check className="w-4 h-4" /><span>{requestMessage}</span></>
          ) : (
            <><Users className="w-4 h-4" /><span>{t('requestTranslation')}</span></>
          )}
        </button>
      </div>

      {/* Guest nudge — show after request */}
      {requested && isGuest && onOpenAuthModal && (
        <button
          type="button"
          onClick={() => onOpenAuthModal(t('requestNotification'))}
          className="inline-flex items-center gap-2 px-4 py-2 text-indigo-300 hover:text-indigo-200 text-sm transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span>{t('requestNotification')}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyResultsCTA;
