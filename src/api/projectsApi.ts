const API_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_JUSSILOG_BACKEND_API_BASE_URL environment variable is not set');
}

function buildUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function handleApiError(data: unknown, status: number, statusText: string): never {
  const message =
    data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
      ? (data as { message: string }).message
      : `API request failed: ${status} ${statusText}`;
  throw new Error(message);
}

export interface ProjectCategory {
  id: number;
  title: string;
  slug: string;
}

export interface ProjectTag {
  name: string;
  color: string;
}

export interface Project {
  id: number;
  title: string;
  slug?: string;
  short_description?: string | null;
  long_description?: string | null;
  feature_image?: string | null;
  images?: string[];
  live_url?: string | null;
  github_url?: string | null;
  tags?: ProjectTagItem[] | null;
  visibility: string;
  sort_order?: number;
  created_at: string;
  updated_at: string;
  categories?: ProjectCategory[];
}

export interface ProjectsResponse {
  data: Project[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export async function getProjects(
  page: number = 1,
  perPage: number = 10,
  sortBy: string = 'sort_order',
  sortDir: 'asc' | 'desc' = 'asc',
  lang?: string,
): Promise<ProjectsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort_by: sortBy,
    sort_dir: sortDir,
  });
  if (lang) params.set('lang', lang);

  const response = await fetch(buildUrl(`projects?${params}`), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) handleApiError(data, response.status, response.statusText);
  return data as ProjectsResponse;
}

export async function getAdminProjects(
  page: number = 1,
  perPage: number = 10,
): Promise<ProjectsResponse> {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });

  const response = await fetch(buildUrl(`admin/projects?${params}`), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) handleApiError(data, response.status, response.statusText);
  return data as ProjectsResponse;
}

function extractProject(data: unknown): Project {
  if (!data || typeof data !== 'object') throw new Error('NOT_FOUND');
  // { data: Project[] } — same paginated envelope as the list endpoint
  const inner = (data as Record<string, unknown>).data;
  if (Array.isArray(inner)) {
    if (!inner[0]) throw new Error('NOT_FOUND');
    return inner[0] as Project;
  }
  // { data: Project } — single-resource envelope
  if (inner && typeof inner === 'object' && 'id' in inner) return inner as Project;
  // Project returned directly at top level
  if ('id' in (data as Record<string, unknown>)) return data as Project;
  throw new Error('NOT_FOUND');
}

export async function getProject(id: number | string): Promise<Project> {
  const response = await fetch(buildUrl(`projects/${id}`), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 404) throw new Error('NOT_FOUND');
    handleApiError(data, response.status, response.statusText);
  }
  return extractProject(data);
}

export async function getAdminProject(id: number | string, lang?: string): Promise<Project> {
  const params = lang ? `?lang=${lang}` : '';
  const response = await fetch(buildUrl(`admin/projects/${id}${params}`), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 404) throw new Error('NOT_FOUND');
    handleApiError(data, response.status, response.statusText);
  }
  return extractProject(data);
}

export interface TranslatedField {
  en: string;
  fi?: string;
}

export interface ProjectFormData {
  title: TranslatedField;
  slug?: TranslatedField;
  short_description?: TranslatedField;
  long_description?: TranslatedField;
  image_file?: File;
  remove_feature_image?: boolean;
  live_url?: string;
  github_url?: string;
  tag_ids?: number[];
  visibility?: string;
  sort_order?: number;
  category_ids?: number[];
}

