const API_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('VITE_JUSSILOG_BACKEND_API_BASE_URL environment variable is not set');
}

function buildUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

function getAuthHeaders(includeContentType = true): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    Accept: 'application/json',
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface WorkExperience {
  id?: number;
  job_title: string;
  company_name: string;
  location?: string;
  start_date: string;
  is_current?: boolean;
  end_date?: string;
  description?: string;
  sort_order?: number;
}

export interface Education {
  id?: number;
  degree: string;
  field_of_study: string;
  institution_name: string;
  location?: string;
  graduation_year?: number;
  gpa?: number;
  sort_order?: number;
}

export interface ResumeSkill {
  id?: number;
  category: string;
  name: string;
  proficiency: 'beginner' | 'intermediate' | 'expert';
  sort_order?: number;
}

export interface Project {
  id?: number;
  name: string;
  description?: string;
  technologies?: string[];
  live_url?: string;
  github_url?: string;
  sort_order?: number;
}

export interface Certification {
  id?: number;
  name: string;
  issuing_organization: string;
  issue_date?: string;
  sort_order?: number;
}

export interface ResumeLanguage {
  id?: number;
  language: string;
  proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
  sort_order?: number;
}

export interface Award {
  id?: number;
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
  sort_order?: number;
}

export interface Recommendation {
  id?: number;
  full_name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  recommendation: string;
  sort_order?: number;
}

export interface Resume {
  id: number;
  title: string;
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  github_url?: string;
  photo?: string;
  language?: string;
  is_primary?: boolean;
  theme?: string;
  template?: string;
  summary?: string;
  work_experiences?: WorkExperience[];
  educations?: Education[];
  skills?: ResumeSkill[];
  projects?: Project[];
  certifications?: Certification[];
  languages?: ResumeLanguage[];
  awards?: Award[];
  recommendations?: Recommendation[];
  created_at?: string;
  updated_at?: string;
}

export type ResumePayload = Omit<Resume, 'id' | 'created_at' | 'updated_at' | 'photo'> & { photo?: string | null };

export interface ExportOption { value: string; label: string; }
export interface ExportOptions { themes: ExportOption[]; templates: ExportOption[]; languages: ExportOption[]; }

export async function getExportOptions(lang?: string): Promise<ExportOptions> {
  const base = buildUrl('resumes/export/options');
  const url = lang ? `${base}?lang=${encodeURIComponent(lang)}` : base;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Failed to fetch export options: ${response.status}`);
  return data as ExportOptions;
}

export interface ResumePaginatedResponse {
  data: Resume[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  next_page_url: string | null;
  prev_page_url: string | null;
}

export async function getResumes(page = 1): Promise<ResumePaginatedResponse> {
  const response = await fetch(buildUrl(`resumes?page=${page}`), {
    method: 'GET',
    headers: getAuthHeaders(false),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Failed to fetch resumes: ${response.status}`);
  }
  if (Array.isArray(data)) {
    return { data, current_page: 1, last_page: 1, per_page: data.length, total: data.length, next_page_url: null, prev_page_url: null };
  }
  return data as ResumePaginatedResponse;
}

export async function getResume(id: number): Promise<Resume> {
  const response = await fetch(buildUrl(`resumes/${id}`), {
    method: 'GET',
    headers: getAuthHeaders(false),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Failed to fetch resume: ${response.status}`);
  }
  return data as Resume;
}

export async function createResume(payload: ResumePayload): Promise<Resume> {
  const response = await fetch(buildUrl('resumes'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Failed to create resume: ${response.status}`);
  }
  return data as Resume;
}

export async function updateResume(id: number, payload: Partial<ResumePayload>): Promise<Resume> {
  const response = await fetch(buildUrl(`resumes/${id}`), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Failed to update resume: ${response.status}`);
  }
  return data as Resume;
}

export async function uploadResumePhoto(id: number, photo: File): Promise<Resume> {
  const fd = new FormData();
  fd.append('_method', 'PUT'); // Laravel method spoofing for file uploads
  fd.append('photo', photo);
  const response = await fetch(buildUrl(`resumes/${id}`), {
    method: 'POST',
    headers: getAuthHeaders(false),
    body: fd,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Failed to upload photo: ${response.status}`);
  }
  return data as Resume;
}

export async function deleteResume(id: number): Promise<void> {
  const response = await fetch(buildUrl(`resumes/${id}`), {
    method: 'DELETE',
    headers: getAuthHeaders(false),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete resume: ${response.status}`);
  }
}

export async function copyResume(id: number): Promise<Resume> {
  const source = await getResume(id);
  const { id: _id, created_at: _ca, updated_at: _ua, photo: _pp, ...rest } = source;
  const payload: ResumePayload = {
    ...rest,
    title: `${source.title || 'Resume'} (Copy)`,
    is_primary: false,
  };
  return createResume(payload);
}

export async function exportResumePdfPublic(payload: ResumePayload): Promise<void> {
  const response = await fetch(buildUrl('resumes/export/pdf'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/pdf' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to export PDF: ${response.status}`);
  }
  const blob = new Blob([await response.blob()], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function exportResumeHtmlPublic(payload: ResumePayload): Promise<void> {
  const response = await fetch(buildUrl('resumes/export/html'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/html' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to export HTML: ${response.status}`);
  }
  const blob = new Blob([await response.blob()], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function exportResumePdf(id: number): Promise<void> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(buildUrl(`resumes/${id}/export/pdf`), {
    method: 'GET',
    headers: {
      Accept: 'application/pdf',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to export PDF: ${response.status}`);
  }
  const blob = new Blob([await response.blob()], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  // Revoke after a short delay to allow the new tab to load the blob
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function exportResumeHtml(id: number): Promise<void> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(buildUrl(`resumes/${id}/export/html`), {
    method: 'GET',
    headers: {
      Accept: 'text/html',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to export HTML: ${response.status}`);
  }
  const blob = new Blob([await response.blob()], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
