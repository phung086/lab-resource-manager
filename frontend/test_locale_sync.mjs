import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

test('locale sync hashes canonical LF bytes and rejects unsynchronized CRLF sources', () => {
  const temporaryRoot = resolve(tmpdir());
  const fixture = mkdtempSync(join(temporaryRoot, 'lrm-locale-sync-'));
  try {
    const frontend = join(fixture, 'frontend');
    mkdirSync(join(frontend, 'scripts'), { recursive: true });
    mkdirSync(join(frontend, 'src/locales/catalog'), { recursive: true });
    copyFileSync(new URL('scripts/syncLocales.mjs', import.meta.url), join(frontend, 'scripts/syncLocales.mjs'));
    for (const locale of ['vi', 'en']) {
      writeFileSync(join(frontend, `src/locales/catalog/${locale}.json`),
        JSON.stringify({ locale, messages: { 'api.example': 'Hello {name}' } }, null, 2).replace(/\n/g, '\r\n') + '\r\n');
    }
    const run = (...args) => spawnSync(process.execPath, ['scripts/syncLocales.mjs', ...args], { cwd: frontend, encoding: 'utf8' });
    const before = run();
    assert.notEqual(before.status, 0);
    assert.match(before.stderr, /must use LF line endings/);
    const synced = run('--write');
    assert.equal(synced.status, 0, synced.stderr);
    const manifest = JSON.parse(readFileSync(join(frontend, 'src/locales/manifest.js'), 'utf8').replace(/^export default /, '').replace(/;\s*$/, ''));
    for (const locale of ['vi', 'en']) {
      const bytes = readFileSync(join(frontend, `src/locales/catalog/${locale}.json`));
      assert.equal(bytes.includes(13), false);
      assert.deepEqual(manifest[locale], { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
    }
    const checked = run();
    assert.equal(checked.status, 0, checked.stderr);
  } finally {
    assert.ok(resolve(fixture).startsWith(temporaryRoot + sep));
    assert.ok(fixture.split(sep).at(-1).startsWith('lrm-locale-sync-'));
    rmSync(fixture, { recursive: true, force: true });
  }
});
