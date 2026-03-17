import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBlogs, deleteBlog } from '../api/blogsApi';
import type { Blog, BlogsResponse } from '../api/blogsApi';
import { getMe } from '../api/authApi';
import { getRoleAccess } from '../utils/authUtils';
import { Pagination } from '../components/Pagination';
import { BlogFormModal } from '../components/BlogFormModal';
import NavBar from '../components/NavBar';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';

const PER_PAGE_OPTIONS = [10, 20, 30, 40, 50];

const STORAGE_BASE_URL = (import.meta.env.VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

function buildImageUrl(path: string) {
  return `${STORAGE_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

function getPageNumbers(currentPage: number, totalPages: number): number[] {
  const pages: number[] = [];
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
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

function BlogsView() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [meta, setMeta] = useState<Pick<BlogsResponse, 'last_page' | 'current_page' | 'per_page' | 'total'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isAdmin, setIsAdmin] = useState(false);

  // Edit modal
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  // Delete confirmation
  const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      setLanguage((event as CustomEvent<Language>).detail);
    };
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    getMe()
      .then((me) => setIsAdmin(getRoleAccess(me).isAdmin))
      .catch(() => {});
  }, []);

  const loadBlogs = async (page: number = currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBlogs(page, perPage);
      setBlogs(res.data);
      setMeta({ last_page: res.last_page, current_page: res.current_page, per_page: res.per_page, total: res.total });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.blog.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getBlogs(currentPage, perPage);
        if (!active) return;
        setBlogs(res.data);
        setMeta({ last_page: res.last_page, current_page: res.current_page, per_page: res.per_page, total: res.total });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : t.blog.errorLoading);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [currentPage, perPage, t.blog.errorLoading]);

  const totalPages = meta?.last_page ?? 1;
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePerPageChange = (value: number) => {
    setPerPage(value);
    setCurrentPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!blogToDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteBlog(blogToDelete.id);
      setBlogToDelete(null);
      const newPage = blogs.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newPage);
      await loadBlogs(newPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.blog.errorLoading);
      setBlogToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(dateStr));
  };

  const tBlog = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminBlogs;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col pt-14">
      <NavBar />

      <main className="grow p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <h1 className="text-2xl font-bold">{t.blog.title}</h1>
            <div className="flex items-center gap-2 text-sm">
              <label className="text-gray-400">{t.blog.perPage}:</label>
              <select
                value={perPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
              >
                {PER_PAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {loading && (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-400">{t.blog.loading}</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && blogs.length === 0 && (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-400">{t.blog.empty}</p>
            </div>
          )}

          {!loading && !error && blogs.length > 0 && (
            <div className="space-y-4">
              {blogs.map((blog) => (
                <div
                  key={blog.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
                >
                  {blog.featured_image && (
                    <button
                      onClick={() => navigate(`/blogs/${blog.id}`)}
                      className="w-full cursor-pointer"
                    >
                      <img
                        src={buildImageUrl(blog.featured_image)}
                        alt={blog.title}
                        className="w-full h-48 object-cover"
                      />
                    </button>
                  )}
                  <div className="p-5">
                    <button
                      onClick={() => navigate(`/blogs/${blog.id}`)}
                      className="w-full text-left hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <h2 className="text-lg font-semibold text-white mb-2">{blog.title}</h2>
                      {blog.excerpt && (
                        <p className="text-gray-400 text-sm mb-3 line-clamp-3">{blog.excerpt}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{formatDate(blog.created_at)}</span>
                        <span className="text-blue-400 text-sm ml-auto">{t.blog.readMore} →</span>
                      </div>
                    </button>

                    {isAdmin && (
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700">
                        <button
                          type="button"
                          onClick={() => setEditingBlog(blog)}
                          className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-300 hover:bg-gray-700/60 transition-colors"
                        >
                          {tBlog.btnEdit}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBlogToDelete(blog)}
                          className="rounded-lg border border-red-500/60 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-600/20 transition-colors"
                        >
                          {tBlog.btnDelete}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && meta && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageNumbers={pageNumbers}
              previousLabel={t.blog.previousPage}
              nextLabel={t.blog.nextPage}
            />
          )}
        </div>
      </main>

      {editingBlog && (
        <BlogFormModal
          blog={editingBlog}
          onClose={() => setEditingBlog(null)}
          onSaved={() => { setEditingBlog(null); loadBlogs(currentPage); }}
        />
      )}

      {/* Delete confirmation modal */}
      {blogToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-lg" role="dialog" aria-modal="true">
            <h2 className="text-xl font-semibold text-white">{tBlog.deleteTitle}</h2>
            <p className="mt-3 text-sm text-gray-300">
              {tBlog.deleteConfirm.replace('{title}', blogToDelete.title)}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { if (!deleting) setBlogToDelete(null); }}
                disabled={deleting}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
              >
                {tBlog.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? tBlog.btnDeleting : tBlog.btnConfirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlogsView;
