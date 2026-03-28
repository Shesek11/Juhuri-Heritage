import React, { useRef } from 'react';
import NikudPalette from './NikudPalette';
import TranslitGuideButton from './TranslitGuideButton';

const isHebrewField = (f: string) => ['hebrewTransliteration', 'hebrewShort', 'hebrewScript', 'hebrewLong', 'hebrew', 'term'].includes(f);
const isLatinField = (f: string) => f === 'latin' || f === 'latinScript';

interface DictionaryInputProps {
  fieldName: string;
  value: string;
  onChange: (value: string) => void;
  latinHint?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

const DictionaryInput: React.FC<DictionaryInputProps> = ({
  fieldName,
  value,
  onChange,
  latinHint,
  placeholder = 'הערך המוצע...',
  autoFocus = false,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        autoFocus={autoFocus}
        className={className || "w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"}
        dir="rtl"
      />
      {isHebrewField(fieldName) && (
        <NikudPalette inputRef={inputRef} value={value} onChange={onChange} latinHint={latinHint} />
      )}
      {isLatinField(fieldName) && <TranslitGuideButton />}
    </div>
  );
};

export { isHebrewField, isLatinField };
export default DictionaryInput;
