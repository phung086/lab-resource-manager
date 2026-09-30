import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { activateLocale, loadLocale, localeStorageKey, normalizeLocale, translateForLocale } from '../i18n.js';
import bootstrap from '../locales/bootstrap.json';
export type Locale = 'vi' | 'en';
type Params = Record<string, unknown>;
export type LocaleMessage = string | { key: string; params?: Params };
type LocaleContextValue = { locale: Locale; t: (key: LocaleMessage, params?: Params) => string; tr: (key: LocaleMessage, params?: Params) => string; changeLocale: (locale: string) => Promise<void>; loadingLocale: Locale | null };
const LocaleContext = createContext<LocaleContextValue | null>(null);
const storedLocale = () => { try { return normalizeLocale(localStorage.getItem(localeStorageKey)) as Locale; } catch { return 'vi' as Locale; } };
export function LocaleProvider({ locale: requestedLocale, children }: { locale?: string; children: React.ReactNode }) {
  const initial = useRef<Locale>(requestedLocale ? normalizeLocale(requestedLocale) as Locale : storedLocale());
  const [locale, setLocale] = useState<Locale>(initial.current), [ready, setReady] = useState(false);
  const [loadingLocale, setLoading] = useState<Locale | null>(initial.current), [failedLocale, setFailed] = useState<Locale | null>(null);
  const sequence = useRef(0), mounted = useRef(false);
  const changeLocale = useCallback(async (value: string) => {
    const next = normalizeLocale(value) as Locale, version = ++sequence.current;
    setLoading(next); setFailed(null);
    try {
      await loadLocale(next);
      if (!mounted.current || version !== sequence.current) return;
      activateLocale(next);
      try { localStorage.setItem(localeStorageKey, next); } catch { /* Preserve the in-session preference in private mode. */ }
      document.documentElement.lang = next; setLocale(next); setReady(true);
    } catch { if (mounted.current && version === sequence.current) setFailed(next); }
    finally { if (mounted.current && version === sequence.current) setLoading(null); }
  }, []);
  useEffect(() => { mounted.current = true; void changeLocale(initial.current); return () => { mounted.current = false; sequence.current += 1; }; }, [changeLocale]);
  useEffect(() => { if (requestedLocale && ready && requestedLocale !== locale) void changeLocale(requestedLocale); }, [requestedLocale, ready, locale, changeLocale]);
  const t = useCallback((key: LocaleMessage, params: Params = {}) => translateForLocale(locale, key, params), [locale]);
  const copy = bootstrap[ready ? locale : initial.current];
  return <LocaleContext.Provider value={{ locale, t, tr: t, changeLocale, loadingLocale }}>
    {(failedLocale || loadingLocale) && <div className={ready ? 'locale-feedback' : 'locale-startup'} role={failedLocale ? 'alert' : 'status'} aria-live="polite"><p>{failedLocale ? copy.failed : copy.loading}</p>{failedLocale && <button type="button" className="secondary-button" onClick={() => void changeLocale(failedLocale)}>{copy.retry}</button>}</div>}
    {ready && children}
  </LocaleContext.Provider>;
}
export function useLocale() { const value = useContext(LocaleContext); if (!value) throw new Error('useLocale requires LocaleProvider'); return value; }
