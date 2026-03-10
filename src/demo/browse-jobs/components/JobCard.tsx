import type { VantaaJob } from '../types';

interface JobCardProps {
  job: VantaaJob;
  onApply: (url: string) => void;
  translations: {
    organization: string;
    category: string;
    deadline: string;
    apply: string;
  };
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  return `${day}.${month}.${year}`;
}

export function JobCard({ job, onApply, translations }: JobCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
      <h3 className="text-xl font-semibold mb-2">{job.tyotehtava}</h3>
      <div className="space-y-1 text-gray-300">
        <p>
          <span className="text-gray-400">{translations.organization}:</span>{' '}
          {job.organisaatio.split(' ').length > 100
            ? job.organisaatio.split(' ').slice(0, 100).join(' ') + '...'
            : job.organisaatio}
        </p>
        <p>
          <span className="text-gray-400">{translations.category}:</span>{' '}
          {job.ammattiala}
        </p>
        <p>
          <span className="text-gray-400">{translations.deadline}:</span>{' '}
          {formatDate(job.haku_paattyy_pvm)}
        </p>
      </div>
      {job.linkki && (
        <div className="mt-4">
          <a
            href={job.linkki}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              onApply(job.linkki);
            }}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            {translations.apply}
          </a>
        </div>
      )}
    </div>
  );
}
