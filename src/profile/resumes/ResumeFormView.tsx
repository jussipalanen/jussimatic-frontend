import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMe } from '../../api/authApi';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../../i18n';
import { PROFICIENCY_LEVELS } from '../../constants';
import type { Language } from '../../i18n';
import { toISODate } from '../../utils/dateUtils';
import {
  copyResume,
  createResume,
  exportResumePdf,
  exportResumeHtml,
  getExportOptions,
  getResume,
  updateResume,
  uploadResumePhoto,
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
import SkillCategorySelect from '../../components/SkillCategorySelect';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WithId<T> = T & { _id: string };

interface FormData {
  // personal
  title: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  portfolio_url: string;
  github_url: string;
  photo: string;
  language: string;
  is_primary: boolean;
  is_public: boolean;
  code: string;
  theme: string;
  template: string;
  // summary
  summary: string;
  // repeatable sections
  work_experiences: WithId<WorkExperience>[];
  educations: WithId<Education>[];
  skills: WithId<ResumeSkill>[];
  projects: WithId<Project & { technologies: string[] }>[];
  certifications: WithId<Certification>[];
  languages: WithId<ResumeLanguage>[];
  awards: WithId<Award>[];
  recommendations: WithId<Recommendation>[];
}

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
  _id: '', full_name: '', title: '', company: '', email: '', phone: '', recommendation: '', sort_order: 0,
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

// ---------------------------------------------------------------------------
// Shared input classes
// ---------------------------------------------------------------------------

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
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
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

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <span
          key={i}
          className="flex items-center gap-1 bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs px-2 py-0.5 rounded-full"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(i); }}
            className="text-blue-300 hover:text-white focus:outline-none"
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
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
  item,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  children,
}: RepeatableItemProps<T>) {
  const update = (partial: Partial<T>) => onUpdate(index, { ...item, ...partial });

  return (
    <div className="bg-gray-750 border border-gray-600 rounded-xl p-4 relative">
      {/* Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition-colors"
          aria-label="Move up"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition-colors"
          aria-label="Move down"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 text-red-400 hover:text-red-300 transition-colors"
          aria-label="Remove item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="pr-20">{children(item, update)}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers for repeatable arrays
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
// ---------------------------------------------------------------------------
// SpokenLanguageSelect — searchable combobox
// ---------------------------------------------------------------------------

function SpokenLanguageSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: ExportOption[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
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
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${opt.value === value
                  ? 'bg-blue-600/30 text-blue-300'
                  : 'text-white/80 hover:bg-gray-700'
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

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function PersonalSection({
  data,
  photoFile,
  onChange,
  onPhotoChange,
  onRemovePhoto,
  themes,
  templates,
  languages,
  username,
  t,
}: {
  data: FormData;
  photoFile: File | null;
  onChange: (partial: Partial<FormData>) => void;
  onPhotoChange: (file: File | null) => void;
  onRemovePhoto: () => void;
  themes: ExportOption[];
  templates: ExportOption[];
  languages: ExportOption[];
  username: string;
  t: (typeof translations)[typeof DEFAULT_LANGUAGE]['resumes'];
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(() => !!data.code);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photoFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const existingPhotoUrl = data.photo
    ? data.photo.startsWith('http')
      ? data.photo
      : `${(import.meta.env.VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL as string)?.replace(/\/+$/, '')}/${data.photo.replace(/^\/+/, '')}`
    : null;

  const thumbnailSrc = previewUrl ?? existingPhotoUrl;

  const field = (name: keyof FormData, label: string, type = 'text', placeholder = '') => (
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
      <div className="sm:col-span-2">
        {field('title', t.fieldResumeTitle, 'text', t.fieldResumeTitlePlaceholder)}
      </div>
      {field('full_name', t.fieldFullName, 'text', t.fieldFullNamePlaceholder)}
      {field('email', t.fieldEmail, 'email', t.fieldEmailPlaceholder)}
      {field('phone', t.fieldPhone, 'text', t.fieldPhonePlaceholder)}
      {field('location', t.fieldLocation, 'text', t.fieldLocationPlaceholder)}
      {field('linkedin_url', t.fieldLinkedIn, 'url', 'https://linkedin.com/in/username')}
      {field('portfolio_url', t.fieldPortfolio, 'url', 'https://yoursite.com')}
      {field('github_url', t.fieldGitHub, 'url', 'https://github.com/username')}

      {/* Resume language */}
      <div>
        <label className={LABEL_CLS}>{t.fieldResumeLanguage} *</label>
        <select
          value={data.language}
          onChange={(e) => onChange({ language: e.target.value })}
          className={INPUT_CLS}
        >
          <option value="">{t.fieldResumeLanguagePlaceholder}</option>
          {languages.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Template */}
      <div>
        <label className={LABEL_CLS}>{t.fieldTemplate}</label>
        <select value={data.template} onChange={(e) => onChange({ template: e.target.value })} className={INPUT_CLS}>
          <option value="">{t.fieldTemplatePlaceholder}</option>
          {templates.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Theme color */}
      <div>
        <label className={LABEL_CLS}>{t.fieldTheme}</label>
        <select value={data.theme} onChange={(e) => onChange({ theme: e.target.value })} className={INPUT_CLS}>
          <option value="">{t.fieldThemePlaceholder}</option>
          {themes.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Photo upload */}
      <div className="sm:col-span-2">
        <label className={LABEL_CLS}>{t.fieldPhoto}</label>
        <div className="flex items-start gap-4">
          {thumbnailSrc && (
            <div className="relative shrink-0">
              <img
                src={thumbnailSrc}
                alt="Profile photo preview"
                className="w-20 h-20 rounded-xl object-cover border border-gray-600"
              />
              <button
                type="button"
                onClick={() => {
                  onPhotoChange(null);
                  onChange({ photo: '' });
                  onRemovePhoto();
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-colors"
                aria-label="Remove photo"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-white/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:text-white file:bg-gray-700 hover:file:bg-gray-600 file:cursor-pointer"
            />
            {photoFile && (
              <p className="text-xs text-green-400 mt-1">{t.fieldPhotoSelected}: {photoFile.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Visibility & Access Code */}
      <div className="sm:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <label className={LABEL_CLS + ' mb-0'}>{t.fieldResumeVisibility}</label>
          <button
            type="button"
            onClick={() => onChange({ is_public: !data.is_public })}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border transition-colors ${data.is_public
              ? 'bg-green-500/20 border-green-500/50 text-green-400'
              : 'border-gray-600 text-white/40 hover:text-white/70 hover:border-gray-500'
              }`}
          >
            {data.is_public ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            {data.is_public ? t.visibilityPublic : t.visibilityPrivate}
          </button>
        </div>
        <label className={LABEL_CLS}>{t.fieldResumeCode}</label>
        <div className="relative">
          <input
            type={showCode ? 'text' : 'password'}
            value={data.code}
            onChange={(e) => onChange({ code: e.target.value })}
            placeholder={t.fieldResumeCodePlaceholder}
            autoComplete="off"
            className={INPUT_CLS + ' pr-10'}
          />
          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-white/40 hover:text-white/70 transition-colors"
            tabIndex={-1}
            aria-label={showCode ? 'Hide code' : 'Show code'}
          >
            {showCode ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <div className="mt-2 rounded-lg bg-gray-800/60 border border-gray-700 px-3 py-2 text-xs text-white/50 space-y-1">
          <p>{t.resumeCodeDesc}</p>
          <button
            type="button"
            onClick={() => {
              const url = `${(import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL as string)?.replace(/\/+$/, '')}/resumes/current?owner=${username || 'owner'}${data.code ? `&code=${data.code}` : ''}`;
              navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="flex items-center gap-1.5 w-full text-left group"
            title="Click to copy"
          >
            <code className="block font-mono text-white/30 break-all group-hover:text-white/50 transition-colors flex-1">
              {(import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL as string)?.replace(/\/+$/, '')}/resumes/current?owner={username || 'owner'}{data.code ? `&code=${data.code}` : ''}
            </code>
            <span className="shrink-0 ml-1">
              {copied ? (
                <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SummarySection({
  data,
  onChange,
  t,
}: {
  data: FormData;
  onChange: (partial: Partial<FormData>) => void;
  t: (typeof translations)[typeof DEFAULT_LANGUAGE]['resumes'];
}) {
  return (
    <div>
      <label className={LABEL_CLS}>{t.fieldSummary}</label>
      <textarea
        value={data.summary}
        onChange={(e) => onChange({ summary: e.target.value })}
        placeholder={t.fieldSummaryPlaceholder}
        rows={6}
        className={INPUT_CLS + ' resize-y'}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main form view
// ---------------------------------------------------------------------------

function ResumeFormView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = !!id;

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

  const VALID_SECTIONS = new Set<SectionKey>(['personal', 'summary', 'work_experiences', 'educations', 'skills', 'projects', 'certifications', 'languages', 'awards', 'recommendations']);
  const hashSection = window.location.hash.replace('#', '') as SectionKey;
  const [activeSection, setActiveSection] = useState<SectionKey>(
    VALID_SECTIONS.has(hashSection) ? hashSection : 'personal'
  );
  const navigateSection = (key: SectionKey) => {
    setActiveSection(key);
    window.location.hash = key;
  };
  const [exportOptions, setExportOptions] = useState<ExportOptions>({ themes: [], templates: [], languages: [], skill_categories: [], skill_proficiencies: [], language_proficiencies: [], spoken_languages: [] });
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    getMe()
      .then((me) => {
        // /me returns { user_id, user: { username, ... } } — username is nested
        const nested = me.user as Record<string, unknown> | undefined;
        const name = (nested?.username ?? me.username ?? '') as string;
        setUsername(name);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    getExportOptions(language)
      .then((opts) => setExportOptions(opts))
      .catch(() => { /* options unavailable, dropdowns will be empty */ });
  }, [language]);

  const [form, setForm] = useState<FormData>({
    title: '',
    full_name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    portfolio_url: '',
    github_url: '',
    photo: '',
    language: '',
    is_primary: false,
    is_public: false,
    code: '',
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
  });

  // Load existing resume when editing
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    if (!isEditing) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resume = await getResume(Number(id));
        setForm({
          title: resume.title ?? '',
          full_name: resume.full_name ?? '',
          email: resume.email ?? '',
          phone: resume.phone ?? '',
          location: resume.location ?? '',
          linkedin_url: resume.linkedin_url ?? '',
          portfolio_url: resume.portfolio_url ?? '',
          github_url: resume.github_url ?? '',
          photo: resume.photo ?? '',
          language: resume.language ?? '',
          is_primary: resume.is_primary ?? false,
          is_public: resume.is_public ?? false,
          code: resume.code ?? '',
          theme: resume.theme ?? '',
          template: resume.template ?? '',
          summary: resume.summary ?? '',
          work_experiences: (resume.work_experiences ?? []).map((e) => ({
            ...e,
            _id: uid(),
            start_date: toISODate(e.start_date),
            end_date: toISODate(e.end_date),
          })),
          educations: (resume.educations ?? []).map((e) => ({ ...e, _id: uid() })),
          skills: (resume.skills ?? []).map((e) => ({ ...e, _id: uid() })),
          projects: (resume.projects ?? []).map((e) => ({
            ...e,
            technologies: e.technologies ?? [],
            _id: uid(),
          })),
          certifications: (resume.certifications ?? []).map((e) => ({
            ...e,
            _id: uid(),
            issue_date: toISODate(e.issue_date),
          })),
          languages: (resume.languages ?? []).map((e) => ({ ...e, _id: uid() })),
          awards: (resume.awards ?? []).map((e) => ({
            ...e,
            _id: uid(),
            date: toISODate(e.date),
          })),
          recommendations: (resume.recommendations ?? []).map((e) => ({ ...e, _id: uid() })),
        });
        setRemovePhoto(false);
        setPhotoFile(null);
      } catch (err) {
        console.error('Failed to load resume:', err);
        setError(t.errLoadResume);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEditing, navigate, t.errLoadResume]);

  const patch = (partial: Partial<FormData>) => setForm((prev) => ({ ...prev, ...partial }));

  // ---- Repeatable helpers ---------------------------------------------------
  const makeRepeatableHandlers = <T extends { _id: string; sort_order?: number }>(
    key: keyof Pick<
      FormData,
      'work_experiences' | 'educations' | 'skills' | 'projects' | 'certifications' | 'languages' | 'awards' | 'recommendations'
    >,
    emptyTemplate: T,
  ) => ({
    add: () =>
      setForm((prev) => ({
        ...prev,
        [key]: [...(prev[key] as unknown as T[]), newItem(emptyTemplate)],
      })),
    update: (index: number, item: T) =>
      setForm((prev) => ({
        ...prev,
        [key]: listUpdate(prev[key] as unknown as T[], index, item),
      })),
    remove: (index: number) =>
      setForm((prev) => ({
        ...prev,
        [key]: listRemove(prev[key] as unknown as T[], index),
      })),
    move: (index: number, direction: -1 | 1) =>
      setForm((prev) => ({
        ...prev,
        [key]: listMove(prev[key] as unknown as T[], index, direction),
      })),
  });

  const workHandlers = makeRepeatableHandlers('work_experiences', EMPTY_WORK);
  const edHandlers = makeRepeatableHandlers('educations', EMPTY_EDUCATION);
  const skillHandlers = makeRepeatableHandlers('skills', EMPTY_SKILL);
  const projectHandlers = makeRepeatableHandlers('projects', EMPTY_PROJECT);
  const certHandlers = makeRepeatableHandlers('certifications', EMPTY_CERTIFICATION);
  const langHandlers = makeRepeatableHandlers('languages', EMPTY_LANGUAGE);
  const awardHandlers = makeRepeatableHandlers('awards', EMPTY_AWARD);
  const recHandlers = makeRepeatableHandlers('recommendations', EMPTY_RECOMMENDATION);

  // ---- Submit ---------------------------------------------------------------
  const handleExport = async (format: 'pdf' | 'html') => {
    if (!id) return;
    setExportMenuOpen(false);
    setExporting(true);
    setError(null);
    try {
      if (format === 'pdf') await exportResumePdf(Number(id));
      else await exportResumeHtml(Number(id));
    } catch (err) {
      console.error(`Failed to export ${format.toUpperCase()}:`, err);
      setError(t.errExportResume);
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!id) return;
    setCopying(true);
    setError(null);
    try {
      const created = await copyResume(Number(id));
      navigate(`/profile/resumes/${created.id}`);
    } catch (err) {
      console.error('Failed to copy resume:', err);
      setError(t.errCopyResume);
    } finally {
      setCopying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.language) {
      setError(t.errLanguageRequired);
      navigateSection('personal');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload: ResumePayload = {
        title: form.title,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
        location: form.location || undefined,
        linkedin_url: form.linkedin_url || undefined,
        portfolio_url: form.portfolio_url || undefined,
        github_url: form.github_url || undefined,
        language: form.language || undefined,
        is_primary: form.is_primary,
        is_public: form.is_public,
        code: form.code.trim() || null,
        theme: form.theme || undefined,
        template: form.template || undefined,
        summary: form.summary || undefined,
        ...(removePhoto && !photoFile ? { photo: null } : {}),
        work_experiences: form.work_experiences.map(({ _id, ...rest }, i) => ({
          ...rest,
          sort_order: i,
        })),
        educations: form.educations.map(({ _id, ...rest }, i) => ({
          ...rest,
          sort_order: i,
        })),
        skills: form.skills.map(({ _id, ...rest }, i) => ({
          ...rest,
          sort_order: i,
        })),
        projects: form.projects.map(({ _id, ...rest }, i) => ({
          ...rest,
          sort_order: i,
        })),
        certifications: form.certifications.map(({ _id, ...rest }, i) => ({
          ...rest,
          sort_order: i,
        })),
        languages: form.languages.map(({ _id, ...rest }, i) => ({
          ...rest,
          sort_order: i,
        })),
        awards: form.awards.map(({ _id, ...rest }, i) => ({
          ...rest,
          sort_order: i,
        })),
        recommendations: form.recommendations.map(({ _id, ...rest }, i) => ({
          ...rest,
          sort_order: i,
        })),
      };

      if (isEditing) {
        const saved = await updateResume(Number(id), payload);
        if (photoFile) {
          const withPhoto = await uploadResumePhoto(Number(id), photoFile);
          patch({ photo: withPhoto.photo ?? '' });
          setPhotoFile(null);
        } else {
          patch({ photo: saved.photo ?? '' });
        }
        setRemovePhoto(false);
        setSuccessMsg(t.saved);
      } else {
        const created = await createResume(payload);
        if (photoFile) {
          await uploadResumePhoto(created.id, photoFile);
        }
        setSuccessMsg(t.created);
        navigate(`/profile/resumes/${created.id}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to save resume:', err);
      setError(t.errSaveResume);
    } finally {
      setSaving(false);
    }
  };

  // ---- Section content -------------------------------------------------------
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <PersonalSection
            data={form}
            photoFile={photoFile}
            onChange={patch}
            onPhotoChange={setPhotoFile}
            onRemovePhoto={() => setRemovePhoto(true)}
            themes={exportOptions.themes}
            templates={exportOptions.templates}
            languages={exportOptions.languages}
            username={username}
            t={t}
          />
        );

      case 'summary':
        return <SummarySection data={form} onChange={patch} t={t} />;

      case 'work_experiences':
        return (
          <div className="space-y-4">
            {form.work_experiences.map((item, i) => (
              <RepeatableItem
                key={item._id}
                item={item}
                index={i}
                total={form.work_experiences.length}
                onUpdate={workHandlers.update}
                onRemove={workHandlers.remove}
                onMove={workHandlers.move}
              >
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLS}>{t.fieldJobTitle}</label>
                      <input type="text" value={it.job_title} onChange={(e) => upd({ job_title: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldCompanyName}</label>
                      <input type="text" value={it.company_name} onChange={(e) => upd({ company_name: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>{t.fieldLocation}</label>
                      <input type="text" value={it.location ?? ''} onChange={(e) => upd({ location: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldStartDate}</label>
                      <input type="date" value={it.start_date} onChange={(e) => upd({ start_date: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div className="flex flex-col justify-end gap-2">
                      <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!it.is_current}
                          onChange={(e) => upd({ is_current: e.target.checked, end_date: e.target.checked ? '' : it.end_date })}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                        />
                        {t.fieldCurrentlyWorking}
                      </label>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldEndDate}</label>
                      <input
                        type="date"
                        value={it.end_date ?? ''}
                        onChange={(e) => upd({ end_date: e.target.value })}
                        disabled={!!it.is_current}
                        className={INPUT_CLS + (it.is_current ? ' opacity-40 cursor-not-allowed' : '')}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>{t.fieldDescription}</label>
                      <textarea
                        value={it.description ?? ''}
                        onChange={(e) => upd({ description: e.target.value })}
                        placeholder={t.fieldDescriptionPlaceholder}
                        rows={3}
                        className={INPUT_CLS + ' resize-y'}
                      />
                    </div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button
              type="button"
              onClick={workHandlers.add}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.addWorkExperience}
            </button>
          </div>
        );

      case 'educations':
        return (
          <div className="space-y-4">
            {form.educations.map((item, i) => (
              <RepeatableItem
                key={item._id}
                item={item}
                index={i}
                total={form.educations.length}
                onUpdate={edHandlers.update}
                onRemove={edHandlers.remove}
                onMove={edHandlers.move}
              >
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLS}>{t.fieldDegree}</label>
                      <input type="text" value={it.degree} onChange={(e) => upd({ degree: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldFieldOfStudy}</label>
                      <input type="text" value={it.field_of_study} onChange={(e) => upd({ field_of_study: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldInstitution}</label>
                      <input type="text" value={it.institution_name} onChange={(e) => upd({ institution_name: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldLocation}</label>
                      <input type="text" value={it.location ?? ''} onChange={(e) => upd({ location: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldGraduationYear}</label>
                      <select
                        value={it.graduation_year ?? ''}
                        onChange={(e) => upd({ graduation_year: e.target.value ? Number(e.target.value) : undefined })}
                        className={INPUT_CLS}
                      >
                        <option value="">—</option>
                        {Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldGPA}</label>
                      <input
                        type="number"
                        value={it.gpa ?? ''}
                        onChange={(e) => upd({ gpa: e.target.value ? Number(e.target.value) : undefined })}
                        min={0}
                        max={10}
                        step={0.01}
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button
              type="button"
              onClick={edHandlers.add}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.addEducation}
            </button>
          </div>
        );

      case 'skills':
        return (
          <div className="space-y-4">
            {form.skills.map((item, i) => (
              <RepeatableItem
                key={item._id}
                item={item}
                index={i}
                total={form.skills.length}
                onUpdate={skillHandlers.update}
                onRemove={skillHandlers.remove}
                onMove={skillHandlers.move}
              >
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <SkillCategorySelect
                        value={it.category}
                        onChange={(val) => upd({ category: val })}
                        options={exportOptions.skill_categories}
                        label={t.fieldCategory}
                        placeholder={t.fieldCategoryPlaceholder}
                        inputCls={INPUT_CLS}
                        labelCls={LABEL_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldSkillName}</label>
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => upd({ name: e.target.value })}
                        placeholder={t.fieldSkillNamePlaceholder}
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldProficiency}</label>
                      <select
                        value={it.proficiency}
                        onChange={(e) => upd({ proficiency: e.target.value as ResumeSkill['proficiency'] })}
                        className={INPUT_CLS}
                      >
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
            <button
              type="button"
              onClick={skillHandlers.add}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.addSkill}
            </button>
          </div>
        );

      case 'projects':
        return (
          <div className="space-y-4">
            {form.projects.map((item, i) => (
              <RepeatableItem
                key={item._id}
                item={item}
                index={i}
                total={form.projects.length}
                onUpdate={projectHandlers.update as (index: number, item: WithId<Project & { technologies: string[] }>) => void}
                onRemove={projectHandlers.remove}
                onMove={projectHandlers.move}
              >
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>{t.fieldProjectName}</label>
                      <input type="text" value={it.name} onChange={(e) => upd({ name: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>{t.fieldDescription}</label>
                      <textarea
                        value={it.description ?? ''}
                        onChange={(e) => upd({ description: e.target.value })}
                        rows={3}
                        className={INPUT_CLS + ' resize-y'}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>{t.fieldTechnologies}</label>
                      <TagInput
                        value={it.technologies}
                        onChange={(tags) => upd({ technologies: tags })}
                        placeholder={t.fieldTechnologiesPlaceholder}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldLiveURL}</label>
                      <input type="url" value={it.live_url ?? ''} onChange={(e) => upd({ live_url: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldGitHub}</label>
                      <input type="url" value={it.github_url ?? ''} onChange={(e) => upd({ github_url: e.target.value })} className={INPUT_CLS} />
                    </div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button
              type="button"
              onClick={projectHandlers.add}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.addProject}
            </button>
          </div>
        );

      case 'certifications':
        return (
          <div className="space-y-4">
            {form.certifications.map((item, i) => (
              <RepeatableItem
                key={item._id}
                item={item}
                index={i}
                total={form.certifications.length}
                onUpdate={certHandlers.update}
                onRemove={certHandlers.remove}
                onMove={certHandlers.move}
              >
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLS}>{t.fieldCertName}</label>
                      <input type="text" value={it.name} onChange={(e) => upd({ name: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldIssuingOrg}</label>
                      <input type="text" value={it.issuing_organization} onChange={(e) => upd({ issuing_organization: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldIssueDate}</label>
                      <input type="date" value={it.issue_date ?? ''} onChange={(e) => upd({ issue_date: e.target.value })} className={INPUT_CLS} />
                    </div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button
              type="button"
              onClick={certHandlers.add}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.addCertification}
            </button>
          </div>
        );

      case 'languages':
        return (
          <div className="space-y-4">
            {form.languages.map((item, i) => (
              <RepeatableItem
                key={item._id}
                item={item}
                index={i}
                total={form.languages.length}
                onUpdate={langHandlers.update}
                onRemove={langHandlers.remove}
                onMove={langHandlers.move}
              >
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLS}>{t.fieldLanguage}</label>
                      <SpokenLanguageSelect
                        value={it.language}
                        onChange={(val) => upd({ language: val })}
                        options={exportOptions.spoken_languages}
                        placeholder={t.fieldLanguagePlaceholder}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldProficiency}</label>
                      <select
                        value={it.proficiency}
                        onChange={(e) => upd({ proficiency: e.target.value as ResumeLanguage['proficiency'] })}
                        className={INPUT_CLS}
                      >
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
            <button
              type="button"
              onClick={langHandlers.add}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.addLanguage}
            </button>
          </div>
        );

      case 'awards':
        return (
          <div className="space-y-4">
            {form.awards.map((item, i) => (
              <RepeatableItem
                key={item._id}
                item={item}
                index={i}
                total={form.awards.length}
                onUpdate={awardHandlers.update}
                onRemove={awardHandlers.remove}
                onMove={awardHandlers.move}
              >
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLS}>{t.fieldAwardTitle}</label>
                      <input type="text" value={it.title} onChange={(e) => upd({ title: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldIssuer}</label>
                      <input type="text" value={it.issuer ?? ''} onChange={(e) => upd({ issuer: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldDate}</label>
                      <input type="date" value={it.date ?? ''} onChange={(e) => upd({ date: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>{t.fieldDescription}</label>
                      <textarea
                        value={it.description ?? ''}
                        onChange={(e) => upd({ description: e.target.value })}
                        rows={3}
                        className={INPUT_CLS + ' resize-y'}
                      />
                    </div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button
              type="button"
              onClick={awardHandlers.add}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.addAward}
            </button>
          </div>
        );

      case 'recommendations':
        return (
          <div className="space-y-4">
            {form.recommendations.map((item, i) => (
              <RepeatableItem
                key={item._id}
                item={item}
                index={i}
                total={form.recommendations.length}
                onUpdate={recHandlers.update}
                onRemove={recHandlers.remove}
                onMove={recHandlers.move}
              >
                {(it, upd) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLS}>{t.fieldRecFullName}</label>
                      <input type="text" value={it.full_name} onChange={(e) => upd({ full_name: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldTitle}</label>
                      <input type="text" value={it.title ?? ''} onChange={(e) => upd({ title: e.target.value })} className={INPUT_CLS} placeholder={t.fieldTitlePlaceholder} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldCompany}</label>
                      <input type="text" value={it.company ?? ''} onChange={(e) => upd({ company: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldEmail}</label>
                      <input type="email" value={it.email ?? ''} onChange={(e) => upd({ email: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t.fieldPhone}</label>
                      <input type="tel" value={it.phone ?? ''} onChange={(e) => upd({ phone: e.target.value })} className={INPUT_CLS} placeholder={t.fieldPhonePlaceholder} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>{t.fieldRecommendation}</label>
                      <textarea
                        value={it.recommendation}
                        onChange={(e) => upd({ recommendation: e.target.value })}
                        rows={4}
                        className={INPUT_CLS + ' resize-y'}
                      />
                    </div>
                  </div>
                )}
              </RepeatableItem>
            ))}
            <button
              type="button"
              onClick={recHandlers.add}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile/resumes')}
              className="text-white/50 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t.backToResumes}
            </button>
            <span className="text-white/30">/</span>
            <h1 className="text-lg font-semibold text-white">
              {isEditing ? (form.title || t.editResume) : t.newResumeTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isEditing && (
              <button
                type="button"
                onClick={handleCopy}
                disabled={copying || saving || exporting}
                className="flex items-center gap-2 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                title="Duplicate this resume"
              >
                {copying ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="hidden sm:inline">{t.copying2}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">{t.copy}</span>
                  </>
                )}
              </button>
            )}
            {isEditing && (
              <div className="relative">
                {exportMenuOpen && (
                  <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                )}
                <button
                  type="button"
                  onClick={() => setExportMenuOpen((o) => !o)}
                  disabled={exporting || saving}
                  className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  title="Export resume"
                >
                  {exporting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span className="hidden sm:inline">{t.exporting}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="hidden sm:inline">{t.export}</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-20 min-w-28">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDF
                    </button>
                    <button
                      onClick={() => handleExport('html')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      HTML
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Primary toggle */}
            <button
              type="button"
              onClick={() => patch({ is_primary: !form.is_primary })}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${form.is_primary
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
                : 'border-gray-600 text-white/50 hover:text-white hover:border-gray-500'
                }`}
              title={t.fieldIsPrimary}
            >
              <svg className="w-4 h-4" fill={form.is_primary ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="hidden sm:inline">{t.setPrimary}</span>
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="hidden sm:inline">{t.exporting}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="hidden sm:inline">{t.saveResume}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-lg bg-green-900/40 border border-green-700 px-4 py-3 text-sm text-green-300">
            {successMsg}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="w-8 h-8 text-white/30 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-6 items-start">
            {/* Sidebar — desktop */}
            <aside className="hidden lg:block w-52 shrink-0 sticky top-20">
              <nav className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                {SECTIONS.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => navigateSection(section.key)}
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
                <select
                  value={activeSection}
                  onChange={(e) => navigateSection(e.target.value as SectionKey)}
                  className={INPUT_CLS}
                >
                  {SECTIONS.map((section) => (
                    <option key={section.key} value={section.key}>
                      {section.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section panel */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h2 className="text-base font-semibold text-white mb-5">{activeSectionLabel}</h2>
                {renderSectionContent()}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResumeFormView;
