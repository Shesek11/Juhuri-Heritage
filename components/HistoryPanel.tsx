import React from 'react';
import { HistoryItem } from '../types';
import { Clock, Trash2, ArrowRightLeft } from 'lucide-react';

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onSelect, onClear }) => {
  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mt-8">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="flex items-center gap-2 text-slate-400 dark:text-slate-400 font-medium">
          <Clock size={16} />
          חיפושים אחרונים
        </h2>
        <button
          onClick={onClear}
          className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={12} />
          נקה הכל
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="flex items-center gap-2 bg-[#0d1424]/60 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all text-sm text-slate-700 dark:text-slate-200"
          >
            <span className="font-medium">{item.term}</span>
            <ArrowRightLeft size={12} className="text-slate-400" />
            <span className="text-slate-400 dark:text-slate-400 truncate max-w-[100px]">
              {item.translations[0]?.hebrew || item.translations[0]?.latin}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HistoryPanel;
