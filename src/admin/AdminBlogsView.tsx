import { useEffect, useState } from 'react';
import { useLocaleNavigate } from '../hooks/useLocaleNavigate';
import { getAllBlogs, deleteBlog } from '../api/blogsApi';
import type { Blog } from '../api/blogsApi';
import { getMe } from '../api/authApi';
import { getRoleAccess } from '../utils/authUtils';
import Header from '../components/Header';

import { Pagination } from '../components/Pagination';
import { BlogFormModal } from '../modals/BlogFormModal';
import { DEFAULT_LANGUAGE, getStoredLanguage, getLocalizedValue, translations } from '../i18n';
import type { Language } from '../i18n';
import { buildImageUrl } from '../constants';

const ITEMS_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number): number[] {
  const pages: number[] = [];
  const max = 5;
  if (totalPages <= max) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
    for (let i = 1; i <= 4; i++) pages.push(i);
    pages.push(-1);
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1);
    pages.push(-1);
    for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push(-1);
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push(-1);
    pages.push(totalPages);
  }
  return pages;
}

function AdminBlogsView() {
  const navigate = useLocaleNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminBlogs;
  const tDash = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminDashboard;

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  // Delete confirmation
  const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null);
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

  const loadBlogs = async (page: number = currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllBlogs(page, ITEMS_PER_PAGE, 'created_at', 'desc', language);
      setBlogs(res.data);
      setTotalPages(res.last_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, language]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openCreateForm = () => { setEditingBlog(null); setShowForm(true); };
  const openEditForm = (blog: Blog) => { setEditingBlog(blog); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingBlog(null); };

  const handleSaved = async () => {
    closeForm();
    await loadBlogs(editingBlog ? currentPage : 1);
    if (!editingBlog) setCurrentPage(1);
  };

  const handleDeleteClick = (blog: Blog) => setBlogToDelete(blog);
  const handleDeleteCancel = () => { if (!deleting) setBlogToDelete(null); };

  const handleDeleteConfirm = async () => {
    if (!blogToDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteBlog(blogToDelete.id);
      setBlogToDelete(null);
      const newTotal = blogs.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newTotal);
      await loadBlogs(newTotal);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errDelete);
      setBlogToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (str: string) =>
    new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(str));

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header
        title={t.title}
        backLabel={tDash.title}
        onBack={() => navigate('/admin')}
      />

      <main className="container mx-auto px-4 py-8">
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
            {/* Header row */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t.title}</h2>
              <button
                onClick={openCreateForm}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t.btnAdd}
              </button>
            </div>

            {/* Empty state */}
            {!loading && !error && blogs.length === 0 && (
              <div className="text-center py-10 text-gray-400">{t.empty}</div>
            )}

            {/* Blog list */}
            {blogs.length > 0 && (
              <div className="flex flex-col gap-3">
                {blogs.map((blog) => (
                  <div
                    key={blog.id}
                    className="flex items-start gap-4 rounded-xl border border-gray-700 bg-gray-800 px-5 py-4 hover:border-gray-600 transition-colors"
                  >
                    {blog.featured_image && (
                      <img
                        src={buildImageUrl(blog.featured_image)}
                        alt={getLocalizedValue(blog.title, language)}
                        className="shrink-0 w-16 h-16 rounded-lg object-cover border border-gray-700"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-white truncate">{getLocalizedValue(blog.title, language)}</span>
                        <span
                          className={`text-xs rounded-full px-2 py-0.5 font-medium ${blog.visibility
                            ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                            : 'bg-gray-700/50 text-gray-400 border border-gray-600/40'
                            }`}
                        >
                          {blog.visibility ? t.labelPublished : t.labelDraft}
                        </span>
                        {blog.category && (
                          <span className="text-xs rounded-full px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30">
                            {blog.category.name}
                          </span>
                        )}
                      </div>
                      {blog.excerpt && (
                        <p className="text-sm text-gray-400 truncate">{getLocalizedValue(blog.excerpt, language)}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                        {blog.author && (
                          <span>{blog.author.first_name} {blog.author.last_name}</span>
                        )}
                        <span>{formatDate(blog.created_at)}</span>
                        <span className="font-mono">#{blog.id}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/blogs/${typeof blog.slug === 'string' ? blog.slug : (blog.slug?.[language] ?? blog.slug?.en ?? blog.id)}`)}
                        className="rounded-lg border border-blue-500/60 px-3 py-1.5 text-sm font-semibold text-blue-300 hover:bg-blue-600/20 transition-colors"
                      >
                        {t.btnView}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditForm(blog)}
                        className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-300 hover:bg-gray-700/60 transition-colors"
                      >
                        {t.btnEdit}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(blog)}
                        className="rounded-lg border border-red-500/60 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-600/20 transition-colors"
                      >
                        {t.btnDelete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageNumbers={getPageNumbers(currentPage, totalPages)}
              previousLabel={t.previousPage}
              nextLabel={t.nextPage}
            />
          </div>
        )}
      </main>

      {showForm && (
        <BlogFormModal
          blog={editingBlog}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirmation modal */}
      {blogToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-lg" role="dialog" aria-modal="true">
            <h2 className="text-xl font-semibold text-white">{t.deleteTitle}</h2>
            <p className="mt-3 text-sm text-gray-300">
              {t.deleteConfirm.replace('{title}', getLocalizedValue(blogToDelete.title, language))}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? t.btnDeleting : t.btnConfirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBlogsView;
