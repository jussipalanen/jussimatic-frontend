const API_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('VITE_JUSSILOG_BACKEND_API_BASE_URL environment variable is not set');
}

function buildUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

type AuthError = Error & { data?: unknown; status?: number };

async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error: AuthError = new Error(`API request failed: ${response.status} ${response.statusText}`);
    error.data = data;
    error.status = response.status;
    throw error;
  }

  return data as T;
}

export interface LoginPayload {
  email?: string;
  username?: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirmation: string;
}

export async function loginUser(payload: LoginPayload) {
  return postJson<unknown>('login', payload);
}

export async function registerUser(payload: RegisterPayload) {
  return postJson<unknown>('register', payload);
}

export async function logoutUser(token: string) {
  return postJson<unknown>('logout', {}, token);
}

export async function requestPasswordReset(email: string) {
  return postJson<unknown>('lost-password', { email });
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  password_confirmation: string;
}

export async function resetPassword(payload: ResetPasswordPayload) {
  return postJson<unknown>('reset-password', payload);
}

export interface User {
  user_id: number;
  role?: string;
  is_admin?: boolean;
  [key: string]: unknown;
}

export async function getMe(): Promise<User> {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const response = await fetch(buildUrl('me'), {
    method: 'GET',
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error: AuthError = new Error(`API request failed: ${response.status} ${response.statusText}`);
    error.data = data;
    error.status = response.status;
    throw error;
  }

  return data as User;
}
