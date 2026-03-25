import React, { useState } from 'react';
import { Info } from 'lucide-react';
import TransliterationGuideModal from '../TransliterationGuideModal';

const TranslitGuideButton: React.FC = () => {
  const [show, setShow] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShow(true)}
        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-colors"
      >
        <Info size={10} />
        חוקי התעתיק
      </button>
      {show && <TransliterationGuideModal onClose={() => setShow(false)} />}
    </>
  );
};

export default TranslitGuideButton;
