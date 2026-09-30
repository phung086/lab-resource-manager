import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadLocale, activateLocale, getActiveLocale, translate, getDictionary } from './src/i18n.js';
const read = locale => readFileSync(new URL(`./src/locales/catalog/${locale}.json`, import.meta.url));
test('failed locale loads retry, integrity failures stay inactive, and translations preserve parameters', async () => {
  const original = globalThis.fetch; let reads = 0, fail = true;
  globalThis.fetch = async () => { reads += 1; if (fail) throw new Error('temporary outage'); return new Response(read('vi')); };
  try {
    await assert.rejects(loadLocale('vi'), /outage/); assert.equal(reads, 1);
    fail = false; await Promise.all([loadLocale('vi'), loadLocale('vi')]); assert.equal(reads, 2);
    activateLocale('vi'); assert.equal(getDictionary('vi').locale, 'vi');
    globalThis.fetch = async () => new Response(read('en').toString().replace('LAB assistant', 'BAD assistant'));
    await assert.rejects(loadLocale('en'), /integrity|size/); assert.equal(getActiveLocale(), 'vi');
    globalThis.fetch = async () => new Response(read('en'));
    await loadLocale('en'); activateLocale('en');
    assert.equal(translate('assistant.openForm', { code: 'GPU-01', time: '10:00' }), 'Open form · GPU-01 · 10:00');
    assert.equal(translate('Original user note: thí nghiệm'), 'Original user note: thí nghiệm');
    assert.throws(() => translate('ui.missing_translation'), /Unknown translation/);
    const notice = { key: 'api.RETURN_RECORDED_PHYSICAL_STATE', params: { status: { key: 'enum.operational.BROKEN' } } };
    assert.equal(translate(notice), 'Return recorded; the physical state remains Broken.');
    activateLocale('vi'); assert.match(translate(notice), /Hỏng/);
    assert.equal(translate('calendar.maintenanceTitle', { title: 'Ghi chú gốc' }), 'Bảo trì: Ghi chú gốc');
  } finally { globalThis.fetch = original; }
});
