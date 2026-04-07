import { useEffect, useRef, useState } from 'react';
import { useLocaleNavigate } from '../../hooks/useLocaleNavigate';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../../i18n';
import { PROFICIENCY_LEVELS } from '../../constants';
import type { Language } from '../../i18n';

import {
  exportResumePdfPublic,
  exportResumeHtmlPublic,
  getExportOptions,
  previewResumePdfPublic,
} from '../../api/resumesApi';
import type {
  Award,
  Certification,
  Education,
  ExportOption,
  ExportOptions,
  Project,
  Recommendation,
  ResumeLanguage,
  ResumePayload,
  ResumeSkill,
  TemplateThemeOption,
  WorkExperience,
} from '../../api/resumesApi';
import Header from '../../components/Header';
import SkillCategorySelect from '../../components/SkillCategorySelect';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WithId<T> = T & { _id: string };

interface FormData {
  title: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  portfolio_url: string;
  github_url: string;
  language: string;
  photo: string; // base64 data URL
  theme: string;
  template: string;
  show_skill_levels: boolean;
  show_language_levels: boolean;
  summary: string;
  work_experiences: WithId<WorkExperience>[];
  educations: WithId<Education>[];
  skills: WithId<ResumeSkill>[];
  projects: WithId<Project & { technologies: string[] }>[];
  certifications: WithId<Certification>[];
  languages: WithId<ResumeLanguage>[];
  awards: WithId<Award>[];
  recommendations: WithId<Recommendation>[];
}

const EMPTY_FORM: FormData = {
  title: '',
  full_name: '',
  email: '',
  phone: '',
  location: '',
  linkedin_url: '',
  portfolio_url: '',
  github_url: '',
  language: '',
  photo: '',
  theme: '',
  template: '',
  show_skill_levels: false,
  show_language_levels: false,
  summary: '',
  work_experiences: [],
  educations: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  awards: [],
  recommendations: [],
};

const uid = () => Math.random().toString(36).slice(2);

const EMPTY_WORK: WithId<WorkExperience> = {
  _id: '', job_title: '', company_name: '', location: '', start_date: '',
  is_current: false, end_date: '', description: '', sort_order: 0,
};
const EMPTY_EDUCATION: WithId<Education> = {
  _id: '', degree: '', field_of_study: '', institution_name: '', location: '',
  graduation_year: undefined, gpa: undefined, sort_order: 0,
};
const EMPTY_SKILL: WithId<ResumeSkill> = {
  _id: '', category: '', name: '', proficiency: 'beginner', sort_order: 0,
};
const EMPTY_PROJECT: WithId<Project & { technologies: string[] }> = {
  _id: '', name: '', description: '', technologies: [], live_url: '', github_url: '', sort_order: 0,
};
const EMPTY_CERTIFICATION: WithId<Certification> = {
  _id: '', name: '', issuing_organization: '', issue_date: '', sort_order: 0,
};
const EMPTY_LANGUAGE: WithId<ResumeLanguage> = {
  _id: '', language: '', proficiency: 'native', sort_order: 0,
};
const EMPTY_AWARD: WithId<Award> = {
  _id: '', title: '', issuer: '', date: '', description: '', sort_order: 0,
};
const EMPTY_RECOMMENDATION: WithId<Recommendation> = {
  _id: '', full_name: '', title: '', company: '', email: '', recommendation: '', sort_order: 0,
};

function newItem<T extends { _id: string }>(template: T): T {
  return { ...template, _id: uid() };
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

type SectionKey =
  | 'personal'
  | 'summary'
  | 'work_experiences'
  | 'educations'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'awards'
  | 'recommendations'
  | 'preview';

// SECTIONS is built inside the component to use translations

const INPUT_CLS =
  'w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const LABEL_CLS = 'block text-sm font-medium text-white/70 mb-1';

// ---------------------------------------------------------------------------
// TagInput
// ---------------------------------------------------------------------------

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <span key={i} className="flex items-center gap-1 bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs px-2 py-0.5 rounded-full">
          {tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(value.filter((_, j) => j !== i)); }} className="text-blue-300 hover:text-white focus:outline-none" aria-label={`Remove ${tag}`}>×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="bg-transparent text-sm text-white placeholder-white/30 focus:outline-none flex-1 min-w-30"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// RepeatableItem
// ---------------------------------------------------------------------------

