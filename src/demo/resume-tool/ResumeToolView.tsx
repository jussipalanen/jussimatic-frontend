import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../../i18n';
import type { Language } from '../../i18n';
import {
  exportResumePdfPublic,
  exportResumeHtmlPublic,
  getExportOptions,
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
  WorkExperience,
} from '../../api/resumesApi';
import NavBar from '../../components/NavBar';

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
  | 'recommendations';

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

function PersonalSection({ data, onChange, t, themes, templates, languages }: {
  data: FormData;
  onChange: (partial: Partial<FormData>) => void;
  t: (typeof translations)[typeof DEFAULT_LANGUAGE]['resumes'];
  themes: ExportOption[];
  templates: ExportOption[];
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
      {/* Template */}
      <div>
        <label className={LABEL_CLS}>{t.fieldTemplate} *</label>
        <select value={data.template} onChange={(e) => onChange({ template: e.target.value })} className={INPUT_CLS}>
          <option value="">{t.fieldTemplatePlaceholder}</option>
          {templates.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {/* Theme color */}
      <div>
        <label className={LABEL_CLS}>{t.fieldTheme} *</label>
        <select value={data.theme} onChange={(e) => onChange({ theme: e.target.value })} className={INPUT_CLS}>
          <option value="">{t.fieldThemePlaceholder}</option>
          {themes.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
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
  const navigate = useNavigate();
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
  ];

  useEffect(() => {
    const handler = (e: Event) => {
      const lang = (e as CustomEvent<Language>).detail;
      setLanguage(lang);
    };
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);
  const [activeSection, setActiveSection] = useState<SectionKey>('personal');
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [exportOptions, setExportOptions] = useState<ExportOptions>({ themes: [], templates: [], languages: [] });
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const patch = (partial: Partial<FormData>) => setForm((prev) => ({ ...prev, ...partial }));

  // Persist form to sessionStorage so a page refresh doesn't wipe the work
  useEffect(() => {
    getExportOptions(language)
      .then((opts) => setExportOptions(opts))
      .catch(() => {});
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
    summary: form.summary || undefined,
    work_experiences: form.work_experiences.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
    educations: form.educations.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
    skills: form.skills.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
    projects: form.projects.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
    certifications: form.certifications.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
    languages: form.languages.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
    awards: form.awards.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
    recommendations: form.recommendations.map(({ _id, ...rest }, i) => ({ ...rest, sort_order: i })),
  });

  // ---- Export --------------------------------------------------------------
  const handleExport = async (format: 'pdf' | 'html') => {
    setExportMenuOpen(false);

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
        return <PersonalSection data={form} onChange={patch} t={t} themes={exportOptions.themes} templates={exportOptions.templates} languages={exportOptions.languages} />;

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
                    <div><label className={LABEL_CLS}>{t.fieldJobTitle} *</label><input type="text" value={it.job_title} onChange={(e) => upd({ job_title: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldCompanyName} *</label><input type="text" value={it.company_name} onChange={(e) => upd({ company_name: e.target.value })} className={INPUT_CLS} /></div>
                    <div className="sm:col-span-2"><label className={LABEL_CLS}>{t.fieldLocation}</label><input type="text" value={it.location ?? ''} onChange={(e) => upd({ location: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldStartDate} *</label><input type="date" value={it.start_date} onChange={(e) => upd({ start_date: e.target.value })} className={INPUT_CLS} /></div>
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
                    <div><label className={LABEL_CLS}>{t.fieldDegree} *</label><input type="text" value={it.degree} onChange={(e) => upd({ degree: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldFieldOfStudy} *</label><input type="text" value={it.field_of_study} onChange={(e) => upd({ field_of_study: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldInstitution} *</label><input type="text" value={it.institution_name} onChange={(e) => upd({ institution_name: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldLocation}</label><input type="text" value={it.location ?? ''} onChange={(e) => upd({ location: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldGraduationYear}</label><input type="number" value={it.graduation_year ?? ''} onChange={(e) => upd({ graduation_year: e.target.value ? Number(e.target.value) : undefined })} min={1900} max={2100} className={INPUT_CLS} /></div>
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
            {form.skills.map((item, i) => (
              <RepeatableItem key={item._id} item={item} index={i} total={form.skills.length} onUpdate={skillHandlers.update} onRemove={skillHandlers.remove} onMove={skillHandlers.move}>
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className={LABEL_CLS}>{t.fieldCategory} *</label><input type="text" value={it.category} onChange={(e) => upd({ category: e.target.value })} placeholder={t.fieldCategoryPlaceholder} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldSkillName} *</label><input type="text" value={it.name} onChange={(e) => upd({ name: e.target.value })} placeholder={t.fieldSkillNamePlaceholder} className={INPUT_CLS} /></div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldProficiency} *</label>
                      <select value={it.proficiency} onChange={(e) => upd({ proficiency: e.target.value as ResumeSkill['proficiency'] })} className={INPUT_CLS}>
                        <option value="beginner">{t.proficiencyBeginner}</option>
                        <option value="intermediate">{t.proficiencyIntermediate}</option>
                        <option value="expert">{t.proficiencyExpert}</option>
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
                    <div className="sm:col-span-2"><label className={LABEL_CLS}>{t.fieldProjectName} *</label><input type="text" value={it.name} onChange={(e) => upd({ name: e.target.value })} className={INPUT_CLS} /></div>
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
                    <div><label className={LABEL_CLS}>{t.fieldCertName} *</label><input type="text" value={it.name} onChange={(e) => upd({ name: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldIssuingOrg} *</label><input type="text" value={it.issuing_organization} onChange={(e) => upd({ issuing_organization: e.target.value })} className={INPUT_CLS} /></div>
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
            {form.languages.map((item, i) => (
              <RepeatableItem key={item._id} item={item} index={i} total={form.languages.length} onUpdate={langHandlers.update} onRemove={langHandlers.remove} onMove={langHandlers.move}>
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={LABEL_CLS}>{t.fieldLanguage} *</label><input type="text" value={it.language} onChange={(e) => upd({ language: e.target.value })} placeholder={t.fieldLanguagePlaceholder} className={INPUT_CLS} /></div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldProficiency} *</label>
                      <select value={it.proficiency} onChange={(e) => upd({ proficiency: e.target.value as ResumeLanguage['proficiency'] })} className={INPUT_CLS}>
                        <option value="native">{t.langNative}</option>
                        <option value="fluent">{t.langFluent}</option>
                        <option value="conversational">{t.langConversational}</option>
                        <option value="basic">{t.langBasic}</option>
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
                    <div><label className={LABEL_CLS}>{t.fieldAwardTitle} *</label><input type="text" value={it.title} onChange={(e) => upd({ title: e.target.value })} className={INPUT_CLS} /></div>
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
                    <div><label className={LABEL_CLS}>{t.fieldRecFullName} *</label><input type="text" value={it.full_name} onChange={(e) => upd({ full_name: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldTitle}</label><input type="text" value={it.title ?? ''} onChange={(e) => upd({ title: e.target.value })} placeholder={t.fieldTitlePlaceholder} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldCompany}</label><input type="text" value={it.company ?? ''} onChange={(e) => upd({ company: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>{t.fieldEmail}</label><input type="email" value={it.email ?? ''} onChange={(e) => upd({ email: e.target.value })} className={INPUT_CLS} /></div>
                    <div className="sm:col-span-2"><label className={LABEL_CLS}>{t.fieldRecommendation} *</label><textarea value={it.recommendation} onChange={(e) => upd({ recommendation: e.target.value })} rows={4} className={INPUT_CLS + ' resize-y'} /></div>
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

      default:
        return null;
    }
  };

  const activeSectionLabel = SECTIONS.find((s) => s.key === activeSection)?.label ?? '';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <NavBar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-12">
        {/* Page header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-white/50 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t.demoBackToHome}
            </button>
            <span className="text-white/30">/</span>
            <h1 className="text-lg font-semibold text-white">{t.demoPageTitle}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-600/20 border border-green-500/30 text-green-300 font-medium">{t.demoBadge}</span>
          </div>

          <div className="flex items-center gap-2">
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
                </div>
              )}
            </div>
          </div>
        </div>

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
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-gray-700/50 last:border-b-0 ${
                    activeSection === section.key
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
