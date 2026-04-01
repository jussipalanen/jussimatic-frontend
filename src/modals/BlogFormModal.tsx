import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createBlog, updateBlog, getCategories } from '../api/blogsApi';
import type { Blog, BlogFormData, BlogCategory, TranslatedField } from '../api/blogsApi';
import { RichTextEditor } from '../components/RichTextEditor';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';
import { buildImageUrl } from '../constants';

interface BlogFormState {
  title: TranslatedField;
  slug: TranslatedField;
  excerpt: TranslatedField;
  content: TranslatedField;
  featured_image: string;
  featured_image_file?: File;
  remove_feature_image: boolean;
  tags: string[];
  tagInput: string;
  blog_category_id?: number;
  visibility: boolean;
}

const EMPTY_FORM: BlogFormState = {
  title: { en: '' },
  slug: { en: '' },
  excerpt: { en: '' },
  content: { en: '' },
  featured_image: '',
  featured_image_file: undefined,
  remove_feature_image: false,
  tags: [],
  tagInput: '',
  blog_category_id: undefined,
  visibility: true,
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface BlogFormModalProps {
  /** Pass a Blog to edit, null to create */
  blog: Blog | null;
  onClose: () => void;
  onSaved: () => void;
}

export function BlogFormModal({ blog, onClose, onSaved }: BlogFormModalProps) {
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const [editLang, setEditLang] = useState<Language>('en');
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminBlogs;

  const [form, setForm] = useState<BlogFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<Record<Language, boolean>>({ en: false, fi: false });
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  // Fetch categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCategoryDropdown]);

  // Populate form when editing
  useEffect(() => {
    if (blog) {
      setForm({
        title: blog.title,
        slug: blog.slug ?? { en: '' },
        excerpt: blog.excerpt ?? { en: '' },
        content: blog.content ?? { en: '' },
        featured_image: blog.featured_image ?? '',
        featured_image_file: undefined,
        remove_feature_image: false,
        tags: blog.tags ? [...blog.tags] : [],
        tagInput: '',
        blog_category_id: blog.blog_category_id,
        visibility: blog.visibility,
      });
      setImagePreview(blog.featured_image ? buildImageUrl(blog.featured_image) : null);
      setSlugManuallyEdited({ en: false, fi: false });
    } else {
      setForm(EMPTY_FORM);
      setImagePreview(null);
      setSlugManuallyEdited({ en: false, fi: false });
    }
    setFormError(null);
  }, [blog]);

  // Auto-generate slug when title changes if slug hasn't been manually edited
  useEffect(() => {
    if (!slugManuallyEdited[editLang] && form.title[editLang]?.trim()) {
      setForm((f) => ({
        ...f,
        slug: { ...f.slug, [editLang]: generateSlug(f.title[editLang] ?? '') },
      }));
    }
  }, [form.title[editLang], slugManuallyEdited, editLang]);

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, featured_image_file: file, remove_feature_image: false }));
    const objectUrl = URL.createObjectURL(file);
    setImagePreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return objectUrl;
    });
  };

  const handleImageRemove = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setForm((f) => ({ ...f, featured_image_file: undefined, featured_image: '', remove_feature_image: true }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !form.tags.includes(trimmedTag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, trimmedTag], tagInput: '' }));
    } else {
      setForm((f) => ({ ...f, tagInput: '' }));
    }
  };

  const handleRemoveTag = (index: number) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.filter((_, i) => i !== index),
    }));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(form.tagInput);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.en.trim()) { setFormError(t.errTitleRequired); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: BlogFormData = {
        title: form.title,
        slug: form.slug.en || form.slug.fi ? form.slug : undefined,
        content: form.content.en || form.content.fi ? form.content : undefined,
        excerpt: form.excerpt.en || form.excerpt.fi ? form.excerpt : undefined,
        featured_image: form.featured_image,
        featured_image_file: form.featured_image_file,
        remove_feature_image: form.remove_feature_image,
        tags: form.tags.length > 0 ? form.tags : undefined,
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
          {/* Language Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-700 -mt-2">
            <button
              type="button"
              onClick={() => setEditLang('en')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${editLang === 'en'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
                }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setEditLang('fi')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${editLang === 'fi'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
                }`}
            >
              Suomi
            </button>
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>{t.labelTitle} <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.title[editLang] ?? ''}
              onChange={(e) => {
                const newTitle = e.target.value;
                setForm((f) => {
                  const updatedForm = { ...f, title: { ...f.title, [editLang]: newTitle } };
                  // Auto-fill slug from title if slug is empty for current language
                  if (!f.slug[editLang]?.trim() && newTitle.trim()) {
                    updatedForm.slug = { ...f.slug, [editLang]: generateSlug(newTitle) };
                  }
                  return updatedForm;
                });
              }}
              className={inputCls}
              placeholder={editLang === 'en' ? 'Enter English title' : 'Syötä suomenkielinen otsikko'}
              required
            />
          </div>

          {/* Slug */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>{t.labelSlug}</label>
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({
                    ...f,
                    slug: { ...f.slug, [editLang]: generateSlug(f.title[editLang] ?? '') },
                  }));
                  setSlugManuallyEdited((s) => ({ ...s, [editLang]: true }));
                }}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Auto-generate
              </button>
            </div>
            <input
              type="text"
              value={form.slug[editLang] ?? ''}
              onChange={(e) => {
                setForm((f) => ({ ...f, slug: { ...f.slug, [editLang]: e.target.value } }));
                setSlugManuallyEdited((s) => ({ ...s, [editLang]: true }));
              }}
              className={inputCls}
              placeholder={editLang === 'en' ? 'english-slug' : 'suomenkielinen-slug'}
            />
          </div>

          {/* Excerpt (short_description) */}
          <div>
            <label className={labelCls}>{t.labelExcerpt}</label>
            <textarea
              value={form.excerpt[editLang] ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: { ...f.excerpt, [editLang]: e.target.value } }))}
              className={`${inputCls} resize-y min-h-[80px]`}
              placeholder={editLang === 'en' ? 'English short description...' : 'Suomenkielinen lyhyt kuvaus...'}
            />
          </div>

          {/* Content (long_description) */}
          <div>
            <label className={labelCls}>{t.labelContent}</label>
            <RichTextEditor
              value={form.content[editLang] ?? ''}
              onChange={(html) => setForm((f) => ({ ...f, content: { ...f.content, [editLang]: html } }))}
              placeholder={editLang === 'en' ? 'English content...' : 'Suomenkielinen sisältö...'}
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

          {/* Category + Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t.labelCategoryId}</label>
              <div ref={categoryDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className={`${inputCls} flex items-center justify-between w-full text-left`}
                >
                  <span>
                    {form.blog_category_id
                      ? categories.find((c) => c.id === form.blog_category_id)?.name || 'Select category'
                      : 'Select category'}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-600 rounded-lg shadow-lg z-50">
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 text-white text-sm border-b border-gray-700 focus:outline-none placeholder-gray-500"
                    />
                    <div className="max-h-48 overflow-y-auto">
                      {categories
                        .filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                        .map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              setForm((f) => ({ ...f, blog_category_id: category.id }));
                              setShowCategoryDropdown(false);
                              setCategorySearch('');
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors ${form.blog_category_id === category.id ? 'bg-blue-900/30 text-blue-400' : 'text-gray-200'
                              }`}
                          >
                            {category.name}
                          </button>
                        ))}
                      {categories.filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-400 text-center">No categories found</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, blog_category_id: undefined }));
                        setShowCategoryDropdown(false);
                        setCategorySearch('');
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors border-t border-gray-700 text-center"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className={labelCls}>{t.labelTags}</label>
              <div className="rounded-lg border border-gray-600 bg-gray-900 p-3 flex flex-wrap gap-2">
                {form.tags.map((tag, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors group"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(index)}
                      className="ml-1 text-blue-200 hover:text-white transition-colors"
                      title="Remove tag"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  value={form.tagInput}
                  onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value }))}
                  onKeyDown={handleTagInputKeyDown}
                  onBlur={() => {
                    if (form.tagInput.trim()) {
                      handleAddTag(form.tagInput);
                    }
                  }}
                  className="flex-1 min-w-[120px] bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                  placeholder={form.tags.length === 0 ? t.placeholderTags : 'Add tag...'}
                  disabled={submitting}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add tags</p>
            </div>
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.visibility}
              onClick={() => setForm((f) => ({ ...f, visibility: !f.visibility }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${form.visibility ? 'bg-green-600' : 'bg-gray-600'
                }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.visibility ? 'translate-x-5' : 'translate-x-0'
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
