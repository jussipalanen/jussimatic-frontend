import { useState, useEffect } from 'react';
import { fetchJobs, fetchCategories } from '../api/jobsApi';
import type { VantaaJob } from '../types';

interface UseJobsDataReturn {
  jobs: VantaaJob[];
  categories: string[];
  loading: boolean;
  error: string | null;
}

export function useJobsData(errorMessage: string): UseJobsDataReturn {
  const [jobs, setJobs] = useState<VantaaJob[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [jobsData, categoriesData] = await Promise.all([
          fetchJobs(),
          fetchCategories(),
        ]);
        
        setJobs(jobsData);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error loading jobs data:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [errorMessage]);

  return { jobs, categories, loading, error };
}
