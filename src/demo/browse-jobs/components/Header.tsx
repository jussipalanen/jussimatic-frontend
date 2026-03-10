interface HeaderProps {
  title: string;
  language: string;
  onLanguageChange: (language: string) => void;
  onBack: () => void;
  translations: {
    languageLabel: string;
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
          <label htmlFor="language" className="sr-only">
            {translations.languageLabel}
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="en">English</option>
            <option value="fi">Finnish</option>
          </select>
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
