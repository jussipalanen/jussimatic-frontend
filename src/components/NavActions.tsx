import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getMe, logoutUser } from '../api/authApi';
import { getRoleAccess } from '../utils/authUtils';
import { DEFAULT_LANGUAGE, getStoredLanguage, setStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';
import LanguageSelect from './LanguageSelect';
import UserEditModal from '../modals/UserEditModal';
import { getProjects } from '../api/projectsApi';
import type { Project } from '../api/projectsApi';

/**
 * Heuristic: flag a device as low-end when it has very few CPU threads
 * or little RAM. Both APIs are best-effort — they may be absent or
 * intentionally limited by the browser, so we only disable animations
 * when we have a positive low-end signal, never on absence of data.
 */
function isLowEndDevice(): boolean {
  // ≤2 logical CPU cores is a strong indicator of a budget device
  if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2) return true;
  // navigator.deviceMemory is non-standard but supported in Chromium browsers
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === 'number' && mem <= 2) return true;
  return false;
}

interface NavUserData {
  user_id?: number;
  first_name?: string;
  firstname?: string;
  last_name?: string;
  lastname?: string;
  email?: string;
  username?: string;
  fullname?: string;
  role?: string;
  user?: {
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface NavActionsProps {
  /** Controlled language value. If omitted, NavActions manages language state from localStorage. */
  language?: Language;
  /** Called (in addition to internal storage + event dispatch) when the user changes language. */
  onLanguageChange?: (lang: Language) => void;
  /** Override the default login navigation (/?auth=login). */
  onLoginClick?: () => void;
}

export default function NavActions({ language: controlledLanguage, onLanguageChange, onLoginClick }: NavActionsProps) {
  const navigate = useNavigate();
  const [internalLanguage, setInternalLanguage] = useState<Language>(() => controlledLanguage ?? getStoredLanguage());
  const language = controlledLanguage ?? internalLanguage;
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<NavUserData | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [portfolioProjects, setPortfolioProjects] = useState<Project[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [animatedBg, setAnimatedBg] = useState(() => {
    const stored = localStorage.getItem('jussimatic-animated-bg');
    // Respect an explicit user preference stored from a previous visit
    if (stored !== null) return stored !== 'false';
    // First visit: disable animations automatically on low-end devices
    return !isLowEndDevice();
  });
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMobileMenuRef = useRef<HTMLDivElement>(null);
  const projectsMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token);
    if (token) {
      getMe()
        .then((data) => setUserData(data as NavUserData))
        .catch(() => { });
    }
  }, []);

