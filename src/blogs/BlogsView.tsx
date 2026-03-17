import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBlogs } from '../api/blogsApi';
import type { Blog, BlogsResponse } from '../api/blogsApi';
import { Pagination } from '../components/Pagination';
import NavBar from '../components/NavBar';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';

const PER_PAGE_OPTIONS = [10, 20, 30, 40, 50];

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

  useEffect(() => {
    const handler = (event: Event) => {
      setLanguage((event as CustomEvent<Language>).detail);
    };
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(dateStr));
  };

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
                <button
                  key={blog.id}
                  onClick={() => navigate(`/blogs/${blog.id}`)}
                  className="w-full text-left bg-gray-800 hover:bg-gray-700/80 border border-gray-700 hover:border-gray-600 rounded-lg p-5 transition-colors cursor-pointer"
                >
                  <h2 className="text-lg font-semibold text-white mb-2">{blog.title}</h2>
                  {blog.excerpt && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-3">{blog.excerpt}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {formatDate(blog.created_at)}
                    </span>
                    <span className="text-blue-400 text-sm ml-auto">{t.blog.readMore} →</span>
                  </div>
                </button>
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
    </div>
  );
}

export default BlogsView;
