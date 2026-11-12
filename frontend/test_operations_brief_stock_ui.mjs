import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const shots = process.env.UI_SCREENSHOT_DIR;
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const now = new Date().toISOString();
const next = new Date(Date.now() + 3600000).toISOString();
const lab = { id: 'qa-lab', name: 'LAB Điện tử' };
const resource = { id: 'qa-room', code: 'LAB-01', name: 'Phòng thực hành', laboratoryId: lab.id };
const rows = [
  { id: 'qa-material', code: 'VT-01', name: 'Dây nối mạch', laboratoryId: lab.id, stockItem: null },
  { id: 'qa-counted', code: 'VT-02', name: 'Kẹp đo', laboratoryId: lab.id, stockItem: { balance: 12, unit: 'bộ' } }
];
const job = { id: 'qa-job', kind: 'calibration', title: 'Hiệu chuẩn đồng hồ', resource, resourceId: resource.id, status: 'scheduled', startAt: now, endAt: next };
const booking = { id: 'qa-loan', resource, resourceId: resource.id, title: 'Bàn giao kiểm thử', status: 'CHECKED_OUT', startAt: now, endAt: now };
const incident = { id: 'qa-incident', resource, resourceId: resource.id, title: 'Kiểm thử sự cố', description: 'Test', severity: 'critical', status: 'reported', detectedAt: now };
const preview = {
  generatedAt: now, horizonHours: 24, laboratories: [lab],
  overdue: { total: 4, withNextBooking: 1, items: [{ ...booking, nextBooking: { id: 'qa-next', startAt: next } }] },
  incidents: { total: 1, items: [incident] }, maintenance: { total: 1, items: [job] }
};
const emptyPreview = { ...preview, overdue: { total: 0, withNextBooking: 0, items: [] }, incidents: { total: 0, items: [] }, maintenance: { total: 0, items: [] } };
const queue = (items, summary) => ({ items, summary, pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1 } });

