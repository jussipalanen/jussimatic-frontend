import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  setStoredLanguage,
  translations,
} from './i18n';
import type { Language } from './i18n';
import { fetchJobs, fetchCategories, type VantaaJob } from './api/jobsApi';

function JobsView() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];
  
  // API data state
  const [jobs, setJobs] = useState<VantaaJob[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filteredJobs, setFilteredJobs] = useState<VantaaJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Format date from YYYY-MM-DD to D.M.YYYY
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  };

  useEffect(() => {
    setStoredLanguage(language);
  }, [language]);

  // Fetch jobs and categories on mount
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
        setFilteredJobs(jobsData);
      } catch (err) {
        console.error('Error loading jobs data:', err);
        setError(t.jobs.errorLoading);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [t.jobs.errorLoading]);

  // Update filtered jobs when jobs, searchQuery, or selectedCategory changes
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    
    const filtered = jobs.filter((job) => {
      const matchesSearch = !query ||
        job.tyotehtava.toLowerCase().includes(query) ||
        job.organisaatio.toLowerCase().includes(query);
      
      const matchesCategory = !selectedCategory ||
        job.ammattiala === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
    
    setFilteredJobs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [jobs, searchQuery, selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filtering is handled automatically by useEffect
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedCategory('');
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 py-4 px-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t.jobs.title}</h1>

          <div className="flex items-center gap-3">
            <label htmlFor="language" className="sr-only">
              {t.chat.languageLabel}
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="en">English</option>
              <option value="fi">Finnish</option>
            </select>
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white"
            >
              ← {t.jobs.back}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="grow p-6">
        <div className="max-w-4xl mx-auto">
          {/* Loading state */}
          {loading && (
            <div className="bg-gray-800 rounded-lg p-6 text-center mb-6">
              <p className="text-gray-400">{t.jobs.loading}</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Search form */}
          {!loading && !error && (
            <form onSubmit={handleSearch} className="mb-6">
              {/* Category filter */}
              <div className="mb-3">
                <label htmlFor="category" className="block text-sm font-medium mb-2">
                  {t.jobs.category}
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">{t.jobs.allCategories}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t.jobs.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="grow bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                  {t.jobs.searchButton}
                </button>
                {(searchQuery || selectedCategory) && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    {t.jobs.clear}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Job listings */}
          {!loading && !error && (
            <div className="space-y-4">
              {filteredJobs.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-6 text-center">
                  <p className="text-gray-400">{t.jobs.empty}</p>
                </div>
              ) : (
                paginatedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors"
                  >
                    <h3 className="text-xl font-semibold mb-2">{job.tyotehtava}</h3>
                    <div className="space-y-1 text-gray-300">
                      <p>
                        <span className="text-gray-400">{t.jobs.organization}:</span>{' '}
                        {job.organisaatio.split(' ').length > 100
                          ? job.organisaatio.split(' ').slice(0, 100).join(' ') + '...'
                          : job.organisaatio}
                      </p>
                      <p>
                        <span className="text-gray-400">{t.jobs.category}:</span>{' '}
                        {job.ammattiala}
                      </p>
                      <p>
                        <span className="text-gray-400">{t.jobs.deadline}:</span>{' '}
                        {formatDate(job.haku_paattyy_pvm)}
                      </p>
                    </div>
                    {job.linkki && (
                      <div className="mt-4">
                        <a
                          href={job.linkki}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                          {t.jobs.apply}
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                    aria-label={t.jobs.previousPage}
                  >
                    ←
                  </button>

                  {/* Page Numbers */}
                  {getPageNumbers().map((page, index) => {
                    if (page === -1) {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-4 py-2 rounded transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                    aria-label={t.jobs.nextPage}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 py-6 px-4 text-center border-t border-gray-700">
        <div className="flex justify-center items-center gap-4 mb-3">
          <a
            href="https://github.com/jussipalanen/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/jussi-alanen-38628a75/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="LinkedIn"
          >
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>
        <p className="text-gray-400">&copy; {year} Jussimatic. {t.footer}</p>
      </footer>
    </div>
  );
}

export default JobsView;
