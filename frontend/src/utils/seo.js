export const PUBLIC_SEO = Object.freeze({
  '/': { titleKey: 'seo.home.title', descriptionKey: 'seo.home.description' },
  '/resources': { titleKey: 'seo.resources.title', descriptionKey: 'seo.resources.description' },
  '/schedule': { titleKey: 'seo.schedule.title', descriptionKey: 'seo.schedule.description' },
  '/how-it-works': { titleKey: 'seo.process.title', descriptionKey: 'seo.process.description' }
});
export function publicSiteOrigin(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      /^(localhost|127\.|\[|.*\.local$)/i.test(url.hostname)) throw new Error('VITE_PUBLIC_SITE_URL must be a public HTTPS origin');
  return url.origin;
}
export function seoForPath(path, { origin = '', indexable = false } = {}) {
  const page = PUBLIC_SEO[path];
  return { page, robots: page && indexable && origin ? 'index,follow,max-image-preview:large' : 'noindex,nofollow,noarchive',
    canonical: page && origin ? origin + path : '' };
}
