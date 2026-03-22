const API_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('VITE_JUSSILOG_BACKEND_API_BASE_URL environment variable is not set');
}

const AIBOT_API_URL = import.meta.env.VITE_JUSSI_AIBOT_API_URL;
if (!AIBOT_API_URL) {
  throw new Error('VITE_JUSSI_AIBOT_API_URL environment variable is not set');
}

const AIBOT_API_KEY = import.meta.env.VITE_JUSSI_AIBOT_AI_SECRET_KEY;
if (!AIBOT_API_KEY) {
  throw new Error('VITE_JUSSI_AIBOT_AI_SECRET_KEY environment variable is not set');
}

interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

interface AskRequest {
  handler: 'jussimatic-ai-cv-chat';
  message: string;
  language: string;
  history: HistoryEntry[];
}

export async function getSuggestions(language: string): Promise<string[]> {
  const url = `${API_BASE_URL}agent/resume/suggestions?lang=${encodeURIComponent(language)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const items: Record<string, string>[] = Array.isArray(data?.suggestions) ? data.suggestions : [];
    return items.map((item) => item[language] ?? item['en'] ?? '').filter(Boolean);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
}

interface AskResponse {
  reply?: string;
  [key: string]: unknown;
}

export async function ask(
  message: string,
  language: string,
  history: HistoryEntry[],
): Promise<AskResponse> {
  const url = `${AIBOT_API_URL}/ai/chat`;

  const requestBody: AskRequest = {
    handler: 'jussimatic-ai-cv-chat',
    message,
    language,
    history,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AIBOT_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling ask API:', error);
    throw error;
  }
}
