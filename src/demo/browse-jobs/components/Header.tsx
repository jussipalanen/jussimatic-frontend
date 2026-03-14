import LanguageSelect from '../../../components/LanguageSelect';
import type { Language } from '../../../i18n';

interface HeaderProps {
  title: string;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onBack: () => void;
  translations: {
    back: string;
  };
}

export function Header({
  title,
  language,
  onLanguageChange,
  onBack,
  translations,
}: HeaderProps) {
  return (
    <header className="bg-gray-800 py-4 px-6 border-b border-gray-700">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>

        <div className="flex items-center gap-3">
          <LanguageSelect value={language} onChange={onLanguageChange} />
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white"
          >
            ← {translations.back}
          </button>
        </div>
      </div>
    </header>
  );
}
