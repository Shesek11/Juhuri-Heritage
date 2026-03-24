import React, { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import apiService from '../../services/apiService';

/** Confirm AI button - saves AI-generated value to DB */
const ConfirmAiButton: React.FC<{
  entryId?: string;
  fieldName: string;
  value: string;
  source?: string;
}> = ({ entryId, fieldName, value, source }) => {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!entryId || source !== 'ai' || confirmed) return null;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await apiService.post(`/dictionary/entries/${entryId}/confirm-ai-field`, {
        fieldName,
        value,
      });
      setConfirmed(true);
    } catch (err) {
      console.error('Confirm AI failed:', err);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleConfirm}
      disabled={confirming}
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
      title="אשר את ערך ה-AI ושמור במאגר"
    >
      {confirming ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
      אשר
    </button>
  );
};

export default ConfirmAiButton;
