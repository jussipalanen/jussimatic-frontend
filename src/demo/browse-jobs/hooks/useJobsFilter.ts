import { useState, useMemo } from 'react';
import type { VantaaJob } from '../types';

interface UseJobsFilterReturn {
  filteredJobs: VantaaJob[];
  searchQuery: string;
  selectedCategory: string;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  handleClearSearch: () => void;
}

export function useJobsFilter(jobs: VantaaJob[]): UseJobsFilterReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const filteredJobs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return jobs.filter((job) => {
      const matchesSearch = !query ||
        job.tyotehtava.toLowerCase().includes(query) ||
        job.organisaatio.toLowerCase().includes(query);

      const matchesCategory = !selectedCategory ||
        job.ammattiala === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [jobs, searchQuery, selectedCategory]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedCategory('');
  };

  return {
    filteredJobs,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    handleClearSearch,
  };
}
