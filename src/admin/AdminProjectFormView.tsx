import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdminProject, createProject, updateProject, getProjectCategories } from '../api/projectsApi';
import type { ProjectCategory, ProjectFormData } from '../api/projectsApi';
import { getMe } from '../api/authApi';
import { getRoleAccess, PERMISSION_MESSAGE } from '../utils/authUtils';
import AdminHeader from '../demo/ecommerce/components/AdminHeader';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';

interface ProjectFormState {
  title: string;
  slug: string;
  short_description: string;
  long_description: string;
  live_url: string;
  github_url: string;
  sort_order: string;
  tags: string[];
  tagInput: string;
  visibility: string;
  category_id: string;
  image_file: File | null;
}

const EMPTY_FORM: ProjectFormState = {
  title: '',
  slug: '',
  short_description: '',
  long_description: '',
  live_url: '',
  github_url: '',
  sort_order: '',
  tags: [],
  tagInput: '',
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

function AdminProjectFormView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminProjects;
  const tDash = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminDashboard;

  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [authError, setAuthError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    document.title = `${isEditing ? t.editTitle : t.createTitle} - Jussimatic`;
  }, [language, isEditing, t.editTitle, t.createTitle]);

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

  useEffect(() => {
    getProjectCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id || authError) return;
    const fetchProject = async () => {
      setLoading(true);
      try {
        const project = await getAdminProject(id);
        setForm({
          title: project.title,
          slug: project.slug ?? '',
          short_description: project.short_description ?? '',
          long_description: project.long_description ?? '',
          live_url: project.live_url ?? '',
          github_url: project.github_url ?? '',
          sort_order: project.sort_order != null ? String(project.sort_order) : '',
          tags: project.tags?.map((t) => t.name) ?? [],
          tagInput: '',
          visibility: project.visibility ?? 'show',
          category_id: project.categories?.[0]?.id != null ? String(project.categories[0].id) : '',
          image_file: null,
        });
        setSlugManuallyEdited(true);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : t.errLoad);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id, authError]);

  useEffect(() => {
    if (!slugManuallyEdited && form.title.trim()) {
      setForm((f) => ({ ...f, slug: generateSlug(f.title) }));
    }
  }, [form.title, slugManuallyEdited]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, image_file: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setForm((f) => ({ ...f, image_file: null }));
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleAddTag = (raw: string) => {
    const tag = raw.trim().replace(/,+$/, '').trim();
    if (tag && !form.tags.includes(tag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, tag], tagInput: '' }));
    } else {
      setForm((f) => ({ ...f, tagInput: '' }));
    }
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(form.tagInput);
    } else if (e.key === 'Backspace' && !form.tagInput && form.tags.length > 0) {
      setForm((f) => ({ ...f, tags: f.tags.slice(0, -1) }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError(t.errTitleRequired); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: ProjectFormData = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        short_description: form.short_description.trim() || undefined,
        long_description: form.long_description.trim() || undefined,
        live_url: form.live_url.trim() || undefined,
        github_url: form.github_url.trim() || undefined,
        sort_order: form.sort_order.trim() ? Number(form.sort_order) : undefined,
        tags: form.tags,
        visibility: form.visibility,
        category_id: form.category_id ? Number(form.category_id) : null,
        image_file: form.image_file ?? undefined,
      };
      if (id) {
        await updateProject(Number(id), payload);
      } else {
        await createProject(payload);
      }
      navigate('/admin/projects');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t.errSave);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none';
  const labelCls = 'block text-sm font-medium text-gray-300 mb-1';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AdminHeader
        title={isEditing ? t.editTitle : t.createTitle}
        backTo="/admin/projects"
        backLabel={t.title}
      />

      <main className="container mx-auto px-4 py-8">
        {authError && (
          <div className="mx-auto max-w-2xl rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-6 text-center">
            <p className="text-lg text-yellow-300">{authError === PERMISSION_MESSAGE ? tDash.permissionDenied : authError}</p>
          </div>
        )}

        {loading && !authError && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
            <p className="mt-4 text-gray-300">{t.loading}</p>
          </div>
        )}

        {!loading && !authError && (
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Title */}
              <div>
                <label className={labelCls}>
                  {t.labelTitle} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={inputCls}
                  placeholder={t.placeholderTitle}
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls}>{t.labelSlug}</label>
                  <button
                    type="button"
                    onClick={() => { setForm((f) => ({ ...f, slug: generateSlug(f.title) })); setSlugManuallyEdited(true); }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => { setForm((f) => ({ ...f, slug: e.target.value })); setSlugManuallyEdited(true); }}
                  className={inputCls}
                  placeholder={t.placeholderSlug}
                />
              </div>

              {/* Short description */}
              <div>
                <label className={labelCls}>{t.labelSubtitle}</label>
                <input
                  type="text"
                  value={form.short_description}
                  onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
                  className={inputCls}
                  placeholder={t.placeholderSubtitle}
                />
              </div>

              {/* Long description */}
              <div>
                <label className={labelCls}>{t.labelDescription}</label>
                <textarea
                  value={form.long_description}
                  onChange={(e) => setForm((f) => ({ ...f, long_description: e.target.value }))}
                  className={`${inputCls} min-h-[120px] resize-y`}
                  placeholder={t.placeholderDescription}
                />
              </div>

              {/* Category */}
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

              {/* Tags */}
              <div>
                <label className={labelCls}>{t.labelTags}</label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 focus-within:border-blue-500">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 px-2 py-0.5 text-xs text-blue-300"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))}
                        className="text-blue-400 hover:text-white leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={form.tagInput}
                    onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value }))}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => { if (form.tagInput.trim()) handleAddTag(form.tagInput); }}
                    className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                    placeholder={form.tags.length === 0 ? t.placeholderTags : ''}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">{t.tagsHint}</p>
              </div>

              {/* URLs */}
              <div className="grid grid-cols-2 gap-3">
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

              {/* Image upload */}
              <div>
                <label className={labelCls}>{t.labelImage}</label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-700 file:px-3 file:py-1.5 file:text-sm file:text-white file:cursor-pointer hover:file:bg-gray-600"
                />
                {imagePreview && (
                  <div className="mt-3 flex items-start gap-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-20 w-20 rounded-lg object-cover border border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      {t.btnRemoveImage}
                    </button>
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between rounded-lg border border-gray-700 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-200">{t.labelVisibility}</p>
                  <p className="text-xs text-gray-500">
                    {form.visibility === 'show' ? t.labelPublished : t.labelHidden}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, visibility: f.visibility === 'show' ? 'hide' : 'show' }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    form.visibility === 'show' ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      form.visibility === 'show' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {formError && (
                <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3">
                  <p className="text-sm text-red-300">{formError}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 pb-8">
                <button
                  type="button"
                  onClick={() => navigate('/admin/projects')}
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
                  {submitting ? t.btnSaving : isEditing ? t.btnUpdate : t.btnCreate}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminProjectFormView;
