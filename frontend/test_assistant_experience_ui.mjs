import assert from 'node:assert/strict';
import http from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import bcrypt from '../backend/node_modules/bcryptjs/index.js';
import { chromium } from 'playwright-core';

// Real Express/Prisma test database. The receiver reply below is a protocol
// fixture, not a model or a claim about external model latency.
const database = new URL(process.env.CHATGPT_BRIDGE_TEST_DATABASE_URL || 'http://missing');
assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
assert.equal(database.pathname, '/lab_resources_chatgpt_bridge_test');
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
Object.assign(process.env, { DATABASE_URL: database.href, NODE_ENV: 'test', LOG_FORMAT: 'dev',
  JWT_SECRET: 'assistant-experience-test-secret-32-characters', RATE_LIMIT_MAX: '10000', MCP_ASSISTANT_ENABLED: 'true',
  ASSISTANT_RATE_LIMIT: '100', CHATGPT_BRIDGE_ENABLED: 'true', CHATGPT_BRIDGE_PUBLIC_ORIGIN: 'https://lab.example',
  CHATGPT_BRIDGE_UI_ORIGIN: base, CHATGPT_BRIDGE_SECRET_KEY: randomBytes(32).toString('base64'),
  OPENAI_API_KEY: '', OPENAI_MODEL: '', EMAIL_ENABLED: 'false', SMTP_HOST: '', REMINDER_SCHEDULER_ENABLED: 'false' });
