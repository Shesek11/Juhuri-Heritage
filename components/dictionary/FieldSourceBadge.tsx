import React from 'react';
import { Bot, Users } from 'lucide-react';

/** Small badge showing the source of a field value */
const FieldSourceBadge: React.FC<{ source?: string }> = ({ source }) => {
  if (!source || source === 'import' || source === 'manual') return null;
  if (source === 'ai') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 mr-1" title="תוכן שנוצר על ידי AI">
        <Bot size={10} /> AI
      </span>
    );
  }
  if (source === 'community') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 mr-1" title="תרומה קהילתית">
        <Users size={10} /> קהילה
      </span>
    );
  }
  return null;
};

export default FieldSourceBadge;
