import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { getAdminProject, createProject, updateProject, getProjectCategories } from '../api/projectsApi';
import type { Project, ProjectCategory, ProjectFormData, ProjectTag } from '../api/projectsApi';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';

const STORAGE_BASE_URL = (import.meta.env.VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

function buildImageUrl(path: string) {
  return `${STORAGE_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

interface TranslatedFormField {
  en: string;
  fi: string;
}

interface ProjectFormState {
  title: TranslatedFormField;
  slug: TranslatedFormField;
  short_description: TranslatedFormField;
  long_description: TranslatedFormField;
  live_url: string;
  github_url: string;
  sort_order: string;
  tags: ProjectTag[];
  tagInput: string;
  tagColor: string;
  visibility: string;
  category_id: string;
  image_file: File | null;
}

const EMPTY_FORM: ProjectFormState = {
  title: { en: '', fi: '' },
  slug: { en: '', fi: '' },
  short_description: { en: '', fi: '' },
  long_description: { en: '', fi: '' },
  live_url: '',
  github_url: '',
  sort_order: '',
  tags: [],
  tagInput: '',
  tagColor: '#3b82f6',
  visibility: 'show',
  category_id: '',
  image_file: null,
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface ProjectFormModalProps {
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProjectFormModal({ project, onClose, onSaved }: ProjectFormModalProps) {
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminProjects;

  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeLang, setActiveLang] = useState<'en' | 'fi'>('en');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    getProjectCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setFormError(null);
    setActiveLang('en');
    setImageRemoved(false);
    if (project) {
      setLoading(true);
      Promise.all([
        getAdminProject(project.id),
        getAdminProject(project.id, 'fi'),
      ])
        .then(([en, fi]) => {
          setForm({
            title: { en: en.title, fi: fi.title !== en.title ? fi.title : '' },
            slug: { en: en.slug ?? '', fi: fi.slug !== en.slug ? fi.slug ?? '' : '' },
            short_description: { en: en.short_description ?? '', fi: fi.short_description !== en.short_description ? fi.short_description ?? '' : '' },
            long_description: { en: en.long_description ?? '', fi: fi.long_description !== en.long_description ? fi.long_description ?? '' : '' },
            live_url: en.live_url ?? '',
            github_url: en.github_url ?? '',
            sort_order: en.sort_order != null ? String(en.sort_order) : '',
            tags: en.tags ?? [],
            tagInput: '',
            tagColor: '#3b82f6',
            visibility: en.visibility ?? 'show',
            category_id: en.categories?.[0]?.id != null ? String(en.categories[0].id) : '',
            image_file: null,
          });
          setImagePreview(en.feature_image ? buildImageUrl(en.feature_image) : null);
          setSlugManuallyEdited(true);
        })
        .catch((err) => setFormError(err instanceof Error ? err.message : t.errLoad))
        .finally(() => setLoading(false));
    } else {
      setForm(EMPTY_FORM);
      setImagePreview(null);
      setSlugManuallyEdited(false);
    }
  }, [project]);

  // Auto-generate EN slug from EN title
  useEffect(() => {
    if (!slugManuallyEdited && form.title.en.trim()) {
      setForm((f) => ({ ...f, slug: { ...f.slug, en: generateSlug(f.title.en) } }));
    }
  }, [form.title.en, slugManuallyEdited]);

  const close = () => { if (!submitting) onClose(); };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, image_file: file }));
    setImageRemoved(false);
    setImagePreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleRemoveImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageRemoved(true);
    setForm((f) => ({ ...f, image_file: null }));
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleAddTag = () => {
    const name = form.tagInput.trim().replace(/,+$/, '').trim();
    if (name && !form.tags.find((tg) => tg.name === name)) {
      setForm((f) => ({ ...f, tags: [...f.tags, { name, color: f.tagColor }], tagInput: '' }));
    } else {
      setForm((f) => ({ ...f, tagInput: '' }));
    }
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Backspace' && !form.tagInput && form.tags.length > 0) {
      setForm((f) => ({ ...f, tags: f.tags.slice(0, -1) }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.en.trim()) { setFormError(t.errTitleRequired); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: ProjectFormData = {
        title: { en: form.title.en.trim(), fi: form.title.fi.trim() || undefined },
        slug: (form.slug.en.trim() || form.slug.fi.trim())
          ? { en: form.slug.en.trim() || undefined, fi: form.slug.fi.trim() || undefined }
          : undefined,
        short_description: (form.short_description.en.trim() || form.short_description.fi.trim())
          ? { en: form.short_description.en.trim(), fi: form.short_description.fi.trim() || undefined }
          : undefined,
        long_description: (form.long_description.en.trim() || form.long_description.fi.trim())
          ? { en: form.long_description.en.trim(), fi: form.long_description.fi.trim() || undefined }
          : undefined,
        live_url: form.live_url.trim() || undefined,
        github_url: form.github_url.trim() || undefined,
        sort_order: form.sort_order.trim() ? Number(form.sort_order) : undefined,
        tags: form.tags,
        visibility: form.visibility,
        category_ids: form.category_id ? [Number(form.category_id)] : undefined,
        image_file: form.image_file ?? undefined,
        remove_feature_image: !form.image_file && imageRemoved ? true : undefined,
      };
      if (project) {
        await updateProject(project.id, payload);
      } else {
        await createProject(payload);
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
            {project ? t.editTitle : t.createTitle}
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

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

            {/* Language tabs */}
            <div className="flex gap-1 rounded-lg border border-gray-700 bg-gray-800 p-1 w-fit">
              {(['en', 'fi'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLang(lang)}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                    activeLang === lang
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Title */}
            <div>
              <label className={labelCls}>
                {t.labelTitle}
                {activeLang === 'en' && <span className="text-red-400 ml-1">*</span>}
              </label>
              <input
                type="text"
                value={form.title[activeLang]}
                onChange={(e) => setForm((f) => ({ ...f, title: { ...f.title, [activeLang]: e.target.value } }))}
                className={inputCls}
                placeholder={`${t.placeholderTitle} (${activeLang.toUpperCase()})`}
                required={activeLang === 'en'}
              />
            </div>

            {/* Slug */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}>{t.labelSlug}</label>
                {activeLang === 'en' && (
                  <button
                    type="button"
                    onClick={() => { setForm((f) => ({ ...f, slug: { ...f.slug, en: generateSlug(f.title.en) } })); setSlugManuallyEdited(true); }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Auto-generate
                  </button>
                )}
              </div>
              <input
                type="text"
                value={form.slug[activeLang]}
                onChange={(e) => { setForm((f) => ({ ...f, slug: { ...f.slug, [activeLang]: e.target.value } })); setSlugManuallyEdited(true); }}
                className={inputCls}
                placeholder={`${t.placeholderSlug} (${activeLang.toUpperCase()})`}
              />
            </div>

            {/* Short description */}
            <div>
              <label className={labelCls}>{t.labelSubtitle}</label>
              <input
                type="text"
                value={form.short_description[activeLang]}
                onChange={(e) => setForm((f) => ({ ...f, short_description: { ...f.short_description, [activeLang]: e.target.value } }))}
                className={inputCls}
                placeholder={`${t.placeholderSubtitle} (${activeLang.toUpperCase()})`}
              />
            </div>

            {/* Long description */}
            <div>
              <label className={labelCls}>{t.labelDescription}</label>
              <RichTextEditor
                key={activeLang}
                value={form.long_description[activeLang]}
                onChange={(html) => setForm((f) => ({ ...f, long_description: { ...f.long_description, [activeLang]: html } }))}
                placeholder={`${t.placeholderDescription} (${activeLang.toUpperCase()})`}
                disabled={submitting}
              />
            </div>

            {/* Feature image */}
            <div>
              <label className={labelCls}>{t.labelImage}</label>
              <label
                className={`flex items-center gap-3 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm cursor-pointer hover:border-blue-500 transition-colors ${submitting ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
                </svg>
                <span className="text-gray-400 truncate">
                  {form.image_file ? form.image_file.name : 'Choose image...'}
                </span>
                <input
                  ref={imageInputRef}
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
                    onClick={handleRemoveImage}
                    disabled={submitting}
                    className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-black/60 text-white hover:bg-red-600/80 transition-colors disabled:opacity-50"
                    title={t.btnRemoveImage}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Category + Visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div>
                <label className={labelCls}>{t.labelCategory}</label>
                <div className="flex gap-2">
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                    className={`${inputCls} flex-1`}
                  >
                    <option value="">{t.placeholderCategory}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  {form.category_id && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category_id: '' }))}
                      className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.visibility === 'show'}
                  onClick={() => setForm((f) => ({ ...f, visibility: f.visibility === 'show' ? 'hide' : 'show' }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${form.visibility === 'show' ? 'bg-green-600' : 'bg-gray-600'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.visibility === 'show' ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
                <span className="text-sm text-gray-300">
                  {form.visibility === 'show' ? t.labelPublished : t.labelHidden}
                </span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className={labelCls}>{t.labelTags}</label>
              {/* Existing tags */}
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.tags.map((tag) => (
                    <span
                      key={tag.name}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color + '33', border: `1px solid ${tag.color}88` }}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((tg) => tg.name !== tag.name) }))}
                        className="text-gray-300 hover:text-white leading-none ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Tag input row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.tagInput}
                  onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value }))}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (form.tagInput.trim()) handleAddTag(); }}
                  className={`${inputCls} flex-1`}
                  placeholder={t.placeholderTags}
                  disabled={submitting}
                />
                <div className="relative flex items-center">
                  <input
                    type="color"
                    value={form.tagColor}
                    onChange={(e) => setForm((f) => ({ ...f, tagColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-600 bg-gray-900 cursor-pointer p-0.5"
                    title="Tag color"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!form.tagInput.trim() || submitting}
                  className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/60 disabled:opacity-40 transition-colors"
                >
                  Add
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">{t.tagsHint}</p>
            </div>

            {/* URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t.labelDemoUrl}</label>
                <input
                  type="url"
                  value={form.live_url}
                  onChange={(e) => setForm((f) => ({ ...f, live_url: e.target.value }))}
                  className={inputCls}
                  placeholder="https://"
                />
              </div>
              <div>
                <label className={labelCls}>{t.labelGithubUrl}</label>
                <input
                  type="url"
                  value={form.github_url}
                  onChange={(e) => setForm((f) => ({ ...f, github_url: e.target.value }))}
                  className={inputCls}
                  placeholder="https://github.com/..."
                />
              </div>
            </div>

            {/* Sort order */}
            <div>
              <label className={labelCls}>{t.labelSortOrder}</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                className={inputCls}
                placeholder="0"
                min="0"
              />
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
                {submitting ? t.btnSaving : project ? t.btnUpdate : t.btnCreate}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
