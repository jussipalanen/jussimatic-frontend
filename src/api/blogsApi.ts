const API_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_JUSSILOG_BACKEND_API_BASE_URL environment variable is not set');
}

function buildUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

export interface BlogAuthor {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
}

export interface Blog {
  id: number;
  user_id: number;
  blog_category_id: number;
  title: string;
  slug?: string;
  excerpt?: string | null;
  content?: string | null;
  featured_image?: string | null;
  tags?: string[] | null;
  visibility: boolean;
  created_at: string;
  updated_at: string;
  author?: BlogAuthor;
  category?: BlogCategory;
}

export interface BlogsResponse {
  data: Blog[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export async function getBlogs(page: number = 1, perPage: number = 10, sortBy: string = 'created_at', sortOrder: 'asc' | 'desc' = 'desc'): Promise<BlogsResponse> {
  const response = await fetch(buildUrl(`blogs?page=${page}&per_page=${perPage}&sort=${sortBy}&order=${sortOrder}`), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data as BlogsResponse;
}

export async function getAllBlogs(page: number = 1, perPage: number = 10, sortBy: string = 'created_at', sortOrder: 'asc' | 'desc' = 'desc'): Promise<BlogsResponse> {
  const response = await fetch(buildUrl(`admin/blogs?page=${page}&per_page=${perPage}&sort=${sortBy}&order=${sortOrder}`), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data as BlogsResponse;
}

export interface BlogFormData {
  title: string;
  content: string;
  slug?: string;
  excerpt?: string;
  featured_image?: string;
  featured_image_file?: File;
  tags?: string[];
  blog_category_id?: number;
  visibility?: boolean;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function buildBlogFormData(data: BlogFormData): FormData {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('content', data.content);
  if (data.slug) formData.append('slug', data.slug);
  if (data.excerpt) formData.append('excerpt', data.excerpt);
  if (data.featured_image_file) {
    formData.append('featured_image', data.featured_image_file);
  } else if (data.featured_image === '') {
    formData.append('featured_image', '');
  }
  // If featured_image is a non-empty string (existing path), skip it — backend keeps the existing value
  if (data.tags && data.tags.length > 0) {
    data.tags.forEach((tag) => formData.append('tags[]', tag));
  }
  if (data.blog_category_id !== undefined) {
    formData.append('blog_category_id', String(data.blog_category_id));
  }
  if (data.visibility !== undefined) {
    formData.append('visibility', data.visibility ? '1' : '0');
  }
  return formData;
}

export async function createBlog(data: BlogFormData): Promise<Blog> {
  const response = await fetch(buildUrl('blogs'), {
    method: 'POST',
    headers: { ...authHeaders() },
    body: buildBlogFormData(data),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'message' in json && typeof (json as { message?: unknown }).message === 'string'
        ? (json as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return (json?.data ?? json) as Blog;
}

export async function updateBlog(id: number, data: BlogFormData): Promise<Blog> {
  const formData = buildBlogFormData(data);
  formData.append('_method', 'PUT'); // Laravel method spoofing for file uploads

  const response = await fetch(buildUrl(`blogs/${id}`), {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'message' in json && typeof (json as { message?: unknown }).message === 'string'
        ? (json as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return (json?.data ?? json) as Blog;
}

export async function deleteBlog(id: number): Promise<void> {
  const response = await fetch(buildUrl(`blogs/${id}`), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    const message =
      json && typeof json === 'object' && 'message' in json && typeof (json as { message?: unknown }).message === 'string'
        ? (json as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }
}

export async function getBlog(id: number | string): Promise<Blog> {
  const response = await fetch(buildUrl(`blogs/${id}`), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 404) throw new Error('NOT_FOUND');
    const message =
      data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data as Blog;
}

// Blog Categories API
export interface BlogCategoryFormData {
  name: string;
  slug?: string;
}

export async function getCategories(): Promise<BlogCategory[]> {
  const response = await fetch(buildUrl('blog-categories'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return (data?.data ?? data) as BlogCategory[];
}

export async function createCategory(data: BlogCategoryFormData): Promise<BlogCategory> {
  const response = await fetch(buildUrl('blog-categories'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'message' in json && typeof (json as { message?: unknown }).message === 'string'
        ? (json as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return (json?.data ?? json) as BlogCategory;
}

export async function updateCategory(id: number, data: BlogCategoryFormData): Promise<BlogCategory> {
  const response = await fetch(buildUrl(`blog-categories/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'message' in json && typeof (json as { message?: unknown }).message === 'string'
        ? (json as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return (json?.data ?? json) as BlogCategory;
}

export async function deleteCategory(id: number): Promise<void> {
  const response = await fetch(buildUrl(`blog-categories/${id}`), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    const message =
      json && typeof json === 'object' && 'message' in json && typeof (json as { message?: unknown }).message === 'string'
        ? (json as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }
}
