import { useEffect, useState } from 'react';
import { useLocaleNavigate } from '../hooks/useLocaleNavigate';
import { getCategories, deleteCategory } from '../api/blogsApi';
import type { BlogCategory } from '../api/blogsApi';
import { getMe } from '../api/authApi';
import { getRoleAccess } from '../utils/authUtils';
import { BlogCategoryModal } from '../modals/BlogCategoryModal';
import Header from '../components/Header';
import AuthModal from '../modals/AuthModal';
import Breadcrumb from '../components/Breadcrumb';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';

function BlogCategoriesView() {
  const navigate = useLocaleNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminBlogs;
  const tDash = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminDashboard;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingCategory, setEditingCategory] = useState<BlogCategory | null | undefined>(undefined);
  const [categoryToDelete, setCategoryToDelete] = useState<BlogCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) { navigate('/', { state: { adminAccessDenied: true } }); return; }
        const me = await getMe();
        const access = getRoleAccess(me);
        if (!access.isAdmin) { navigate('/', { state: { adminAccessDenied: true } }); return; }
      } catch {
        navigate('/', { state: { adminAccessDenied: true } });
      }
    };
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCategories();
      setCategories(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async () => {
    if (!categoryToDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errDelete);
      setCategoryToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaved = () => {
    setEditingCategory(undefined);
    loadCategories();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header onLoginClick={() => setIsModalOpen(true)} />

      <main className="container mx-auto px-4 pt-24 md:pt-32 pb-8">
        <div className="mx-auto max-w-4xl mb-8">
          <Breadcrumb
            items={[{ label: tDash.title, onClick: () => navigate('/admin') }]}
            current={t.categoryListTitle}
          />
        </div>
        {loading && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
            <p className="mt-4 text-gray-300">{t.loading}</p>
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto max-w-2xl rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 mb-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {!loading && (
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t.categoryListTitle}</h2>
              <button
                onClick={() => setEditingCategory(null)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t.btnAddCategory}
              </button>
            </div>

            {!loading && !error && categories.length === 0 && (
              <div className="text-center py-10 text-gray-400">{t.empty}</div>
            )}

            {categories.length > 0 && (
              <div className="flex flex-col gap-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800 px-5 py-4 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{category.name}</span>
                        <span className="text-xs font-mono text-gray-400">/{category.slug}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCategory(category)}
                        className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-300 hover:bg-gray-700/60 transition-colors"
                      >
                        {t.btnEdit}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryToDelete(category)}
                        className="rounded-lg border border-red-500/60 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-600/20 transition-colors"
                      >
                        {t.btnDelete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {editingCategory !== undefined && (
        <BlogCategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(undefined)}
          onSaved={handleSaved}
        />
      )}

      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-lg" role="dialog" aria-modal="true">
            <h2 className="text-xl font-semibold text-white">{t.deleteTitle}</h2>
            <p className="mt-3 text-sm text-gray-300">
              {t.deleteConfirm.replace('{title}', categoryToDelete.name)}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { if (!deleting) setCategoryToDelete(null); }}
                disabled={deleting}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? t.btnDeleting : t.btnConfirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialTab="login" />
    </div>
  );
}

export default BlogCategoriesView;
