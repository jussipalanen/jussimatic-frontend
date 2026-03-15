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
        className={[
          'flex items-center gap-1.5 bg-gray-900 text-white border border-gray-700 rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors hover:bg-gray-800',
          className ?? 'px-2 py-1 text-xs sm:text-sm',
        ].join(' ')}
      >
        {(() => { const Flag = FLAG_COMPONENTS[value]; return <Flag className="w-5 h-auto rounded-sm" title={t[value]} />; })()}
        {open && (
          <>
            <span>{t[value]}</span>
            <svg
              className="w-3 h-3 shrink-0 rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
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
