export type Language = 'en' | 'fi';

export const DEFAULT_LANGUAGE: Language = 'en';
export const STORAGE_KEY = 'jussimatic-language';

const isLanguage = (value: string | null): value is Language => value === 'en' || value === 'fi';

const getBrowserLanguage = (): Language => {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;

  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = candidate.toLowerCase();
    if (normalized === 'fi' || normalized.startsWith('fi-')) return 'fi';
    if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  }

  return DEFAULT_LANGUAGE;
};

export const getStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isLanguage(value) ? value : getBrowserLanguage();
  } catch {
    return getBrowserLanguage();
  }
};

export const setStoredLanguage = (lang: Language): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors.
  }
};

export const translations = {
  en: {
    landing: {
      title: 'Welcome to Jussimatic',
      subtitle: 'Your ultimate solution for automated justice.',
      cta: 'Get Started',
    },
    chat: {
      title: 'Chat',
      back: 'Back',
      empty: 'Start your conversation...',
      inputPlaceholder: 'Type your message...',
      send: 'Send',
      sending: 'Sending...',
      clearMessages: 'Clear messages',
      noResponse: 'No response from API.',
      error: 'Sorry, there was an error processing your request.',
      languageLabel: 'Language',
    },
    footer: 'All rights reserved.',
  },
  fi: {
    landing: {
      title: 'Tervetuloa Jussimaticiin',
      subtitle: 'Oikeuden automatisoinnin paras ratkaisu.',
      cta: 'Aloita',
    },
    chat: {
      title: 'Keskustelu',
      back: 'Takaisin',
      empty: 'Aloita keskustelu...',
      inputPlaceholder: 'Kirjoita viestisi...',
      send: 'Laheta',
      sending: 'Lahetaan...',
      clearMessages: 'Tyhjenna viestit',
      noResponse: 'Ei vastausta API:lta.',
      error: 'Pahoittelut, pyyntoa ei voitu kasitella.',
      languageLabel: 'Kieli',
    },
    footer: 'Kaikki oikeudet pidatetaan.',
  },
} as const;
