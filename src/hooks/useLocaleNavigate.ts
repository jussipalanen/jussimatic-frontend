import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import type { NavigateOptions } from 'react-router-dom';
import { getLanguageFromPath, localePath } from '../i18n';

/**
 * Wraps React Router's navigate so every internal path is automatically
 * prefixed with /en when the current URL is under the English locale.
 * Returns a stable function reference (via useCallback) so it is safe to
 * use inside useEffect dependency arrays without causing infinite loops.
 */
export function useLocaleNavigate() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const lang = getLanguageFromPath(pathname);

  return useCallback((to: string, options?: NavigateOptions) => {
    nav(localePath(to, lang), options);
  }, [nav, lang]);
}
