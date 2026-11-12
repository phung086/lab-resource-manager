import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

// Isolated browser regression. No bank, business API or database is contacted.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const evidence = process.env.UI_EVIDENCE_DIR || `${process.env.TEMP}/lab-header-navigation`;
mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true }
  : { channel: 'msedge', headless: true });
const results = [];
const catalogs = {};
for (const locale of ['vi', 'en']) catalogs[locale] = JSON.parse(await readFile(new URL(`./src/locales/catalog/${locale}.json`, import.meta.url), 'utf8')).messages;

async function fixture(role = 'CUSTOMER', locale = 'vi') {
  const actor = { id: `header-${role}`, role, fullName: 'Nguyễn Minh Anh', email: 'header@example.test', isActive: true };
  const state = { paid: false, staleBooking: false, failCharge: false, reads: 0, sharedStatuses: [], writes: 0, delayShared: false };
  const startAt = new Date(Date.now() + 86400000).toISOString();
  const booking = () => ({ id: 'header-booking', bookingCode: 'LAB-HEADER-01', requestedById: actor.id, title: 'Phiên kiểm thử giao diện', status: state.paid && !state.staleBooking ? 'CONFIRMED' : 'PENDING_APPROVAL', paymentDueAt: new Date(Date.now() + 600000).toISOString(), feeAmountVnd: 80000, startAt, endAt: new Date(Date.parse(startAt) + 3600000).toISOString(), resource: { id: 'fixture-device', code: 'DEVICE-01', name: 'Bộ thực hành cảm biến', category: 'EQUIPMENT' } });
  const transaction = () => ({ id: 'header-charge', userId: actor.id, user: actor, amount: 80000, currency: 'VND', provider: 'vnpay', txnRef: 'HEADER-FIXTURE', description: 'Phiên kiểm thử giao diện', status: state.paid ? 'success' : 'pending', paidAt: state.paid ? new Date().toISOString() : null, createdAt: new Date().toISOString(), paymentUrlExpiresAt: null, reconciliationStatus: 'none', reconciliationReason: null, booking: booking() });
  const notification = { id: 'payment-notification', type: 'SYSTEM', titleKey: 'payment.success.title', title: 'Thanh toán đã xác minh', message: 'Thông báo lịch sử, không phải việc chờ thanh toán.', messageParams: { bookingId: 'header-booking' }, createdAt: new Date().toISOString(), readAt: null };
  const items = [{ id: 'fixture-device', code: 'DEVICE-01', name: 'Bộ thực hành cảm biến', category: 'EQUIPMENT', laboratoryName: 'LAB Thực nghiệm' }, { id: 'fixture-kit', code: 'KIT-02', name: 'Bộ thí nghiệm mạch điện', category: 'EXPERIMENT_KIT', laboratoryName: 'LAB Thực nghiệm' }];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(({ actor, locale, items }) => {
    sessionStorage.setItem('lrm_token', 'isolated-header-fixture');
    sessionStorage.setItem('lrm_user', JSON.stringify(actor));
    localStorage.setItem('lrm_locale', locale);
    localStorage.setItem('lrm.navigation.pinned', 'false');
    localStorage.setItem(`lrm:resource-selection:v1:${actor.id}`, JSON.stringify(items.slice(0, 1)));
  }, { actor, locale, items });
  await context.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    let data = [];
    if (request.method() !== 'GET' && !path.startsWith('/api/auth/')) state.writes++;
    if (path === '/api/auth/me') data = actor;
    else if (['/api/auth/session', '/api/auth/activity'].includes(path)) data = { idleExpiresAt: new Date(Date.now() + 3600000).toISOString(), expiresAt: new Date(Date.now() + 7200000).toISOString(), idleTimeoutSeconds: 3600 };
    else if (path === '/api/resources') data = items.map(item => ({ ...item, bookingState: 'bookable', operationalStatus: 'AVAILABLE', availability: { state: 'AVAILABLE', available: true }, laboratory: { id: 'fixture-lab', name: item.laboratoryName }, laboratoryId: 'fixture-lab', rental: { hourlyRateVnd: 80000 }, media: [] }));
    else if (path === '/api/bookings' || path === '/api/incidents') {
      const rows = path === '/api/bookings' ? [booking()] : [];
      data = { items: rows, pagination: { page: 1, pageSize: 100, total: rows.length, totalPages: 1 }, summary: { total: rows.length, byStatus: rows.length ? { [booking().status]: 1 } : {}, pendingPayment: rows.length && booking().status === 'PENDING_APPROVAL' ? 1 : 0, overdue: 0, history: 0 } };
      if (path === '/api/bookings' && url.searchParams.get('pageSize') === '100') {
        state.reads++;
        state.sharedStatuses.push(booking().status);
        if (state.delayShared) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else if (path === '/api/notifications/unread-count') data = { unread: 1 };
    else if (path === '/api/notifications') data = [notification];
    else if (path === '/api/bookings/header-booking') data = booking();
    else if (path === '/api/payments/booking/header-booking') {
      if (state.failCharge) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'API_REQUEST_FAILED', message: 'api.API_REQUEST_FAILED' }) });
      data = [transaction()];
    } else if (path === '/api/payments/my') data = { transactions: [transaction()], providers: { vnpay: true, vietqr: false } };
    else if (path === '/api/dashboard') data = {};
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }).catch(() => {});
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, state, errors };
}

