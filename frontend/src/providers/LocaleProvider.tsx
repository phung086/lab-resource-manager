import React, { createContext, useContext, useCallback } from 'react';
import english from '../locales/en-ui.json';

export type Locale = 'vi' | 'en';
const LocaleContext = createContext<Locale>('vi');
export function LocaleProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale === 'en' ? 'en' : 'vi'}>{children}</LocaleContext.Provider>;
}
export function useLocale() {
  const locale = useContext(LocaleContext);
  const t = useCallback((vi: string, en: string) => locale === 'en' ? en : vi, [locale]);
  const tr = useCallback((text: string) => locale === 'en' ? (english as Record<string, string>)[text?.trim().replace(/\s+/g, ' ')] || text : text, [locale]);
  return { locale, t, tr };
}
