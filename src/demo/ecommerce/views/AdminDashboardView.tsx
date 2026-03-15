import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe } from '../../../api/authApi';
import { getRoleAccess, PERMISSION_MESSAGE } from '../../../utils/authUtils';
import { getCart } from '../../../utils/cartUtils';
import EcommerceHeader from '../components/EcommerceHeader';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../../../i18n';
import type { Language } from '../../../i18n';

function AdminDashboardView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminDashboard;

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    const loadAuth = async () => {
      setLoading(true);
      setAuthError(null);

      try {
        const token = localStorage.getItem('auth_token');

        if (!token) {
          setAuthError(t.authErrLogin);
          setLoading(false);
          return;
        }

        const user = await getMe();
        const access = getRoleAccess(user);

        if (!access.isAdmin && !access.isVendor) {
          setAuthError(PERMISSION_MESSAGE);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Authentication failed:', error);
        setAuthError(t.authErrLogin);
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
  }, [navigate]);

  const cartCount = getCart().reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <EcommerceHeader
        title={t.title}
        backTo="/demo/ecommerce/products"
        backLabel={translations[language].ecommerce.browseProducts}
        cartCount={cartCount}
        activeNav="admin-dashboard"
      />

      <main className="container mx-auto px-4 py-10">
        {authError && (
          <div className="mx-auto max-w-2xl rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-6 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-16 w-16 text-yellow-500 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <p className="text-lg text-yellow-300 mb-4">{authError}</p>
            {authError !== PERMISSION_MESSAGE && (
              <button
                onClick={() => navigate('/demo/ecommerce/products')}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {t.goToProducts}
              </button>
            )}
          </div>
        )}

        {loading && !authError && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-300">{t.loading}</p>
          </div>
        )}

        {!loading && !authError && (
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-700 bg-gray-800 p-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold">{t.heading}</h2>
              <p className="text-gray-300">{t.subtitle}</p>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/demo/ecommerce/admin/orders')}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900/60 p-6 text-center hover:border-blue-500/60 hover:bg-blue-600/10 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-blue-400 group-hover:text-blue-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-base font-semibold text-white">{t.ordersTitle}</span>
                <span className="text-sm text-gray-400">{t.ordersDesc}</span>
              </button>
              <button
                onClick={() => navigate('/demo/ecommerce/admin/users')}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900/60 p-6 text-center hover:border-purple-500/60 hover:bg-purple-600/10 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-purple-400 group-hover:text-purple-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-base font-semibold text-white">{t.usersTitle}</span>
                <span className="text-sm text-gray-400">{t.usersDesc}</span>
              </button>
              <button
                onClick={() => navigate('/demo/ecommerce/admin/invoices')}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900/60 p-6 text-center hover:border-green-500/60 hover:bg-green-600/10 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-green-400 group-hover:text-green-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-base font-semibold text-white">{t.invoicesTitle}</span>
                <span className="text-sm text-gray-400">{t.invoicesDesc}</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboardView;
