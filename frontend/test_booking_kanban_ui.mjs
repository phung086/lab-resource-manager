import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

// All API traffic is intercepted. These test records never reach a database.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const vi = JSON.parse(await readFile(new URL('./src/locales/catalog/vi.json', import.meta.url), 'utf8')).messages;
const browser = await chromium.launch({ headless: true });
let checks = 0;
try {
  for (const role of ['ADMIN', 'LAB_STAFF', 'CUSTOMER']) {
    const actor = { id: role === 'CUSTOMER' ? 'board-customer' : 'board-staff', fullName: 'Kanban test', role, isActive: true };
    const requester = { id: 'board-customer', fullName: 'Người dùng kiểm thử', role: 'CUSTOMER' };
    const resource = { id: 'board-room', code: 'QA-ROOM', name: 'Phòng kiểm thử Kanban', category: 'ROOM', operationalStatus: 'AVAILABLE', laboratoryId: 'board-lab', laboratory: { id: 'board-lab', code: 'QA', name: 'LAB kiểm thử' } };
    const startAt = new Date(Date.now() + 86400000).toISOString(), endAt = new Date(Date.now() + 90000000).toISOString();
    const records = ['CONFIRMED', 'CHECKED_OUT', 'RETURNED', 'COMPLETED', 'PENDING_APPROVAL'].map((status, index) => ({ id: `board-${index}`, bookingCode: `QA-${index}`, status, resourceId: resource.id, resource, title: 'Kiểm thử chuyển trạng thái', requestedById: requester.id, requestedBy: requester, startAt, endAt, feeAmountVnd: 0 }));
    records.push({ ...records[4], id: 'board-payment', paymentDueAt: new Date(Date.now() + 3600000).toISOString() });
    let writes = 0, allowWrite = false;
    const context = await browser.newContext({ viewport: { width: role === 'CUSTOMER' ? 390 : 1440, height: 960 }, reducedMotion: 'reduce' });
    await context.addInitScript(actor => { sessionStorage.setItem('lrm_token', 'isolated-kanban-fixture'); sessionStorage.setItem('lrm_user', JSON.stringify(actor)); localStorage.setItem('lrm_locale', 'vi'); }, actor);
    await context.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      let data = [], status = 200;
      if (path === '/api/auth/me') data = actor;
      else if (path === '/api/auth/session' || path === '/api/auth/activity') data = { idleExpiresAt: new Date(Date.now() + 3600000).toISOString(), expiresAt: new Date(Date.now() + 7200000).toISOString(), idleTimeoutSeconds: 3600 };
      else if (path === '/api/resources') data = [resource];
      else if (path === '/api/notifications/unread-count') data = { unread: 0 };
      else if (path === '/api/bookings') {
        const filter = url.searchParams.get('filter') || 'ALL';
        // ADR-036: holds and legacy approval share an enum, not a queue.
        const items = records.filter(row => filter === 'ALL' || (filter === 'PENDING_PAYMENT' ? row.status === 'PENDING_APPROVAL' && !!row.paymentDueAt : filter === 'PENDING_APPROVAL' ? row.status === filter && !row.paymentDueAt : filter === 'HISTORY' ? ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(row.status) : row.status === filter));
        const byStatus = Object.fromEntries([...new Set(records.map(row => row.status))].map(status => [status, records.filter(row => row.status === status).length]));
        data = { items, pagination: { page: 1, pageSize: 20, total: items.length, totalPages: items.length ? 1 : 0 }, summary: { total: records.length, byStatus, pendingPayment: 1, overdue: 0, history: 1, asOf: new Date().toISOString() } };
      } else if (path === '/api/bookings/board-0/check-out') {
        writes++;
        assert.equal(request.method(), 'POST');
        assert.equal(request.postDataJSON().conditionBefore, 'Đã kiểm tra thiết bị');
        if (!allowWrite) { status = 503; data = { message: 'api.API_REQUEST_FAILED' }; }
        else { records[0].status = 'CHECKED_OUT'; data = records[0]; }
      } else if (/^\/api\/bookings\/[^/]+$/.test(path)) data = records.find(row => row.id === path.split('/').at(-1));
      else if (request.method() !== 'GET') throw new Error(`Unexpected fixture write: ${path}`);
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/workspace/bookings`);
    const board = page.getByTestId('booking-kanban');
    const card = board.locator('[data-booking-id="board-0"]');
    await card.waitFor();
    assert.equal(await board.locator('.kanban-column').count(), 6); checks++;
    assert.equal(await board.locator('[data-booking-id="board-payment"]').getAttribute('draggable'), 'false'); checks++;
    assert.equal(await board.locator('[data-kanban-status="PENDING_PAYMENT"] [data-booking-id="board-payment"]').count(), 1);
    assert.equal(await board.locator('[data-kanban-status="PENDING_APPROVAL"] [data-booking-id="board-payment"]').count(), 0); checks++;
    if (role !== 'CUSTOMER') {
      await card.dragTo(board.locator('[data-kanban-status="RETURNED"]'));
      assert.equal(await page.locator('#booking-operation-form').count(), 0); assert.equal(writes, 0); checks++;
      await card.dragTo(board.locator('[data-kanban-status="CHECKED_OUT"]'));
      await page.locator('#booking-operation-form').waitFor();
      assert.equal(writes, 0); assert.equal(await board.locator('[data-kanban-status="CONFIRMED"] [data-booking-id="board-0"]').count(), 1); checks++;
      await page.locator('.modal-container-2026').getByRole('button', { name: vi['ui.cancel_74fcd352'], exact: true }).click();
      assert.equal(writes, 0); checks++;
      await card.locator('.kanban-next').focus(); await page.keyboard.press('Enter');
      await page.locator('#booking-condition-evidence').fill('Đã kiểm tra thiết bị');
      await page.locator('button[form="booking-operation-form"]').click();
      await page.locator('.modal-container-2026 .alert.danger').waitFor();
      assert.equal(writes, 1); assert.equal(records[0].status, 'CONFIRMED'); checks++;
      allowWrite = true;
      await page.locator('button[form="booking-operation-form"]').click();
      await board.locator('[data-kanban-status="CHECKED_OUT"] [data-booking-id="board-0"]').waitFor();
      assert.equal(await board.locator('[data-kanban-status="CONFIRMED"] [data-booking-id="board-0"]').count(), 0); assert.equal(writes, 2); checks++;
    } else {
      assert.equal(await board.locator('[draggable="true"],.kanban-next').count(), 0); checks++;
      assert.equal(writes, 0); checks++;
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;
    assert.deepEqual(errors, []); checks++;
    await context.close();
  }
  console.log(JSON.stringify({ checks, type: 'Isolated API fixtures; not database integration' }));
} finally { await browser.close(); }
