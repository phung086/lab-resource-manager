import { readFileSync } from 'node:fs';
const catalogs = Object.fromEntries(['vi', 'en'].map(locale => [locale, JSON.parse(readFileSync(new URL(`./${locale}.json`, import.meta.url), 'utf8')).messages]));
export const normalizeLocale = value => value === 'en' ? 'en' : 'vi';
export function requestLocale(req) {
  const explicit = req.get?.('X-LRM-Locale') || req.headers?.['x-lrm-locale'];
  if (['vi', 'en'].includes(explicit)) return explicit;
  const languages = String(req.get?.('Accept-Language') || req.headers?.['accept-language'] || '').split(',').map((value, index) => {
    const [tag, parameter] = value.trim().split(';');
    const quality = parameter?.trim().startsWith('q=') ? Number(parameter.trim().slice(2)) : 1;
    return { locale: tag.toLowerCase().split('-')[0], quality: Number.isFinite(quality) ? quality : 0, index };
  }).filter(item => ['en', 'vi'].includes(item.locale) && item.quality > 0 && item.quality <= 1).sort((a, b) => b.quality - a.quality || a.index - b.index);
  return languages[0]?.locale || 'vi';
}
export function localeMiddleware(req, res, next) {
  req.locale = requestLocale(req);
  const json = res.json.bind(res);
  res.json = body => {
    if (body?.error?.code) return json({ ...body, error: { ...body.error, message: localize(req.locale, body.error.messageKey || `api.${body.error.code}`, body.error.messageParams || {}) } });
    return json(body);
  };
  res.set('Content-Language', req.locale); res.vary('Accept-Language'); res.vary('X-LRM-Locale'); next();
}
export function localize(locale, key, params = {}) {
  const message = catalogs[normalizeLocale(locale)][key] || catalogs[normalizeLocale(locale)]['api.API_REQUEST_FAILED'];
  return message.replace(/\{([a-zA-Z][\w]*)\}/g, (_, key) => params[key] === undefined || params[key] === null ? '—' : String(params[key]));
}
export const localizeError = (locale, code) => localize(locale, `api.${code || 'API_REQUEST_FAILED'}`);
