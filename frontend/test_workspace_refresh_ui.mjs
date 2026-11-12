import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

// Browser lifecycle regression with isolated HTTP fixtures. No requests reach a real API.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const vi = JSON.parse(await readFile(new URL('./src/locales/catalog/vi.json', import.meta.url), 'utf8')).messages;
const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true }
  : { channel: 'chrome', headless: true });
const results = [];
try {
  for (const scenario of ['same-session', 'new-actor', 'queued-refresh']) {
    const initialActor = { id: 'refresh-a', role: 'CUSTOMER', fullName: 'Actor A', email: 'a@example.test', isActive: true };
    let actor = initialActor, delayNext = false, delayed = false, sharedReads = 0;
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(user => {
      sessionStorage.setItem('lrm_token', 'isolated-refresh-fixture');
      sessionStorage.setItem('lrm_user', JSON.stringify(user));
      localStorage.setItem('lrm_locale', 'vi');
    }, initialActor);
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url()), path = url.pathname;
      let data = [];
      if (path === '/api/auth/me') data = actor;
      else if (path === '/api/auth/login') data = { accessToken: 'isolated-refresh-fixture', user: actor };
      else if (path === '/api/bookings' || path === '/api/incidents') {
        data = { items: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 }, summary: { total: 0, byStatus: {}, history: 0, pendingPayment: 0, overdue: 0, asOf: new Date().toISOString() } };
        if (path === '/api/bookings' && url.searchParams.get('pageSize') === '100') {
          sharedReads++;
          if (delayNext) { delayNext = false; delayed = true; await new Promise(resolve => setTimeout(resolve, 1000)); }
        }
      } else if (path === '/api/notifications/unread-count') data = { unread: 0 };
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }).catch(() => {});
    });
    await page.goto(`${base}/workspace/overview`);
    await page.locator('.discovery-studio').waitFor();
    assert.equal(sharedReads, 1);
    delayNext = true;
    if (scenario === 'queued-refresh') {
      await page.locator('[data-nav-id="resources"]').click();
      await page.locator('[data-nav-id="home"]').click();
      await page.waitForFunction(() => !document.querySelector('.home-loading'));
    } else {
      await page.getByRole('button', { name: vi['ui.refresh_data_167c5f3e'], exact: true }).click();
    }
    await assertEventually(() => delayed, 'Shared refresh must be in flight');
    if (scenario === 'queued-refresh') {
      // Home-entry refresh is silent, leaving refresh available. Preserve this
      // explicit invalidation rather than dropping it behind the in-flight read.
      await page.getByRole('button', { name: vi['ui.refresh_data_167c5f3e'], exact: true }).click();
    } else {
      await page.evaluate(() => window.dispatchEvent(new Event('lrm:session-invalid')));
      if (scenario === 'new-actor') actor = { ...initialActor, id: 'refresh-b', fullName: 'Actor B', email: 'b@example.test', authVersion: 1 };
      await page.locator('input[type=email]').fill(actor.email);
      await page.locator('input[type=password]').fill('IsolatedFixturePassword!');
      await page.locator('button[type=submit]').click();
    }
    await assertEventually(() => sharedReads === 3, 'A fresh shared read must start after cancellation or queued invalidation');
    await page.locator('.discovery-studio').waitFor();
    await page.locator('.home-loading').waitFor({ state: 'hidden' });
    assert.ok((await page.locator('.studio-hero h1').innerText()).includes(actor.fullName));
    assert.deepEqual(errors, []);
    results.push({ scenario, sharedReads, passed: true });
    await context.close();
  }
  console.log(JSON.stringify({ results, type: 'Isolated browser fixtures; no real API or database writes' }));
} finally { await browser.close(); }

async function assertEventually(condition, label) {
  const deadline = Date.now() + 10000;
  while (!condition() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 30));
  assert.ok(condition(), label);
}
