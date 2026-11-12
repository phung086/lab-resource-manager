import assert from 'node:assert/strict';
import http from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import bcrypt from '../backend/node_modules/bcryptjs/index.js';
import { chromium } from 'playwright-core';

const database = new URL(process.env.CHATGPT_BRIDGE_TEST_DATABASE_URL || 'http://missing');
assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
assert.equal(database.pathname, '/lab_resources_chatgpt_bridge_test');
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
Object.assign(process.env, { DATABASE_URL: database.href, NODE_ENV: 'test', LOG_FORMAT: 'dev', RATE_LIMIT_MAX: '10000',
  JWT_SECRET: 'assistant-all-roles-isolated-test-secret', MCP_ASSISTANT_ENABLED: 'true',
  CHATGPT_BRIDGE_ENABLED: 'true', CHATGPT_BRIDGE_PUBLIC_ORIGIN: 'https://lab.example', CHATGPT_BRIDGE_UI_ORIGIN: base,
  CHATGPT_BRIDGE_SECRET_KEY: randomBytes(32).toString('base64'), OPENAI_API_KEY: '', OPENAI_MODEL: '',
  EMAIL_ENABLED: 'false', SMTP_HOST: '', REMINDER_SCHEDULER_ENABLED: 'false' });
const [{ prisma }, { createApp }, { config }, { bridgeRequests }, { bridgeTimeContext }] = await Promise.all([
  import('../backend/src/db.js'), import('../backend/src/app.js'), import('../backend/src/config.js'),
  import('../backend/src/chatgptBridge/runtime.js'), import('../backend/src/chatgptBridge/timeContext.js')
]);
assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_chatgpt_bridge_test');
assert.ok((await prisma.user.findMany({ select: { email: true } })).every(user => user.email.endsWith('@bridge.test')));
const server = http.createServer(createApp()); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
config.port = server.address().port;
const api = `http://127.0.0.1:${config.port}`, output = path.join(tmpdir(), 'lab-assistant-roles'); mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, headless: true });
const checks = [], timings = [], errors = []; const check = (value, name) => { assert.ok(value, name); checks.push(name); };
let activePage;
try {
  await prisma.chatgptBridgeGrant.updateMany({ where: { revokedAt: null }, data: { revokedAt: new Date() } });
  await prisma.chatgptBridgeRequest.updateMany({ where: { status: 'PENDING' }, data: { status: 'CANCELLED' } });
  const users = {};
  for (const role of ['ADMIN', 'LAB_STAFF', 'CUSTOMER']) users[role] = await prisma.user.create({ data: { id: randomUUID(),
    email: `role-ui-${randomUUID()}@bridge.test`, fullName: `UI ${role}`, role, phone: '0900000001', passwordHash: bcrypt.hashSync('RolesUI!2026', 4) } });
  const client = await prisma.chatgptBridgeClient.create({ data: { id: randomUUID(), name: 'Roles UI protocol fixture', redirectUris: [] } });
  const grant = await prisma.chatgptBridgeGrant.create({ data: { id: randomUUID(), ownerId: users.ADMIN.id, ownerAuthVersion: users.ADMIN.authVersion, clientId: client.id,
    generation: randomUUID(), audience: 'https://lab.example/mcp/support-bridge', scope: 'lab.assistant.read lab.assistant.reply lab.assistant.events', expiresAt: new Date(Date.now() + 3600000) } });
  const subscription = await prisma.chatgptBridgeSubscription.create({ data: { id: randomUUID(), grantId: grant.id, eventType: 'question', webhookId: randomUUID(),
    callbackUrl: 'https://receiver.example/fixture', secretCipher: 'unused-without-dispatcher', expiresAt: grant.expiresAt } });
  const campus = await prisma.campus.create({ data: { id: randomUUID(), code: randomUUID(), name: 'Role UI campus' } });
  const building = await prisma.building.create({ data: { id: randomUUID(), code: randomUUID(), name: 'Role UI building', campusId: campus.id } });
  const labs = [];
  for (const label of ['Own', 'Foreign']) labs.push(await prisma.laboratory.create({ data: { id: randomUUID(), code: randomUUID(), name: `${label} UI LAB`, buildingId: building.id } }));
  await prisma.userLabAssignment.create({ data: { userId: users.LAB_STAFF.id, laboratoryId: labs[0].id } });
  const resources = [];
  for (const [index, label] of ['OWN-UI', 'FOREIGN-UI'].entries()) {
    const resource = await prisma.resource.create({ data: { id: randomUUID(), code: label + '-' + randomUUID(), name: label, category: 'MATERIAL', subtype: 'MATERIAL', location: 'UI fixture', laboratoryId: labs[index].id } });
    resources.push(resource);
    if (!index) await prisma.stockItem.create({ data: { resourceId: resource.id, unit: 'pieces', balance: 42 } });
    const today = bridgeTimeContext(new Date()).today;
    await prisma.booking.create({ data: { id: randomUUID(), requestedById: users.CUSTOMER.id, resourceId: resource.id, title: label, purpose: 'Isolated role test',
      status: 'CONFIRMED', startAt: new Date(today + 'T09:00:00+07:00'), endAt: new Date(today + 'T10:00:00+07:00') } });
  }
  for (const [role, locale, viewport] of [['LAB_STAFF', 'vi', { width: 1440, height: 900 }], ['ADMIN', 'en', { width: 375, height: 812 }], ['CUSTOMER', 'vi', { width: 1366, height: 768 }]]) {
    const login = await fetch(api + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: users[role].email, password: 'RolesUI!2026' }) });
    assert.equal(login.status, 200); const session = await login.json();
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    let businessWrites = 0, bridgeCreates = 0;
    await context.addInitScript(({ session, locale }) => { sessionStorage.setItem('lrm_token', session.accessToken); sessionStorage.setItem('lrm_user', JSON.stringify(session.user)); localStorage.setItem('lrm_locale', locale); }, { session, locale });
    await context.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() === 'POST' && url.pathname.endsWith('/assistant/bridge/requests')) bridgeCreates++;
      if (request.method() !== 'GET' && !/\/auth\/|\/assistant\//.test(url.pathname)) businessWrites++;
      const response = await route.fetch({ url: api + url.pathname + url.search }); await route.fulfill({ response });
    });
    const page = await context.newPage(); activePage = page; page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/workspace/overview'); await page.locator('.assistant-launcher').click();
    const dock = page.locator('#lab-assistant-panel'), input = dock.locator('#assistant-question');
    await dock.locator('.assistant-suggestions button').first().waitFor();
    check(await dock.locator('.assistant-suggestions button').count() === (role === 'CUSTOMER' ? 3 : 4), `${role}: role-specific suggestions`);
    await page.screenshot({ path: path.join(output, `${role}-welcome.png`) });
    const ask = async message => {
      await input.fill(message); const start = performance.now();
      const wait = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/assistant/bridge/requests'));
      await input.press('Enter'); const response = await wait, body = await response.json();
      timings.push({ role, message, ms: Math.round(performance.now() - start), http: response.status() });
      return { response, body };
    };
    if (role !== 'CUSTOMER') {
      for (const message of ['Xem lịch hôm nay', 'Kiểm tra tồn kho', 'Thống kê 7 ngày', `Tìm khách hàng ${users.CUSTOMER.email}`]) {
        const before = await prisma.chatgptBridgeDelivery.count(), { response, body } = await ask(message);
        assert.equal(response.status(), 202, JSON.stringify(body));
        check(body.status === 'ANSWERED' && body.source === 'authenticated_mcp', `${role}: ${message} answers from fresh data immediately`);
        check(await prisma.chatgptBridgeDelivery.count() === before, `${role}: ${message} does not queue Work`);
        await page.waitForFunction(() => !document.querySelector('.assistant-busy'));
        const text = await dock.locator('.assistant-answer').last().innerText();
        check(!/assistant\.|api\.|ChatGPT/.test(text), `${role}: localized result without internals`);
        if (message.includes('tồn kho')) check(role === 'LAB_STAFF' ? text.includes('42') && !text.includes('FOREIGN-UI') : text.includes('FOREIGN-UI'), `${role}: stock obeys scope and preserves unknown quantities`);
        if (message.includes('lịch')) check(role === 'LAB_STAFF' ? text.includes('OWN-UI') && !text.includes('FOREIGN-UI') : text.includes('FOREIGN-UI'), `${role}: schedule obeys scope`);
        if (message.includes('khách hàng')) check(text.includes(users.CUSTOMER.email) && text.includes('0900000001'), `${role}: authorized contact info is useful`);
      }
      await page.screenshot({ path: path.join(output, `${role}-contacts.png`) });
      const last = dock.locator('.assistant-next-actions').last();
      await last.getByRole('button').first().click(); await page.waitForURL(/\/workspace\/users/);
      check(!await dock.isVisible(), `${role}: contact navigation uses existing user screen`);
      await page.locator('.assistant-launcher').click();
    } else {
      const own = await ask('Xem lịch hôm nay'); assert.equal(own.body.status, 'ANSWERED');
      await page.waitForFunction(() => !document.querySelector('.assistant-busy'));
      const denied = await ask('Danh sách khách hàng');
      check(denied.response.status() === 403, 'CUSTOMER: contact enumeration denied by backend');
      await dock.locator('[role=alert]').waitFor();
    }
    const pending = await ask('Phân tích và tư vấn cách tổ chức buổi thực hành');
    check(pending.body.status === 'PENDING', `${role}: open-ended question reaches Work bridge`);
    const question = await bridgeRequests.context(grant, pending.body.id);
    check(question.actorRole === role, `${role}: receiver sees server-owned actor role`);
    await bridgeRequests.reply(grant, { requestId: pending.body.id, generation: grant.generation, answer: `Protocol fixture for ${role}: review your LAB workspace.` });
    await page.waitForFunction(() => !document.querySelector('.assistant-busy'));
    check((await dock.locator('.assistant-answer').last().innerText()).includes(`Protocol fixture for ${role}`), `${role}: receiver reply reaches its own dock`);
    check(bridgeCreates >= 2, `${role}: same configured connection handles questions`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${role}: no horizontal overflow`);
    check(businessWrites === 0, `${role}: assistant remains read-only`);
    await context.close();
  }
  // With the Work subscription unavailable, local authenticated reads still work.
  await prisma.chatgptBridgeSubscription.update({ where: { id: subscription.id }, data: { status: 'REVOKED' } });
  const customer = users.CUSTOMER;
  const login = await fetch(api + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: customer.email, password: 'RolesUI!2026' }) }); const session = await login.json();
  const context = await browser.newContext();
  await context.addInitScript(session => { sessionStorage.setItem('lrm_token', session.accessToken); sessionStorage.setItem('lrm_user', JSON.stringify(session.user)); }, session);
  await context.route('**/api/**', async route => { const url = new URL(route.request().url()); const response = await route.fetch({ url: api + url.pathname + url.search }); await route.fulfill({ response }); });
  const page = await context.newPage(); activePage = page; await page.goto(base + '/workspace/overview'); await page.locator('.assistant-launcher').click();
  await page.locator('#assistant-question').fill('Xem lịch hôm nay');
  await page.waitForFunction(() => document.querySelector('.assistant-compose button[type=submit]')?.disabled === false);
  const local = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/assistant/chat'));
  await page.locator('#assistant-question').press('Enter'); const result = await local;
  check(result.status() === 200 && (await result.json()).source === 'authenticated_mcp', 'disconnected Work: local authenticated schedule still works');
  await context.close();
  check(errors.length === 0, 'no browser runtime exceptions');
  writeFileSync(path.join(output, 'result.json'), JSON.stringify({ checks, timings, errors }, null, 2));
  console.log(JSON.stringify({ pass: true, assertions: checks.length, timings, output }));
} catch (error) { await activePage?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error; }
finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); }
