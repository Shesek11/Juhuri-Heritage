import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';

interface Props {
  note: string;
  link?: string;
}

export default function CulturalNote({ note, link }: Props) {
  return (
    <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-xl p-4 max-w-md mx-auto">
      <div className="flex items-start gap-3">
        <BookOpen size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-amber-200/80 font-medium mb-1">הידעת?</p>
          <p className="text-sm text-slate-300 leading-relaxed">{note}</p>
          {link && (
            <a
              href={link}
              className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 mt-2"
            >
              למד עוד <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
