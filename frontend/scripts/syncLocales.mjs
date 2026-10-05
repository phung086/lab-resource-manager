import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const write = process.argv.includes('--write');
const root = new URL('../', import.meta.url);
const catalogs = ['vi', 'en'].map(locale => JSON.parse(readFileSync(new URL(`src/locales/catalog/${locale}.json`, root), 'utf8')));
assert.deepEqual(Object.keys(catalogs[0].messages).sort(), Object.keys(catalogs[1].messages).sort(), 'Locale keys must match');
const placeholders = value => [...new Set([...value.matchAll(/\{([a-zA-Z][\w]*)\}/g)].map(match => match[1]))].sort();
const errors = [];
for (const [key, vi] of Object.entries(catalogs[0].messages)) {
  const en = catalogs[1].messages[key];
  if (typeof vi !== 'string' || typeof en !== 'string' || !vi.trim() || !en.trim()) errors.push(`${key}: empty translation`);
  else if (JSON.stringify(placeholders(vi)) !== JSON.stringify(placeholders(en))) errors.push(`${key}: interpolation parameters differ`);
  if (/[À-ỹĐđ]/.test(en)) errors.push(`${key}: English contains Vietnamese text`);
}
assert.deepEqual(errors, [], errors.join('\n'));
const manifest = {};
for (const catalog of catalogs) {
  const catalogPath = new URL(`src/locales/catalog/${catalog.locale}.json`, root);
  const source = readFileSync(catalogPath, 'utf8');
  const normalized = source.replace(/\r\n/g, '\n');
  if (write) writeFileSync(catalogPath, normalized);
  else assert.equal(source, normalized, `Catalog ${catalog.locale} must use LF line endings; run npm run i18n:sync`);
  // Hash the exact bytes Git and Vite will serve on every platform.
  const bytes = Buffer.from(normalized, 'utf8');
  manifest[catalog.locale] = { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
  const projection = JSON.stringify({ locale: catalog.locale, messages: Object.fromEntries(Object.entries(catalog.messages).filter(([key]) => /^(?:api|assistant|enum|email|notification|calendar|profile)\./.test(key))) }, null, 2) + '\n';
  const output = new URL(`../backend/src/locales/${catalog.locale}.json`, root);
  if (write) { mkdirSync(new URL('../backend/src/locales/', root), { recursive: true }); writeFileSync(output, projection); }
  else assert.equal(readFileSync(output, 'utf8'), projection, `Backend ${catalog.locale} catalog is out of sync; run npm run i18n:sync`);
}
const output = new URL('src/locales/manifest.js', root), text = 'export default ' + JSON.stringify(manifest, null, 2) + ';\n';
if (write) writeFileSync(output, text); else assert.equal(readFileSync(output, 'utf8'), text, 'Catalog integrity manifest is out of sync');
console.log(`${catalogs[0].messages && Object.keys(catalogs[0].messages).length} VI/EN keys: parity, parameters, integrity and backend projection verified`);
