import { useEffect, useState } from 'react';
import { fetchCountries } from '../api/settingsApi';
import type { CountryOption } from '../api/settingsApi';
import { getStoredLanguage } from '../i18n';
import type { Language } from '../i18n';

interface CountrySelectProps {
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function CountrySelect({ name, value, onChange, className, required, disabled }: CountrySelectProps) {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    fetchCountries(language).then(setCountries).catch(() => setCountries([]));
  }, [language]);

  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={className}
      required={required}
      disabled={disabled}
    >
      <option value="">— Select country —</option>
      {countries.map((c) => (
        <option key={c.value} value={c.value}>{c.label}</option>
      ))}
    </select>
  );
}
