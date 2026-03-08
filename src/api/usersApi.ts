const API_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_JUSSILOG_BACKEND_API_BASE_URL environment variable is not set');
}

function buildUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

export interface UserSummary {
  id?: number;
  user_id?: number;
  username?: string;
  fullname?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  role?: string;
  user_role?: string;
  type?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface UpdateUserPayload {
  fullname?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  roles?: string[];
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}

export async function fetchAllUsers(): Promise<UserSummary[]> {
  const url = buildUrl('users');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  if (Array.isArray(data)) {
    return data as UserSummary[];
  }
  if (data && typeof data === 'object' && 'data' in data) {
    const wrapped = (data as { data?: UserSummary[] }).data;
    if (Array.isArray(wrapped)) {
      return wrapped;
    }
  }
  return [];
}

export async function deleteUser(userId: number): Promise<void> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const url = buildUrl(`users/${userId}`);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

export async function updateUser(userId: number, payload: UpdateUserPayload): Promise<Record<string, unknown>> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const url = buildUrl(`users/${userId}`);
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `HTTP error! status: ${response.status}`;
    throw new Error(message);
  }

  return (data as Record<string, unknown>) ?? {};
}
