import React from 'react';
import { Loader2 } from 'lucide-react';

interface EnrichmentSkeletonProps {
  /** Label to show while loading */
  label?: string;
  /** Height variant */
  size?: 'sm' | 'md' | 'lg';
}

/** Animated skeleton shown while Gemini AI enriches a field */
const EnrichmentSkeleton: React.FC<EnrichmentSkeletonProps> = ({
  label = 'AI מעשיר...',
  size = 'sm',
}) => {
  const heights = { sm: 'h-5', md: 'h-8', lg: 'h-20' };

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex items-center gap-1.5 text-xs text-amber-400 shrink-0">
        <Loader2 size={12} className="animate-spin" />
        <span>{label}</span>
      </div>
      <div className={`flex-1 ${heights[size]} bg-white/5 rounded animate-pulse`} />
    </div>
  );
};

export default EnrichmentSkeleton;