try {
  const variants = [
    ['ADMIN', 'vi', 390], ['ADMIN', 'vi', 1440], ['ADMIN', 'en', 390], ['ADMIN', 'en', 1440],
    ['LAB_STAFF', 'en', 390]
  ];
  for (const [role, locale, width] of variants) {
    const actor = { id: 'qa-operator', fullName: 'QA Operator', email: 'qa@example.test', role, isActive: true };
    const context = await browser.newContext({ viewport: { width, height: 940 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ actor, locale }) => {
      sessionStorage.setItem('lrm_token', 'isolated-brief-stock-ui');
      sessionStorage.setItem('lrm_user', JSON.stringify(actor));
      localStorage.setItem('lrm_locale', locale);
    }, { actor, locale });
    const mutations = [], scopes = [], errors = [];
    let failBrief = false;
    await context.route('**/api/**', async route => {
      const request = route.request();
      const { pathname, searchParams } = new URL(request.url());
      if (request.method() !== 'GET' && !pathname.startsWith('/api/auth/')) mutations.push(pathname);
      let data = [];
      if (['/api/auth/me', '/api/users/me'].includes(pathname)) data = actor;
      else if (['/api/auth/session', '/api/auth/activity'].includes(pathname)) data = { expiresAt: next, idleExpiresAt: next, idleTimeoutSeconds: 3600 };
      else if (pathname === '/api/dashboard') data = { summary: { totalResources: 1, criticalIncidentCount: 1 } };
      else if (pathname === '/api/dashboard/trends') data = { scope: 'all', timezone: 'Asia/Ho_Chi_Minh', startAt: now, endAt: next, buckets: [] };
      else if (pathname === '/api/dashboard/operations-brief') {
        const scope = searchParams.get('laboratoryId');
        scopes.push(scope);
        if (failBrief) return route.fulfill({ status: 503, json: { error: 'API_REQUEST_FAILED' } });
        data = scope ? emptyPreview : preview;
      } else if (pathname === '/api/bookings') data = queue([booking], { total: 1, byStatus: { CHECKED_OUT: 1 }, pendingPayment: 0, history: 0, overdue: 1, asOf: now });
      else if (pathname === '/api/bookings/qa-loan') data = booking;
      else if (pathname === '/api/incidents') data = queue([incident], { total: 1, byStatus: { reported: 1 }, open: 1, resolved: 0, asOf: now });
      else if (pathname === '/api/incidents/qa-incident') data = incident;
      else if (pathname === '/api/maintenance') data = [job];
      else if (pathname === '/api/lab-workspace/stock') data = rows;
      else if (pathname === '/api/notifications/unread-count') data = { unread: 0 };
      else if (pathname === '/api/users') data = [actor];
      else if (pathname === '/api/resources') data = [resource];
      else if (pathname === '/api/laboratories') data = [lab];
      await route.fulfill({ json: data });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    try {
      if (role === 'ADMIN') {
        await page.goto(`${base}/workspace/overview`);
        const brief = page.locator('.ops-brief');
        const groups = brief.locator('.ops-brief-group');
        await groups.nth(2).waitFor();
        assert.deepEqual(await groups.locator('.ops-brief-group-heading > strong').allTextContents(), ['4', '1', '1']);
        assert.equal(await brief.getByRole('heading', { name: locale === 'vi' ? 'Điểm nhanh vận hành' : 'Operations at a glance' }).count(), 1);
        assert.equal(await page.locator('.admin-excep,.admin-people,.admin-health,.admin-resource').count(), 4);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        if (shots) await brief.screenshot({ path: join(shots, `operations-${locale}-${width}.png`) });
        assert.equal(await groups.locator('details[open]').count(), 0);
        if (width === 390) {
          const first = groups.first();
          await first.locator('summary').focus();
          await page.keyboard.press('Enter');
          await first.locator('.ops-brief-row').waitFor();
        }
        await brief.getByRole('combobox').selectOption(lab.id);
        await brief.locator('.ops-brief-empty').nth(2).waitFor({ state: 'attached' });
        assert.equal(scopes.at(-1), lab.id);
        failBrief = true;
        await brief.locator('.ops-brief-refresh').click();
        await brief.getByRole('alert').waitFor();
        assert.equal(await groups.count(), 0);
        failBrief = false;
        await brief.getByRole('combobox').selectOption('');
        await groups.nth(2).waitFor();
        if (width === 1440) {
          for (const [index, path, param, id] of [[0, 'bookings', 'booking', booking.id], [1, 'incidents', 'incident', incident.id], [2, 'maintenance', 'job', job.id]]) {
            await groups.nth(index).locator('summary').click();
            await groups.nth(index).locator('.ops-brief-row').click();
            await page.waitForURL(url => url.pathname.endsWith(`/${path}`) && url.searchParams.get(param) === id);
            await page.goto(`${base}/workspace/overview`);
            await groups.nth(2).waitFor();
          }
        }
      }
      await page.goto(`${base}/workspace/materials`);
      await page.locator('.materials-row-receipt').click();
      assert.equal(await page.locator('#material-kind').inputValue(), 'RECEIPT');
      await page.waitForFunction(() => document.activeElement?.id === 'material-quantity');
      assert.equal(new URL(page.url()).searchParams.get('resource'), rows[0].id);
      assert.equal(await page.locator('.materials-movement-actions button').count(), 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (shots) await page.screenshot({ path: join(shots, `materials-${role}-${locale}-${width}.png`) });
      await page.locator('.materials-row-button').nth(1).click();
      const actions = page.locator('.materials-movement-actions button');
      assert.equal(await actions.count(), role === 'ADMIN' ? 3 : 2);
      await actions.nth(1).click();
      assert.equal(await page.locator('#material-kind').inputValue(), 'ISSUE');
      assert.equal(await page.locator('#material-unit').inputValue(), 'bộ');
      assert.deepEqual(mutations, []);
      assert.deepEqual(errors, []);
      console.log(`${role} ${locale} ${width}px: scope, dossier routes and stock actions verified`);
    } catch (error) {
      console.error(role, locale, width, page.url(), errors, (await page.locator('body').innerText()).slice(0, 1800));
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
