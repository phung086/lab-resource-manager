import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

// Isolated browser fixtures only. Every API request is intercepted; no business
// database, email or payment provider is contacted by this visual regression.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const output = process.env.UI_EVIDENCE_DIR || `${process.env.TEMP}/lab-conversation-payment-20261027`;
const phase = process.env.CAPTURE_PHASE || 'after';
await mkdir(output, { recursive: true });
const catalogs = Object.fromEntries(await Promise.all(['vi', 'en'].map(async locale => [locale,
  JSON.parse(await readFile(new URL(`./src/locales/catalog/${locale}.json`, import.meta.url), 'utf8')).messages])));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const user = { id: 'visual-customer', role: 'CUSTOMER', fullName: 'Minh Anh', email: 'visual@example.test', isActive: true };
const staff = { id: 'visual-staff', role: 'LAB_STAFF', fullName: 'Ngọc Linh' };
const lab = { id: 'visual-lab', code: 'LAB-AI', name: 'Phòng thí nghiệm trí tuệ nhân tạo' };
const session = { id: 'visual-session', ordinal: 12, subject: 'Hỗ trợ lịch sử dụng máy trạm GPU', category: 'BOOKING', status: 'ACTIVE', laboratoryId: lab.id,
  requesterId: user.id, assignedStaffId: staff.id, requester: user, assignedStaff: staff, laboratory: lab,
  queuePosition: null, staffConnected: true, createdAt: '2026-10-27T02:10:00Z', assignedAt: '2026-10-27T02:11:00Z', closedAt: null, resolution: null };
const initialMessages = [
  { id: 'm1', sequence: 1, kind: 'CUSTOMER', sender: user, body: 'Chào LAB, mình cần kiểm tra lịch sử dụng máy trạm GPU cho buổi nghiên cứu chiều nay.', createdAt: '2026-10-27T02:10:00Z' },
  { id: 'm2', sequence: 2, kind: 'STAFF', sender: staff, body: 'Chào Minh Anh, mình là Linh phụ trách LAB. Bạn gửi giúp mình mã đặt lịch để mình kiểm tra nhé.', createdAt: '2026-10-27T02:11:00Z' },
  { id: 'm3', sequence: 3, kind: 'CUSTOMER', sender: user, body: 'Mã của mình là LAB-2710-GPU. Mình muốn xác nhận thời gian nhận máy và các bước bàn giao.', createdAt: '2026-10-27T02:12:00Z' },
  { id: 'm4', sequence: 4, kind: 'STAFF', sender: staff, body: 'Mình sẽ kiểm tra yêu cầu của bạn. Thông tin đặt lịch và thanh toán vẫn được xác nhận riêng trong hệ thống.', createdAt: '2026-10-27T02:13:00Z' },
];
const charge = { id: 'visual-payment', txnRef: 'LAB2710GPU001', amount: 240000, currency: 'VND', status: 'pending', provider: 'unselected', userId: user.id,
  description: 'Thuê máy trạm GPU phục vụ nghiên cứu', createdAt: '2026-10-27T02:00:00Z', paidAt: null, paymentUrlExpiresAt: null,
  reconciliationStatus: 'none', reconciliationReason: null, reconciledAt: null, user,
  booking: { id: 'visual-booking', title: 'Nghiên cứu thị giác máy tính', status: 'CONFIRMED', resource: { code: 'AI-GPU-01', name: 'Máy trạm GPU · AI LAB' } } };
