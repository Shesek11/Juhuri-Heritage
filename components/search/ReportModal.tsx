import React, { useState } from 'react';
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

const REPORT_REASONS = [
  { value: 'wrong', label: 'התרגום לא נכון' },
  { value: 'partial', label: 'חלקי/חסר ניואנס' },
  { value: 'spelling', label: 'שגיאת כתיב' },
  { value: 'other', label: 'אחר' },
] as const;

const ReportModal: React.FC<ReportModalProps> = ({ searchQuery, entry, onClose, onSubmit }) => {
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
          fieldName: 'hebrew',
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

  const primaryTranslation = entry.translations[0];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0d1424] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl font-rubik"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">דיווח על תרגום</h2>
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
            <p className="text-white font-medium">תודה על הדיווח!</p>
            <p className="text-slate-400 text-sm">הדיווח נשלח לבדיקה.</p>
            {!isAuthenticated && (
              <p className="text-indigo-300 text-sm">
                הירשם כדי לעקוב אחרי הדיווחים שלך ולצבור נקודות ניסיון.
              </p>
            )}
            <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
              סגור
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Context */}
            <div className="bg-white/5 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">חיפוש:</span>
                <span className="text-white font-medium">{searchQuery}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">תוצאה:</span>
                <span className="text-white">{entry.term}</span>
                {primaryTranslation?.hebrew && (
                  <>
                    <span className="text-slate-500">&larr;</span>
                    <span className="text-slate-300">{primaryTranslation.hebrew}</span>
                  </>
                )}
              </div>
            </div>

            {/* Report type */}
            <div className="space-y-2">
              <label className="text-sm text-slate-300 font-medium">מה הבעיה?</label>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      reportType === reason.value
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportType"
                      value={reason.value}
                      checked={reportType === reason.value}
                      onChange={(e) => setReportType(e.target.value)}
                      className="accent-indigo-500"
                    />
                    <span className="text-sm text-white">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Better translation */}
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium">תרגום מדויק יותר (אופציונלי)</label>
              <input
                type="text"
                value={betterTranslation}
                onChange={(e) => setBetterTranslation(e.target.value)}
                placeholder="הכנס תרגום טוב יותר..."
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Explanation */}
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium">הסבר (אופציונלי)</label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="למה התרגום לא מדויק..."
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
                <span>שולח...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>שלח דיווח</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
