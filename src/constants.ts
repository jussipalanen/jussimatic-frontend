// App constants
export const APP_NAME = 'Jussimatic';
export const CHAT_TITLE = 'Jussimatic';
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'Jussimatic - Portfolio by Jussi Alanen';
export const APP_DESCRIPTION = import.meta.env.VITE_APP_DESCRIPTION || 'Jussimatic is the main portfolio by Jussi Alanen, including project references and live demos such as CV Review tool, CV Chat, Browse Jobs and Ecommerce.';
export const ECOMMERCE_MAIN_TITLE = import.meta.env.VITE_ECOMMERCE_MAIN_TITLE || 'Ecommerce Demo';

// Storage URL for media/images
export const STORAGE_BASE_URL = (import.meta.env.VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

// Placeholder image URL for ecommerce
export const PLACEHOLDER_IMAGE_URL = 'https://placehold.net/default.png';

/**
 * Build a full URL for a storage path
 */
export function buildImageUrl(path: string): string {
  return `${STORAGE_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

/**
 * Build a storage URL with null/undefined handling and placeholder fallback.
 * Returns placeholder image if path is null/undefined.
 */
export function buildStorageUrl(path: string | null | undefined): string {
  if (!path) return PLACEHOLDER_IMAGE_URL;
  if (!STORAGE_BASE_URL) return path;
  const base = STORAGE_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

// Proficiency levels for language skills
export const PROFICIENCY_LEVELS: Record<string, number> = {
  beginner: 1,
  elementary: 1,
  basic: 2,
  limited_working: 2,
  intermediate: 3,
  professional_working: 3,
  advanced: 4,
  full_professional: 4,
  expert: 5,
  native_bilingual: 5,
  native: 5,
};

