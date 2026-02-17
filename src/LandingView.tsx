import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from './i18n';

function LandingView() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const [language] = useState(() => getStoredLanguage());
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Hero Section */}
      <header className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">{t.landing.title}</h1>
          <p className="text-xl mb-8">{t.landing.subtitle}</p>
          <button 
            onClick={() => navigate('/chat')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {t.landing.cta}
          </button>
        </div>
      </header>

      {/* Footer */}
      <footer className="bg-gray-800 py-6 px-4 text-center">
        <p className="text-gray-400">&copy; {year} Jussimatic. {t.footer}</p>
      </footer>
    </div>
  );
}

export default LandingView;
