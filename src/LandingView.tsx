import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { DEFAULT_LANGUAGE, getStoredLanguage, setStoredLanguage, translations } from './i18n';
import type { Language } from './i18n';
import { logoutUser } from './api/authApi';
import { getVisitorsToday, getVisitorsTotal, trackVisitor } from './api/visitorsApi';
import AuthModal from './AuthModal';

function LandingView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const year = new Date().getFullYear();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visitorsCount, setVisitorsCount] = useState<number | null>(null);
  const [visitorsTotalCount, setVisitorsTotalCount] = useState<number | null>(null);
  const [visitorsError, setVisitorsError] = useState<string | null>(null);

  useEffect(() => {
    setStoredLanguage(language);
  }, [language]);

  // Check for auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token);
  }, []);

  useEffect(() => {
    let active = true;

    const loadVisitorsStats = async () => {
      try {
        const [todayData, totalData] = await Promise.all([
          getVisitorsToday(),
          getVisitorsTotal(),
        ]);
        if (!active) return;
        setVisitorsCount(todayData.visitors);
        setVisitorsTotalCount(totalData.visitors);
      } catch (error) {
        console.error('Failed to load visitors count:', error);
        if (!active) return;
        setVisitorsError('Visitors count unavailable');
      }
    };

    loadVisitorsStats();

    return () => {
      active = false;
    };
  }, []);

  // Track visitor on first visit (once per session)
  useEffect(() => {
    const sessionKey = 'visitor_tracked';
    const alreadyTracked = sessionStorage.getItem(sessionKey);

    if (alreadyTracked) return;

    const trackVisit = async () => {
      try {
        await trackVisitor();
        sessionStorage.setItem(sessionKey, 'true');
      } catch (error) {
        console.error('Failed to track visitor:', error);
      }
    };

    trackVisit();
  }, []);

  useEffect(() => {
    if (searchParams.get('auth') !== 'login') return;

    setIsModalOpen(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('auth');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      await logoutUser(token);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear token and reload regardless of API response
      localStorage.removeItem('auth_token');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Language Selector */}
      <div className="fixed top-4 right-4 z-40">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="rounded-lg border border-white/20 bg-gray-800/90 backdrop-blur-sm px-3 py-2 text-sm text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Select language"
        >
          <option value="en">English</option>
          <option value="fi">Suomi</option>
        </select>
      </div>

      {/* Hero Section */}
      <header className="grow flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="text-center w-full max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">{t.landing.title}</h1>
          <p className="text-lg sm:text-xl mb-8">{t.landing.subtitle}</p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 justify-center">
            <button 
              onClick={() => navigate('/chat')}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {t.landing.cta}
            </button>
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded border border-white/20"
              >
                Login
              </button>
            )}
            <button 
              onClick={() => navigate('/demo/browse-jobs')}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              {t.landing.jobsCta}
            </button>
            <button 
              onClick={() => navigate('/demo/ecommerce/products')}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              Ecommerce Demo
            </button>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-sm text-white/60">{t.landing.visitorsDescription}</p>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
              {visitorsError ? (
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70">
                  {visitorsError}
                </div>
              ) : (
                <>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70">
                    {visitorsCount === null ? 'Loading...' : `${t.landing.visitorsToday}: ${visitorsCount}`}
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70">
                    {visitorsTotalCount === null ? 'Loading...' : `${t.landing.visitorsAllTime}: ${visitorsTotalCount}`}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Social Links */}
          <div className="flex justify-center items-center gap-6 mt-8">
            <a
              href="https://github.com/jussipalanen/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <svg
                className="w-8 h-8"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/jussi-alanen-38628a75/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <svg
                className="w-8 h-8"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Footer */}
      <footer className="bg-gray-800 py-6 px-4 text-center">
        <div className="flex justify-center items-center gap-4 mb-3">
          <a
            href="https://github.com/jussipalanen/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/jussi-alanen-38628a75/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="LinkedIn"
          >
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>
        <p className="text-gray-400">&copy; {year} Jussimatic. {t.footer}</p>
      </footer>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialTab="login" />
    </div>
  );
}

export default LandingView;
