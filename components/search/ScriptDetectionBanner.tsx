import React from 'react';
import { Languages } from 'lucide-react';

interface ScriptDetectionBannerProps {
  query: string;
  onSwitchScript: () => void;
}

const ScriptDetectionBanner: React.FC<ScriptDetectionBannerProps> = ({ query, onSwitchScript }) => {
  if (!/[a-zA-Z]/.test(query)) return null;

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 font-rubik" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-blue-300 text-sm">
            חיפשנו כתעתיק לטיני. חיפשת מילה אחרת?
          </span>
        </div>

        <button
          onClick={onSwitchScript}
          className="px-3 py-1.5 text-sm text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20"
        >
          שנה סוג חיפוש
        </button>
      </div>
    </div>
  );
};

export default ScriptDetectionBanner;
