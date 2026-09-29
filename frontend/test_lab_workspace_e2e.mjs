import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const ui = process.env.UX_FRONTEND_URL || 'http://127.0.0.1:15181';
const api = process.env.UX_API_URL || 'http://127.0.0.1:15005/api';
assert.ok(process.env.UX_DEMO_PASSWORD, 'UX_DEMO_PASSWORD is required');
const out = fileURLToPath(new URL('../logs/lab-build/', import.meta.url)); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [], results = [];
async function settleImages(page) {
  for (const card of await page.locator('.catalog-card').all()) await card.scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images).map(img => img.decode().catch(() => {})));
    window.scrollTo(0, 0);
  });
}
async function inspect(page, label, screenshot = false) {
  await page.locator('body').waitFor();
  await page.waitForTimeout(350);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  assert.equal(overflow, false, `${label}: page overflow`);
  assert.equal(await page.locator('vite-error-overlay').count(), 0, `${label}: Vite error`);
  if (screenshot) await page.screenshot({ path: path.join(out, `${label}.png`), fullPage: true });
  results.push(label);
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(ui, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.catalog-card').count(), 6);
  await settleImages(page);
  await inspect(page, 'final-landing-desktop', true);
  await page.getByRole('button', { name: 'EN', exact: true }).first().click();
  await page.getByRole('heading', { name: 'Choose where to begin.' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  await page.getByRole('searchbox').fill('LOCAL-EQ-01');
  assert.equal(await page.locator('.catalog-card').count(), 1);
  await page.locator('.catalog-card-cta').click();
  await page.locator('.catalog-detail .public-primary').waitFor();
  assert.ok((await page.locator('.catalog-detail').innerText()).includes('Safety training'));
  await page.getByRole('button', { name: 'Close details', exact: true }).click();
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: /Show more resources/ }).click();
  assert.equal(await page.locator('.catalog-card').count(), 11);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  await page.setViewportSize({ width: 390, height: 844 });
  await settleImages(page);
  await inspect(page, 'final-landing-mobile', true);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({ path: path.join(out, 'final-hero-desktop.png') });
  await page.close();
  for (const role of ['student', 'lecturer', 'staff', 'admin']) {
    const response = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${role}@lrm.local`, password: process.env.UX_DEMO_PASSWORD }) });
    assert.equal(response.status, 200, `${role}: login`); const session = await response.json();
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ session }) => { localStorage.setItem('lrm_token', session.accessToken); localStorage.setItem('lrm_user', JSON.stringify(session.user)); localStorage.setItem('lrm_locale', 'en'); }, { session });
    const p = await context.newPage(); p.on('pageerror', error => errors.push(error.message));
    await p.goto(ui, { waitUntil: 'networkidle' });
    await p.locator('#kiem-tra-lich .lab-home').waitFor();
    await inspect(p, `${role}-home`);
    const routes = ['lich-dat', 'booking', 'tai-nguyen', 'ho-so', 'thong-bao', 'su-co', ...(role === 'staff' || role === 'admin' ? ['kho-vat-tu', 'bao-tri', 'van-hanh', 'telemetry'] : ['lop-hoc-phan']), ...(role === 'admin' ? ['nguoi-dung', 'lop-hoc-phan'] : [])];
    for (const route of routes) {
      await p.goto(`${ui}/#/workspace/${route}`, { waitUntil: 'networkidle' });
      await inspect(p, `${role}-${route}`, role === 'admin' && ['kho-vat-tu', 'bao-tri', 'lich-dat'].includes(route));
      await p.setViewportSize({ width: 390, height: 844 });
      await inspect(p, `${role}-${route}-mobile`, role === 'admin' && ['kho-vat-tu','bao-tri'].includes(route));
      await p.setViewportSize({ width: 1440, height: 960 });
    }
    await context.close();
  }
  assert.deepEqual(errors, [], 'Uncaught browser errors');
  fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify({ results, errors, mutations: 'none; authentication and read-only UI only' }, null, 2));
  console.log(`PASS: ${results.length} desktop/mobile checks; four roles; language, search, details, pagination; no uncaught errors.`);
} finally { await browser.close(); }
