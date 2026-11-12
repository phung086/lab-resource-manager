import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

// Real browser, isolated HTTP fixtures. No API requests reach business services.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const evidence = process.env.UI_EVIDENCE_DIR || `${process.env.TEMP}/lab-disclosures-inbox`;
mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
try {
  for (const role of ['CUSTOMER', 'LAB_STAFF', 'ADMIN']) for (const locale of ['vi', 'en']) {
    const actor = { id: 'disclosure-actor', role, fullName: 'Nguyễn Minh Anh', email: 'inbox@example.test', isActive: true };
    const resource = { id: 'disclosure-device', code: 'LAB-EQ-01', name: 'Bộ thực hành cảm biến', category: 'EQUIPMENT', subtype: 'OTHER', description: 'Thông tin mở rộng của bộ thực hành cảm biến.', capacity: 4, laboratoryId: 'fixture-lab', laboratory: { id: 'fixture-lab', name: 'LAB Thực nghiệm', isActive: true }, operationalStatus: 'AVAILABLE', bookingState: 'bookable', availability: { state: 'AVAILABLE', available: true }, rental: { hourlyRateVnd: 80000 }, specs: { manufacturer: 'Fixture' }, media: [] };
    let notifications = [0, 1, 2, 3].map((index) => ({ id: `notice-${index}`, type: index % 2 ? 'BOOKING_UPCOMING' : 'SYSTEM', title: ['Thanh toán đã xác minh', 'Lịch sử dụng sắp tới', 'Đã cập nhật tài nguyên', 'Thông báo đã đọc'][index], message: 'Thông tin kiểm thử giao diện trong phạm vi tài khoản hiện tại.', sentAt: new Date(Date.now() - index * 60000).toISOString(), createdAt: new Date().toISOString(), readAt: index === 3 ? new Date().toISOString() : null, messageParams: { bookingId: 'fixture-booking' } }));
    let writes = 0, failNextRead = true;
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ actor, locale }) => { sessionStorage.setItem('lrm_token', 'isolated-disclosure-fixture'); sessionStorage.setItem('lrm_user', JSON.stringify(actor)); localStorage.setItem('lrm_locale', locale); localStorage.setItem('lrm.navigation.pinned', 'false'); }, { actor, locale });
    await context.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      let data = [];
      if (path === '/api/auth/me') data = actor;
      else if (['/api/auth/session', '/api/auth/activity'].includes(path)) data = { idleExpiresAt: new Date(Date.now() + 3600000).toISOString(), expiresAt: new Date(Date.now() + 7200000).toISOString(), idleTimeoutSeconds: 3600 };
      else if (path === '/api/resources') data = [resource];
      else if (path === '/api/notifications/unread-count') data = { unread: notifications.filter(row => !row.readAt).length };
      else if (path === '/api/notifications') data = notifications;
      else if (path === '/api/notifications/read-all' || /^\/api\/notifications\/notice-\d\/read$/.test(path)) {
        writes++;
        if (failNextRead) { failNextRead = false; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'API_REQUEST_FAILED', message: 'api.API_REQUEST_FAILED' }) }); }
        notifications = notifications.map(row => path.endsWith('/read-all') || path.includes(`/${row.id}/`) ? { ...row, readAt: new Date().toISOString() } : row);
        data = { updated: 1 };
      } else if (path === '/api/bookings' || path === '/api/incidents') data = { items: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 }, summary: { total: 0, byStatus: {}, pendingPayment: 0, history: 0, overdue: 0 } };
      else if (req.method() !== 'GET' && !path.startsWith('/api/auth/')) throw new Error('Unexpected business mutation ' + path);
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }).catch(() => {});
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/workspace/resources`);
    await page.locator('.resource-catalogue-card').waitFor();
    const railWidth = await page.locator('.workspace-navigation').evaluate(node => node.getBoundingClientRect().width);
    assert.equal(railWidth, 104);
    await page.locator('.rail-menu').click();
    await page.waitForFunction(() => Math.round(document.querySelector('.workspace-navigation').getBoundingClientRect().width) === 264);
    await page.locator('.workspace-nav-toggle').click();
    await page.locator('.rail-menu').waitFor();
    assert.equal(await page.locator('.workspace-nav-panel').count(), 0, 'One click collapses desktop navigation');
    const card = page.locator('.resource-catalogue-more'), summary = card.locator('summary');
    await summary.focus(); await page.keyboard.press('Enter');
    assert.equal(await card.getAttribute('open'), '');
    assert.ok(await card.locator('.expandable-card-content').isVisible());
    if (role === 'CUSTOMER') for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.locator('.resource-catalogue-card').screenshot({ path: `${evidence}/resource-card-${locale}-${width}.png` });
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    await summary.focus();
    assert.equal(await summary.evaluate(node => getComputedStyle(node, '::before').content), 'none');
    await page.keyboard.press('Space');
    assert.equal(await card.getAttribute('open'), null);
    assert.ok(await summary.evaluate(node => node === document.activeElement));
    if (role === 'CUSTOMER') {
      await page.locator('[data-quick-nav-id="home"]').click();
      await page.locator('.hub-guide summary').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('.hub-guide[open] li').count(), 3);
      await page.locator('.hub-guide').screenshot({ path: `${evidence}/guide-${locale}.png` });
    }
    await page.locator('.header-notification-btn-2026').click();
    await page.locator('.header-notices-items button').first().waitFor();
    assert.equal(await page.locator('.header-notices-items button[data-unread=true]').count(), 3);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.header-notices-panel').count(), 0);
    await page.locator('.header-notification-btn-2026').click();
    await page.locator('.header-notices-panel .workspace-popover-link').click();
    await page.locator('.inbox-stack-card').waitFor();
    assert.equal(await page.locator('.inbox-stack').getAttribute('data-depth'), '3');
    const firstTitle = await page.locator('.inbox-stack-copy h3').innerText();
    const next = page.locator('.inbox-stack-controls button').last();
    await next.focus(); await page.keyboard.press('Enter');
    assert.notEqual(await page.locator('.inbox-stack-copy h3').innerText(), firstTitle);
    await page.locator('.inbox-stack-controls button').first().click();
    assert.equal(await page.locator('.inbox-stack-copy h3').innerText(), firstTitle);
    assert.equal(writes, 0, 'Previewing notifications does not mark them read');
    await page.locator('.inbox-toolbar [aria-pressed]').nth(2).click();
    assert.equal(await page.locator('.inbox-stack').count(), 0);
    await page.locator('.inbox-toolbar [aria-pressed]').first().click();
    await page.locator('.inbox-search input').fill('no matching notification');
    assert.equal(await page.locator('.inbox-stack').count(), 0);
    await page.locator('.inbox-search input').fill('');
    await page.locator('.inbox-stack-open').click();
    assert.equal(new URL(page.url()).searchParams.get('notification'), 'notice-0');
    assert.equal(await page.locator('.inbox-detail h2').innerText(), firstTitle);
    assert.equal(writes, 0);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.evaluate(() => window.scrollTo(0, 0));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.equal(await page.locator('.inbox-stack').evaluate(node => getComputedStyle(node).position), 'static');
      await page.screenshot({ path: `${evidence}/inbox-${role}-${locale}-${width}.png`, fullPage: true });
    }
    await page.locator('.inbox-stack-read').click();
    await page.locator('.notifications-workspace > .inbox-error').waitFor();
    assert.equal(await page.locator('.inbox-stack-copy h3').innerText(), firstTitle, 'Failed mark-read must retain the notification');
    assert.equal(notifications.filter(row => !row.readAt).length, 3);
    await page.locator('.inbox-stack-read').click();
    await page.waitForFunction(() => document.querySelector('.header-notification-btn-2026 .notification-counter-pill')?.textContent.trim() === '2');
    assert.notEqual(await page.locator('.inbox-stack-copy h3').innerText(), firstTitle);
    assert.equal(await page.locator('.inbox-row.is-read').count(), 2);
    await page.reload();
    await page.locator('.inbox-stack-card').waitFor();
    assert.notEqual(await page.locator('.inbox-stack-copy h3').innerText(), firstTitle, 'Read notification must not return after reload');
    await page.locator('.inbox-actions button').last().click();
    await page.locator('.inbox-stack').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.care-toast-stack').count(), 0);
    assert.equal(notifications.filter(row => !row.readAt).length, 0);
    assert.deepEqual(errors, []);
    results.push({ role, locale, widths: [1440, 390], stackReadFailureAndRetry: true, expandableKeyboard: true });
    await context.close();
  }
  console.log(JSON.stringify({ results, evidence, scope: 'Isolated browser fixtures only' }));
} finally { await browser.close(); }
