import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe } from '../api/authApi';
import { getRoleAccess } from '../utils/authUtils';
import Header from '../components/Header';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';

function AdminDashboardView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminDashboard;

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    document.title = `${t.title} - Jussimatic`;
  }, [language, t.title]);

  useEffect(() => {
    const loadAuth = async () => {
      setLoading(true);

      try {
        const token = localStorage.getItem('auth_token');

        if (!token) {
          navigate('/', { state: { adminAccessDenied: true } });
          return;
        }

        const user = await getMe();
        const access = getRoleAccess(user);

        if (!access.isAdmin) {
          navigate('/', { state: { adminAccessDenied: true } });
          return;
        }
      } catch (error) {
        console.error('Authentication failed:', error);
        navigate('/', { state: { adminAccessDenied: true } });
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
  }, [navigate, t.authErrLogin, t.goToProducts]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header
        title={t.title}
        backLabel={t.backToMain}
        onBack={() => navigate('/')}
      />

      <main className="container mx-auto px-4 py-10">
        {loading && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-300">{t.loading}</p>
          </div>
        )}

        {!loading && (
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-700 bg-gray-800 p-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold">{t.heading}</h2>
              <p className="text-gray-300">{t.subtitle}</p>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/admin/orders')}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900/60 p-6 text-center hover:border-blue-500/60 hover:bg-blue-600/10 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-blue-400 group-hover:text-blue-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-base font-semibold text-white">{t.ordersTitle}</span>
                <span className="text-sm text-gray-400">{t.ordersDesc}</span>
              </button>
              <button
                onClick={() => navigate('/admin/users')}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900/60 p-6 text-center hover:border-purple-500/60 hover:bg-purple-600/10 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-purple-400 group-hover:text-purple-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-base font-semibold text-white">{t.usersTitle}</span>
                <span className="text-sm text-gray-400">{t.usersDesc}</span>
              </button>
              <button
                onClick={() => navigate('/admin/invoices')}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900/60 p-6 text-center hover:border-green-500/60 hover:bg-green-600/10 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-green-400 group-hover:text-green-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-base font-semibold text-white">{t.invoicesTitle}</span>
                <span className="text-sm text-gray-400">{t.invoicesDesc}</span>
              </button>
              <button
                onClick={() => navigate('/admin/blogs')}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900/60 p-6 text-center hover:border-purple-500/60 hover:bg-purple-600/10 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-purple-400 group-hover:text-purple-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2zM9 12h6M9 16h4" />
                </svg>
                <span className="text-base font-semibold text-white">{t.blogsTitle}</span>
                <span className="text-sm text-gray-400">{t.blogsDesc}</span>
              </button>
              <button
                onClick={() => navigate('/admin/blog-categories')}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900/60 p-6 text-center hover:border-orange-500/60 hover:bg-orange-600/10 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-orange-400 group-hover:text-orange-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-base font-semibold text-white">{t.blogCategoriesTitle}</span>
                <span className="text-sm text-gray-400">{t.blogCategoriesDesc}</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboardView;
