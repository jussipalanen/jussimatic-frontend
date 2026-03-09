import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ECOMMERCE_MAIN_TITLE } from './constants';
import { getMe, logoutUser } from './api/authApi';
import { getRoleAccess } from './utils/authUtils';
import AuthModal from './AuthModal';

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
  const isProductsActive = activeNav === 'products';
  const isCartActive = activeNav === 'cart';
  const isOrdersActive = activeNav === 'my-orders';
  const isProfileActive = activeNav === 'my-profile';
  const isAdminActive = activeNav === 'admin-dashboard';

  const navButtonClass =
    'rounded-lg border border-gray-600 px-3 py-2 text-white hover:bg-gray-700 transition-colors';
  const activeButtonClass = 'rounded-lg bg-blue-600 px-3 py-2 text-white cursor-default';
  const navWideButtonClass =
    'rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700 transition-colors';
  const activeWideButtonClass = 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white cursor-default';

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
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <button
                onClick={() => navigate(backTo)}
                className="text-sm sm:text-base text-white hover:text-gray-300 transition-colors shrink-0"
                aria-label={backLabel}
              >
                ← Back
              </button>
              <h1 className="flex min-w-0 items-baseline gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-bold truncate">{ECOMMERCE_MAIN_TITLE}</span>
                <span className="text-base sm:text-xl font-semibold text-gray-300 truncate">/ {title}</span>
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="lg:hidden rounded-lg border border-gray-600 p-2 text-white hover:bg-gray-700 transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="ecommerce-mobile-menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="hidden lg:flex items-center gap-3">
              {actions && <div className="flex items-center gap-3">{actions}</div>}
              <button
                onClick={() => navigateAndCloseMenu('/demo/ecommerce/products')}
                className={isProductsActive ? activeButtonClass : navButtonClass}
                aria-label="Browse products"
                disabled={isProductsActive}
                aria-current={isProductsActive ? 'page' : undefined}
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="text-sm font-semibold">Browse Products</span>
                </div>
              </button>
              <button
                onClick={() => navigateAndCloseMenu('/demo/ecommerce/cart')}
                className={isCartActive ? `relative ${activeButtonClass}` : `relative ${navButtonClass}`}
                aria-label="View cart"
                disabled={isCartActive}
                aria-current={isCartActive ? 'page' : undefined}
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm font-semibold">Cart</span>
                  {cartCount > 0 && (
                    <span className="ml-1 bg-red-500 rounded-full px-2 py-0.5 text-xs font-bold">
                      {cartCount}
                    </span>
                  )}
                </div>
              </button>
              {canShowOrdersNav && (
                <button
                  onClick={() => navigateAndCloseMenu('/demo/ecommerce/my-orders')}
                  className={isOrdersActive ? activeWideButtonClass : navWideButtonClass}
                  disabled={isOrdersActive}
                  aria-current={isOrdersActive ? 'page' : undefined}
                >
                  My Orders
                </button>
              )}
              {isLoggedIn && (
                <button
                  onClick={() => navigateAndCloseMenu('/demo/ecommerce/my-profile')}
                  className={isProfileActive ? activeWideButtonClass : navWideButtonClass}
                  disabled={isProfileActive}
                  aria-current={isProfileActive ? 'page' : undefined}
                >
                  My Profile
                </button>
              )}
              {canShowAdminNav && (
                <button
                  onClick={() => navigateAndCloseMenu('/demo/ecommerce/admin')}
                  className={isAdminActive ? activeWideButtonClass : navWideButtonClass}
                  disabled={isAdminActive}
                  aria-current={isAdminActive ? 'page' : undefined}
                >
                  Admin Dashboard
                </button>
              )}
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Logout
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setAuthInitialTab('login');
                      setIsAuthModalOpen(true);
                    }}
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setAuthInitialTab('register');
                      setIsAuthModalOpen(true);
                    }}
                    className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>

          {isMobileMenuOpen && (
            <div id="ecommerce-mobile-menu" className="mt-4 space-y-2 rounded-xl border border-gray-700 bg-gray-900/80 p-3 lg:hidden">
              {actions && <div className="flex flex-wrap items-center gap-2 pb-1">{actions}</div>}
              <button
                onClick={() => navigateAndCloseMenu('/demo/ecommerce/products')}
                className={`w-full text-left ${isProductsActive ? activeButtonClass : navButtonClass}`}
                aria-label="Browse products"
                disabled={isProductsActive}
                aria-current={isProductsActive ? 'page' : undefined}
              >
                Browse Products
              </button>
              <button
                onClick={() => navigateAndCloseMenu('/demo/ecommerce/cart')}
                className={`relative w-full text-left ${isCartActive ? activeButtonClass : navButtonClass}`}
                aria-label="View cart"
                disabled={isCartActive}
                aria-current={isCartActive ? 'page' : undefined}
              >
                Cart {cartCount > 0 ? `(${cartCount})` : ''}
              </button>
              {canShowOrdersNav && (
                <button
                  onClick={() => navigateAndCloseMenu('/demo/ecommerce/my-orders')}
                  className={`w-full text-left ${isOrdersActive ? activeWideButtonClass : navWideButtonClass}`}
                  disabled={isOrdersActive}
                  aria-current={isOrdersActive ? 'page' : undefined}
                >
                  My Orders
                </button>
              )}
              {isLoggedIn && (
                <button
                  onClick={() => navigateAndCloseMenu('/demo/ecommerce/my-profile')}
                  className={`w-full text-left ${isProfileActive ? activeWideButtonClass : navWideButtonClass}`}
                  disabled={isProfileActive}
                  aria-current={isProfileActive ? 'page' : undefined}
                >
                  My Profile
                </button>
              )}
              {canShowAdminNav && (
                <button
                  onClick={() => navigateAndCloseMenu('/demo/ecommerce/admin')}
                  className={`w-full text-left ${isAdminActive ? activeWideButtonClass : navWideButtonClass}`}
                  disabled={isAdminActive}
                  aria-current={isAdminActive ? 'page' : undefined}
                >
                  Admin Dashboard
                </button>
              )}
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="w-full text-left rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Logout
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
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setAuthInitialTab('register');
                      setIsAuthModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authInitialTab}
      />
    </>
  );
}

export default EcommerceHeader;
