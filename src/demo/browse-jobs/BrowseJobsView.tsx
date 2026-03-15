import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  setStoredLanguage,
  translations,
} from '../../i18n';
import type { Language } from '../../i18n';
import { useJobsData } from './hooks/useJobsData';
import { useJobsFilter } from './hooks/useJobsFilter';
import { usePagination } from './hooks/usePagination';
import type { VantaaJob } from './types';
import DemoHeader from '../../components/DemoHeader';
import { SearchForm } from './components/SearchForm';
import { JobList } from './components/JobList';
import { Pagination } from './components/Pagination';
import { Footer } from './components/Footer';

function BrowseJobsView() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];

  // Custom hooks for data management
  const { jobs, categories, loading, error } = useJobsData(t.jobs.errorLoading);
  const {
    filteredJobs,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    handleClearSearch,
  } = useJobsFilter(jobs);

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const pagination = usePagination(5);
  const { resetPage } = pagination;

  // Persist language preference
  useEffect(() => {
    setStoredLanguage(language);
  }, [language]);

  // Reset pagination when filters change
  useEffect(() => {
    resetPage();
  }, [filteredJobs, resetPage]);

  const totalPages = pagination.getTotalPages(filteredJobs.length);
  const paginatedJobs = pagination.paginatedItems(filteredJobs) as VantaaJob[];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <DemoHeader
        title={t.jobs.title}
        language={language}
        onLanguageChange={setLanguage}
        backLabel={t.jobs.back}
        onBack={() => navigate('/')}
      />

      <main className="grow p-6">
        <div className="max-w-4xl mx-auto">
          {!loading && !error && (
            <SearchForm
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              categories={categories}
              onSearchChange={setSearchQuery}
              onCategoryChange={setSelectedCategory}
              onClearSearch={handleClearSearch}
              translations={{
                category: t.jobs.category,
                allCategories: t.jobs.allCategories,
                searchPlaceholder: t.jobs.searchPlaceholder,
                searchButton: t.jobs.searchButton,
                clear: t.jobs.clear,
              }}
            />
          )}

          {!loading && !error && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-400">
                {filteredJobs.length} {t.jobs.results}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  className={`p-2 rounded transition-colors ${viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  className={`p-2 rounded transition-colors ${viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <JobList
            viewMode={viewMode}
            jobs={paginatedJobs}
            loading={loading}
            error={error}
            translations={{
              loading: t.jobs.loading,
              empty: t.jobs.empty,
              organization: t.jobs.organization,
              category: t.jobs.category,
              deadline: t.jobs.deadline,
              apply: t.jobs.apply,
            }}
          />

          {!loading && !error && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={totalPages}
              onPageChange={(page) => pagination.handlePageChange(page, totalPages)}
              pageNumbers={pagination.getPageNumbers(totalPages)}
              previousLabel={t.jobs.previousPage}
              nextLabel={t.jobs.nextPage}
            />
          )}
        </div>
      </main>

      <Footer year={year} footerText={t.footer} />
    </div>
  );
}

export default BrowseJobsView;
