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

  const pagination = usePagination(5);

  // Persist language preference
  useEffect(() => {
    setStoredLanguage(language);
  }, [language]);

  // Reset pagination when filters change
  useEffect(() => {
    pagination.resetPage();
  }, [filteredJobs, pagination]);

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

          <JobList
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
              getPageNumbers={() => pagination.getPageNumbers(totalPages)}
              translations={{
                previousPage: t.jobs.previousPage,
                nextPage: t.jobs.nextPage,
              }}
            />
          )}
        </div>
      </main>

      <Footer year={year} footerText={t.footer} />
    </div>
  );
}

export default BrowseJobsView;
