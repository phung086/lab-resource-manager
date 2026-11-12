import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const shots = process.env.UI_SCREENSHOT_DIR;
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CHROMIUM_EXECUTABLE_PATH ? undefined : 'msedge',
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH
});
const date = new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const nextDate = new Date(Date.now() + 172_800_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const at = (day, time) => new Date(`${day}T${time}:00+07:00`).toISOString();
const deadline = new Date(Date.now() + 600_000).toISOString();
const customer = { id: 'qa-customer', fullName: 'Minh Anh', role: 'CUSTOMER', isActive: true };
const policy = { workDayStartHour: 8, workDayEndHour: 20, allowWeekend: true, minBookingMinutes: 15, maxBookingMinutes: 480 };
const lab = { id: 'qa-lab', name: 'LAB Điện tử', isActive: true, labPolicy: policy };
const resource = { id: 'qa-scope-a', code: 'OSC-A', name: 'Máy hiện sóng A', category: 'EQUIPMENT', operationalStatus: 'AVAILABLE',
  bookingState: 'bookable', laboratoryId: lab.id, laboratory: lab, labPolicy: policy };
const other = { ...resource, id: 'qa-scope-b', code: 'OSC-B', name: 'Máy hiện sóng B' };
const history = { id: 'qa-history', status: 'COMPLETED', title: 'Buổi đo trước', resource, requestedBy: customer,
  requestedById: customer.id, resourceId: resource.id, startAt: '2026-08-03T02:00:00.000Z', endAt: '2026-08-03T03:00:00.000Z', feeAmountVnd: 0 };
const payment = { ...history, id: 'qa-payment', status: 'PENDING_APPROVAL', startAt: at(date, '09:00'), endAt: at(date, '10:00'), feeAmountVnd: 50000, paymentDueAt: deadline };
const contact = { fullName: customer.fullName, phone: '0900000000', email: 'ui-fixture@example.test' };

try {
  for (const [width, locale] of [[1440, 'vi'], [390, 'en']]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ customer, locale }) => {
      sessionStorage.setItem('lrm_token', 'ui-test-only');
      sessionStorage.setItem('lrm_user', JSON.stringify(customer));
      localStorage.setItem('lrm_locale', locale);
    }, { customer, locale });
    let settled = false;
    const writes = [], reads = [], errors = [];
    await context.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      reads.push(path);
      if (request.method() === 'POST' && !path.startsWith('/api/auth/')) writes.push({ path, body: request.postDataJSON() });
      let data = [];
      if (path === '/api/auth/me') data = customer;
      else if (path.startsWith('/api/auth/')) data = { idleExpiresAt: deadline, expiresAt: deadline, idleTimeoutSeconds: 600 };
      else if (path === '/api/bookings' && request.method() === 'GET') {
        const filter = url.searchParams.get('filter');
        const items = filter === 'HISTORY' ? [history] : settled ? [] : [payment];
        data = { items, pagination: { page: 1, pageSize: 20, total: items.length, totalPages: Number(Boolean(items.length)) },
          summary: { total: 2, byStatus: settled ? { COMPLETED: 1, CONFIRMED: 1 } : { COMPLETED: 1, PENDING_APPROVAL: 1 },
            pendingPayment: settled ? 0 : 1, actionRequired: settled ? 0 : 1, history: 1, overdue: 0, asOf: new Date().toISOString() } };
      } else if (path === '/api/bookings/qa-history') data = history;
      else if (path === '/api/bookings/qa-history/repeat-draft') data = { resources: [resource, other] };
      else if (path === '/api/laboratories') data = [lab];
      else if (path === '/api/resources') data = [resource];
      else if (path === '/api/resources/qa-scope-b') data = other;
      else if (path.endsWith('/fulfillment')) data = { category: 'EQUIPMENT', deliveryAllowed: false };
      else if (path === '/api/users/me') data = { ...customer, ...contact };
      else if (path === '/api/calendar/events') data = { events: [{ id: 'busy-fixture', type: 'booking',
        resourceId: resource.id, start: at(date, '08:00'), end: at(date, '20:00') }] };
      else if (path === '/api/planning/alternatives') data = { suggestions: [{ replacement: other, amountVnd: 45000 }] };
      else if (path === '/api/planning/suggestions') data = { suggestions: [{ startAt: at(nextDate, '09:00'), endAt: at(nextDate, '10:00') }] };
      else if (path === '/api/planning/review') data = { items: [resource, other].map(resource => ({ resource, quote: { amountVnd: 45000, version: 2 } })), amountVnd: 90000 };
      else if (path === '/api/planning/waitlist' && request.method() === 'POST') data = { id: 'wait-fixture', status: 'WAITING' };
      else if (path === '/api/booking-pricing/quote') data = { amountVnd: 45000, version: 1 };
      else if (path.startsWith('/api/booking-pricing/')) data = [{ id: 'qa-rate', purposeCode: 'STUDY', hourlyRateVnd: 45000 }];
      else if (path === '/api/notifications/unread-count') data = { unread: 0 };
      await route.fulfill({ json: data });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/workspace/bookings`);
    await page.locator('.customer-ticket-payment button').waitFor();
    assert.match(await page.locator('.operations-filter-btn.is-active').innerText(), locale === 'vi' ? /Cần xử lý/ : /Needs action/);
    if (shots) await page.screenshot({ path: join(shots, `needs-action-${width}.png`) });
    settled = true;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.locator('.customer-ticket-payment').waitFor({ state: 'detached' });
    await page.locator('.operations-filter-btn').filter({ hasText: locale === 'vi' ? 'Lịch sử' : 'History' }).click();
    await page.locator('[data-booking-id="qa-history"] .operation-card-select').click();
    await page.getByRole('button', { name: locale === 'vi' ? 'Đặt lại bộ tài nguyên' : 'Book these resources again' }).click();
    await page.locator('.customer-repeat-draft .planning-resource').first().waitFor();
    assert.equal(await page.locator('.customer-repeat-draft input[type=checkbox]:checked').count(), 2);
    for (const input of await page.locator('.customer-repeat-draft input[type=datetime-local]').all()) assert.equal(await input.inputValue(), '');
    assert.equal(await page.locator('.planning-summary .primary-button').isDisabled(), true);
    if (shots) await page.screenshot({ path: join(shots, `repeat-${width}.png`) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const repeat = page.locator('.customer-repeat-draft');
    const dates = repeat.locator('input[type=datetime-local]');
    const fields = repeat.locator('.planning-grid');
    await dates.nth(0).fill(`${nextDate}T09:00`);
    await dates.nth(1).fill(`${nextDate}T10:00`);
    await fields.locator('input:not([type])').nth(0).fill('Buổi đo mới');
    await fields.locator('input:not([type])').nth(1).fill('Minh Anh');
    await fields.locator('input[type=tel]').fill('0900000000');
    await repeat.locator('.planning-actions .primary-button').click();
    await repeat.locator('.planning-total').waitFor();
    assert.deepEqual(writes.find(row => row.path === '/api/planning/review')?.body.resourceIds, [resource.id, other.id]);
    assert.equal(await repeat.locator('.planning-summary .primary-button').isEnabled(), true);
    await dates.nth(1).fill(`${nextDate}T10:30`);
    assert.equal(await repeat.locator('.planning-summary .primary-button').isDisabled(), true);

    await page.goto(`${base}/workspace/calendar?resource=${resource.id}`);
    await page.locator('.planner-slot-panel:not([hidden])').waitFor();
    await page.locator('.planner-date-input input').fill(date);
    await page.locator('.planner-custom-time summary').click();
    await page.locator('.planner-custom-time input').first().fill('09:00');
    await page.locator('.planner-custom-time input').last().fill('10:00');
    const recovery = page.locator('.booking-availability-help');
    await recovery.waitFor();
    assert.ok(!reads.includes('/api/bookings/availability'), 'Recovery appears before submitting an unavailable slot');
    assert.equal(await page.locator('.planner-booking-actions .btn-primary').isDisabled(), true);
    await recovery.getByRole('button', { name: locale === 'vi' ? /Theo dõi khung/ : /Watch this interval/ }).click();
    await recovery.getByRole('button', { name: locale === 'vi' ? 'Đang theo dõi' : 'Following' }).waitFor();
    assert.equal(writes.find(row => row.path === '/api/planning/waitlist')?.body.startAt, at(date, '09:00'));
    await recovery.getByRole('button', { name: locale === 'vi' ? /Tìm tài nguyên thay thế/ : /Find resource alternatives/ }).click();
    const result = recovery.getByRole('button', { name: /OSC-B/ });
    await result.waitFor();
    if (shots) await recovery.screenshot({ path: join(shots, `recovery-${width}.png`) });
    await result.click();
    await page.getByRole('dialog').waitFor();
    assert.ok(reads.includes('/api/resources/qa-scope-b'));
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    await recovery.getByRole('button', { name: locale === 'vi' ? /Tìm giờ phù hợp/ : /Find available times/ }).click();
    await recovery.getByRole('button', { name: /09:00–10:00/ }).click();
    assert.equal(await page.locator('.planner-date-input input').inputValue(), nextDate);
    assert.match(await page.locator('.planner-choice').innerText(), /09:00–10:00/);
    assert.equal(writes.some(row => ['/api/bookings', '/api/planning/bundles'].includes(row.path)), false);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('Customer booking journey passed in Vietnamese desktop and English mobile with isolated API fixtures.');
} finally {
  await browser.close();
}
