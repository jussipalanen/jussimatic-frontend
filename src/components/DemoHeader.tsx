import NavActions from './NavActions';
import Breadcrumb from './Breadcrumb';
import type { Language } from '../i18n';

interface DemoHeaderProps {
  title: string;
  subtitle?: string;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  backLabel: string;
  onBack: () => void;
  /** Tailwind classes for the breadcrumb inner container, e.g. "max-w-4xl mx-auto". Defaults to max-w-4xl. */
  containerClassName?: string;
}

export default function DemoHeader({
  title,
  subtitle,
  language,
  onLanguageChange,
  backLabel,
  onBack,
  containerClassName = 'max-w-4xl mx-auto',
}: DemoHeaderProps) {
  return (
    <>
      {/* ── Top bar ───────────────────────────────────────────────── */}
      <header className="relative z-10 bg-gray-900/95 backdrop-blur-sm border-b border-white/10">
        <div className="absolute inset-0 bg-linear-to-r from-blue-600/10 via-transparent to-purple-600/8 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-blue-500/40 to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Branding */}
          <span className="text-white font-bold text-lg">Jussimatic</span>

          {/* Nav actions (projects, language, login) */}
          <NavActions language={language} onLanguageChange={onLanguageChange} />
        </div>
      </header>

      {/* ── Breadcrumb bar ────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-4 pb-1">
        <div className={containerClassName}>
          <Breadcrumb
            items={[{ label: backLabel, onClick: onBack }]}
            current={title}
            subtitle={subtitle}
          />
        </div>
      </div>
    </>
  );
}

