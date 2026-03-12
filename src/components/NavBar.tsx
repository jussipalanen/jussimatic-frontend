import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, logoutUser } from '../api/authApi';
import { DEFAULT_LANGUAGE, getStoredLanguage, setStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';

interface NavUserData {
  first_name?: string;
  firstname?: string;
  last_name?: string;
  lastname?: string;
  email?: string;
  [key: string]: unknown;
}

interface NavBarProps {
  /** Optional callback to open a login modal. If not provided, navigates to /?auth=login */
  onLoginClick?: () => void;
}

export default function NavBar({ onLoginClick }: NavBarProps) {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<NavUserData | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const projectsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token);
    if (token) {
      getMe()
        .then((data) => setUserData(data as NavUserData))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (projectsMenuRef.current && !projectsMenuRef.current.contains(e.target as Node)) {
        setShowProjects(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setStoredLanguage(lang);
    window.dispatchEvent(new CustomEvent('jussimatic-language-change', { detail: lang }));
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    try {
      await logoutUser(token);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
  };

  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      navigate('/?auth=login');
    }
  };

  const getFullName = () => {
    const first = String(userData?.first_name ?? userData?.firstname ?? '').trim();
    const last = String(userData?.last_name ?? userData?.lastname ?? '').trim();
    return `${first} ${last}`.trim() || 'Account';
  };

  const getInitials = () => {
    const first = String(userData?.first_name ?? userData?.firstname ?? '').trim();
    const last = String(userData?.last_name ?? userData?.lastname ?? '').trim();
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first[0].toUpperCase();
    return 'U';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="text-white font-bold text-lg hover:text-blue-400 transition-colors"
          >
            Jussimatic
          </button>

          {/* Right-side items */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Projects dropdown — hidden on mobile */}
            <div className="relative hidden sm:block" ref={projectsMenuRef}>
              <button
                onClick={() => setShowProjects((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                {t.landing.projectsCta}
                <svg
                  className={`w-3 h-3 transition-transform ${showProjects ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showProjects && (
                <div className="absolute top-full right-0 mt-1 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => { navigate('/chat'); setShowProjects(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {t.landing.chatCta}
                  </button>
                  <button
                    onClick={() => { navigate('/demo/browse-jobs'); setShowProjects(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {t.landing.jobsCta}
                  </button>
                  <button
                    onClick={() => { navigate('/demo/ecommerce/products'); setShowProjects(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    {t.landing.ecommerceCta}
                  </button>
                  <button
                    onClick={() => { navigate('/demo/ai-cv-review'); setShowProjects(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4 text-orange-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t.landing.aiCvCta}
                  </button>
                </div>
              )}
            </div>

            {/* Language selector */}
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
              className="rounded-lg border border-white/20 bg-gray-800/90 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Select language"
            >
              <option value="en">EN</option>
              <option value="fi">FI</option>
            </select>

            {/* User menu or login button */}
            {isLoggedIn ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="flex items-center gap-1.5 text-sm text-white rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors border border-white/20"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {getInitials()}
                  </div>
                  <span className="hidden sm:block max-w-30 truncate">{getFullName()}</span>
                  <svg
                    className={`w-3 h-3 shrink-0 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-1 w-60 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-gray-700">
                      <div className="font-medium text-white text-sm">{getFullName()}</div>
                      {userData?.email && (
                        <div className="text-xs text-white/60 mt-0.5 truncate">{String(userData.email)}</div>
                      )}
                    </div>

                    <div className="py-1">
                      {/* Settings — TBA */}
                      <button
                        disabled
                        title="Coming soon"
                        className="w-full text-left px-4 py-2 text-sm text-white/40 flex items-center gap-2 cursor-not-allowed"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                        <span className="ml-auto text-xs">(TBA)</span>
                      </button>

                      {/* Resumes */}
                      <button
                        onClick={() => { navigate('/profile/resumes'); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Resumes
                      </button>
                    </div>

                    <div className="border-t border-gray-700 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-1.5 text-sm text-white px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
