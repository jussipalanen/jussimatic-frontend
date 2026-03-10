const API_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_JUSSILOG_BACKEND_API_BASE_URL environment variable is not set');
}

function buildUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

export interface VisitorsTodayResponse {
  visitors: number;
}

export interface VisitorsTotalResponse {
  visitors: number;
}

export async function getVisitorsToday(): Promise<VisitorsTodayResponse> {
  const response = await fetch(buildUrl('visitors/today'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  if (!data || typeof data !== 'object' || !('visitors' in data) || typeof (data as { visitors?: unknown }).visitors !== 'number') {
    throw new Error('Invalid visitors count response');
  }

  return data as VisitorsTodayResponse;
}

export async function getVisitorsTotal(): Promise<VisitorsTotalResponse> {
  const response = await fetch(buildUrl('visitors/total'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  if (!data || typeof data !== 'object' || !('visitors' in data) || typeof (data as { visitors?: unknown }).visitors !== 'number') {
    throw new Error('Invalid visitors total response');
  }

  return data as VisitorsTotalResponse;
}

export async function trackVisitor(): Promise<void> {
  const response = await fetch(buildUrl('visitors/track'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message =
      data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }
}
