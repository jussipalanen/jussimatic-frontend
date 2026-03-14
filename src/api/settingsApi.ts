const API_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_JUSSILOG_BACKEND_API_BASE_URL environment variable is not set');
}

function buildUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

export interface CountryOption {
  value: string;
  label: string;
}

export async function fetchCountries(lang?: string): Promise<CountryOption[]> {
  const path = lang ? `settings/countries?lang=${encodeURIComponent(lang)}` : 'settings/countries';
  const response = await fetch(buildUrl(path), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch countries: ${response.status}`);
  }
  return response.json() as Promise<CountryOption[]>;
}
