const API_BASE_URL = import.meta.env.VITE_JUSSIMATIC_BACKEND_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('VITE_JUSSIMATIC_BACKEND_API_BASE_URL environment variable is not set');
}

interface AskRequest {
  lang: string;
  search: string;
}

interface AskResponse {
  // Add response fields based on your API response structure
  response?: string;
  [key: string]: any;
}

/**
 * Send a question to the Jussimatic API
 * @param lang - The language code (e.g., "en")
 * @param search - The search query/message from the user
 * @returns API response
 */
export async function ask(lang: string, search: string): Promise<AskResponse> {
  const url = `${API_BASE_URL}api/cv/ask`;
  
  const requestBody: AskRequest = {
    lang,
    search,
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
