import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '../../../hooks/useLocaleNavigate';
import { useEffect, useState } from 'react';
import { ECOMMERCE_MAIN_TITLE } from '../../../constants';

function isLowEndDevice(): boolean {
  if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2) return true;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === 'number' && mem <= 2) return true;
  return false;
}
import { getMe, logoutUser } from '../../../api/authApi';
import { getRoleAccess } from '../../../utils/authUtils';
import AuthModal from '../../../modals/AuthModal';
import { getStoredLanguage, translations, getPathWithoutLanguage, type Language } from '../../../i18n';
import LanguageSelect from '../../../components/LanguageSelect';

type NavKey = 'products' | 'cart' | 'my-orders' | 'my-profile' | 'admin-dashboard';

interface EcommerceHeaderProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  cartCount?: number;
  activeNav?: NavKey;
  actions?: ReactNode;
}

function EcommerceHeader({
  title,
  backTo,
  backLabel,
  cartCount = 0,
  activeNav,
  actions,
}: EcommerceHeaderProps) {
  const rawNavigate = useNavigate();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [roleAccess, setRoleAccess] = useState<ReturnType<typeof getRoleAccess> | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const [animatedBg, setAnimatedBg] = useState(() => {
    const stored = localStorage.getItem('jussimatic-animated-bg');
    if (stored !== null) return stored !== 'false';
    return !isLowEndDevice();
  });
  const [lightTheme, setLightTheme] = useState(() => localStorage.getItem('jussimatic-theme') === 'light');

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    const currentPath = getPathWithoutLanguage(location.pathname);
    const newPath = lang === 'en' ? `/en${currentPath}` : currentPath;
    rawNavigate(newPath);
    window.dispatchEvent(new CustomEvent<Language>('jussimatic-language-change', { detail: lang }));
  };

  useEffect(() => {
    const handler = (event: Event) => setLanguage((event as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    if (animatedBg) {
      document.documentElement.classList.remove('no-bg-animation');
    } else {
      document.documentElement.classList.add('no-bg-animation');
    }
    localStorage.setItem('jussimatic-animated-bg', String(animatedBg));
  }, [animatedBg]);

  useEffect(() => {
    if (lightTheme) {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    localStorage.setItem('jussimatic-theme', lightTheme ? 'light' : 'dark');
  }, [lightTheme]);

  const t = translations[language].ecommerce;
  const isProductsActive = activeNav === 'products';
  const isCartActive = activeNav === 'cart';
  const isOrdersActive = activeNav === 'my-orders';
  const isProfileActive = activeNav === 'my-profile';
  const isAdminActive = activeNav === 'admin-dashboard';

  const navBtnCls = 'rounded-lg border border-gray-600 px-2.5 py-1.5 lg:px-3 lg:py-2 text-white hover:bg-gray-700 transition-colors';
  const activeBtnCls = 'rounded-lg bg-blue-600 px-2.5 py-1.5 lg:px-3 lg:py-2 text-white cursor-default';
  const navWideCls = 'rounded-lg border border-gray-600 px-2.5 py-1.5 lg:px-3 lg:py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700 transition-colors';
  const activeWideCls = 'rounded-lg bg-blue-600 px-2.5 py-1.5 lg:px-3 lg:py-2 text-sm font-semibold text-white cursor-default';

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoggedIn(false);
      setRoleAccess(null);
      return;
    }

    setIsLoggedIn(true);
    getMe()
      .then((me) => setRoleAccess(getRoleAccess(me)))
      .catch((error) => {
        console.warn('Failed to load user roles:', error);
        setIsLoggedIn(false);
        setRoleAccess(null);
      });
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      await logoutUser(token);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setRoleAccess(null);
      setIsMobileMenuOpen(false);
      window.location.reload();
    }
  };

  const navigateAndCloseMenu = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const canShowOrdersNav = Boolean(isLoggedIn && roleAccess && !roleAccess.isCustomer);
  const canShowAdminNav = Boolean(isLoggedIn && roleAccess && (roleAccess.isAdmin || roleAccess.isVendor));

  return (
    <>
      <header className="bg-gray-900/95 backdrop-blur-sm border-b border-white/10 shadow-lg sticky top-0 z-10">
        <div className="absolute inset-0 bg-linear-to-r from-blue-600/10 via-transparent to-purple-600/8 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-blue-500/40 to-transparent pointer-events-none" />
        <div className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => navigate('/')} aria-label="Go to homepage" className="cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 shrink-0">
                <img src="/jussimatic_logo.webp" alt="" className="h-10 md:h-20" fetchPriority='high' />
              </button>
              <h1 className="flex min-w-0 items-baseline gap-2 flex-wrap">
                <span className="text-lg font-bold text-white truncate">{ECOMMERCE_MAIN_TITLE}</span>
                <span className="text-sm font-medium text-white/50 truncate">/ {title}</span>
              </h1>
            </div>

            {/* Mobile/tablet header controls — hidden on desktop */}
            <div className="lg:hidden flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="rounded-lg border border-gray-600 p-2 text-white hover:bg-gray-700 transition-colors"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="ecommerce-mobile-menu"
              >
                {isMobileMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>

            {/* Desktop nav bar */}
            <div className="hidden lg:flex shrink-0 items-center gap-1.5 lg:gap-2.5">
              {actions && <div className="flex items-center gap-1.5 lg:gap-2.5">{actions}</div>}

              <LanguageSelect value={language} onChange={handleLanguageChange} className="px-2 py-1 lg:px-3 lg:py-1.5 text-xs lg:text-sm" />

              {/* Light / Dark theme toggle */}
              <button
                onClick={() => setLightTheme((v) => !v)}
                aria-label={lightTheme ? 'Switch to dark theme' : 'Switch to light theme'}
                title={lightTheme ? 'Switch to dark theme' : 'Switch to light theme'}
                aria-pressed={lightTheme}
                className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-300 ${lightTheme
                  ? 'border-yellow-400/60 bg-yellow-400/15 text-yellow-500 hover:bg-yellow-400/25 hover:border-yellow-400/80'
                  : 'border-white/15 bg-white/5 text-white/30 hover:bg-white/10 hover:border-white/30 hover:text-white/60'
                }`}
              >
                {lightTheme ? (
                  <>
                    <span className="absolute inset-0 rounded-lg bg-yellow-300/20 blur-sm animate-pulse" />
                    <svg className="relative w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 15a5 5 0 100-10 5 5 0 000 10zm7.071-12.071a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM21 11h1a1 1 0 110 2h-1a1 1 0 110-2zm-2.929 7.071a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM12 20a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-7.071-2.929a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM3 11H2a1 1 0 100 2h1a1 1 0 100-2zm1.929-7.071a1 1 0 011.414 0l.707.707A1 1 0 015.636 6.05l-.707-.707a1 1 0 010-1.414z" />
                    </svg>
                  </>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4" />
                    <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                )}
              </button>

              {/* Animated background toggle */}
              <button
                onClick={() => setAnimatedBg((v) => !v)}
                aria-label={animatedBg ? 'Disable animations' : 'Enable animations'}
                title={animatedBg ? 'Disable animations' : 'Enable animations'}
                aria-pressed={animatedBg}
                className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-300 ${animatedBg
                  ? lightTheme
                    ? 'border-yellow-400/60 bg-yellow-400/15 text-yellow-500 hover:bg-yellow-400/25 hover:border-yellow-400/80'
                    : 'border-amber-400/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400/70'
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

              {/* Products */}
              <button onClick={() => navigateAndCloseMenu('/demo/ecommerce/products')} disabled={isProductsActive} aria-current={isProductsActive ? 'page' : undefined} aria-label={t.browseProducts} className={isProductsActive ? activeBtnCls : navBtnCls}>
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  <span className="hidden 2xl:inline text-sm font-semibold">{t.browseProducts}</span>
                </div>
              </button>

              {/* Cart */}
              <button onClick={() => navigateAndCloseMenu('/demo/ecommerce/cart')} disabled={isCartActive} aria-current={isCartActive ? 'page' : undefined} aria-label={t.cart} className={`relative ${isCartActive ? activeBtnCls : navBtnCls}`}>
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <span className="hidden 2xl:inline text-sm font-semibold">{t.cart}</span>
                  {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold leading-none text-white">{cartCount}</span>}
                </div>
              </button>

              {/* My Orders */}
              {canShowOrdersNav && (
                <button onClick={() => navigateAndCloseMenu('/demo/ecommerce/my-orders')} disabled={isOrdersActive} aria-current={isOrdersActive ? 'page' : undefined} className={isOrdersActive ? activeWideCls : navWideCls}>
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    <span className="hidden 2xl:inline">{t.myOrders}</span>
                  </div>
                </button>
              )}

              {/* My Profile */}
              {isLoggedIn && (
                <button onClick={() => navigateAndCloseMenu('/demo/ecommerce/my-profile')} disabled={isProfileActive} aria-current={isProfileActive ? 'page' : undefined} className={isProfileActive ? activeWideCls : navWideCls}>
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <span className="hidden 2xl:inline">{t.myProfile}</span>
                  </div>
                </button>
              )}

              {/* Admin */}
              {canShowAdminNav && (
                <button onClick={() => navigateAndCloseMenu('/admin')} disabled={isAdminActive} aria-current={isAdminActive ? 'page' : undefined} className={isAdminActive ? activeWideCls : navWideCls}>
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="hidden 2xl:inline">{t.adminDashboard}</span>
                  </div>
                </button>
              )}

              {/* Logout / Login + Register */}
              {isLoggedIn ? (
                <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 lg:px-3 lg:py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  <span className="hidden 2xl:inline">{t.logout}</span>
                </button>
              ) : (
                <>
                  <button onClick={() => { setAuthInitialTab('login'); setIsAuthModalOpen(true); }} className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 lg:px-3 lg:py-2 text-sm font-semibold text-white hover:bg-white/20">{t.login}</button>
                  <button onClick={() => { setAuthInitialTab('register'); setIsAuthModalOpen(true); }} className="rounded-lg bg-green-600 px-2.5 py-1.5 lg:px-3 lg:py-2 text-sm font-semibold text-white hover:bg-green-700">{t.register}</button>
                </>
              )}
            </div>
          </div>

          {isMobileMenuOpen && (
            <div id="ecommerce-mobile-menu" className="mt-3 lg:hidden">
              <div className="rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-sm shadow-2xl">

                {/* Page actions (e.g. search bar passed via actions prop) */}
                {actions && (
                  <div className="px-4 py-3 border-b border-white/10">
                    <div className="flex flex-wrap items-center gap-2">{actions}</div>
                  </div>
                )}

                {/* Main navigation grid */}
                <div className="p-3 flex flex-col gap-1">
                  {/* Products */}
                  <button
                    onClick={() => navigateAndCloseMenu('/demo/ecommerce/products')}
                    disabled={isProductsActive}
                    aria-current={isProductsActive ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors text-left ${isProductsActive ? 'bg-blue-600 text-white cursor-default' : 'bg-white/5 text-gray-200 hover:bg-white/10'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    {t.browseProducts}
                  </button>

                  {/* Cart */}
                  <button
                    onClick={() => navigateAndCloseMenu('/demo/ecommerce/cart')}
                    disabled={isCartActive}
                    aria-current={isCartActive ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors text-left ${isCartActive ? 'bg-blue-600 text-white cursor-default' : 'bg-white/5 text-gray-200 hover:bg-white/10'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="flex-1">{t.cart}</span>
                    {cartCount > 0 && (
                      <span className="ml-auto bg-red-500 rounded-full px-1.5 py-0.5 text-xs font-bold leading-none">{cartCount}</span>
                    )}
                  </button>

                  {/* My Orders */}
                  {canShowOrdersNav && (
                    <button
                      onClick={() => navigateAndCloseMenu('/demo/ecommerce/my-orders')}
                      disabled={isOrdersActive}
                      aria-current={isOrdersActive ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors text-left ${isOrdersActive ? 'bg-blue-600 text-white cursor-default' : 'bg-white/5 text-gray-200 hover:bg-white/10'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {t.myOrders}
                    </button>
                  )}

                  {/* My Profile */}
                  {isLoggedIn && (
                    <button
                      onClick={() => navigateAndCloseMenu('/demo/ecommerce/my-profile')}
                      disabled={isProfileActive}
                      aria-current={isProfileActive ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors text-left ${isProfileActive ? 'bg-blue-600 text-white cursor-default' : 'bg-white/5 text-gray-200 hover:bg-white/10'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {t.myProfile}
                    </button>
                  )}

                  {/* Admin */}
                  {canShowAdminNav && (
                    <button
                      onClick={() => navigateAndCloseMenu('/admin')}
                      disabled={isAdminActive}
                      aria-current={isAdminActive ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors text-left ${isAdminActive ? 'bg-blue-600 text-white cursor-default' : 'bg-white/5 text-gray-200 hover:bg-white/10'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {t.adminDashboard}
                    </button>
                  )}
                </div>

                {/* Bottom bar: auth action */}
                <div className="px-3 pb-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <div className="flex items-center gap-2">
                    <LanguageSelect value={language} onChange={handleLanguageChange} dropdownAlign="left" />
                    {/* Light / Dark theme toggle — mobile */}
                    <button
                      onClick={() => setLightTheme((v) => !v)}
                      aria-label={lightTheme ? 'Switch to dark theme' : 'Switch to light theme'}
                      title={lightTheme ? 'Switch to dark theme' : 'Switch to light theme'}
                      aria-pressed={lightTheme}
                      className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-300 ${lightTheme
                        ? 'border-yellow-400/60 bg-yellow-400/15 text-yellow-500 hover:bg-yellow-400/25 hover:border-yellow-400/80'
                        : 'border-white/15 bg-white/5 text-white/30 hover:bg-white/10 hover:border-white/30 hover:text-white/60'
                      }`}
                    >
                      {lightTheme ? (
                        <>
                          <span className="absolute inset-0 rounded-lg bg-yellow-300/20 blur-sm animate-pulse" />
                          <svg className="relative w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 15a5 5 0 100-10 5 5 0 000 10zm7.071-12.071a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM21 11h1a1 1 0 110 2h-1a1 1 0 110-2zm-2.929 7.071a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM12 20a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-7.071-2.929a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM3 11H2a1 1 0 100 2h1a1 1 0 100-2zm1.929-7.071a1 1 0 011.414 0l.707.707A1 1 0 015.636 6.05l-.707-.707a1 1 0 010-1.414z" />
                          </svg>
                        </>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="4" />
                          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                        </svg>
                      )}
                    </button>
                    {/* Animated background toggle — mobile */}
                    <button
                      onClick={() => setAnimatedBg((v) => !v)}
                      aria-label={animatedBg ? 'Disable animations' : 'Enable animations'}
                      title={animatedBg ? 'Disable animations' : 'Enable animations'}
                      aria-pressed={animatedBg}
                      className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-300 ${animatedBg
                        ? lightTheme
                          ? 'border-yellow-400/60 bg-yellow-400/15 text-yellow-500 hover:bg-yellow-400/25 hover:border-yellow-400/80'
                          : 'border-amber-400/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400/70'
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
                  </div>
                  {isLoggedIn ? (
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {t.logout}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setAuthInitialTab('login'); setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }}
                        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
                      >
                        {t.login}
                      </button>
                      <button
                        onClick={() => { setAuthInitialTab('register'); setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }}
                        className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        {t.register}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {backTo && backLabel && (
        <div className="container mx-auto px-4 pt-4">
          <button
            onClick={() => navigate(backTo)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            aria-label={backLabel}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </button>
        </div>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authInitialTab}
      />
    </>
  );
}

export default EcommerceHeader;
