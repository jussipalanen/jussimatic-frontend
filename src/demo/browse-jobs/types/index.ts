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

export interface JobsState {
  jobs: VantaaJob[];
  filteredJobs: VantaaJob[];
  categories: string[];
  selectedCategory: string;
  searchQuery: string;
  currentPage: number;
  loading: boolean;
  error: string | null;
}
