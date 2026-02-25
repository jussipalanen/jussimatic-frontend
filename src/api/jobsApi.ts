const JOBS_API_BASE_URL = 'https://gis.vantaa.fi/rest/tyopaikat/v1';

export interface VantaaJob {
  id: number;
  organisaatio: string;
  ammattiala: string;
  tyotehtava: string;
  tyoavain: string;
  osoite: string;
  haku_paattyy_pvm: string;
  x: number;
  y: number;
  linkki: string;
}

/**
 * Fetches all available jobs from Vantaa API
 */
export async function fetchJobs(): Promise<VantaaJob[]> {
  try {
    const response = await fetch(`${JOBS_API_BASE_URL}/kaikki`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error('Unexpected API response format:', data);
      return [];
    }
    
    return data as VantaaJob[];
  } catch (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }
}

/**
 * Fetches categories (ammattiala values) from Vantaa API
 */
export async function fetchCategories(): Promise<string[]> {
  try {
    const response = await fetch(`${JOBS_API_BASE_URL}/`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract unique ammattiala values from the response
    if (Array.isArray(data)) {
      const categories = data
        .map((item: VantaaJob) => item.ammattiala)
        .filter((value, index, self) => value && self.indexOf(value) === index)
        .sort();
      
      return categories as string[];
    }
    
    console.error('Unexpected API response format:', data);
    return [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}
