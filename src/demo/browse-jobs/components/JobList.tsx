import type { VantaaJob } from '../types';
import { JobCard } from './JobCard';

interface JobListProps {
  jobs: VantaaJob[];
  loading: boolean;
  error: string | null;
  translations: {
    loading: string;
    empty: string;
    organization: string;
    category: string;
    deadline: string;
    apply: string;
  };
}

export function JobList({ jobs, loading, error, translations }: JobListProps) {
  const handleApply = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">{translations.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">{translations.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onApply={handleApply}
          translations={{
            organization: translations.organization,
            category: translations.category,
            deadline: translations.deadline,
            apply: translations.apply,
          }}
        />
      ))}
    </div>
  );
}