  useEffect(() => {
    getProjects(1, 50, 'sort_order', 'asc', language)
      .then((res) => setPortfolioProjects(res.data.filter((p) => p.visibility === 'show')))
      .catch(() => {});
  }, [language]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node) &&
        !userMobileMenuRef.current?.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
      if (projectsMenuRef.current && !projectsMenuRef.current.contains(e.target as Node)) {
        setShowProjects(false);
      }
      const inMobileMenu = mobileMenuRef.current?.contains(e.target as Node);
      const inMobileButton = mobileMenuButtonRef.current?.contains(e.target as Node);
      if (!inMobileMenu && !inMobileButton) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (animatedBg) {
      document.documentElement.classList.remove('no-bg-animation');
    } else {
      document.documentElement.classList.add('no-bg-animation');
    }
    localStorage.setItem('jussimatic-animated-bg', String(animatedBg));
  }, [animatedBg]);

  const handleLanguageChange = (lang: Language) => {
    setInternalLanguage(lang);
    setStoredLanguage(lang);
    window.dispatchEvent(new CustomEvent('jussimatic-language-change', { detail: lang }));
    onLanguageChange?.(lang);
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
    setShowMobileMenu(false);
    if (onLoginClick) onLoginClick();
    else navigate('/?auth=login');
  };

  const getFullName = () => {
    const first = String(userData?.user?.first_name ?? userData?.first_name ?? userData?.firstname ?? '').trim();
    const last = String(userData?.user?.last_name ?? userData?.last_name ?? userData?.lastname ?? '').trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    const name = String(userData?.user?.name ?? '').trim();
    return name || 'Account';
  };

  const getInitials = () => {
    const first = String(userData?.user?.first_name ?? userData?.first_name ?? userData?.firstname ?? '').trim();
    const last = String(userData?.user?.last_name ?? userData?.last_name ?? userData?.lastname ?? '').trim();
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first[0].toUpperCase();
    const name = String(userData?.user?.name ?? '').trim();
    if (name) return name[0].toUpperCase();
    return 'U';
  };

  const getEmail = () => String(userData?.user?.email ?? userData?.email ?? '').trim();

  const isAdmin = isLoggedIn && userData != null && getRoleAccess(userData).isAdmin;

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu button — visible only below sm */}
        <button
          ref={mobileMenuButtonRef}
          onClick={() => setShowMobileMenu((v) => !v)}
          className={`sm:hidden flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-300 ${showMobileMenu ? 'text-white bg-white/15 border-white/30' : 'text-white/60 bg-white/5 border-white/15 hover:text-white hover:bg-white/10 hover:border-white/30'}`}
          aria-label={t.landing.menu}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Desktop projects dropdown */}
        <div className="relative hidden sm:block" ref={projectsMenuRef}>
          <button
            onClick={() => setShowProjects((v) => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${showProjects ? 'text-white bg-white/15' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {t.landing.menu}
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
            <div className="absolute top-full right-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden max-h-[80vh] overflow-y-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40 px-4 pt-3 pb-1.5">{t.landing.portfolioSection}</p>
              {portfolioProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => { if (project.live_url) { window.open(project.live_url, '_blank', 'noopener,noreferrer'); } setShowProjects(false); }}
                  disabled={!project.live_url}
                  className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-default"
                >
                  <svg className="w-4 h-4 shrink-0 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="truncate">{project.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Animated background toggle */}
        <button
          onClick={() => setAnimatedBg((v) => !v)}
          aria-label={animatedBg ? t.landing.animatedBgDisable : t.landing.animatedBgEnable}
          title={animatedBg ? t.landing.animatedBgDisable : t.landing.animatedBgEnable}
          aria-pressed={animatedBg}
          className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-300 ${animatedBg
            ? 'border-amber-400/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400/70'
            : 'border-white/15 bg-white/5 text-white/30 hover:bg-white/10 hover:border-white/30 hover:text-white/60'
            }`}
        >
          {animatedBg ? (
            <>
              <span className="absolute inset-0 rounded-lg bg-amber-400/20 blur-sm animate-pulse" />
              <svg className="relative w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* Admin link — visible for admin/vendor roles only */}
        {isLoggedIn && userData && (() => { const access = getRoleAccess(userData); return access.isAdmin || access.isVendor; })() && (
          <button
            onClick={() => navigate('/admin')}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Admin dashboard"
            title="Admin dashboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}

        {/* Language selector */}
        <LanguageSelect value={language} onChange={handleLanguageChange} />

        {/* User menu or login button */}
        {isLoggedIn ? (
          <>
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
                  className={`hidden sm:block w-3 h-3 shrink-0 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Desktop dropdown — absolute positioning is not affected by backdrop-filter */}
              {showUserMenu && (
                <div className="hidden sm:flex flex-col absolute top-full right-0 mt-1 w-60 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <div className="font-medium text-white text-sm">{getFullName()}</div>
                    {getEmail() && (
                      <div className="text-xs text-white/60 mt-0.5 truncate">{getEmail()}</div>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setShowUserMenu(false); setShowEditModal(true); }}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {t.landing.editProfile}
                    </button>

                    <button
                      onClick={() => { navigate('/profile/resumes'); setShowUserMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t.landing.myResumes}
                    </button>

                    <button
                      onClick={() => { navigate('/profile/invoices'); setShowUserMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                      </svg>
                      {t.landing.myInvoices}
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => { navigate('/admin'); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {t.landing.admin}
                      </button>
                    )}
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
            {/* Mobile full-screen overlay — portaled to body to escape nav's backdrop-filter containing block */}
            {showUserMenu && createPortal(
              <div
                ref={userMobileMenuRef}
                className="fixed inset-0 z-50 sm:hidden flex flex-col bg-gray-900 overflow-y-auto"
              >
                <div className="px-4 border-b border-gray-700">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium text-white">{getFullName()}</div>
                      {getEmail() && (
                        <div className="text-xs text-white/60 mt-0.5">{getEmail()}</div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center justify-center w-9 h-9 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label={t.landing.close}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setShowUserMenu(false); setShowEditModal(true); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {t.landing.editProfile}
                  </button>
                  <button
                    onClick={() => { navigate('/profile/resumes'); setShowUserMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t.landing.myResumes}
                  </button>
                  <button
                    onClick={() => { navigate('/profile/invoices'); setShowUserMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    </svg>
                    {t.landing.myInvoices}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { navigate('/admin'); setShowUserMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {t.landing.admin}
                    </button>
                  )}
                </div>
                <div className="border-t border-gray-700 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t.landing.logout}
                  </button>
                </div>
              </div>,
              document.body
            )}
          </>
        ) : (
          <button
            onClick={handleLoginClick}
            className="flex items-center gap-1.5 text-sm text-white px-2 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">{t.auth.tabLogin}</span>
          </button>
        )}
      </div>

      {/* Mobile demos panel — portaled to body to escape nav's backdrop-filter containing block */}
      {showMobileMenu && createPortal(
        <div
          ref={mobileMenuRef}
          className="fixed inset-x-0 top-14 bottom-0 z-40 sm:hidden overflow-y-auto border-t border-white/10 bg-gray-900"
        >
          <div className="max-w-7xl mx-auto px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40 px-2 pt-1 pb-2">{t.landing.portfolioSection}</p>
            <div className="grid grid-cols-2 gap-1">
              {portfolioProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => { if (project.live_url) { window.open(project.live_url, '_blank', 'noopener,noreferrer'); } setShowMobileMenu(false); }}
                  disabled={!project.live_url}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-default"
                >
                  <svg className="w-4 h-4 shrink-0 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="truncate">{project.title}</span>
                </button>
              ))}
            </div>
            {/* Animated background toggle — mobile panel */}
            <div className="border-t border-white/10 mt-2 pt-2">
              <button
                onClick={() => setAnimatedBg((v) => !v)}
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  {t.landing.animatedBgLabel}
                </span>
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${animatedBg ? 'bg-blue-600' : 'bg-white/20'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${animatedBg ? 'translate-x-5' : 'translate-x-1'}`} />
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showEditModal && userData?.user_id != null && (
        <UserEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          userId={userData.user_id}
          initialData={{
            username: String(userData.username ?? (userData.user as Record<string, unknown>)?.username ?? ''),
            fullname: String(userData.fullname ?? userData.user?.name ?? ''),
            first_name: String(userData.first_name ?? userData.firstname ?? userData.user?.first_name ?? ''),
            last_name: String(userData.last_name ?? userData.lastname ?? userData.user?.last_name ?? ''),
            email: String(userData.email ?? userData.user?.email ?? ''),
            role: String(userData.role ?? ''),
          }}
          onSuccess={() => {
            getMe()
              .then((data) => setUserData(data as NavUserData))
              .catch(() => { });
          }}
          showRoleSelect={false}
        />
      )}
    </>
  );
}