const results = [];
async function open(view, width, locale = 'vi', role = 'CUSTOMER', overrides = {}) {
  const actor = role === 'LAB_STAFF' ? staff : { ...user, ...(role === 'ADMIN' ? { id: 'visual-admin' } : {}), role };
  const transaction = { ...charge, ...overrides.transaction };
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [];
  let messages = [...initialMessages], detailReads = 0, failDetail = false;
  page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript(({ actor, locale }) => {
    sessionStorage.setItem('lrm_token', 'isolated-visual-fixture');
    sessionStorage.setItem('lrm_user', JSON.stringify(actor));
    localStorage.setItem('lrm_locale', locale);
  }, { actor, locale });
  await context.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    let data = [], status = 200;
    if (path === '/api/auth/me') data = actor;
    else if (path === '/api/auth/session' || path === '/api/auth/activity') data = { idleExpiresAt: new Date(Date.now() + 3600000).toISOString(), expiresAt: new Date(Date.now() + 7200000).toISOString(), idleTimeoutSeconds: 3600 };
    else if (path === '/api/notifications/unread-count') data = { unread: 0 };
    else if (path === '/api/bookings' && role === 'ADMIN' && !url.search) data = [];
    else if (path === '/api/bookings' || path === '/api/incidents') data = { items: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 }, summary: { total: 0, byStatus: {}, history: 0 } };
    else if (path === '/api/support/metadata') data = { laboratories: [lab], presence: { accepting: true }, quickReplies: [{ id: 'booking', titleKey: 'support.quick.booking.title', bodyKey: 'support.quick.booking.body' }] };
    else if (path === '/api/support/presence') data = { accepting: true };
    else if (path === '/api/support/sessions') data = { activeSession: session, items: [session], pagination: { page: 1, total: 1, totalPages: 1 }, summary: { ACTIVE: 1, WAITING: 0, CLOSED: 0, CANCELLED: 0 } };
    else if (path === '/api/support/sessions/visual-session/messages') {
      const body = request.postDataJSON();
      const row = { id: body.messageId, sequence: messages.length + 1, sender: actor, kind: role === 'CUSTOMER' ? 'CUSTOMER' : 'STAFF', body: body.body, createdAt: '2026-10-27T02:14:00Z' };
      messages.push(row); data = row;
    } else if (path === '/api/support/sessions/visual-session') {
      detailReads++;
      if (failDetail) { status = 503; data = { code: 'API_REQUEST_FAILED', message: 'api.API_REQUEST_FAILED' }; }
      else data = { session, messages: messages.filter(row => row.sequence > Number(url.searchParams.get('after') || 0)), hasMore: false, nextCursor: messages.length };
    } else if (path === '/api/payments/my' || path === '/api/payments/admin/transactions') data = { transactions: [transaction, { ...charge, id: 'visual-paid', txnRef: 'LAB2710GPU002', status: 'success', provider: 'vnpay', paidAt: '2026-10-27T02:05:00Z', amount: 80000, booking: { ...charge.booking, title: 'Thực hành xử lý ảnh' } }], providers: overrides.providers || { vnpay: true, vietqr: false } };
    else if (path === '/api/payments/visual-paid/receipt') data = { transaction: { ...charge, status: 'success', provider: 'vnpay', paidAt: '2026-10-27T02:05:00Z' }, generatedAt: '2026-10-27T02:15:00Z' };
    else if (request.method() !== 'GET') throw new Error(`Unexpected fixture mutation: ${path}`);
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) }).catch(() => {});
  });
  await page.goto(`${base}/workspace/${view}${view === 'support' ? '?session=visual-session' : '?transaction=visual-payment'}`);
  await page.locator(view === 'support' ? role === 'ADMIN' ? '.support-transcript' : '#support-message' : '.payment-detail').waitFor();
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
  return { page, context, errors, get detailReads() { return detailReads; }, fail(value) { failDetail = value; }, append() { messages.push({ ...initialMessages[3], id: 'remote-new', sequence: messages.length + 1, body: 'Tin mới khi đang đọc lịch sử' }); } };
}
try {
  for (const view of ['support', 'payments']) {
    for (const width of [1440, 390]) {
      const state = await open(view, width), { page } = state;
      if (process.env.SKIP_UI_CAPTURES !== '1') await page.screenshot({ path: `${output}/${phase}-${view}-${width}.png`, fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${view} ${width}: no document overflow`);
      if (phase !== 'before') {
        const animated = page.locator(view === 'support' ? '.support-message:not(.kind-system)' : '.payment-detail').first();
        assert.equal(await animated.evaluate(el => getComputedStyle(el).animationName), 'none', 'Reduced motion disables the authored arrival');
        await page.emulateMedia({ reducedMotion:'no-preference' });
        assert.equal(await animated.evaluate(el => getComputedStyle(el).animationName), view === 'support' ? 'support-message-arrive' : 'payment-dossier-arrive');
        await page.emulateMedia({ reducedMotion:'reduce' });
        if (view === 'support') {
          await page.locator('.support-transcript').evaluate(el => { el.scrollTop = 0; });
          await page.waitForTimeout(100);
          state.append();
          await page.locator('.support-new-messages').waitFor();
          assert.equal(await page.locator('.support-transcript').evaluate(el => el.scrollTop < 20), true, 'Incoming messages do not pull the reader away from history');
          await page.locator('.support-new-messages').click();
          await page.locator('.support-new-messages').waitFor({ state: 'hidden' });
          assert.equal(await page.locator('.support-transcript').evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight < 5), true);
          await page.locator('#support-message').fill('Bản nháp được giữ nguyên');
          state.fail(true);
          await page.locator('.support-connection.is-error').waitFor();
          assert.equal(await page.locator('#support-message').inputValue(), 'Bản nháp được giữ nguyên');
          state.fail(false);
          await page.locator('.support-connection.is-error').waitFor({ state: 'hidden' });
          await page.locator('#support-message').press('Shift+Enter');
          assert.ok((await page.locator('#support-message').inputValue()).includes('\n'));
          await page.locator('#support-message').press('Enter');
          await page.locator('.support-transcript').getByText('Bản nháp được giữ nguyên', { exact: true }).waitFor();
          assert.equal(await page.locator('#support-message').inputValue(), '');
          assert.ok(state.detailReads >= 2);
        } else {
          assert.equal(await page.locator('.payment-provider-choices button').nth(1).isDisabled(), true);
          await page.locator('.customer-payment-list button').nth(1).click();
          await page.locator('.payment-dossier .primary-button').click();
          await page.locator('.payment-receipt').waitFor();
          await page.getByRole('dialog').getByRole('button', { name: catalogs.vi['ui.close_002fdaf4'] || /Đóng/ }).first().click();
        }
      }
      assert.deepEqual(state.errors, []);
      results.push({ view, width, locale: 'vi', passed: true });
      await state.context.close();
    }
  }
  if (phase !== 'before') {
    for (const view of ['support', 'payments']) {
      const state = await open(view, 1440, 'en');
      assert.equal(await state.page.locator('main').innerText().then(text => /support\.studio\.|ui\.paymentStudio\./.test(text)), false);
      if (process.env.SKIP_UI_CAPTURES !== '1') await state.page.screenshot({ path: `${output}/after-${view}-en.png`, fullPage: true });
      assert.deepEqual(state.errors, []); results.push({ view, locale: 'en', passed: true }); await state.context.close();
    }
    for (const [name, role, overrides, expected] of [
      ['admin-read-only','ADMIN',{},'reviewHelp'],
      ['cancelled-booking','CUSTOMER',{ transaction: { booking: { ...charge.booking, status:'CANCELLED' } } },'reviewHelp'],
      ['no-provider','CUSTOMER',{ providers: { vnpay:false, vietqr:false } },'unavailableHelp'],
      ['transfer-pending','CUSTOMER',{ transaction: { provider:'vietqr' } },'transferHelp'],
      ['expired-session','CUSTOMER',{ transaction: { status:'expired' } },'retryHelp'],
      ['failed-session','CUSTOMER',{ transaction: { status:'failed' } },'retryHelp'],
    ]) {
      const state = await open('payments', 390, 'vi', role, overrides);
      assert.ok((await state.page.locator('.payment-value-block').innerText()).includes(catalogs.vi[`ui.paymentStudio.${expected}`]));
      if (expected === 'reviewHelp') assert.equal(await state.page.locator('.payment-provider-choices').count(), 0);
      if (expected === 'unavailableHelp') assert.equal(await state.page.locator('.payment-provider-choices button:enabled').count(), 0);
      assert.deepEqual(state.errors, []); results.push({ scenario:name, passed:true }); await state.context.close();
    }
    for (const role of ['LAB_STAFF','ADMIN']) {
      const state = await open('support',1440,'vi',role);
      assert.equal(await state.page.locator('.support-compose').count(), role === 'ADMIN' ? 0 : 1);
      await state.page.locator('.support-session-actions summary').click();
      assert.equal(await state.page.locator('.support-close input').isVisible(), true);
      assert.deepEqual(state.errors, []); results.push({ scenario:`support-${role}`,passed:true }); await state.context.close();
    }
  }
  await writeFile(`${output}/${phase}-results.json`, JSON.stringify({ results, isolation: 'All API requests intercepted; visual fixtures only' }, null, 2));
  console.log(JSON.stringify({ results, output }));
} finally { await browser.close(); }
