import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import AIConfirmModal from './AIConfirmModal';

interface AIValueBadgeProps {
  /** The AI-generated value to display */
  value: string;
  /** Entry ID for confirm/suggest API calls */
  entryId?: string;
  /** Field name (e.g. 'latin', 'hebrew', 'russian') */
  fieldName: string;
  /** Still loading from Gemini */
  isLoading?: boolean;
  /** Optional className for the value text */
  valueClassName?: string;
  /** Render value inline (no wrapping div) */
  inline?: boolean;
}

/** Displays an AI-enriched value with a clickable AI badge that opens confirm/correct modal */
const AIValueBadge: React.FC<AIValueBadgeProps> = ({
  value,
  entryId,
  fieldName,
  isLoading = false,
  valueClassName = '',
  inline = false,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400">
        <Loader2 size={12} className="animate-spin" />
        <span className="bg-white/5 rounded animate-pulse h-4 w-16 inline-block" />
      </span>
    );
  }

  if (!value) return null;

  // Already confirmed — show as regular value (no badge)
  if (confirmed) {
    const Tag = inline ? 'span' : 'div';
    return <Tag className={valueClassName} dir="auto">{value}</Tag>;
  }

  const badge = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (entryId) setShowModal(true);
      }}
      className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 hover:text-amber-300 transition-colors cursor-pointer shrink-0"
      title="לחץ לאשר או לתקן"
    >
      <Sparkles size={9} />
      AI
    </button>
  );

  const Tag = inline ? 'span' : 'div';

  return (
    <>
      <Tag className={`${inline ? 'inline-flex' : 'flex'} items-center gap-1.5`}>
        <span className={`${valueClassName} animate-in fade-in duration-500`} dir="auto">{value}</span>
        {badge}
      </Tag>
      {showModal && entryId && (
        <AIConfirmModal
          entryId={entryId}
          fieldName={fieldName}
          aiValue={value}
          onClose={() => setShowModal(false)}
          onConfirmed={() => setConfirmed(true)}
        />
      )}
    </>
  );
};

export default AIValueBadge;
