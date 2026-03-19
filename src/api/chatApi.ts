const API_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('VITE_JUSSILOG_BACKEND_API_BASE_URL environment variable is not set');
}

interface AskRequest {
  question: string;
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
  // Add response fields based on your API response structure
  response?: string;
  [key: string]: unknown;
}

/**
 * Send a question to the Jussimatic API
 * @param language - The language code (e.g., "en")
 * @param question - The question from the user
 * @returns API response
 */
export async function ask(question: string): Promise<AskResponse> {
  const url = `${API_BASE_URL}agent/resume/ask`;

  const requestBody: AskRequest = {
    question,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
