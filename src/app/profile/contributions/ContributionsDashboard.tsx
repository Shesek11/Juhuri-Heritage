'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../contexts/AuthContext';
import apiService from '../../../../services/apiService';
import { Clock, CheckCircle, XCircle, Award, BookOpen, MessageSquare, FileText } from 'lucide-react';

interface ContributionItem {
  id: number | string;
  entryTerm?: string;
  term?: string;
  fieldName?: string;
  suggestedValue?: string;
  origin?: string;
  translated?: string;
  status: string;
  reportType?: string;
  createdAt: string;
  reviewedAt?: string;
  approvedAt?: string;
}

interface DashboardData {
  suggestions: ContributionItem[];
  entries: ContributionItem[];
  examples: ContributionItem[];
  xp: number;
  totalContributions: number;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-400"><Clock size={10} />ממתין</span>;
    case 'approved':
    case 'active':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/15 text-green-400"><CheckCircle size={10} />אושר</span>;
    case 'rejected':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-400"><XCircle size={10} />נדחה</span>;
    default:
      return null;
  }
};

const fieldLabel: Record<string, string> = {
  hebrew: 'עברית',
  latin: 'תעתיק לטיני',
  cyrillic: 'קירילית',
  russian: 'רוסית',
  definition: 'הגדרה',
  pronunciationGuide: 'הגייה',
  partOfSpeech: 'חלק דיבר',
};

export default function ContributionsDashboard() {
  const { isAuthenticated, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'entries' | 'examples'>('suggestions');

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchData = async () => {
      try {
        const res = await apiService.get<DashboardData>('/dictionary/users/me/contributions');
        setData(res);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          <h1 className="text-2xl font-bold text-white mb-4">התרומות שלי</h1>
          <p className="text-slate-400 mb-6">כדי לראות את התרומות שלך, יש להתחבר תחילה</p>
          <Link href="/dictionary" className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            חזרה למילון
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto" />
        <p className="text-slate-400 mt-4">טוען תרומות...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-slate-400">
        שגיאה בטעינת התרומות
      </div>
    );
  }

  const tabs = [
    { key: 'suggestions' as const, label: 'הצעות תיקון', icon: <MessageSquare size={14} />, count: data.suggestions.length },
    { key: 'entries' as const, label: 'ערכים חדשים', icon: <BookOpen size={14} />, count: data.entries.length },
    { key: 'examples' as const, label: 'פתגמים', icon: <FileText size={14} />, count: data.examples.length },
  ];

  const items = activeTab === 'suggestions' ? data.suggestions
    : activeTab === 'entries' ? data.entries
    : data.examples;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">התרומות שלי</h1>
            <p className="text-slate-400 text-sm mt-1">מעקב אחרי כל מה שתרמת למילון</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="flex items-center gap-1 text-amber-400">
                <Award size={18} />
                <span className="text-xl font-bold">{data.xp}</span>
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">XP</span>
            </div>
            <div className="text-center">
              <span className="text-xl font-bold text-indigo-400">{data.totalContributions}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">תרומות</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:bg-white/5 border border-transparent'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === tab.key ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl border border-white/10 p-8 text-center">
            <p className="text-slate-500">אין תרומות עדיין בקטגוריה זו</p>
            <Link href="/dictionary" className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              חפש מילים ותרום
            </Link>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl border border-white/10 p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Title line */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {(item.entryTerm || item.term) && (
                      <Link
                        href={`/word/${encodeURIComponent(item.entryTerm || item.term || '')}`}
                        className="font-bold text-white hover:text-amber-400 transition-colors"
                      >
                        {item.entryTerm || item.term}
                      </Link>
                    )}
                    {item.fieldName && (
                      <span className="text-xs text-slate-500">
                        → {fieldLabel[item.fieldName] || item.fieldName}
                      </span>
                    )}
                    {statusBadge(item.status)}
                  </div>

                  {/* Value */}
                  {item.suggestedValue && (
                    <p className="text-sm text-slate-300 mt-1 truncate" dir="auto">{item.suggestedValue}</p>
                  )}
                  {item.origin && (
                    <p className="text-sm text-slate-300 mt-1 truncate" dir="auto">
                      {item.origin} {item.translated ? `— ${item.translated}` : ''}
                    </p>
                  )}

                  {/* Date */}
                  <p className="text-[10px] text-slate-600 mt-2">
                    {new Date(item.createdAt).toLocaleDateString('he-IL')}
                    {item.reviewedAt && (
                      <span className="mr-2">
                        · נבדק {new Date(item.reviewedAt).toLocaleDateString('he-IL')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