try {
  for (const role of ['CUSTOMER', 'LAB_STAFF', 'ADMIN']) for (const locale of ['vi', 'en']) {
    const { context, page, state, errors } = await fixture(role, locale);
    await page.goto(`${base}/workspace/resources`);
    await page.locator('.rail-shortcuts').waitFor();
    const railIds = await page.locator('[data-quick-nav-id]').evaluateAll(nodes => nodes.map(node => node.dataset.quickNavId).sort());
    const expand = page.locator('.rail-menu');
    await expand.focus();
    await page.keyboard.press('Enter');
    const collapse = page.locator('.workspace-nav-toggle');
    await collapse.waitFor();
    await page.waitForFunction(() => document.activeElement?.matches('.workspace-nav-toggle'));
    assert.equal(await collapse.getAttribute('aria-label'), catalogs[locale]['ui.navigation.collapse']);
    assert.equal(await page.locator('.workspace-nav-scrim,.workspace-nav-panel[role="dialog"],.main-content-column-2026[inert]').count(), 0);
    assert.equal(await page.locator('.workspace-nav-heading button.workspace-nav-toggle').count(), 1);
    const expandedIds = await page.locator('[data-nav-id]').evaluateAll(nodes => nodes.map(node => node.dataset.navId).sort());
    const primaryIds = role === 'ADMIN' ? ['home','resources','bookings','dashboard','profile'] : ['home','resources','smart_calendar','bookings','profile'];
    assert.deepEqual(railIds, primaryIds.sort(), `${role}: compact menu contains primary shortcuts only`);
    assert.ok(railIds.every(id => expandedIds.includes(id)));
    assert.ok(expandedIds.includes('payments') && expandedIds.includes('escalations'));
    if (role === 'CUSTOMER') assert.ok(!expandedIds.includes('users') && !expandedIds.includes('admin_management'));
    else assert.ok(expandedIds.includes('users') && expandedIds.includes('admin_management'));
    const styles = await page.locator('[data-nav-id="resources"]').evaluate(node => ({ weight: Number(getComputedStyle(node).fontWeight), line: getComputedStyle(node.closest('ul')).borderLeftWidth }));
    assert.ok(styles.weight >= 600);
    assert.equal(styles.line, '0px');
    await page.reload();
    await collapse.waitFor();
    await page.setViewportSize({ width: 390, height: 900 });
    await expand.click();
    await page.locator('.workspace-nav-panel[role="dialog"]').waitFor();
    assert.equal(await page.locator('.main-content-column-2026[inert]').count(), 1);
    assert.ok(await page.locator('.workspace-nav-search input').evaluate(node => node === document.activeElement));
    if (role === 'CUSTOMER' && locale === 'vi') await page.screenshot({ path: `${evidence}/menu-mobile.png` });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.matches('.rail-menu'));
    assert.equal(await page.locator('.main-content-column-2026[inert]').count(), 0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await collapse.waitFor();
    if (role === 'CUSTOMER' && locale === 'vi') {
      await page.locator('.resource-catalogue-card').first().waitFor();
      await page.screenshot({ path: `${evidence}/menu-desktop.png` });
    }
    await collapse.focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.activeElement?.matches('.rail-menu'));
    assert.equal(await page.locator('.workspace-nav-panel').count(), 0);
    assert.equal(await expand.getAttribute('aria-label'), catalogs[locale]['ui.navigation.expand']);
    await page.reload();
    await expand.waitFor();
    const last = page.locator('.rail-shortcuts [data-quick-nav-id]').last();
    await last.scrollIntoViewIfNeeded();
    assert.ok(await last.isVisible());
    const rail = await page.locator('.rail-shortcuts').evaluate(node => ({ height: node.clientHeight, total: node.scrollHeight, scroll: node.scrollTop }));
    assert.ok(rail.height > 0 && (rail.total <= rail.height || rail.scroll > 0), 'Long compact menu must scroll');
    if (locale === 'vi') await page.screenshot({ path: `${evidence}/rail-${role}-bottom.png`, fullPage: false });
    assert.equal(await page.locator('.resource-selection-tray,.care-toast-stack').count(), 0);
    assert.equal(await page.locator('.header-resource-selection').count(), role === 'CUSTOMER' ? 1 : 0);
    if (role === 'CUSTOMER') {
      assert.equal(await page.locator('.selection-count').innerText(), '1');
      await page.locator('[data-resource-code="KIT-02"] .catalogue-image-actions button:not(.resource-catalogue-calendar)').click();
      await page.waitForFunction(() => document.querySelector('.selection-count')?.textContent === '2');
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      if (role === 'CUSTOMER') {
        await page.locator('.selection-toggle').click();
        await page.locator('.header-selection-panel').waitFor();
        assert.equal(await page.locator('.header-selection-panel li').count(), 2);
        assert.equal(await page.locator('.selection-count').innerText(), '2');
        const bounds = await page.locator('.header-selection-panel').boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
        assert.ok(await page.locator('.header-selection-panel').evaluate(node => {
          const bounds = node.getBoundingClientRect();
          // No inline assistant or body control may render above this header panel.
          return [0.1, 0.5, 0.9].every(x => [0.15, 0.5, 0.85].every(y => node.contains(document.elementFromPoint(bounds.x + bounds.width * x, bounds.y + bounds.height * y))));
        }), 'Header selection must remain above page controls');
        await page.screenshot({ path: `${evidence}/selection-${locale}-${width}.png`, fullPage: false });
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.header-selection-panel').count(), 0);
        assert.ok(await page.locator('.selection-toggle').evaluate(node => node === document.activeElement));
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${role} ${locale} ${width}: page overflow`);
    }
    if (role === 'CUSTOMER') {
      await page.locator('.selection-toggle').click();
      await page.locator('.header-selection-panel .btn').click();
      await page.waitForURL('**/workspace/selection*');
      assert.equal(await page.locator('.header-selection-panel').count(), 0);
      await page.locator('.header-notification-btn-2026').click();
      await page.locator('.header-notices-panel .workspace-popover-link').click();
      await page.locator('.inbox-list').waitFor();
      assert.equal(await page.locator('.inbox-row').count(), 1, 'Historical notification remains available in inbox');
      assert.equal(await page.locator('.care-toast-stack').count(), 0);
    } else {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.locator('.rail-menu').click();
      await page.screenshot({ path: `${evidence}/menu-${role}-${locale}.png`, fullPage: false });
    }
    assert.deepEqual(errors, []);
    assert.equal(state.writes, 0);
    results.push({ role, locale, menuEntries: railIds.length, desktopAndMobile: true });
    await context.close();
  }

  const { context, page, state, errors } = await fixture();
  await page.goto(`${base}/workspace/payments?booking=header-booking`);
  await page.locator('.payment-hold-notice').waitFor();
  const initialReads = state.reads;
  state.paid = true;
  await page.locator('.checkout-banner.is-success').waitFor({ timeout: 18000 });
  await eventually(() => state.reads > initialReads);
  await eventually(() => state.sharedStatuses.at(-1) === 'CONFIRMED');
  assert.equal(await page.locator('.payment-hold-notice').count(), 0);
  assert.equal(await page.locator('.booking-checkout-payment .primary-button').count(), 0);
  // Home-entry read is delayed, so the immediate focus uses the updated shared snapshot.
  state.delayShared = true;
  await page.locator('[data-quick-nav-id="home"]').click();
  await page.locator('.hub-focus[data-state="upcoming"]').waitFor();
  assert.equal(await page.locator('.hub-focus[data-state="payment"]').count(), 0);
  assert.equal(await page.locator('.care-toast-stack').count(), 0);
  // A verified charge must not show a payment countdown even if the booking read lags.
  state.staleBooking = true;
  await page.goto(`${base}/workspace/payments?booking=header-booking`);
  await page.locator('.checkout-banner.is-success').waitFor();
  assert.equal(await page.locator('.payment-hold-notice').count(), 0);
  state.failCharge = true;
  await page.locator('.booking-checkout > .page-section-header button').click();
  await page.locator('.booking-checkout > .alert.danger').waitFor();
  assert.equal(await page.locator('.checkout-banner').count(), 0, 'Failed refresh must not retain actionable stale checkout');
  assert.equal(await page.locator('.payment-hold-notice').count(), 0);
  state.failCharge = false;
  await page.goto(`${base}/workspace/payments?transaction=header-charge`);
  await page.locator('.payment-ledger').waitFor();
  await page.locator('.payment-open-receipt').waitFor();
  assert.equal(await page.locator('.payment-hold-notice').count(), 0, 'Verified ledger payment must not show a pending countdown');
  assert.equal(state.writes, 0);
  assert.deepEqual(errors, []);
  results.push({ paymentPollingRefresh: true, stalePaidHoldHidden: true, refreshFailureVisible: true });
  await context.close();
  console.log(JSON.stringify({ results, evidence, type: 'Isolated HTTP fixtures; no business writes' }));
} finally { await browser.close(); }

async function eventually(condition) {
  const end = Date.now() + 5000;
  while (!condition() && Date.now() < end) await new Promise(resolve => setTimeout(resolve, 50));
  assert.ok(condition(), 'Payment update must refresh shared workspace data');
}