function buildProjectFormData(data: ProjectFormData): FormData {
  const formData = new FormData();

  // Translated fields
  formData.append('title[en]', data.title.en);
  if (data.title.fi !== undefined) formData.append('title[fi]', data.title.fi);

  if (data.slug?.en) formData.append('slug[en]', data.slug.en);
  if (data.slug?.fi) formData.append('slug[fi]', data.slug.fi);

  if (data.short_description?.en !== undefined) formData.append('short_description[en]', data.short_description.en);
  if (data.short_description?.fi !== undefined) formData.append('short_description[fi]', data.short_description.fi);

  if (data.long_description?.en !== undefined) formData.append('long_description[en]', data.long_description.en);
  if (data.long_description?.fi !== undefined) formData.append('long_description[fi]', data.long_description.fi);

  if (data.image_file) formData.append('feature_image', data.image_file);
  else if (data.remove_feature_image) formData.append('feature_image', '');
  if (data.live_url !== undefined) formData.append('live_url', data.live_url);
  if (data.github_url !== undefined) formData.append('github_url', data.github_url);

  // Tag IDs
  if (data.tag_ids && data.tag_ids.length > 0) {
    data.tag_ids.forEach((id, i) => formData.append(`tag_ids[${i}]`, String(id)));
  } else {
    formData.append('tag_ids', '');
  }

  if (data.visibility !== undefined) formData.append('visibility', data.visibility);
  if (data.sort_order !== undefined) formData.append('sort_order', String(data.sort_order));

  if (data.category_ids && data.category_ids.length > 0) {
    data.category_ids.forEach((id, i) => formData.append(`category_ids[${i}]`, String(id)));
  }

  return formData;
}

export async function createProject(data: ProjectFormData): Promise<Project> {
  const response = await fetch(buildUrl('projects'), {
    method: 'POST',
    headers: { ...authHeaders() },
    body: buildProjectFormData(data),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) handleApiError(json, response.status, response.statusText);
  return (json?.data ?? json) as Project;
}

export async function updateProject(id: number, data: ProjectFormData): Promise<Project> {
  const formData = buildProjectFormData(data);
  formData.append('_method', 'PUT');
  const response = await fetch(buildUrl(`projects/${id}`), {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) handleApiError(json, response.status, response.statusText);
  return (json?.data ?? json) as Project;
}

export async function deleteProject(id: number): Promise<void> {
  const response = await fetch(buildUrl(`projects/${id}`), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    handleApiError(json, response.status, response.statusText);
  }
}

// Project Tags

export interface ProjectTagItem {
  id: number;
  title: string;
  slug: string;
  color: string;
}

export interface ProjectTagFormData {
  title: string;
  color: string;
}

export async function getProjectTags(): Promise<ProjectTagItem[]> {
  const response = await fetch(buildUrl('project-tags'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) handleApiError(data, response.status, response.statusText);
  return (data?.data ?? data) as ProjectTagItem[];
}

export async function createProjectTag(data: ProjectTagFormData): Promise<ProjectTagItem> {
  const response = await fetch(buildUrl('project-tags'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) handleApiError(json, response.status, response.statusText);
  return (json?.data ?? json) as ProjectTagItem;
}

export async function updateProjectTag(id: number, data: ProjectTagFormData): Promise<ProjectTagItem> {
  const response = await fetch(buildUrl(`project-tags/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) handleApiError(json, response.status, response.statusText);
  return (json?.data ?? json) as ProjectTagItem;
}

export async function deleteProjectTag(id: number): Promise<void> {
  const response = await fetch(buildUrl(`project-tags/${id}`), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    handleApiError(json, response.status, response.statusText);
  }
}

// Project Categories

export interface ProjectCategoryFormData {
  title: string;
  slug?: string;
}

export async function getProjectCategories(): Promise<ProjectCategory[]> {
  const response = await fetch(buildUrl('project-categories'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) handleApiError(data, response.status, response.statusText);
  return (data?.data ?? data) as ProjectCategory[];
}

export async function createProjectCategory(data: ProjectCategoryFormData): Promise<ProjectCategory> {
  const response = await fetch(buildUrl('project-categories'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) handleApiError(json, response.status, response.statusText);
  return (json?.data ?? json) as ProjectCategory;
}

export async function updateProjectCategory(id: number, data: ProjectCategoryFormData): Promise<ProjectCategory> {
  const response = await fetch(buildUrl(`project-categories/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) handleApiError(json, response.status, response.statusText);
  return (json?.data ?? json) as ProjectCategory;
}

export async function deleteProjectCategory(id: number): Promise<void> {
  const response = await fetch(buildUrl(`project-categories/${id}`), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    handleApiError(json, response.status, response.statusText);
  }
}
