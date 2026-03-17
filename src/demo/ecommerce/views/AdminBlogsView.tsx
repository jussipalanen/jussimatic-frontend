import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBlogs, createBlog, updateBlog, deleteBlog } from '../../../api/blogsApi';
import type { Blog, BlogFormData } from '../../../api/blogsApi';
import { getMe } from '../../../api/authApi';
import { getRoleAccess, PERMISSION_MESSAGE } from '../../../utils/authUtils';
import { getCart } from '../../../utils/cartUtils';
import EcommerceHeader from '../components/EcommerceHeader';
import { Pagination } from '../../../components/Pagination';
import { RichTextEditor } from '../../../components/RichTextEditor';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../../../i18n';
import type { Language } from '../../../i18n';

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

interface BlogFormState {
  title: string;
  excerpt: string;
  content: string;
  feature_image: string;
  feature_image_file?: File;
  tags: string;
  blog_category_id?: number;
  visibility: boolean;
}

const EMPTY_FORM: BlogFormState = {
  title: '',
  excerpt: '',
  content: '',
  feature_image: '',
  feature_image_file: undefined,
  tags: '',
  blog_category_id: undefined,
  visibility: true,
};

function AdminBlogsView() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminBlogs;
  const tDash = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminDashboard;

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [form, setForm] = useState<BlogFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null);
  const [deleting, setDeleting] = useState(false);

  const cartCount = getCart().reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) { setAuthError(t.authErrLogin); setLoading(false); return; }
        const me = await getMe();
        const access = getRoleAccess(me);
        if (!access.isAdmin && !access.isVendor) { setAuthError(PERMISSION_MESSAGE); setLoading(false); return; }
      } catch {
        setAuthError(t.authErrLogin);
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loadBlogs = async (page: number = currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBlogs(page, ITEMS_PER_PAGE);
      setBlogs(res.data);
      setTotalPages(res.last_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authError) return;
    loadBlogs(currentPage);
  }, [currentPage, authError]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openCreateForm = () => {
    setEditingBlog(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (blog: Blog) => {
    setEditingBlog(blog);
    setForm({
      title: blog.title,
      excerpt: blog.excerpt ?? '',
      content: blog.content ?? '',
      feature_image: blog.feature_image ?? '',
      feature_image_file: undefined,
      tags: blog.tags ? blog.tags.join(', ') : '',
      blog_category_id: blog.blog_category_id,
      visibility: blog.visibility,
    });
    setImagePreview(blog.feature_image ?? null);
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setShowForm(false);
    setEditingBlog(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setFormError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, feature_image_file: file }));
    const objectUrl = URL.createObjectURL(file);
    setImagePreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return objectUrl;
    });
  };

  const handleImageRemove = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setForm((f) => ({ ...f, feature_image_file: undefined, feature_image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError(t.errTitleRequired); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const rawTags = form.tags.trim();
      const payload: BlogFormData = {
        title: form.title.trim(),
        content: form.content.trim(),
        excerpt: form.excerpt.trim() || undefined,
        feature_image_file: form.feature_image_file,
        tags: rawTags ? rawTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        blog_category_id: form.blog_category_id,
        visibility: form.visibility,
      };
      if (editingBlog) {
        await updateBlog(editingBlog.id, payload);
      } else {
        await createBlog(payload);
      }
      closeForm();
      await loadBlogs(editingBlog ? currentPage : 1);
      if (!editingBlog) setCurrentPage(1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t.errSave);
    } finally {
      setSubmitting(false);
    }
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

  const inputCls = 'w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none';
  const labelCls = 'block text-sm font-medium text-gray-300 mb-1';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <EcommerceHeader
        title={t.title}
        backTo="/admin"
        backLabel={tDash.title}
        cartCount={cartCount}
        activeNav="admin-dashboard"
      />

      <main className="container mx-auto px-4 py-8">
        {/* Auth error */}
        {authError && (
          <div className="mx-auto max-w-2xl rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-6 text-center">
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
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
            <p className="mt-4 text-gray-300">{t.loading}</p>
          </div>
        )}

        {error && !loading && !authError && (
          <div className="mx-auto max-w-2xl rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 mb-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {!loading && !authError && (
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
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-white truncate">{blog.title}</span>
                        <span
                          className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                            blog.visibility
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
                        <p className="text-sm text-gray-400 truncate">{blog.excerpt}</p>
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
                        onClick={() => navigate(`/blogs/${blog.id}`)}
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

      {/* Blog form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 py-8 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
        >
          <div className="w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {editingBlog ? t.editTitle : t.createTitle}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 flex flex-col gap-5">
              {/* Title */}
              <div>
                <label className={labelCls}>{t.labelTitle} <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={inputCls}
                  placeholder={t.placeholderTitle}
                  required
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className={labelCls}>{t.labelExcerpt}</label>
                <textarea
                  value={form.excerpt ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  className={`${inputCls} resize-y min-h-[80px]`}
                  placeholder={t.placeholderExcerpt}
                />
              </div>

              {/* Content */}
              <div>
                <label className={labelCls}>{t.labelContent}</label>
                <RichTextEditor
                  value={form.content}
                  onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                  placeholder={t.placeholderContent}
                  disabled={submitting}
                />
              </div>

              {/* Feature image */}
              <div>
                <label className={labelCls}>{t.labelFeatureImage}</label>
                <label
                  className={`flex items-center gap-3 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm cursor-pointer hover:border-blue-500 transition-colors ${submitting ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
                  </svg>
                  <span className="text-gray-400 truncate">
                    {form.feature_image_file ? form.feature_image_file.name : t.placeholderFeatureImage}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={submitting}
                    onChange={handleImageChange}
                  />
                </label>
                {imagePreview && (
                  <div className="mt-2 relative w-full">
                    <img
                      src={imagePreview}
                      alt="Feature image preview"
                      className="w-full max-h-48 object-cover rounded-lg border border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={handleImageRemove}
                      disabled={submitting}
                      className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-black/60 text-white hover:bg-red-600/80 transition-colors disabled:opacity-50"
                      title="Remove image"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Category ID + Tags row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t.labelCategoryId}</label>
                  <input
                    type="number"
                    min={1}
                    value={form.blog_category_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, blog_category_id: e.target.value ? Number(e.target.value) : undefined }))}
                    className={inputCls}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className={labelCls}>{t.labelTags}</label>
                  <input
                    type="text"
                    value={form.tags ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    className={inputCls}
                    placeholder={t.placeholderTags}
                  />
                </div>
              </div>

              {/* Visibility toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.visibility}
                  onClick={() => setForm((f) => ({ ...f, visibility: !f.visibility }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                    form.visibility ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      form.visibility ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-300">
                  {form.visibility ? t.labelPublished : t.labelDraft}
                </span>
              </div>

              {formError && (
                <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3">
                  <p className="text-sm text-red-300">{formError}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {submitting ? t.btnSaving : editingBlog ? t.btnUpdate : t.btnCreate}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {blogToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-lg" role="dialog" aria-modal="true">
            <h2 className="text-xl font-semibold text-white">{t.deleteTitle}</h2>
            <p className="mt-3 text-sm text-gray-300">
              {t.deleteConfirm.replace('{title}', blogToDelete.title)}
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
