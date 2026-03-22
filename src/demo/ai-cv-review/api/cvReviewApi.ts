const API_BASE_URL = import.meta.env.VITE_JUSSI_AIBOT_API_URL;
const API_KEY = import.meta.env.VITE_JUSSI_AIBOT_AI_SECRET_KEY;

if (!API_BASE_URL) {
  throw new Error('VITE_JUSSI_AIBOT_API_URL environment variable is not set');
}

if (!API_KEY) {
  throw new Error('VITE_JUSSI_AIBOT_AI_SECRET_KEY environment variable is not set');
}

function buildUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

export interface CVReviewResponse {
  provider?: string;
  rating_text?: string;
  stars?: number;
  summary?: string;
  provider_raw_output?: string;
  strengths?: string[];
  weaknesses?: string[];
  [key: string]: unknown;
}

/**
 * Upload a CV file for AI review
 * @param file - The CV file to upload (PDF, DOC, DOCX, TXT)
 * @returns Promise with the review response
 */
export async function reviewCV(file: File): Promise<CVReviewResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const url = buildUrl('ai/review');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  return response.json() as Promise<CVReviewResponse>;
}
