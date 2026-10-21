import assert from 'node:assert/strict';
const base = new URL(process.env.SEO_SMOKE_URL || 'http://127.0.0.1:25441');
assert.equal(base.hostname, '127.0.0.1'); assert.equal(base.port, '25441');
const canonicalOrigin = 'https://lab.example.edu.vn'; // Explicit QA image only, never infer a production domain.
let checks = 0; const titles = new Set();
for (const path of ['/', '/resources', '/schedule', '/how-it-works']) {
  const response = await fetch(base.origin + path), html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /<main><h1>[^<]+<\/h1>/); checks += 2;
  assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large"/); checks++;
  assert.ok(html.includes(`<link rel="canonical" href="${canonicalOrigin}${path}"`)); checks++;
  assert.ok(response.headers.get('content-security-policy')?.includes("script-src 'self'")); checks++;
  titles.add(html.match(/<title>([^<]+)<\/title>/)?.[1]);
}
assert.equal(titles.size, 4); checks++;
for (const path of ['/workspace/profile?section=security', '/workspace/payments?booking=private-reference', '/login?returnTo=%2Fworkspace%2Fprofile', '/register']) {
  const response = await fetch(base.origin + path), html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /noindex,nofollow,noarchive/); checks += 2;
  assert.doesNotMatch(html, /rel="canonical"|private-reference/); checks++;
  assert.equal(response.headers.get('cache-control'), 'no-store'); checks++;
  assert.ok(response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'")); checks++;
}
const unknown = await fetch(base.origin + '/missing-resource'); assert.equal(unknown.status, 404); assert.match(await unknown.text(), /noindex/); checks += 2;
const redirect = await fetch(base.origin + '/resources/?q=scope', { redirect: 'manual' }); assert.equal(redirect.status, 308); assert.ok(redirect.headers.get('location').endsWith('/resources?q=scope')); checks += 2;
const robots = await (await fetch(base.origin + '/robots.txt')).text(); assert.ok(robots.includes('Sitemap: ' + canonicalOrigin + '/sitemap.xml')); checks++;
const sitemap = await (await fetch(base.origin + '/sitemap.xml')).text(); assert.equal((sitemap.match(/<loc>/g) || []).length, 4); assert.doesNotMatch(sitemap, /workspace|login|register|booking=/); checks += 2;
console.log(JSON.stringify({ checks, result: 'PASS', scope: 'Local production-image HTTP; no browser/Google indexing certification' }));
