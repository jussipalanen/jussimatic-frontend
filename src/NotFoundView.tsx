import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from './i18n';
import type { Language } from './i18n';

export default function NotFoundView() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).notFound;

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <NavBar />
      <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <p className="text-8xl font-bold text-white/10 select-none mb-2">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">{t.heading}</h1>
        <p className="text-gray-400 mb-8">{t.description}</p>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {t.goHome}
        </button>
      </main>
    </div>
  );
}
