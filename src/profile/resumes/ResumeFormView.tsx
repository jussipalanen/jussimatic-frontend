import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  copyResume,
  createResume,
  exportResumePdf,
  exportResumeHtml,
  getResume,
  updateResume,
} from '../../api/resumesApi';
import type {
  Award,
  Certification,
  Education,
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

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'personal', label: 'Personal Information' },
  { key: 'summary', label: 'Professional Summary' },
  { key: 'work_experiences', label: 'Work Experience' },
  { key: 'educations', label: 'Education' },
  { key: 'skills', label: 'Skills' },
  { key: 'projects', label: 'Projects' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'languages', label: 'Languages' },
  { key: 'awards', label: 'Awards & Achievements' },
  { key: 'recommendations', label: 'Recommendations' },
];

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
// Section renderers
// ---------------------------------------------------------------------------

function PersonalSection({
  data,
  photoFile,
  onChange,
  onPhotoChange,
}: {
  data: FormData;
  photoFile: File | null;
  onChange: (partial: Partial<FormData>) => void;
  onPhotoChange: (file: File | null) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
      : `${(import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL as string)?.replace(/\/+$/, '')}/${data.photo.replace(/^\/+/, '')}`
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
        {field('title', 'Resume Title *', 'text', 'e.g. Software Engineer CV')}
      </div>
      {field('full_name', 'Full Name *', 'text', 'Jussi Palanen')}
      {field('email', 'Email *', 'email', 'jussi@example.com')}
      {field('phone', 'Phone', 'text', '+358401234567')}
      {field('location', 'Location', 'text', 'Helsinki, Finland')}
      {field('linkedin_url', 'LinkedIn URL', 'url', 'https://linkedin.com/in/username')}
      {field('portfolio_url', 'Portfolio / Website', 'url', 'https://yoursite.com')}
      {field('github_url', 'GitHub URL', 'url', 'https://github.com/username')}

      {/* Resume language */}
      <div>
        <label className={LABEL_CLS}>Resume Language</label>
        <select
          value={data.language}
          onChange={(e) => onChange({ language: e.target.value })}
          className={INPUT_CLS}
        >
          <option value="">Select language</option>
          <option value="en">English</option>
          <option value="fi">Finnish (Suomi)</option>
          <option value="sv">Swedish (Svenska)</option>
          <option value="de">German (Deutsch)</option>
          <option value="fr">French (Français)</option>
          <option value="es">Spanish (Español)</option>
        </select>
      </div>

      {/* Photo upload */}
      <div className="sm:col-span-2">
        <label className={LABEL_CLS}>Profile Photo</label>
        <div className="flex items-start gap-4">
          {thumbnailSrc && (
            <img
              src={thumbnailSrc}
              alt="Profile photo preview"
              className="w-20 h-20 rounded-xl object-cover border border-gray-600 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-white/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:text-white file:bg-gray-700 hover:file:bg-gray-600 file:cursor-pointer"
            />
            {photoFile && (
              <p className="text-xs text-green-400 mt-1">Selected: {photoFile.name}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummarySection({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (partial: Partial<FormData>) => void;
}) {
  return (
    <div>
      <label className={LABEL_CLS}>Summary</label>
      <textarea
        value={data.summary}
        onChange={(e) => onChange({ summary: e.target.value })}
        placeholder="A short bio or objective paragraph..."
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

  const [activeSection, setActiveSection] = useState<SectionKey>('personal');
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

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
          summary: resume.summary ?? '',
          work_experiences: (resume.work_experiences ?? []).map((e) => ({ ...e, _id: uid() })),
          educations: (resume.educations ?? []).map((e) => ({ ...e, _id: uid() })),
          skills: (resume.skills ?? []).map((e) => ({ ...e, _id: uid() })),
          projects: (resume.projects ?? []).map((e) => ({
            ...e,
            technologies: e.technologies ?? [],
            _id: uid(),
          })),
          certifications: (resume.certifications ?? []).map((e) => ({ ...e, _id: uid() })),
          languages: (resume.languages ?? []).map((e) => ({ ...e, _id: uid() })),
          awards: (resume.awards ?? []).map((e) => ({ ...e, _id: uid() })),
          recommendations: (resume.recommendations ?? []).map((e) => ({ ...e, _id: uid() })),
        });
      } catch (err) {
        console.error('Failed to load resume:', err);
        setError('Failed to load resume data.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEditing, navigate]);

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
      setError(`Failed to export ${format.toUpperCase()}. Please try again.`);
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
      setError('Failed to copy resume. Please try again.');
    } finally {
      setCopying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        summary: form.summary || undefined,
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
        await updateResume(Number(id), payload, photoFile ?? undefined);
        setSuccessMsg('Resume saved.');
      } else {
        const created = await createResume(payload, photoFile ?? undefined);
        setSuccessMsg('Resume created.');
        navigate(`/profile/resumes/${created.id}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to save resume:', err);
      setError('Failed to save resume. Please check the fields and try again.');
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
          />
        );

      case 'summary':
        return <SummarySection data={form} onChange={patch} />;

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
                      <label className={LABEL_CLS}>Job Title *</label>
                      <input type="text" value={it.job_title} onChange={(e) => upd({ job_title: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Company Name *</label>
                      <input type="text" value={it.company_name} onChange={(e) => upd({ company_name: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>Location</label>
                      <input type="text" value={it.location ?? ''} onChange={(e) => upd({ location: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Start Date *</label>
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
                        Currently working here
                      </label>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>End Date</label>
                      <input
                        type="date"
                        value={it.end_date ?? ''}
                        onChange={(e) => upd({ end_date: e.target.value })}
                        disabled={!!it.is_current}
                        className={INPUT_CLS + (it.is_current ? ' opacity-40 cursor-not-allowed' : '')}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>Description</label>
                      <textarea
                        value={it.description ?? ''}
                        onChange={(e) => upd({ description: e.target.value })}
                        placeholder="Responsibilities, achievements..."
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
              Add Work Experience
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
                      <label className={LABEL_CLS}>Degree *</label>
                      <input type="text" value={it.degree} onChange={(e) => upd({ degree: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Field of Study *</label>
                      <input type="text" value={it.field_of_study} onChange={(e) => upd({ field_of_study: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Institution *</label>
                      <input type="text" value={it.institution_name} onChange={(e) => upd({ institution_name: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Location</label>
                      <input type="text" value={it.location ?? ''} onChange={(e) => upd({ location: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Graduation Year</label>
                      <input
                        type="number"
                        value={it.graduation_year ?? ''}
                        onChange={(e) => upd({ graduation_year: e.target.value ? Number(e.target.value) : undefined })}
                        min={1900}
                        max={2100}
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>GPA</label>
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
              Add Education
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
                      <label className={LABEL_CLS}>Category *</label>
                      <input
                        type="text"
                        value={it.category}
                        onChange={(e) => upd({ category: e.target.value })}
                        placeholder="e.g. Languages, Frameworks"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Skill Name *</label>
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => upd({ name: e.target.value })}
                        placeholder="e.g. PHP, React, Docker"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Proficiency *</label>
                      <select
                        value={it.proficiency}
                        onChange={(e) => upd({ proficiency: e.target.value as ResumeSkill['proficiency'] })}
                        className={INPUT_CLS}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="expert">Expert</option>
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
              Add Skill
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
                      <label className={LABEL_CLS}>Project Name *</label>
                      <input type="text" value={it.name} onChange={(e) => upd({ name: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>Description</label>
                      <textarea
                        value={it.description ?? ''}
                        onChange={(e) => upd({ description: e.target.value })}
                        rows={3}
                        className={INPUT_CLS + ' resize-y'}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>Technologies Used</label>
                      <TagInput
                        value={it.technologies}
                        onChange={(tags) => upd({ technologies: tags })}
                        placeholder="Add a technology and press Enter"
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Live URL</label>
                      <input type="url" value={it.live_url ?? ''} onChange={(e) => upd({ live_url: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>GitHub URL</label>
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
              Add Project
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
                      <label className={LABEL_CLS}>Certificate Name *</label>
                      <input type="text" value={it.name} onChange={(e) => upd({ name: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Issuing Organization *</label>
                      <input type="text" value={it.issuing_organization} onChange={(e) => upd({ issuing_organization: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Issue Date</label>
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
              Add Certification
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
                      <label className={LABEL_CLS}>Language *</label>
                      <input
                        type="text"
                        value={it.language}
                        onChange={(e) => upd({ language: e.target.value })}
                        placeholder="e.g. Finnish"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Proficiency *</label>
                      <select
                        value={it.proficiency}
                        onChange={(e) => upd({ proficiency: e.target.value as ResumeLanguage['proficiency'] })}
                        className={INPUT_CLS}
                      >
                        <option value="native">Native</option>
                        <option value="fluent">Fluent</option>
                        <option value="conversational">Conversational</option>
                        <option value="basic">Basic</option>
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
              Add Language
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
                      <label className={LABEL_CLS}>Title *</label>
                      <input type="text" value={it.title} onChange={(e) => upd({ title: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Issuer</label>
                      <input type="text" value={it.issuer ?? ''} onChange={(e) => upd({ issuer: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Date</label>
                      <input type="date" value={it.date ?? ''} onChange={(e) => upd({ date: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>Description</label>
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
              Add Award
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
                      <label className={LABEL_CLS}>Full Name *</label>
                      <input type="text" value={it.full_name} onChange={(e) => upd({ full_name: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Title</label>
                      <input type="text" value={it.title ?? ''} onChange={(e) => upd({ title: e.target.value })} className={INPUT_CLS} placeholder="e.g. CTO" />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Company</label>
                      <input type="text" value={it.company ?? ''} onChange={(e) => upd({ company: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Email</label>
                      <input type="email" value={it.email ?? ''} onChange={(e) => upd({ email: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>Recommendation *</label>
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
              Add Recommendation
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
              Resumes
            </button>
            <span className="text-white/30">/</span>
            <h1 className="text-lg font-semibold text-white">
              {isEditing ? (form.title || 'Edit Resume') : 'New Resume'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
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
                    Copying…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
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
                      Exporting…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export
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
                  Saving…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Resume
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
                <select
                  value={activeSection}
                  onChange={(e) => setActiveSection(e.target.value as SectionKey)}
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
