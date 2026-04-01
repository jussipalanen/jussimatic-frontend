import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { getAdminProject, createProject, updateProject, getProjectCategories, getProjectTags, createProjectTag } from '../api/projectsApi';
import type { Project, ProjectCategory, ProjectFormData, ProjectTagItem } from '../api/projectsApi';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';
import { buildImageUrl } from '../constants';

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
  tag_ids: number[];
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
  tag_ids: [],
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
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<{ en: boolean; fi: boolean }>({ en: false, fi: false });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [availableTags, setAvailableTags] = useState<ProjectTagItem[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const tagContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    getProjectCategories().then(setCategories).catch(() => { });
    getProjectTags().then(setAvailableTags).catch(() => { });
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
            tag_ids: en.tags ? en.tags.map((tag) => tag.id) : [],
            visibility: en.visibility ?? 'show',
            category_id: en.categories?.[0]?.id != null ? String(en.categories[0].id) : '',
            image_file: null,
          });
          setImagePreview(en.feature_image ? buildImageUrl(en.feature_image) : null);
          setSlugManuallyEdited({ en: true, fi: true });
        })
        .catch((err) => setFormError(err instanceof Error ? err.message : t.errLoad))
        .finally(() => setLoading(false));
    } else {
      setForm(EMPTY_FORM);
      setImagePreview(null);
      setSlugManuallyEdited({ en: false, fi: false });
    }
  }, [project]);

  // Auto-generate slug from title when title changes (per language)
  useEffect(() => {
    if (!slugManuallyEdited.en && form.title.en?.trim()) {
      setForm((f) => ({ ...f, slug: { ...f.slug, en: generateSlug(f.title.en) } }));
      // Reset manual flag so it can auto-fill again if slug is cleared
      setSlugManuallyEdited((s) => ({ ...s, en: false }));
    }
  }, [form.title.en, slugManuallyEdited.en]);

  useEffect(() => {
    if (!slugManuallyEdited.fi && form.title.fi?.trim()) {
      setForm((f) => ({ ...f, slug: { ...f.slug, fi: generateSlug(f.title.fi) } }));
      // Reset manual flag so it can auto-fill again if slug is cleared
      setSlugManuallyEdited((s) => ({ ...s, fi: false }));
    }
  }, [form.title.fi, slugManuallyEdited.fi]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagContainerRef.current && !tagContainerRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredTags = availableTags.filter(
    (tag) => tag.title.toLowerCase().includes(tagSearch.toLowerCase().trim()),
  );
  const exactMatch = availableTags.find(
    (tag) => tag.title.toLowerCase() === tagSearch.trim().toLowerCase(),
  );

  const selectTag = (tag: ProjectTagItem) => {
    setForm((f) => ({
      ...f,
      tag_ids: f.tag_ids.includes(tag.id)
        ? f.tag_ids.filter((id) => id !== tag.id)
        : [...f.tag_ids, tag.id],
    }));
    setTagSearch('');
    setTagDropdownOpen(false);
  };

  const handleCreateTag = async () => {
    const title = tagSearch.trim();
    if (!title || creatingTag) return;
    setCreatingTag(true);
    try {
      const newTag = await createProjectTag({ title, color: '#3b82f6' });
      setAvailableTags((prev) => [...prev, newTag]);
      setForm((f) => ({ ...f, tag_ids: [...f.tag_ids, newTag.id] }));
      setTagSearch('');
      setTagDropdownOpen(false);
    } catch {
      // silently ignore — tag list admin handles errors
    } finally {
      setCreatingTag(false);
    }
  };

  const handleTagSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setTagDropdownOpen(false); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTags.length > 0 && !exactMatch) { selectTag(filteredTags[0]); return; }
      if (exactMatch) { selectTag(exactMatch); return; }
      if (tagSearch.trim()) handleCreateTag();
    }
  };

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.en.trim()) { setFormError(t.errTitleRequired); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: ProjectFormData = {
        title: { en: form.title.en.trim(), fi: form.title.fi.trim() || undefined },
        slug: form.slug.en.trim() ? { en: form.slug.en.trim(), fi: form.slug.fi.trim() || undefined } : undefined,
        short_description: (form.short_description.en.trim() || form.short_description.fi.trim())
          ? { en: form.short_description.en.trim(), fi: form.short_description.fi.trim() || undefined }
          : undefined,
        long_description: (form.long_description.en.trim() || form.long_description.fi.trim())
          ? { en: form.long_description.en.trim(), fi: form.long_description.fi.trim() || undefined }
          : undefined,
        live_url: form.live_url.trim() || undefined,
        github_url: form.github_url.trim() || undefined,
        sort_order: form.sort_order.trim() ? Number(form.sort_order) : undefined,
        tag_ids: form.tag_ids,
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
      <div className="w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
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
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeLang === lang
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
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}>
                  {t.labelTitle}
                  {activeLang === 'en' && <span className="text-red-400 ml-1">*</span>}
                </label>
                {activeLang === 'fi' && form.title.en?.trim() && !form.title.fi?.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const srcTitle = form.title.en ?? '';
                      const srcSlug = form.slug.en ?? '';
                      setForm((f) => ({ ...f, title: { ...f.title, fi: srcTitle } }));
                      setSlugManuallyEdited((s) => ({ ...s, fi: !!srcSlug.trim() }));
                      if (!form.slug.fi?.trim() && srcSlug.trim()) {
                        setForm((f) => ({ ...f, slug: { ...f.slug, fi: srcSlug } }));
                      }
                    }}
                    className="text-xs text-green-400 hover:text-green-300 transition-colors"
                  >
                    {t.copyFromEnglish}
                  </button>
                )}
                {activeLang === 'en' && form.title.fi?.trim() && !form.title.en?.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const srcTitle = form.title.fi ?? '';
                      const srcSlug = form.slug.fi ?? '';
                      setForm((f) => ({ ...f, title: { ...f.title, en: srcTitle } }));
                      setSlugManuallyEdited((s) => ({ ...s, en: !!srcSlug.trim() }));
                      if (!form.slug.en?.trim() && srcSlug.trim()) {
                        setForm((f) => ({ ...f, slug: { ...f.slug, en: srcSlug } }));
                      }
                    }}
                    className="text-xs text-green-400 hover:text-green-300 transition-colors"
                  >
                    {t.copyFromFinnish}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={form.title[activeLang]}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setForm((f) => {
                    const updatedForm = { ...f, title: { ...f.title, [activeLang]: newTitle } };
                    // Auto-fill slug from title if slug is empty for current language
                    if (!f.slug[activeLang]?.trim() && newTitle.trim()) {
                      updatedForm.slug = { ...f.slug, [activeLang]: generateSlug(newTitle) };
                    }
                    return updatedForm;
                  });
                }}
                onBlur={() => {
                  // Auto-generate slug on blur if slug is empty
                  const title = form.title[activeLang];
                  if (title?.trim() && !form.slug[activeLang]?.trim()) {
                    setForm((f) => ({ ...f, slug: { ...f.slug, [activeLang]: generateSlug(title) } }));
                  }
                }}
                className={inputCls}
                placeholder={`${t.placeholderTitle} (${activeLang.toUpperCase()})`}
                required={activeLang === 'en'}
              />
            </div>

            {/* Slug */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}>{t.labelSlug}</label>
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, slug: { ...f.slug, [activeLang]: generateSlug(f.title[activeLang] ?? '') } }));
                    setSlugManuallyEdited((s) => ({ ...s, [activeLang]: true }));
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Auto-generate
                </button>
              </div>
              <input
                type="text"
                value={form.slug[activeLang]}
                onChange={(e) => {
                  setForm((f) => ({ ...f, slug: { ...f.slug, [activeLang]: e.target.value } }));
                  setSlugManuallyEdited((s) => ({ ...s, [activeLang]: true }));
                }}
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
            <div ref={tagContainerRef} className="relative">
              <label className={labelCls}>{t.labelTags}</label>

              {/* Selected tag pills */}
              {form.tag_ids.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.tag_ids.map((id) => {
                    const tag = availableTags.find((tg) => tg.id === id);
                    if (!tag) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color + '33', border: `1px solid ${tag.color}88` }}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                        {tag.title}
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setForm((f) => ({ ...f, tag_ids: f.tag_ids.filter((i) => i !== id) }))}
                          className="ml-0.5 text-gray-300 hover:text-white leading-none"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Search input */}
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => { setTagSearch(e.target.value); setTagDropdownOpen(true); }}
                onFocus={() => setTagDropdownOpen(true)}
                onKeyDown={handleTagSearchKeyDown}
                className={inputCls}
                placeholder={t.placeholderTags}
                disabled={submitting}
                autoComplete="off"
              />

              {/* Dropdown */}
              {tagDropdownOpen && (tagSearch.trim() !== '' || filteredTags.length > 0) && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 shadow-xl max-h-48 overflow-y-auto">
                  {filteredTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectTag(tag); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left hover:bg-gray-700 transition-colors"
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      <span className="text-white">{tag.title}</span>
                      {form.tag_ids.includes(tag.id) && (
                        <span className="ml-auto text-green-400 text-xs">✓</span>
                      )}
                    </button>
                  ))}
                  {tagSearch.trim() && !exactMatch && (
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleCreateTag(); }}
                      disabled={creatingTag}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left text-blue-400 hover:bg-gray-700 transition-colors border-t border-gray-700 disabled:opacity-60"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {creatingTag ? 'Creating…' : `Create "${tagSearch.trim()}"`}
                    </button>
                  )}
                  {filteredTags.length === 0 && !tagSearch.trim() && (
                    <p className="px-3 py-2 text-sm text-gray-500">{t.tagsHint}</p>
                  )}
                </div>
              )}
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
