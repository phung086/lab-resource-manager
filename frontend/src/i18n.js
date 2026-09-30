import manifest from './locales/manifest.js';
export const defaultLocale = 'vi';
export const localeStorageKey = 'lrm_locale';
export const localeOptions = ['vi', 'en'];
const urls = { vi: new URL('./locales/catalog/vi.json', import.meta.url).href, en: new URL('./locales/catalog/en.json', import.meta.url).href };
const catalogs = new Map(), pending = new Map(), dictionaries = new Map();
let activeLocale = defaultLocale;
export const normalizeLocale = value => localeOptions.includes(value) ? value : defaultLocale;
export const getActiveLocale = () => activeLocale;
export function activateLocale(locale) {
  const next = normalizeLocale(locale);
  if (!catalogs.has(next)) throw new Error('Locale catalog has not loaded');
  activeLocale = next;
}
export async function loadLocale(value) {
  const locale = normalizeLocale(value);
  if (catalogs.has(locale)) return catalogs.get(locale);
  if (pending.has(locale)) return pending.get(locale);
  const operation = (async () => {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
    try {
      // Failed attempts are never cached: retry makes a new network request.
      const response = await fetch(urls[locale], { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Locale catalog could not be loaded');
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 1_000_000 || bytes.byteLength !== manifest[locale].bytes) throw new Error('Invalid locale catalog size');
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
      if (hash !== manifest[locale].sha256) throw new Error('Locale catalog integrity check failed');
      const catalog = JSON.parse(new TextDecoder().decode(bytes));
      if (catalog.locale !== locale || catalog.version !== 1 || !catalog.messages || Object.values(catalog.messages).some(value => typeof value !== 'string')) throw new Error('Invalid locale catalog');
      catalogs.set(locale, catalog);
      return catalog;
    } finally { clearTimeout(timeout); }
  })();
  pending.set(locale, operation);
  try { return await operation; } finally { pending.delete(locale); }
}
export function interpolate(template, params = {}) {
  return String(template ?? '').replace(/\{([^}]+)\}/g, (_, key) => params[key] === undefined || params[key] === null ? '—' : String(params[key]));
}
export function translateForLocale(locale, key, params = {}) {
  if (key && typeof key === 'object' && typeof key.key === 'string') return translateForLocale(locale, key.key, key.params || {});
  if (key === undefined || key === null || key === '') return '';
  const catalog = catalogs.get(normalizeLocale(locale));
  if (!catalog) throw new Error('Locale catalog has not loaded');
  if (Object.hasOwn(catalog.messages, key)) return interpolate(catalog.messages[key], Object.fromEntries(Object.entries(params).map(([name, value]) => [name, value && typeof value === 'object' && typeof value.key === 'string' ? translateForLocale(locale, value) : value])));
  // Original content and already-localized API errors are text, not message IDs.
  if (!/^(?:core|ui|assistant|api|enum|email|notification|calendar|profile)\./.test(key)) return String(key);
  throw new Error(`Unknown translation key: ${key}`);
}
export const hasMessage = key => Boolean(catalogs.get(activeLocale)?.messages && Object.hasOwn(catalogs.get(activeLocale).messages, key));
export const translate = (key, params = {}) => translateForLocale(activeLocale, key, params);
export function getDictionary(locale) {
  locale = normalizeLocale(locale);
  if (dictionaries.has(locale)) return dictionaries.get(locale);
  const catalog = catalogs.get(normalizeLocale(locale));
  if (!catalog) throw new Error('Locale catalog has not loaded');
  const result = {};
  for (const [key, value] of Object.entries(catalog.messages)) {
    if (!key.startsWith('core.')) continue;
    const parts = key.slice(5).split('.'); let node = result;
    parts.slice(0, -1).forEach((part, index) => { node[part] ||= /^\d+$/.test(parts[index + 1]) ? [] : {}; node = node[part]; });
    node[parts.at(-1)] = value;
  }
  dictionaries.set(locale, result); return result;
}

export function localizeNotification(record) {
  const params = { ...record.messageParams };
  const typeKeys = { BOOKING_APPROVED: 'booking.approved', BOOKING_REJECTED: 'booking.rejected', BOOKING_UPCOMING: 'booking.upcoming', RETURN_REMINDER: 'booking.return_reminder' };
  const prefix = typeKeys[record.type] || (params.event ? `booking.event.${params.event}` : '');
  const render = (field, legacyGroup) => {
    const id = record[`${field}Key`] || (prefix ? `${prefix}.${field}` : '');
    for (const key of [`notification.${id}`, `core.notifications.${legacyGroup}.${id}`]) if (hasMessage(key)) return translate(key, params);
    return record[field] || translate(`notification.generic.${field}`);
  };
  for (const key of ['startAt', 'endAt']) if (params[key]) params[key] = new Intl.DateTimeFormat(activeLocale === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(params[key]));
  return { ...record, title: render('title', 'titles'), message: render('message', 'messages') };
}
