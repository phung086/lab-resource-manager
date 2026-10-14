import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const database = new URL(process.env.SUPPORT_TEST_DATABASE_URL || '');
assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
assert.equal(database.pathname, '/lab_resources_support_test', 'Only support test fixtures may be changed');
const base = process.env.SUPPORT_UI_URL || 'http://127.0.0.1:5173';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
Object.assign(process.env, { DATABASE_URL: database.href, NODE_ENV: 'test', JWT_SECRET: 'support-isolated-test-secret-at-least-32-chars', RATE_LIMIT_MAX: '10000', MCP_ASSISTANT_ENABLED: 'true', OPENAI_API_KEY: '', OPENAI_MODEL: '', PAYMENTS_ENABLED: 'false', REMINDER_SCHEDULER_ENABLED: 'false', CORS_ORIGINS: base, LOG_FORMAT: 'dev' });
const [{ createApp }, { prisma }, { config }] = await Promise.all([import('../backend/src/app.js'), import('../backend/src/db.js'), import('../backend/src/config.js')]);
const [db] = await prisma.$queryRaw`SELECT current_database() AS name`;
assert.equal(db.name, 'lab_resources_support_test');
const users = await prisma.user.findMany();
assert.ok(users.length > 0 && users.every(row => row.email.endsWith('@support.test')), 'Run the isolated API fixture tests first');
await prisma.supportMessage.deleteMany(); await prisma.supportSession.deleteMany(); await prisma.supportPresence.deleteMany();
const server = http.createServer(createApp()); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
config.port = server.address().port; const api = `http://127.0.0.1:${config.port}`;
const output = '../backend/logs/support-browser'; mkdirSync(output, { recursive: true });
const sessions = {}, checks = [], errors = [];
const catalogs = Object.fromEntries(['vi', 'en'].map(locale => [locale, JSON.parse(readFileSync(`src/locales/catalog/${locale}.json`)).messages]));
const check = (condition, description) => { assert.ok(condition, description); checks.push(description); };
async function call(name, path, body) {
  const response = await fetch(`${api}/api${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(sessions[name] ? { Authorization: `Bearer ${sessions[name].accessToken}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(data)}`); return data;
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, headless: true });
const opened = [];
async function open(name) {
  sessions[name] = await call(name, '/auth/login', { email: `${name}@support.test`, password: 'SupportTest!2026' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }); opened.push(context);
  await context.addInitScript(session => { localStorage.setItem('lrm_token', session.accessToken); localStorage.setItem('lrm_user', JSON.stringify(session.user)); localStorage.setItem('lrm_locale', 'vi'); }, sessions[name]);
  // Every intercepted request is forwarded to the real test Express/Prisma API.
  // No response, message, queue position or successful mutation is simulated.
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    try { const response = await route.fetch({ url: `${api}${url.pathname}${url.search}` }); await route.fulfill({ response }); }
    catch (error) { if (!context.pages().every(page => page.isClosed())) errors.push(`${name}: ${error.message}`); }
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
  await page.goto(`${base}/workspace/support`); await page.locator('#support-heading').waitFor();
  return page;
}
const text = (key, locale = 'vi') => catalogs[locale][`support.${key}`];
const chatText = async (page, value) => {
  const inline = page.locator('.assistant-human');
  const scope = await inline.isVisible() ? page.locator('.assistant-human-transcript') : page.locator('.support-transcript');
  await scope.getByText(value, { exact: true }).waitFor({ timeout: 12_000 });
};
async function ask(page, message) {
  await page.locator('.support-request textarea').fill(message);
  await page.locator('.support-request select').first().selectOption({ label: 'SUPPORT-a · Support Lab a' });
  await page.getByRole('button', { name: text('request'), exact: true }).click();
  await chatText(page, message);
}
try {
  const student = await open('student'), peer = await open('peer'), third = await open('third'), fourth = await open('fourth'), staff = await open('staff'), staff2 = await open('staff2'), admin = await open('admin');
  await staff.getByRole('button', { name: text('goReady'), exact: true }).click();
  await staff2.getByRole('button', { name: text('goReady'), exact: true }).click();
  // Ask the actual assistant first, then explicitly choose human support.
  await student.locator('.assistant-launcher').click();
  await student.locator('#assistant-question').fill('Tôi cần hỗ trợ đặt lịch trong LAB');
  await student.locator('.assistant-compose button[type=submit]').click();
  await student.locator('.assistant-answer').first().waitFor();
  await student.getByRole('button', { name: text('handoff'), exact: true }).click();
  await student.locator('.assistant-human-share input').waitFor();
  check(!await student.locator('.assistant-human-share input').isChecked(), 'Sharing context is opt-in inside the same chat');
  check(await student.locator('.assistant-answer').count() > 0, 'Handoff retains the prior assistant answer in the same panel');
  await student.locator('.assistant-human-share input').check();
  const requestForm = student.locator('.assistant-human-request');
  await requestForm.locator('select').first().selectOption({ label: 'SUPPORT-a · Support Lab a' });
  await requestForm.locator('textarea').fill('Khách A cần kiểm tra đặt lịch');
  await requestForm.getByRole('button', { name: text('request'), exact: true }).click();
  await chatText(student, 'Khách A cần kiểm tra đặt lịch');
  await ask(peer, 'Khách B cần hỗ trợ thiết bị');
  await ask(third, 'Khách C chờ đến lượt'); await ask(fourth, 'Khách D chờ đến lượt');
  await third.locator('.support-waiting').getByText(/#1/).waitFor(); await fourth.locator('.support-waiting').getByText(/#2/).waitFor();
  check(true, 'Two busy agents produce live customer queue positions #1 and #2');
  const a = (await call('student', '/support/sessions')).activeSession;
  const handlingName = a.assignedStaffId === sessions.staff.user.id ? 'staff' : 'staff2';
  const handling = handlingName === 'staff' ? staff : staff2;
  await chatText(handling, 'Khách A cần kiểm tra đặt lịch');
  await student.reload(); await student.locator('#support-heading').waitFor();
  await student.locator('.assistant-launcher').click();
  await student.locator('#assistant-human-message').waitFor({ state: 'visible', timeout: 12_000 });
  await chatText(student, 'Khách A cần kiểm tra đặt lịch');
  check(await student.locator('#assistant-human-message').isVisible(), 'Reload and reopen reconnects the existing staff session inside the dock');
  await student.locator('#assistant-human-message').fill('<script>customer message</script>'); await student.locator('.assistant-human .assistant-compose button').click();
  await chatText(handling, '<script>customer message</script>');
  check(await handling.locator('.support-transcript script').count() === 0, 'Customer content renders as text, never executable markup');
  await handling.locator('.support-quick-replies summary').click();
  await handling.getByRole('button', { name: text('quick.booking.title'), exact: true }).click();
  check((await handling.locator('#support-message').inputValue()) === text('quick.booking.body'), 'Quick reply only inserts an editable draft');
  const beforeSend = (await call('student', `/support/sessions/${a.id}`)).messages;
  check(!beforeSend.some(message => message.body === text('quick.booking.body')), 'Quick reply does not send automatically');
  await handling.locator('#support-message').fill('Nhân viên đã nhận thông tin và đang kiểm tra'); await handling.locator('.support-compose button').click();
  await chatText(student, 'Nhân viên đã nhận thông tin và đang kiểm tra'); check(true, 'Customer and staff exchange real persisted messages in separate browser sessions');
  await admin.goto(`${base}/workspace/support?session=${a.id}`); await chatText(admin, 'Nhân viên đã nhận thông tin và đang kiểm tra');
  check(await admin.locator('.support-compose').count() === 0, 'Admin reviews conversation without impersonating its agent');
  await handling.locator('.support-close input').fill('Đã hướng dẫn đặt lịch và kiểm tra điều kiện'); await handling.getByRole('button', { name: text('finish'), exact: true }).click();
  await chatText(handling, 'Khách C chờ đến lượt'); await third.locator('.support-assignee').waitFor(); await fourth.locator('.support-waiting').getByText(/#1/).waitFor();
  check(true, 'Completing chat assigns oldest waiting customer and updates the remaining position automatically');
  await student.goto(`${base}/workspace/support?session=${a.id}`); await student.reload(); await student.locator('.support-closed').waitFor(); await chatText(student, 'Nhân viên đã nhận thông tin và đang kiểm tra'); check(true, 'Reloading persisted history preserves completed chat and its messages');
  await admin.locator('.support-closed').waitFor(); check((await admin.locator('.support-transcript').textContent()).includes('Đã hướng dẫn đặt lịch'), 'Admin can read persisted resolution and handling history');
  await handling.locator('#support-message').fill('Bản nháp chưa gửi');
  await handling.route('**/api/support/sessions/*?after=*', route => route.abort('failed'));
  await handling.locator('.support-connection.is-error').waitFor({ timeout: 12_000 });
  check(await handling.locator('#support-message').inputValue() === 'Bản nháp chưa gửi', 'Network failure is visible and preserves the unsent draft');
  await handling.unroute('**/api/support/sessions/*?after=*');
  await handling.locator('.support-connection.is-error').waitFor({ state: 'hidden', timeout: 12_000 });
  check(true, 'Polling reconnects to the real API after a network interruption');
  for (const locale of ['vi', 'en']) {
    await handling.locator('.header-2026').getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
    await handling.locator(`html[lang=${locale}]`).waitFor();
    check(await handling.locator('#support-message').inputValue() === 'Bản nháp chưa gửi', `${locale}: language change preserves the draft`);
    for (const width of [1440, 375]) {
      await handling.setViewportSize({ width, height: 1000 });
      await handling.evaluate(() => window.scrollTo(0, 0));
      check(await handling.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale}, ${width}px: no horizontal overflow`);
      await handling.screenshot({ path: `${output}/staff-${locale}-${width}.png`, fullPage: true });
    }
  }
  await admin.screenshot({ path: `${output}/admin-history.png`, fullPage: true });
  const c = (await call('third', '/support/sessions')).activeSession;
  await admin.goto(`${base}/workspace/support?session=${c.id}`); await admin.locator('.support-close input').fill('Chuyển người xử lý theo yêu cầu khách hàng');
  await admin.getByRole('button', { name: text('requeue'), exact: true }).click();
  await third.locator('.support-waiting').getByText(/#1/).waitFor();
  await handling.locator('.support-chat-empty').waitFor({ timeout: 12_000 });
  await handling.getByRole('button', { name: text('goReady', 'en'), exact: true }).waitFor({ timeout: 20_000 });
  check(true, 'Admin requeue updates the customer position, clears the old staff chat and pauses receiving');
  check(errors.length === 0, `No browser runtime errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({ checks: checks.length, passed: checks }, null, 2));
} finally {
  await Promise.all(opened.map(context => context.close())); await browser.close();
  await new Promise(resolve => server.close(resolve)); await prisma.$disconnect();
}
