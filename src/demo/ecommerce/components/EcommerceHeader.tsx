import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ECOMMERCE_MAIN_TITLE } from '../../../constants';
import { getMe, logoutUser } from '../../../api/authApi';
import { getRoleAccess } from '../../../utils/authUtils';
import AuthModal from '../../../AuthModal';
import { getStoredLanguage, setStoredLanguage, translations, type Language } from '../../../i18n';

type NavKey = 'products' | 'cart' | 'my-orders' | 'my-profile' | 'admin-dashboard';

interface EcommerceHeaderProps {
  title: string;
  backTo: string;
  backLabel: string;
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
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [roleAccess, setRoleAccess] = useState<ReturnType<typeof getRoleAccess> | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());

  useEffect(() => {
    setStoredLanguage(language);
    window.dispatchEvent(new CustomEvent('jussimatic-language-change', { detail: language }));
  }, [language]);

  const t = translations[language].ecommerce;
  const isProductsActive = activeNav === 'products';
  const isCartActive = activeNav === 'cart';
  const isOrdersActive = activeNav === 'my-orders';
  const isProfileActive = activeNav === 'my-profile';
  const isAdminActive = activeNav === 'admin-dashboard';

  const navButtonClass =
    'rounded-lg border border-gray-600 px-2.5 py-1.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 text-white hover:bg-gray-700 transition-colors';
  const activeButtonClass = 'rounded-lg bg-blue-600 px-2.5 py-1.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 text-white cursor-default';
  const navWideButtonClass =
    'rounded-lg border border-gray-600 px-2.5 py-1.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 text-sm 2xl:text-base font-semibold text-gray-200 hover:bg-gray-700 transition-colors';
  const activeWideButtonClass = 'rounded-lg bg-blue-600 px-2.5 py-1.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 text-sm 2xl:text-base font-semibold text-white cursor-default';

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
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <h1 className="flex min-w-0 items-baseline gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-bold truncate">{ECOMMERCE_MAIN_TITLE}</span>
                <span className="text-base sm:text-xl font-semibold text-gray-300 truncate">/ {title}</span>
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="md:hidden rounded-lg border border-gray-600 p-2 text-white hover:bg-gray-700 transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="ecommerce-mobile-menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="hidden md:flex shrink-0 items-center gap-1.5 lg:gap-2.5 2xl:gap-4">
              {actions && <div className="flex items-center gap-1.5 lg:gap-2.5 2xl:gap-4">{actions}</div>}

              {/* Products */}
              <button
                onClick={() => navigateAndCloseMenu('/demo/ecommerce/products')}
                className={isProductsActive ? activeButtonClass : navButtonClass}
                aria-label={t.browseProducts}
                disabled={isProductsActive}
                aria-current={isProductsActive ? 'page' : undefined}
              >
                <div className="flex items-center gap-1.5 2xl:gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 2xl:h-6 2xl:w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="hidden 2xl:inline text-sm 2xl:text-base font-semibold">{t.browseProducts}</span>
                </div>
              </button>

              {/* Cart */}
              <button
                onClick={() => navigateAndCloseMenu('/demo/ecommerce/cart')}
                className={isCartActive ? `relative ${activeButtonClass}` : `relative ${navButtonClass}`}
                aria-label={t.cart}
                disabled={isCartActive}
                aria-current={isCartActive ? 'page' : undefined}
              >
                <div className="flex items-center gap-1.5 2xl:gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 2xl:h-6 2xl:w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="hidden 2xl:inline text-sm 2xl:text-base font-semibold">{t.cart}</span>
                  {cartCount > 0 && (
                    <span className="bg-red-500 rounded-full px-1.5 py-0.5 text-xs font-bold leading-none">
                      {cartCount}
                    </span>
                  )}
                </div>
              </button>

              {/* My Orders */}
              {canShowOrdersNav && (
                <button
                  onClick={() => navigateAndCloseMenu('/demo/ecommerce/my-orders')}
                  className={isOrdersActive ? activeWideButtonClass : navWideButtonClass}
                  disabled={isOrdersActive}
                  aria-current={isOrdersActive ? 'page' : undefined}
                >
                  <div className="flex items-center gap-1.5 2xl:gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 2xl:h-6 2xl:w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="hidden 2xl:inline">{t.myOrders}</span>
                  </div>
                </button>
              )}

              {/* My Profile */}
              {isLoggedIn && (
                <button
                  onClick={() => navigateAndCloseMenu('/demo/ecommerce/my-profile')}
                  className={isProfileActive ? activeWideButtonClass : navWideButtonClass}
                  disabled={isProfileActive}
                  aria-current={isProfileActive ? 'page' : undefined}
                >
                  <div className="flex items-center gap-1.5 2xl:gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 2xl:h-6 2xl:w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="hidden 2xl:inline">{t.myProfile}</span>
                  </div>
                </button>
              )}

              {/* Admin */}
              {canShowAdminNav && (
                <button
                  onClick={() => navigateAndCloseMenu('/demo/ecommerce/admin')}
                  className={isAdminActive ? activeWideButtonClass : navWideButtonClass}
                  disabled={isAdminActive}
                  aria-current={isAdminActive ? 'page' : undefined}
                >
                  <div className="flex items-center gap-1.5 2xl:gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 2xl:h-6 2xl:w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="hidden 2xl:inline">{t.adminDashboard}</span>
                  </div>
                </button>
              )}

              {/* Logout / Login + Register */}
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 2xl:gap-2 rounded-lg bg-red-600 px-2.5 py-1.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 text-sm 2xl:text-base font-semibold text-white hover:bg-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 2xl:h-6 2xl:w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden lg:inline">{t.logout}</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setAuthInitialTab('login');
                      setIsAuthModalOpen(true);
                    }}
                    className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 text-sm 2xl:text-base font-semibold text-white hover:bg-white/20"
                  >
                    {t.login}
                  </button>
                  <button
                    onClick={() => {
                      setAuthInitialTab('register');
                      setIsAuthModalOpen(true);
                    }}
                    className="rounded-lg bg-green-600 px-2.5 py-1.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 text-sm 2xl:text-base font-semibold text-white hover:bg-green-700"
                  >
                    {t.register}
                  </button>
                </>
              )}

              <label htmlFor="ecommerce-language" className="sr-only">{t.languageLabel}</label>
              <select
                id="ecommerce-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-gray-900 text-white border border-gray-700 rounded-lg px-2 py-1 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 text-xs lg:text-sm 2xl:text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="en">English</option>
                <option value="fi">Finnish</option>
              </select>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div id="ecommerce-mobile-menu" className="mt-4 space-y-2 rounded-xl border border-gray-700 bg-gray-900/80 p-3 md:hidden">
              {actions && <div className="flex flex-wrap items-center gap-2 pb-1">{actions}</div>}
              <button
                onClick={() => navigateAndCloseMenu('/demo/ecommerce/products')}
                className={`w-full text-left ${isProductsActive ? activeButtonClass : navButtonClass}`}
                aria-label={t.browseProducts}
                disabled={isProductsActive}
                aria-current={isProductsActive ? 'page' : undefined}
              >
                {t.browseProducts}
              </button>
              <button
                onClick={() => navigateAndCloseMenu('/demo/ecommerce/cart')}
                className={`relative w-full text-left ${isCartActive ? activeButtonClass : navButtonClass}`}
                aria-label={t.cart}
                disabled={isCartActive}
                aria-current={isCartActive ? 'page' : undefined}
              >
                {t.cart}{cartCount > 0 ? ` (${cartCount})` : ''}
              </button>
              {canShowOrdersNav && (
                <button
                  onClick={() => navigateAndCloseMenu('/demo/ecommerce/my-orders')}
                  className={`w-full text-left ${isOrdersActive ? activeWideButtonClass : navWideButtonClass}`}
                  disabled={isOrdersActive}
                  aria-current={isOrdersActive ? 'page' : undefined}
                >
                  {t.myOrders}
                </button>
              )}
              {isLoggedIn && (
                <button
                  onClick={() => navigateAndCloseMenu('/demo/ecommerce/my-profile')}
                  className={`w-full text-left ${isProfileActive ? activeWideButtonClass : navWideButtonClass}`}
                  disabled={isProfileActive}
                  aria-current={isProfileActive ? 'page' : undefined}
                >
                  {t.myProfile}
                </button>
              )}
              {canShowAdminNav && (
                <button
                  onClick={() => navigateAndCloseMenu('/demo/ecommerce/admin')}
                  className={`w-full text-left ${isAdminActive ? activeWideButtonClass : navWideButtonClass}`}
                  disabled={isAdminActive}
                  aria-current={isAdminActive ? 'page' : undefined}
                >
                  {t.adminDashboard}
                </button>
              )}
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="w-full text-left rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {t.logout}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setAuthInitialTab('login');
                      setIsAuthModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
                  >
                    {t.login}
                  </button>
                  <button
                    onClick={() => {
                      setAuthInitialTab('register');
                      setIsAuthModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    {t.register}
                  </button>
                </div>
              )}
              <div className="pt-1">
                <label htmlFor="ecommerce-language-mobile" className="sr-only">{t.languageLabel}</label>
                <select
                  id="ecommerce-language-mobile"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="en">English</option>
                  <option value="fi">Finnish</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </header>

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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authInitialTab}
      />
    </>
  );
}

export default EcommerceHeader;
