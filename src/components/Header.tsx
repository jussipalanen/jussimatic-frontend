import { useLocaleNavigate } from '../hooks/useLocaleNavigate';
import NavActions from './NavActions';
import Breadcrumb from './Breadcrumb';
import type { Language } from '../i18n';

interface HeaderProps {
  /** If provided, renders a fixed top navbar (simple mode). */
  onLoginClick?: () => void;
  /** If provided, renders a relative header with breadcrumb (demo mode). */
  title?: string;
  subtitle?: string;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
  backLabel?: string;
  onBack?: () => void;
  /** Tailwind classes for the breadcrumb inner container. Defaults to max-w-4xl mx-auto. */
  containerClassName?: string;
}

export default function Header({
  onLoginClick,
  title,
  subtitle,
  language,
  onLanguageChange,
  backLabel,
  onBack,
  containerClassName = 'max-w-4xl mx-auto',
}: HeaderProps) {
  const navigate = useLocaleNavigate();

  if (title) {
    // Demo mode — relative, with breadcrumb
    return (
      <>
        <header className="relative z-10 bg-gray-900/95 backdrop-blur-sm border-b border-white/10 shadow-lg">
          <div className="absolute inset-0 bg-linear-to-r from-blue-600/10 via-transparent to-purple-600/8 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-blue-500/40 to-transparent pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              aria-label="Go to homepage"
              className="cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              <img src="/jussimatic_logo.webp" alt="" className="h-10 md:h-20" fetchPriority="high" />
            </button>

            <NavActions language={language} onLanguageChange={onLanguageChange} />
          </div>
        </header>

        <div className="px-4 sm:px-6 pt-4 pb-1">
          <div className={containerClassName}>
            <Breadcrumb
              items={[{ label: backLabel ?? '', onClick: onBack }]}
              current={title}
              subtitle={subtitle}
            />
          </div>
        </div>
      </>
    );
  }

  // Navbar mode — fixed, no breadcrumb
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-white/10 shadow-lg">
      <div className="absolute inset-0 bg-linear-to-r from-blue-600/10 via-transparent to-purple-600/8 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-blue-500/40 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative flex items-center justify-between py-2">
          <button
            onClick={() => navigate('/')}
            aria-label="Go to homepage"
            className="cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            <img src="/jussimatic_logo.webp" alt="" className="h-10 md:h-20" fetchPriority="high" />
          </button>
          <NavActions onLoginClick={onLoginClick} />
        </div>
      </div>
    </nav>
  );
}