const [{ prisma }, { createApp }, { bridgeRequests }] = await Promise.all([
  import('../backend/src/db.js'), import('../backend/src/app.js'), import('../backend/src/chatgptBridge/runtime.js')
]);
assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_chatgpt_bridge_test');
assert.ok((await prisma.user.findMany({ select: { email: true } })).every(row => row.email.endsWith('@bridge.test')));
const output = process.env.UI_SCREENSHOT_DIR || path.join(tmpdir(), 'lab-assistant-experience');
mkdirSync(output, { recursive: true });
const server = http.createServer(createApp()); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const api = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, headless: true });
const checks = [], timings = [], errors = [];
const check = (value, message) => { assert.ok(value, message); checks.push(message); };
let currentPage;
try {
  await prisma.chatgptBridgeGrant.updateMany({ where: { revokedAt: null }, data: { revokedAt: new Date() } });
  await prisma.chatgptBridgeRequest.updateMany({ where: { status: 'PENDING' }, data: { status: 'CANCELLED' } });
  const user = role => prisma.user.create({ data: { id: randomUUID(), email: `ui-${randomUUID()}@bridge.test`, fullName: `Assistant ${role}`,
    role, passwordHash: bcrypt.hashSync('AssistantUI!2026', 4) } });
  const owner = await user('ADMIN');
  const client = await prisma.chatgptBridgeClient.create({ data: { id: randomUUID(), name: 'UI protocol fixture', redirectUris: [] } });
  const grant = await prisma.chatgptBridgeGrant.create({ data: { id: randomUUID(), ownerId: owner.id, ownerAuthVersion: owner.authVersion,
    clientId: client.id, generation: randomUUID(), audience: 'https://lab.example/mcp/support-bridge',
    scope: 'lab.assistant.read lab.assistant.reply lab.assistant.events', expiresAt: new Date(Date.now() + 3600000) } });
  await prisma.chatgptBridgeSubscription.create({ data: { id: randomUUID(), grantId: grant.id, eventType: 'question', webhookId: randomUUID(),
    callbackUrl: 'https://receiver.example/fixture', secretCipher: 'unused-without-dispatcher', expiresAt: grant.expiresAt } });

  for (const [locale, viewport] of [['vi', { width: 1440, height: 900 }], ['en', { width: 375, height: 812 }]]) {
    const customer = await user('CUSTOMER');
    const login = await fetch(api + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: customer.email, password: 'AssistantUI!2026' }) });
    assert.equal(login.status, 200); const session = await login.json();
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(({ session, locale }) => { sessionStorage.setItem('lrm_token', session.accessToken); sessionStorage.setItem('lrm_user', JSON.stringify(session.user)); localStorage.setItem('lrm_locale', locale); }, { session, locale });
    let writes = 0;
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'POST' && /\/(bookings|payments|support\/requests)(\/|$)/.test(url.pathname)) writes++;
      const response = await route.fetch({ url: api + url.pathname + url.search }); await route.fulfill({ response });
    });
    const page = await context.newPage(); currentPage = page; page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/workspace/resources'); await page.locator('.assistant-launcher').click();
    const dock = page.locator('#lab-assistant-panel'), input = dock.locator('#assistant-question');
    await dock.locator('.assistant-suggestions button').first().waitFor();
    await page.screenshot({ path: path.join(output, `welcome-${locale}.png`) });
    const rect = await dock.boundingBox();
    check(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= viewport.width && rect.y + rect.height <= viewport.height, `${locale}: dock fits viewport`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}: no horizontal overflow`);
    check(await dock.getAttribute('aria-modal') === 'false', `${locale}: nonmodal dock`);

    const other = locale === 'vi' ? 'en' : 'vi';
    await input.fill('Bản nháp tiếp theo');
    await dock.locator('.assistant-language button').filter({ hasText: other.toUpperCase() }).click();
    await page.waitForFunction(value => document.querySelector('#lab-assistant-panel')?.lang === value, other);
    check(await page.locator('html').getAttribute('lang') === locale, `${locale}: local language leaves application unchanged`);
    check(await page.evaluate(() => localStorage.getItem('lrm_locale')) === locale, `${locale}: local language leaves saved preference unchanged`);
    check(await input.inputValue() === 'Bản nháp tiếp theo', `${locale}: language keeps draft`);
    const globalToggle = page.locator('.header-2026 .segmented-control-2026');
    await globalToggle.getByRole('button', { name: other.toUpperCase(), exact: true }).click();
    await page.locator(`html[lang=${other}]`).waitFor();
    await globalToggle.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
    await page.locator(`html[lang=${locale}]`).waitFor();
    // On narrow screens focusing a covered header control correctly minimizes
    // the nonmodal dock; reopening must retain its scoped locale and draft.
    if (!await dock.isVisible()) await page.locator('.assistant-launcher').click();
    await page.waitForFunction(value => document.querySelector('#lab-assistant-panel')?.lang === value, locale);
    check(await input.inputValue() === 'Bản nháp tiếp theo', `${locale}: application language follows into chat and keeps draft`);

    // Delay only delivery of the real HTTP response, keeping the real mutation.
    let release, entered;
    const gate = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { entered = resolve; });
    await page.route('**/assistant/bridge/requests', async route => {
      entered(); const start = performance.now();
      const response = await route.fetch({ url: api + '/api/assistant/bridge/requests' }); timings.push(Math.round(performance.now() - start));
      await gate; await route.fulfill({ response });
    });
    const deliveries = await prisma.chatgptBridgeDelivery.count();
    await input.fill(locale === 'vi' ? 'xin chào' : 'hello'); await input.press('Enter'); await started;
    check(await input.inputValue() === '', `${locale}: Enter immediately clears composer`);
    check(await dock.locator('.assistant-delivery').innerText() === (locale === 'vi' ? 'Đang gửi…' : 'Sending…'), `${locale}: visible sending state`);
    await input.fill('Next draft stays'); await input.press('Enter');
    check(await dock.locator('.assistant-turn').count() === 1, `${locale}: Enter while busy does not duplicate send`);
    release(); await dock.locator('.assistant-answer').waitFor(); await page.unroute('**/assistant/bridge/requests');
    check(await input.inputValue() === 'Next draft stays', `${locale}: reply preserves the next draft`);
    check(await prisma.chatgptBridgeDelivery.count() === deliveries, `${locale}: greeting creates no remote job`);
    check(!/ChatGPT|OpenAI|Thông tin phản hồi|Response information/.test(await dock.innerText()), `${locale}: no provider or response metadata`);
    check(await dock.locator('.assistant-next-actions button').count() === 2, `${locale}: answer offers LAB navigation`);

    const ask = async message => {
      await input.fill(message);
      const response = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/assistant/bridge/requests'));
      await input.press('Enter'); return (await response).json();
    };
    const job = await ask('cr7 là ai');
    check(job.status === 'PENDING', `${locale}: general knowledge still uses the configured receiver`);
    await dock.locator('.assistant-busy').waitFor();
    check((await dock.locator('.assistant-busy').innerText()).includes(locale === 'vi' ? 'Đang tìm câu trả lời' : 'Finding an answer'), `${locale}: neutral waiting copy`);
    await input.fill('Keep this separate draft');
    await bridgeRequests.context(grant, job.id);
    await bridgeRequests.reply(grant, { requestId: job.id, generation: grant.generation, answer: 'Protocol fixture: Cristiano Ronaldo. Continue with LAB resources below.' });
    await page.waitForFunction(() => document.querySelectorAll('.assistant-answer').length === 2);
    check(await input.inputValue() === 'Keep this separate draft', `${locale}: remote reply keeps next draft`);
    await page.screenshot({ path: path.join(output, `conversation-${locale}.png`) });
    await dock.locator('.assistant-next-actions button').last().click(); await page.waitForURL(/\/workspace\/bookings/);
    check(!await dock.isVisible(), `${locale}: next action opens real project screen`);
    await page.locator('.assistant-launcher').click();

    const cancelled = await ask('Giải thích định luật Ohm');
    await dock.locator('.assistant-stop').click();
    await page.waitForFunction(() => !document.querySelector('.assistant-busy'));
    check((await prisma.chatgptBridgeRequest.findUniqueOrThrow({ where: { id: cancelled.id } })).status === 'CANCELLED', `${locale}: stop cancels persisted job`);
    check(await dock.locator('.assistant-retry').count() === 1, `${locale}: cancelled turn remains retryable`);
    await input.fill('Draft after stop');
    await page.route('**/assistant/bridge/requests', route => route.abort('failed'));
    await input.fill('Test lost connection'); await input.press('Enter');
    await dock.locator('.assistant-retry').nth(1).waitFor();
    check(await dock.locator('.assistant-turn').count() === 4, `${locale}: failed message stays in transcript`);
    await input.fill('Draft after failure'); await page.unroute('**/assistant/bridge/requests');
    await dock.locator('.assistant-retry').last().click();
    await page.waitForFunction(() => !!document.querySelector('.assistant-busy'));
    await dock.locator('.assistant-stop').click(); await page.waitForFunction(() => !document.querySelector('.assistant-busy'));
    check(await dock.locator('.assistant-turn').count() === 4 && await input.inputValue() === 'Draft after failure', `${locale}: retry reuses turn and preserves unsent draft`);

    await input.fill('Two lines'); await input.press('Shift+Enter');
    check((await input.inputValue()).includes('\n'), `${locale}: Shift+Enter inserts a newline`);
    await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
    check(await dock.locator('.assistant-turn').count() === 4, `${locale}: IME Enter does not send`);
    await input.press('Escape'); check(!await dock.isVisible(), `${locale}: Escape minimizes`);
    await page.locator('.assistant-launcher').click();
    check((await input.inputValue()).includes('Two lines'), `${locale}: minimize preserves draft`);
    await dock.locator('.assistant-footer button').click(); await dock.locator('.assistant-human').waitFor();
    await dock.locator('.assistant-human-request').waitFor();
    check(await dock.locator('.assistant-human-request').isVisible(), `${locale}: human handoff stays in the dock`);
    await dock.locator('.assistant-human > button').last().click();
    await dock.locator('.assistant-new').click();
    check(await dock.locator('.assistant-turn').count() === 0 && (await input.inputValue()).includes('Two lines'), `${locale}: new conversation preserves unsent draft`);
    check(writes === 0, `${locale}: chat never mutates business data`);
    await context.close();
  }
  check(errors.length === 0, 'no browser runtime exceptions');
  writeFileSync(path.join(output, 'result.json'), JSON.stringify({ checks, timings, errors }, null, 2));
  console.log(JSON.stringify({ pass: true, assertions: checks.length, greetingHttpMs: timings, output }));
} catch (error) {
  await currentPage?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); }
