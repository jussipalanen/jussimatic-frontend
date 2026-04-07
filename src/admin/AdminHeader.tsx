import type { ReactNode } from 'react';
import { useLocaleNavigate } from '../hooks/useLocaleNavigate';
import { APP_NAME } from '../constants';
import NavActions from '../components/NavActions';

interface AdminHeaderProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}

function AdminHeader({ title, backTo, backLabel, actions }: AdminHeaderProps) {
  const navigate = useLocaleNavigate();

  return (
    <>
      <header className="bg-gray-900/95 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="absolute inset-0 bg-linear-to-r from-blue-600/10 via-transparent to-purple-600/8 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-blue-500/40 to-transparent pointer-events-none" />
        <div className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="flex min-w-0 items-baseline gap-2 flex-wrap">
              <button onClick={() => navigate('/')} className="text-lg font-bold text-white hover:text-blue-400 transition-colors cursor-pointer">{APP_NAME}</button>
              <span className="text-sm font-medium text-white/50 truncate">/ {title}</span>
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              {actions && <div className="flex items-center gap-1.5">{actions}</div>}
              <NavActions />
            </div>
          </div>
        </div>
      </header>

      {backTo && backLabel && (
        <div className="container mx-auto px-4 pt-4">
          <button
            onClick={() => navigate(backTo)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            aria-label={backLabel}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </button>
        </div>
      )}
    </>
  );
}

export default AdminHeader;