interface RepeatableItemProps<T extends { _id: string; sort_order?: number }> {
  item: T;
  index: number;
  total: number;
  onUpdate: (index: number, updated: T) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  children: (item: T, update: (partial: Partial<T>) => void) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// SpokenLanguageSelect — searchable combobox
// ---------------------------------------------------------------------------

function SpokenLanguageSelect({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: ExportOption[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selectedLabel =
    options.find((o) => o.value === value)?.label ??
    options.find((o) => o.value.toLowerCase() === value.toLowerCase())?.label ??
    options.find((o) => o.label.toLowerCase() === value.toLowerCase())?.label ??
    value;

  return (
    <div ref={containerRef} className="relative">
      <div
        className={INPUT_CLS + ' flex items-center justify-between cursor-pointer gap-2'}
        onClick={() => { setOpen((v) => !v); setQuery(''); }}
      >
        <span className={selectedLabel ? 'text-white' : 'text-white/30'}>
          {selectedLabel || placeholder}
        </span>
        <svg className="w-4 h-4 text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-700">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full bg-gray-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-white/40">No results</li>
            )}
            {filtered.map((opt) => (
              <li
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${opt.value === value ? 'bg-blue-600/30 text-blue-300' : 'text-white/80 hover:bg-gray-700'
                  }`}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RepeatableItem<T extends { _id: string; sort_order?: number }>({
  item, index, total, onUpdate, onRemove, onMove, children,
}: RepeatableItemProps<T>) {
  const update = (partial: Partial<T>) => onUpdate(index, { ...item, ...partial });
  return (
    <div className="bg-gray-750 border border-gray-600 rounded-xl p-4 relative">
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition-colors" aria-label="Move up">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        </button>
        <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1} className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition-colors" aria-label="Move down">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        <button type="button" onClick={() => onRemove(index)} className="p-1 text-red-400 hover:text-red-300 transition-colors" aria-label="Remove item">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="pr-20">{children(item, update)}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Array helpers
// ---------------------------------------------------------------------------

function listUpdate<T>(arr: T[], index: number, item: T): T[] {
  return arr.map((el, i) => (i === index ? item : el));
}
function listRemove<T>(arr: T[], index: number): T[] {
  return arr.filter((_, i) => i !== index);
}
function listMove<T>(arr: T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction;
  if (next < 0 || next >= arr.length) return arr;
  const copy = [...arr];
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}

// ---------------------------------------------------------------------------
// PersonalSection
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

function PersonalSection({ data, onChange, t, templates, templateThemes, languages }: {
  data: FormData;
  onChange: (partial: Partial<FormData>) => void;
  t: (typeof translations)[typeof DEFAULT_LANGUAGE]['resumes'];
  templates: ExportOption[];
  templateThemes: Record<string, TemplateThemeOption[]>;
  languages: ExportOption[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ''; // reset so re-selecting same file triggers onChange
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPhotoError(t.errPhotoType);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(t.errPhotoSize);
      return;
    }
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      onChange({ photo: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const field = (name: keyof Omit<FormData, 'photo'>, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <input
        type={type}
        value={String(data[name] ?? '')}
        onChange={(e) => onChange({ [name]: e.target.value })}
        placeholder={placeholder}
        className={INPUT_CLS}
      />
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">{field('title', t.fieldResumeTitle, 'text', t.fieldResumeTitlePlaceholder)}</div>
      {field('full_name', t.fieldFullName, 'text', t.fieldFullNamePlaceholder)}
      {field('email', t.fieldEmail, 'email', t.fieldEmailPlaceholder)}
      {field('phone', t.fieldPhone, 'text', t.fieldPhonePlaceholder)}
      {field('location', t.fieldLocation, 'text', t.fieldLocationPlaceholder)}
      {field('linkedin_url', t.fieldLinkedIn, 'url', 'https://linkedin.com/in/username')}
      {field('portfolio_url', t.fieldPortfolio, 'url', 'https://yoursite.com')}
      {field('github_url', t.fieldGitHub, 'url', 'https://github.com/username')}
      <div>
        <label className={LABEL_CLS}>{t.fieldResumeLanguage} *</label>
        <select value={data.language} onChange={(e) => onChange({ language: e.target.value })} className={INPUT_CLS}>
          <option value="">{t.fieldResumeLanguagePlaceholder}</option>
          {languages.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {/* Template + Theme picker */}
      <div className="sm:col-span-2 space-y-4">
        <div>
          <label className={LABEL_CLS}>{t.fieldTemplate} *</label>
          <div className="flex gap-3 flex-wrap">
            {templates.map((tpl) => {
              const isActive = data.template === tpl.value;
              const firstTheme = templateThemes[tpl.value]?.[0]?.value;
              const keepTheme = data.theme && templateThemes[tpl.value]?.some((th) => th.value === data.theme);
              return (
                <button
                  key={tpl.value}
                  type="button"
                  onClick={() => onChange({ template: tpl.value, theme: keepTheme ? data.theme : firstTheme ?? '' })}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${isActive
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'border-gray-600 text-white/60 hover:text-white hover:border-gray-500'
                  }`}
                >
                  {tpl.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>{t.fieldTheme} *</label>
          <div className="flex flex-wrap gap-2">
            {data.template && templateThemes[data.template]?.length
              ? templateThemes[data.template].map((theme) => {
                  const isActive = data.theme === theme.value;
                  return (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => onChange({ theme: theme.value })}
                      title={theme.value}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all capitalize ${isActive
                        ? 'border-white/50 ring-2 ring-white/30 text-white'
                        : 'border-gray-600 text-white/60 hover:border-gray-400 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: theme.accent }}
                      />
                      {theme.value}
                    </button>
                  );
                })
              : <p className="text-xs text-white/40">{t.fieldTemplatePlaceholder}</p>
            }
          </div>
        </div>
      </div>
      {/* Profile photo */}
      <div>
        <label className={LABEL_CLS}>{t.fieldPhoto}</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        {data.photo ? (
          <div className="flex items-center gap-3">
            <img
              src={data.photo}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border border-gray-600"
            />
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors text-left"
              >
                {t.fieldPhotoClickToUpload}
              </button>
              <button
                type="button"
                onClick={() => { onChange({ photo: '' }); setPhotoError(null); }}
                className="text-xs text-red-400 hover:text-red-300 transition-colors text-left"
              >
                {t.fieldPhotoRemove}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-gray-600 hover:border-gray-400 rounded-lg py-5 px-4 text-white/40 hover:text-white/70 transition-colors bg-gray-700/30"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">{t.fieldPhotoClickToUpload}</span>
          </button>
        )}
        {photoError && <p className="mt-1 text-xs text-red-400">{photoError}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function ResumeToolView() {
  const navigate = useLocaleNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).resumes;

  const SECTIONS: { key: SectionKey; label: string }[] = [
    { key: 'personal', label: t.sectionPersonal },
    { key: 'summary', label: t.sectionSummary },
    { key: 'work_experiences', label: t.sectionWork },
    { key: 'educations', label: t.sectionEducation },
    { key: 'skills', label: t.sectionSkills },
    { key: 'projects', label: t.sectionProjects },
    { key: 'certifications', label: t.sectionCertifications },
    { key: 'languages', label: t.sectionLanguages },
    { key: 'awards', label: t.sectionAwards },
    { key: 'recommendations', label: t.sectionRecommendations },
    { key: 'preview' as SectionKey, label: t.sectionPreview },
  ];

  const [activeSection, setActiveSection] = useState<SectionKey>('personal');
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [exportOptions, setExportOptions] = useState<ExportOptions>({ themes: [], templates: [], template_themes: {}, languages: [], skill_categories: [], skill_proficiencies: [], language_proficiencies: [], spoken_languages: [] });
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        // Handle wrapped formats: { resume: {...} }, { data: {...} }, or plain object
        const p = raw?.resume ?? raw?.data ?? raw;
        setForm({
          ...EMPTY_FORM,
          title: p.title ?? '',
          full_name: p.full_name ?? '',
          email: p.email ?? '',
          phone: p.phone ?? '',
          location: p.location ?? '',
          linkedin_url: p.linkedin_url ?? '',
          portfolio_url: p.portfolio_url ?? '',
          github_url: p.github_url ?? '',
          language: p.language ?? '',
          photo: p.photo ?? '',
          theme: p.theme ?? '',
          template: p.template ?? '',
          show_skill_levels: p.show_skill_levels ?? false,
          show_language_levels: p.show_language_levels ?? false,
          summary: p.summary ?? '',
          work_experiences: (p.work_experiences ?? []).map((e: object) => ({ ...e, _id: uid() })),
          educations: (p.educations ?? []).map((e: object) => ({ ...e, _id: uid() })),
          skills: (p.skills ?? []).map((e: object) => ({ ...e, _id: uid() })),
          projects: (p.projects ?? []).map((e: object) => ({ ...e, technologies: (e as { technologies?: string[] }).technologies ?? [], _id: uid() })),
          certifications: (p.certifications ?? []).map((e: object) => ({ ...e, _id: uid() })),
          languages: (p.languages ?? []).map((e: object) => ({ ...e, _id: uid() })),
          awards: (p.awards ?? []).map((e: object) => ({ ...e, _id: uid() })),
          recommendations: (p.recommendations ?? []).map((e: object) => ({ ...e, _id: uid() })),
        });
      } catch {
        setImportError(t.errImportResume);
      }
    };
    reader.readAsText(file);
  };

  const patch = (partial: Partial<FormData>) => setForm((prev) => ({ ...prev, ...partial }));

  useEffect(() => {
    const handler = (event: Event) => setLanguage((event as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  // Persist form to sessionStorage so a page refresh doesn't wipe the work
  useEffect(() => {
    getExportOptions(language)
      .then((opts) => setExportOptions(opts))
      .catch(() => { });
  }, [language]);

  useEffect(() => {
    const saved = sessionStorage.getItem('demo-resume-form');
    if (saved) {
      try { setForm(JSON.parse(saved) as FormData); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('demo-resume-form', JSON.stringify(form));
  }, [form]);

  // ---- Repeatable handlers -------------------------------------------------
  const makeHandlers = <T extends { _id: string; sort_order?: number }>(
    key: keyof Pick<FormData, 'work_experiences' | 'educations' | 'skills' | 'projects' | 'certifications' | 'languages' | 'awards' | 'recommendations'>,
    emptyTemplate: T,
  ) => ({
    add: () => setForm((prev) => ({ ...prev, [key]: [...(prev[key] as unknown as T[]), newItem(emptyTemplate)] })),
    update: (index: number, item: T) => setForm((prev) => ({ ...prev, [key]: listUpdate(prev[key] as unknown as T[], index, item) })),
    remove: (index: number) => setForm((prev) => ({ ...prev, [key]: listRemove(prev[key] as unknown as T[], index) })),
    move: (index: number, direction: -1 | 1) => setForm((prev) => ({ ...prev, [key]: listMove(prev[key] as unknown as T[], index, direction) })),
  });

  const workHandlers = makeHandlers('work_experiences', EMPTY_WORK);
  const edHandlers = makeHandlers('educations', EMPTY_EDUCATION);
  const skillHandlers = makeHandlers('skills', EMPTY_SKILL);
  const projectHandlers = makeHandlers('projects', EMPTY_PROJECT);
  const certHandlers = makeHandlers('certifications', EMPTY_CERTIFICATION);
  const langHandlers = makeHandlers('languages', EMPTY_LANGUAGE);
  const awardHandlers = makeHandlers('awards', EMPTY_AWARD);
  const recHandlers = makeHandlers('recommendations', EMPTY_RECOMMENDATION);

  // ---- Build payload -------------------------------------------------------
  const buildPayload = (): ResumePayload => ({
    title: form.title || 'Untitled Resume',
    full_name: form.full_name,
    email: form.email,
    phone: form.phone || undefined,
    location: form.location || undefined,
    linkedin_url: form.linkedin_url || undefined,
    portfolio_url: form.portfolio_url || undefined,
    github_url: form.github_url || undefined,
    language: form.language || undefined,
    photo: form.photo || undefined,
    theme: form.theme || undefined,
    template: form.template || undefined,
    show_skill_levels: form.show_skill_levels,
    show_language_levels: form.show_language_levels,
    summary: form.summary || undefined,
    work_experiences: form.work_experiences.map(({ _id, ...rest }, i) => ({
      ...rest,
      sort_order: i,
    })),
    educations: form.educations.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
    skills: form.skills.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
    projects: form.projects.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
    certifications: form.certifications.map(({ _id, ...rest }, i) => ({
      ...rest,
      sort_order: i,
    })),
    languages: form.languages.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
    awards: form.awards.map(({ _id, ...rest }, i) => ({
      ...rest,
      sort_order: i,
    })),
    recommendations: form.recommendations.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
  });

  // ---- Preview -------------------------------------------------------------
  const loadPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
    try {
      const url = await previewResumePdfPublic(buildPayload());
      setPreviewPdfUrl(url);
    } catch {
      setPreviewError(t.previewErrLoad);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'preview') loadPreview();
    return () => {
      if (activeSection !== 'preview' && previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // ---- Export --------------------------------------------------------------
  const handleExport = async (format: 'pdf' | 'html' | 'json') => {
    setExportMenuOpen(false);

    if (format === 'json') {
      const payload = buildPayload();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.title || 'resume'}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return;
    }

    if (!form.language) {
      setError(t.errLanguageRequired);
      setActiveSection('personal');
      return;
    }
    if (!form.theme) {
      setError(t.errThemeRequired);
      setActiveSection('personal');
      return;
    }
    if (!form.template) {
      setError(t.errTemplateRequired);
      setActiveSection('personal');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const payload = buildPayload();

      if (format === 'pdf') {
        await exportResumePdfPublic(payload);
      } else {
        await exportResumeHtmlPublic(payload);
      }
    } catch (err) {
      console.error(`Export failed:`, err);
      setError(t.errExportResume);
    } finally {
      setExporting(false);
    }
  };

  // ---- Clear ---------------------------------------------------------------
  const handleClear = () => {
    setForm({ ...EMPTY_FORM });
    sessionStorage.removeItem('demo-resume-form');
    setShowClearConfirm(false);
    setError(null);
    setActiveSection('personal');
  };

  // ---- Section content -----------------------------------------------------
  const renderSection = () => {
    switch (activeSection) {
      case 'personal':
        return <PersonalSection data={form} onChange={patch} t={t} templates={exportOptions.templates} templateThemes={exportOptions.template_themes} languages={exportOptions.languages} />;

      case 'summary':
        return (
          <div>
            <label className={LABEL_CLS}>{t.fieldSummary}</label>
            <textarea value={form.summary} onChange={(e) => patch({ summary: e.target.value })} placeholder={t.fieldSummaryPlaceholder} rows={6} className={INPUT_CLS + ' resize-y'} />
          </div>
        );

      case 'work_experiences':
        return (
          <div className="space-y-4">
            {form.work_experiences.map((item, i) => (
              <RepeatableItem key={item._id} item={item} index={i} total={form.work_experiences.length} onUpdate={workHandlers.update} onRemove={workHandlers.remove} onMove={workHandlers.move}>
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={LABEL_CLS}>{t.fieldJobTitle}</label><input type="text" value={it.job_title} onChange={(e) => upd({ job_title: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldCompanyName}</label><input type="text" value={it.company_name} onChange={(e) => upd({ company_name: e.target.value })} className={INPUT_CLS} /></div>
                    <div className="sm:col-span-2"><label className={LABEL_CLS}>{t.fieldLocation}</label><input type="text" value={it.location ?? ''} onChange={(e) => upd({ location: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldStartDate}</label><input type="date" value={it.start_date} onChange={(e) => upd({ start_date: e.target.value })} className={INPUT_CLS} /></div>
                    <div className="flex flex-col justify-end gap-2">
                      <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
                        <input type="checkbox" checked={!!it.is_current} onChange={(e) => upd({ is_current: e.target.checked, end_date: e.target.checked ? '' : it.end_date })} className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500" />
                        {t.fieldCurrentlyWorking}
                      </label>
                    </div>
                    <div><label className={LABEL_CLS}>{t.fieldEndDate}</label><input type="date" value={it.end_date ?? ''} onChange={(e) => upd({ end_date: e.target.value })} disabled={!!it.is_current} className={INPUT_CLS + (it.is_current ? ' opacity-40 cursor-not-allowed' : '')} /></div>
                    <div className="sm:col-span-2"><label className={LABEL_CLS}>{t.fieldDescription}</label><textarea value={it.description ?? ''} onChange={(e) => upd({ description: e.target.value })} placeholder={t.fieldDescriptionPlaceholder} rows={3} className={INPUT_CLS + ' resize-y'} /></div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button type="button" onClick={workHandlers.add} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t.addWorkExperience}
            </button>
          </div>
        );

      case 'educations':
        return (
          <div className="space-y-4">
            {form.educations.map((item, i) => (
              <RepeatableItem key={item._id} item={item} index={i} total={form.educations.length} onUpdate={edHandlers.update} onRemove={edHandlers.remove} onMove={edHandlers.move}>
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={LABEL_CLS}>{t.fieldDegree}</label><input type="text" value={it.degree} onChange={(e) => upd({ degree: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldFieldOfStudy}</label><input type="text" value={it.field_of_study} onChange={(e) => upd({ field_of_study: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldInstitution}</label><input type="text" value={it.institution_name} onChange={(e) => upd({ institution_name: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldLocation}</label><input type="text" value={it.location ?? ''} onChange={(e) => upd({ location: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldGraduationYear}</label><select value={it.graduation_year ?? ''} onChange={(e) => upd({ graduation_year: e.target.value ? Number(e.target.value) : undefined })} className={INPUT_CLS}><option value="">—</option>{Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - i).map((y) => (<option key={y} value={y}>{y}</option>))}</select></div>
                    <div><label className={LABEL_CLS}>{t.fieldGPA}</label><input type="number" value={it.gpa ?? ''} onChange={(e) => upd({ gpa: e.target.value ? Number(e.target.value) : undefined })} min={0} max={10} step={0.01} className={INPUT_CLS} /></div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button type="button" onClick={edHandlers.add} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t.addEducation}
            </button>
          </div>
        );

      case 'skills':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className={LABEL_CLS + ' mb-0'}>{t.showSkillLevelsLabel}</label>
              <button
                type="button"
                onClick={() => patch({ show_skill_levels: !form.show_skill_levels })}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border transition-colors ${form.show_skill_levels
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'border-gray-600 text-white/40 hover:text-white/70 hover:border-gray-500'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={form.show_skill_levels ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' : 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'} />
                </svg>
                {form.show_skill_levels ? t.showLevelsOn : t.showLevelsOff}
              </button>
            </div>
            {form.skills.map((item, i) => (
              <RepeatableItem key={item._id} item={item} index={i} total={form.skills.length} onUpdate={skillHandlers.update} onRemove={skillHandlers.remove} onMove={skillHandlers.move}>
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><SkillCategorySelect value={it.category} onChange={(val) => upd({ category: val })} options={exportOptions.skill_categories} label={t.fieldCategory} placeholder={t.fieldCategoryPlaceholder} inputCls={INPUT_CLS} labelCls={LABEL_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldSkillName}</label><input type="text" value={it.name} onChange={(e) => upd({ name: e.target.value })} placeholder={t.fieldSkillNamePlaceholder} className={INPUT_CLS} /></div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldProficiency}</label>
                      <select value={it.proficiency} onChange={(e) => upd({ proficiency: e.target.value as ResumeSkill['proficiency'] })} className={INPUT_CLS}>
                        <option value="">{t.fieldProficiencyPlaceholder}</option>
                        {exportOptions.skill_proficiencies.map(o => (
                          <option key={o.value} value={o.value}>{PROFICIENCY_LEVELS[o.value] ? `${PROFICIENCY_LEVELS[o.value]} - ${o.label}` : o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button type="button" onClick={skillHandlers.add} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t.addSkill}
            </button>
          </div>
        );

      case 'projects':
        return (
          <div className="space-y-4">
            {form.projects.map((item, i) => (
              <RepeatableItem key={item._id} item={item} index={i} total={form.projects.length} onUpdate={projectHandlers.update as (index: number, item: WithId<Project & { technologies: string[] }>) => void} onRemove={projectHandlers.remove} onMove={projectHandlers.move}>
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2"><label className={LABEL_CLS}>{t.fieldProjectName}</label><input type="text" value={it.name} onChange={(e) => upd({ name: e.target.value })} className={INPUT_CLS} /></div>
                    <div className="sm:col-span-2"><label className={LABEL_CLS}>{t.fieldDescription}</label><textarea value={it.description ?? ''} onChange={(e) => upd({ description: e.target.value })} rows={3} className={INPUT_CLS + ' resize-y'} /></div>
                    <div className="sm:col-span-2"><label className={LABEL_CLS}>{t.fieldTechnologies}</label><TagInput value={it.technologies} onChange={(tags) => upd({ technologies: tags })} placeholder={t.fieldTechnologiesPlaceholder} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldLiveURL}</label><input type="url" value={it.live_url ?? ''} onChange={(e) => upd({ live_url: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldGitHub}</label><input type="url" value={it.github_url ?? ''} onChange={(e) => upd({ github_url: e.target.value })} className={INPUT_CLS} /></div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button type="button" onClick={projectHandlers.add} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t.addProject}
            </button>
          </div>
        );

      case 'certifications':
        return (
          <div className="space-y-4">
            {form.certifications.map((item, i) => (
              <RepeatableItem key={item._id} item={item} index={i} total={form.certifications.length} onUpdate={certHandlers.update} onRemove={certHandlers.remove} onMove={certHandlers.move}>
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={LABEL_CLS}>{t.fieldCertName}</label><input type="text" value={it.name} onChange={(e) => upd({ name: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldIssuingOrg}</label><input type="text" value={it.issuing_organization} onChange={(e) => upd({ issuing_organization: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldIssueDate}</label><input type="date" value={it.issue_date ?? ''} onChange={(e) => upd({ issue_date: e.target.value })} className={INPUT_CLS} /></div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button type="button" onClick={certHandlers.add} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t.addCertification}
            </button>
          </div>
        );

      case 'languages':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className={LABEL_CLS + ' mb-0'}>{t.showLanguageLevelsLabel}</label>
              <button
                type="button"
                onClick={() => patch({ show_language_levels: !form.show_language_levels })}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border transition-colors ${form.show_language_levels
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'border-gray-600 text-white/40 hover:text-white/70 hover:border-gray-500'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={form.show_language_levels ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' : 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'} />
                </svg>
                {form.show_language_levels ? t.showLevelsOn : t.showLevelsOff}
              </button>
            </div>
            {form.languages.map((item, i) => (
              <RepeatableItem key={item._id} item={item} index={i} total={form.languages.length} onUpdate={langHandlers.update} onRemove={langHandlers.remove} onMove={langHandlers.move}>
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={LABEL_CLS}>{t.fieldLanguage}</label><SpokenLanguageSelect value={it.language} onChange={(val) => upd({ language: val })} options={exportOptions.spoken_languages} placeholder={t.fieldLanguagePlaceholder} /></div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldProficiency}</label>
                      <select value={it.proficiency} onChange={(e) => upd({ proficiency: e.target.value as ResumeLanguage['proficiency'] })} className={INPUT_CLS}>
                        <option value="">{t.fieldProficiencyPlaceholder}</option>
                        {exportOptions.language_proficiencies.map(o => (
                          <option key={o.value} value={o.value}>{PROFICIENCY_LEVELS[o.value] ? `${PROFICIENCY_LEVELS[o.value]} - ${o.label}` : o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button type="button" onClick={langHandlers.add} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t.addLanguage}
            </button>
          </div>
        );

      case 'awards':
        return (
          <div className="space-y-4">
            {form.awards.map((item, i) => (
              <RepeatableItem key={item._id} item={item} index={i} total={form.awards.length} onUpdate={awardHandlers.update} onRemove={awardHandlers.remove} onMove={awardHandlers.move}>
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={LABEL_CLS}>{t.fieldAwardTitle}</label><input type="text" value={it.title} onChange={(e) => upd({ title: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldIssuer}</label><input type="text" value={it.issuer ?? ''} onChange={(e) => upd({ issuer: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldDate}</label><input type="date" value={it.date ?? ''} onChange={(e) => upd({ date: e.target.value })} className={INPUT_CLS} /></div>
                    <div className="sm:col-span-2"><label className={LABEL_CLS}>{t.fieldDescription}</label><textarea value={it.description ?? ''} onChange={(e) => upd({ description: e.target.value })} rows={3} className={INPUT_CLS + ' resize-y'} /></div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button type="button" onClick={awardHandlers.add} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t.addAward}
            </button>
          </div>
        );

      case 'recommendations':
        return (
          <div className="space-y-4">
            {form.recommendations.map((item, i) => (
              <RepeatableItem key={item._id} item={item} index={i} total={form.recommendations.length} onUpdate={recHandlers.update} onRemove={recHandlers.remove} onMove={recHandlers.move}>
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={LABEL_CLS}>{t.fieldRecFullName}</label><input type="text" value={it.full_name} onChange={(e) => upd({ full_name: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldTitle}</label><input type="text" value={it.title ?? ''} onChange={(e) => upd({ title: e.target.value })} placeholder={t.fieldTitlePlaceholder} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldCompany}</label><input type="text" value={it.company ?? ''} onChange={(e) => upd({ company: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldEmail}</label><input type="email" value={it.email ?? ''} onChange={(e) => upd({ email: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldPhone}</label><input type="tel" value={it.phone ?? ''} onChange={(e) => upd({ phone: e.target.value })} placeholder={t.fieldPhonePlaceholder} className={INPUT_CLS} /></div>
                    <div className="sm:col-span-2"><label className={LABEL_CLS}>{t.fieldRecommendation}</label><textarea value={it.recommendation} onChange={(e) => upd({ recommendation: e.target.value })} rows={4} className={INPUT_CLS + ' resize-y'} /></div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button type="button" onClick={recHandlers.add} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t.addRecommendation}
            </button>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            {previewError && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300 w-full">
                  {previewError}
                </div>
                <button
                  type="button"
                  onClick={loadPreview}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t.previewLoadBtn}
                </button>
              </div>
            )}
            {previewLoading && (
              <div className="flex justify-center py-20">
                <svg className="w-8 h-8 text-white/30 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="ml-3 text-sm text-white/50 self-center">{t.previewLoading}</span>
              </div>
            )}
            {previewPdfUrl && !previewLoading && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={loadPreview}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t.previewLoadBtn}
                  </button>
                </div>
                <iframe
                  src={previewPdfUrl}
                  title="Resume PDF Preview"
                  className="w-full rounded-lg border border-gray-600"
                  style={{ height: '80vh' }}
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const activeSectionLabel = SECTIONS.find((s) => s.key === activeSection)?.label ?? '';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header
        containerClassName="max-w-6xl mx-auto"
        title={t.demoPageTitle}
        language={language}
        onLanguageChange={(lang) => setLanguage(lang)}
        backLabel={t.demoBackToHome}
        onBack={() => navigate('/')}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-12">
        {/* Page header */}
        <div className="flex items-center justify-end mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {/* Import JSON button */}
            <input
              ref={importFileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportJson}
            />
            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              className="flex items-center gap-2 border border-gray-600 hover:border-gray-500 text-white/70 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              title={t.importJson}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="hidden sm:inline">{t.importJson}</span>
            </button>

            {/* Clear button */}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 border border-gray-600 hover:border-gray-500 text-white/70 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t.demoClearBtn}
            </button>

            {/* Export button */}
            <div className="relative">
              {exportMenuOpen && (
                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
              )}
              <button
                type="button"
                onClick={() => setExportMenuOpen((o) => !o)}
                disabled={exporting}
                className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {exporting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    {t.exporting}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t.export}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-20 min-w-28">
                  <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors">
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    PDF
                  </button>
                  <button onClick={() => handleExport('html')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors">
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    HTML
                  </button>
                  <button onClick={() => handleExport('json')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors">
                    <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Import error */}
        {importError && (
          <div className="mb-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">{importError}</div>
        )}

        {/* Demo notice */}
        <div className="mb-5 rounded-lg border border-blue-500/30 bg-blue-900/20 px-4 py-3 text-sm text-blue-300 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>
            {t.demoNotice}{' '}
            <button onClick={() => navigate('/?auth=login')} className="underline hover:text-blue-200 transition-colors">{t.demoNoticeLoginLink}</button>
            {' '}{t.demoNoticeLoginSuffix}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="flex gap-6 items-start">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:block w-52 shrink-0 sticky top-20">
            <nav className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              {SECTIONS.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-gray-700/50 last:border-b-0 ${activeSection === section.key
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-gray-700'
                    }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile section picker */}
            <div className="lg:hidden mb-4">
              <select value={activeSection} onChange={(e) => setActiveSection(e.target.value as SectionKey)} className={INPUT_CLS}>
                {SECTIONS.map((section) => (
                  <option key={section.key} value={section.key}>{section.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h2 className="text-base font-semibold text-white mb-5">{activeSectionLabel}</h2>
              {renderSection()}
            </div>
          </div>
        </div>
      </div>

      {/* Clear confirm dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-lg" role="dialog" aria-modal="true">
            <h2 className="text-lg font-semibold text-white">{t.clearDialogTitle}</h2>
            <p className="mt-2 text-sm text-gray-300">{t.clearDialogBody}</p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setShowClearConfirm(false)} className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800">
                {t.cancel}
              </button>
              <button type="button" onClick={handleClear} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                {t.clearAll}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeToolView;
