import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadEnv } from 'vite';
import { PUBLIC_SEO, publicSiteOrigin, seoForPath } from '../src/utils/seo.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...loadEnv('production', root, 'VITE_'), ...process.env };
const origin = publicSiteOrigin(env.VITE_PUBLIC_SITE_URL);
const indexable = env.VITE_SEO_INDEXABLE === 'true';
if (indexable && !origin) throw new Error('Indexable builds require VITE_PUBLIC_SITE_URL');
const dist = path.join(root, 'dist'), base = await readFile(path.join(dist, 'index.html'), 'utf8');
const { messages } = JSON.parse(await readFile(path.join(root, 'src/locales/catalog/vi.json'), 'utf8'));
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
// Private/auth/error routes always start with noindex, before JavaScript executes.
await writeFile(path.join(dist, 'private.html'), base);
for (const [pathname, keys] of Object.entries(PUBLIC_SEO)) {
  const page = { title: messages[keys.titleKey], description: messages[keys.descriptionKey] };
  const policy = seoForPath(pathname, { origin, indexable });
  let html = base.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(page.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${escape(page.description)}" />`)
    .replace(/<meta name="robots"[^>]*>/, `<meta name="robots" content="${policy.robots}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escape(page.title)}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escape(page.description)}" />`);
  if (policy.canonical) html = html.replace('</head>', `<link rel="canonical" href="${escape(policy.canonical)}" /><meta property="og:url" content="${escape(policy.canonical)}" /></head>`);
  // Useful public content and crawlable links before JS; React replaces this same-product introduction.
  const links = Object.entries(PUBLIC_SEO).map(([href, item]) => `<li><a href="${href}">${escape(messages[item.titleKey])}</a></li>`).join('');
  html = html.replace('<div id="root"></div>', `<div id="root"><main><h1>${escape(page.title)}</h1><p>${escape(page.description)}</p><nav aria-label="Điều hướng LAB"><ul>${links}</ul></nav><p>Đăng nhập để đặt lịch và quản lý lịch sử dụng của bạn.</p><a href="/login">Đăng nhập</a></main></div>`);
  const directory = pathname === '/' ? dist : path.join(dist, pathname.slice(1));
  await mkdir(directory, { recursive: true }); await writeFile(path.join(directory, 'index.html'), html);
}
const locations = indexable && origin ? Object.keys(PUBLIC_SEO).map(p => `<url><loc>${escape(origin + p)}</loc></url>`).join('') : '';
await writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations}</urlset>\n`);
await writeFile(path.join(dist, 'robots.txt'), indexable && origin
  ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /mcp/\nDisallow: /oauth/\nSitemap: ${origin}/sitemap.xml\n`
  : 'User-agent: *\nDisallow: /\n');
console.log(`SEO: four public documents, private noindex, indexing ${indexable ? 'enabled' : 'disabled'}`);
