import { useEffect, useRef, useState } from 'react';
import { GB, FI } from 'country-flag-icons/react/3x2';
import { translations, DEFAULT_LANGUAGE } from '../i18n';
import type { Language } from '../i18n';

const FLAG_COMPONENTS: Record<Language, React.ComponentType<{ className?: string; title?: string }>> = {
  en: GB,
  fi: FI,
};
const LANGUAGE_VALUES: Language[] = ['en', 'fi'];

interface LanguageSelectProps {
  value: Language;
  onChange: (lang: Language) => void;
  /** Extra classes applied to the trigger button (padding, font-size, etc.) */
  className?: string;
  /** Which edge of the trigger the dropdown aligns to. Default: 'right' */
  dropdownAlign?: 'left' | 'right';
}

export default function LanguageSelect({ value, onChange, className, dropdownAlign = 'right' }: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const t = (translations[value] ?? translations[DEFAULT_LANGUAGE]).languages;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        className={`flex items-center justify-center gap-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all duration-300 ${className ?? 'w-8 h-8 sm:w-auto sm:px-2.5'} ${open ? 'bg-white/15 border-white/30 text-white' : 'bg-white/5 border-white/15 text-white/60 hover:bg-white/10 hover:border-white/30 hover:text-white'}`}
      >
        {(() => { const Flag = FLAG_COMPONENTS[value]; return <Flag className="w-5 h-auto rounded-sm shrink-0" title={t[value]} />; })()}
        <span className="hidden sm:inline text-xs font-medium">{t[value]}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className={`absolute top-full mt-1 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden ${dropdownAlign === 'left' ? 'left-0' : 'right-0'}`}
        >
          {LANGUAGE_VALUES.map((lang) => (
            <button
              key={lang}
              type="button"
              role="option"
              aria-selected={value === lang}
              onClick={() => { onChange(lang); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${value === lang
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-200 hover:bg-gray-700'
                }`}
            >
              {(() => { const Flag = FLAG_COMPONENTS[lang]; return <Flag className="w-5 h-auto rounded-sm" title={t[lang]} />; })()}
              {t[lang]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
