import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, logoutUser } from '../api/authApi';
import { DEFAULT_LANGUAGE, getStoredLanguage, setStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';
import LanguageSelect from './LanguageSelect';
import UserEditModal from '../demo/ecommerce/components/UserEditModal';
import { DEMOS } from '../demos';

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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const projectsMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

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
      const inMobileMenu = mobileMenuRef.current?.contains(e.target as Node);
      const inMobileButton = mobileMenuButtonRef.current?.contains(e.target as Node);
      if (!inMobileMenu && !inMobileButton) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile demos button — visible only below sm */}
        <button
          ref={mobileMenuButtonRef}
          onClick={() => setShowMobileMenu((v) => !v)}
          className={`sm:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${showMobileMenu ? 'text-white bg-white/15' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
          aria-label="Projects & demos"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>

        {/* Desktop projects dropdown */}
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
              {DEMOS.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => { navigate(demo.path); setShowProjects(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                  <svg className={`w-4 h-4 shrink-0 ${demo.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={demo.iconPath} />
                  </svg>
                  {t.landing[demo.labelKey]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language selector */}
        <LanguageSelect value={language} onChange={handleLanguageChange} />

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
            {t.auth.tabLogin}
          </button>
        )}
      </div>

      {/* Mobile demos panel — fixed just below the header bar (top-14 = h-14 header height) */}
      {showMobileMenu && (
        <div
          ref={mobileMenuRef}
          className="fixed inset-x-0 top-14 z-40 sm:hidden border-t border-white/10 bg-gray-900/98"
        >
          <div className="max-w-7xl mx-auto px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40 px-2 pt-1 pb-2">{t.landing.projectsCta}</p>
            <div className="grid grid-cols-2 gap-1">
              {DEMOS.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => { navigate(demo.path); setShowMobileMenu(false); }}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  <svg className={`w-4 h-4 shrink-0 ${demo.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={demo.iconPath} />
                  </svg>
                  {t.landing[demo.labelKey]}
                </button>
              ))}
            </div>
          </div>
        </div>
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
              .catch(() => {});
          }}
          showRoleSelect={false}
        />
      )}
    </>
  );
}
