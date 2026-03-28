import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import FocusTrap from 'focus-trap-react';
import { X, AlertTriangle, Send } from 'lucide-react';
import { DictionaryEntry } from '../../types';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

interface ReportModalProps {
  searchQuery: string;
  entry: DictionaryEntry;
  onClose: () => void;
  onSubmit: (data: ReportData) => void;
}

export interface ReportData {
  reportType: string;
  betterTranslation?: string;
  explanation?: string;
}

const REPORT_REASON_KEYS = ['wrong', 'partial', 'spelling', 'other'] as const;
const REPORT_REASON_I18N: Record<string, string> = {
  wrong: 'wrongTranslation',
  partial: 'partialMissing',
  spelling: 'typo',
  other: 'other',
};

const ReportModal: React.FC<ReportModalProps> = ({ searchQuery, entry, onClose, onSubmit }) => {
  const t = useTranslations('report');
  const tc = useTranslations('common');
  const { isAuthenticated } = useAuth();
  const [reportType, setReportType] = useState('wrong');
  const [betterTranslation, setBetterTranslation] = useState('');
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportType) return;

    setSubmitting(true);
    try {
      const data: ReportData = {
        reportType,
        betterTranslation: betterTranslation.trim() || undefined,
        explanation: explanation.trim() || undefined,
      };

      if (entry.id) {
        await apiService.post(`/dictionary/entries/${entry.id}/suggest-field`, {
          fieldName: 'hebrewShort',
          suggestedValue: betterTranslation.trim() || `[דיווח: ${reportType}]`,
          reason: explanation.trim() || undefined,
          report_type: 'report',
        });
      }

      onSubmit(data);
      setSubmitted(true);
    } catch {
      // Allow callback even on API error
      onSubmit({ reportType, betterTranslation, explanation });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const primaryTranslation = entry.dialectScripts[0];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <FocusTrap focusTrapOptions={{ allowOutsideClick: true, escapeDeactivates: true }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="bg-[#0d1424] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl font-rubik"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 id="report-modal-title" className="text-lg font-bold text-white">{t('title')}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-white font-medium">{t('thankYou')}</p>
            <p className="text-slate-400 text-sm">{t('sentForReview')}</p>
            {!isAuthenticated && (
              <p className="text-indigo-300 text-sm">
                {t('signUpToTrack')}
              </p>
            )}
            <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
              {tc('close')}
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Context */}
            <div className="bg-white/5 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">{t('searchLabel')}</span>
                <span className="text-white font-medium">{searchQuery}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">{t('resultLabel')}</span>
                <span className="text-white">{entry.hebrewScript}</span>
                {entry.hebrewShort && (
                  <>
                    <span className="text-slate-400">&larr;</span>
                    <span className="text-slate-300">{entry.hebrewShort}</span>
                  </>
                )}
              </div>
            </div>

            {/* Report type */}
            <div className="space-y-2">
              <label className="text-sm text-slate-300 font-medium">{t('whatIsWrong')}</label>
              <div className="space-y-2">
                {REPORT_REASON_KEYS.map((value) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      reportType === value
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportType"
                      value={value}
                      checked={reportType === value}
                      onChange={(e) => setReportType(e.target.value)}
                      className="accent-indigo-500"
                    />
                    <span className="text-sm text-white">{t(REPORT_REASON_I18N[value])}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Better translation */}
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium">{t('betterTranslation')}</label>
              <input
                type="text"
                value={betterTranslation}
                onChange={(e) => setBetterTranslation(e.target.value)}
                placeholder={t('betterTranslationPlaceholder')}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Explanation */}
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium">{t('explanation')}</label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder={t('explanationPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !reportType}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span>{t('sending')}</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t('sendReport')}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
      </FocusTrap>
    </div>
  );
};

export default ReportModal;
