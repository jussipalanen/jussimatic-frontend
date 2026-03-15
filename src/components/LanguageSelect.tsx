import { useEffect, useRef, useState } from 'react';
import { translations, DEFAULT_LANGUAGE } from '../i18n';
import type { Language } from '../i18n';

const FLAGS: Record<Language, string> = { en: '🇬🇧', fi: '🇫🇮' };
const LANGUAGE_VALUES: Language[] = ['en', 'fi'];

interface LanguageSelectProps {
  value: Language;
  onChange: (lang: Language) => void;
  /** Extra classes applied to the trigger button (padding, font-size, etc.) */
  className?: string;
}

export default function LanguageSelect({ value, onChange, className }: LanguageSelectProps) {
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
        <span className="text-base leading-none" aria-hidden="true">{FLAGS[value]}</span>
        <span className="hidden sm:inline">{t[value]}</span>
        <svg
          className={`hidden sm:block w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-full mt-1 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
        >
          {LANGUAGE_VALUES.map((lang) => (
            <button
              key={lang}
              type="button"
              role="option"
              aria-selected={value === lang}
              onClick={() => { onChange(lang); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                value === lang
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-200 hover:bg-gray-700'
              }`}
            >
              <span className="text-base leading-none" aria-hidden="true">{FLAGS[lang]}</span>
              {t[lang]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
