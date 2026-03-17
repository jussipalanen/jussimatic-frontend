import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createBlog, updateBlog } from '../api/blogsApi';
import type { Blog, BlogFormData } from '../api/blogsApi';
import { RichTextEditor } from './RichTextEditor';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';

const STORAGE_BASE_URL = (import.meta.env.VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

function buildImageUrl(path: string) {
  return `${STORAGE_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

interface BlogFormState {
  title: string;
  excerpt: string;
  content: string;
  featured_image: string;
  featured_image_file?: File;
  tags: string;
  blog_category_id?: number;
  visibility: boolean;
}

const EMPTY_FORM: BlogFormState = {
  title: '',
  excerpt: '',
  content: '',
  featured_image: '',
  featured_image_file: undefined,
  tags: '',
  blog_category_id: undefined,
  visibility: true,
};

interface BlogFormModalProps {
  /** Pass a Blog to edit, null to create */
  blog: Blog | null;
  onClose: () => void;
  onSaved: () => void;
}

export function BlogFormModal({ blog, onClose, onSaved }: BlogFormModalProps) {
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminBlogs;

  const [form, setForm] = useState<BlogFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (blog) {
      setForm({
        title: blog.title,
        excerpt: blog.excerpt ?? '',
        content: blog.content ?? '',
        featured_image: blog.featured_image ?? '',
        featured_image_file: undefined,
        tags: blog.tags ? blog.tags.join(', ') : '',
        blog_category_id: blog.blog_category_id,
        visibility: blog.visibility,
      });
      setImagePreview(blog.featured_image ? buildImageUrl(blog.featured_image) : null);
    } else {
      setForm(EMPTY_FORM);
      setImagePreview(null);
    }
    setFormError(null);
  }, [blog]);

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, featured_image_file: file }));
    const objectUrl = URL.createObjectURL(file);
    setImagePreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return objectUrl;
    });
  };

  const handleImageRemove = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setForm((f) => ({ ...f, featured_image_file: undefined, featured_image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
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
        featured_image_file: form.featured_image_file,
        tags: rawTags ? rawTags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined,
        blog_category_id: form.blog_category_id,
        visibility: form.visibility,
      };
      if (blog) {
        await updateBlog(blog.id, payload);
      } else {
        await createBlog(payload);
      }
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t.errSave);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none';
  const labelCls = 'block text-sm font-medium text-gray-300 mb-1';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 py-8 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {blog ? t.editTitle : t.createTitle}
          </h2>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
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
              value={form.excerpt}
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

          {/* Featured image */}
          <div>
            <label className={labelCls}>{t.labelFeatureImage}</label>
            <label
              className={`flex items-center gap-3 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm cursor-pointer hover:border-blue-500 transition-colors ${submitting ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
              </svg>
              <span className="text-gray-400 truncate">
                {form.featured_image_file ? form.featured_image_file.name : t.placeholderFeatureImage}
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

          {/* Category ID + Tags */}
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
                value={form.tags}
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
              onClick={close}
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
              {submitting ? t.btnSaving : blog ? t.btnUpdate : t.btnCreate}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
