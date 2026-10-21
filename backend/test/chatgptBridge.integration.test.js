import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PROTOCOL_VERSION_META_KEY, CLIENT_CAPABILITIES_META_KEY } from '@modelcontextprotocol/server';
import { buildBridgeConfig, CHATGPT_STABLE_REDIRECT } from '../src/chatgptBridge/config.js';
import { createBridgeOAuth } from '../src/chatgptBridge/oauth.js';
import { createBridgeEvents, EVENT_NAME } from '../src/chatgptBridge/events.js';
import { pkceChallenge } from '../src/chatgptBridge/crypto.js';

const url = new URL(process.env.CHATGPT_BRIDGE_TEST_DATABASE_URL || '');
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname)); assert.ok(['/lab_resources_chatgpt_bridge_test', '/lab_resources_chatgpt_actions_test'].includes(url.pathname));
// Configure the guarded database before importing any module that owns a Prisma
// client. Optional provider integrations stay off; charges are pending only.
Object.assign(process.env, { DATABASE_URL: url.href, NODE_ENV: 'test', LOG_FORMAT: 'dev',
  JWT_SECRET: 'bridge-actions-isolated-contract-test-secret-32-characters', PAYMENTS_ENABLED: 'true', VNPAY_ENABLED: 'false',
  EMAIL_ENABLED: 'false', SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', OPENAI_API_KEY: '', CHATGPT_BRIDGE_ENABLED: 'false', MCP_ASSISTANT_ENABLED: 'false' });
const { buildBridgeMcp } = await import('../src/chatgptBridge/mcp.js');
const { createBridgeRequests } = await import('../src/chatgptBridge/requests.js');
const { prisma: toolDatabase } = await import('../src/db.js');
const { createApp } = await import('../src/app.js');
const { requireAuth } = await import('../src/middleware/auth.js');
const { createBridgeOAuthRouters } = await import('../src/chatgptBridge/routes.js');
const businessApp = createApp();
let customerBearer;
const customerHttp = (method, path, body) => {
  const call = request(businessApp)[method]('/api' + path).set('Authorization', `Bearer ${customerBearer}`);
  return body ? call.send(body) : call;
};
const prisma = new PrismaClient({ datasources: { db: { url: url.href } } });
const settings = buildBridgeConfig({ NODE_ENV: 'test', CHATGPT_BRIDGE_ENABLED: 'true', CHATGPT_BRIDGE_PUBLIC_ORIGIN: 'https://lab.example', CHATGPT_BRIDGE_SECRET_KEY: randomBytes(32).toString('base64') });
let clock = new Date(), owner, alice, bob, client, grant, access, server, origin, fixtureLab, fixtureBooking;
const oauth = createBridgeOAuth({ prisma, settings, now: () => clock });
const requests = createBridgeRequests({ prisma, settings, now: () => clock });
const events = createBridgeEvents({ prisma, settings, now: () => clock, sendWebhook: async (_url, request) => {
  const data = JSON.parse(request.body); return { status: 200, ok: true, body: JSON.stringify({ challenge: data.challenge }) };
} });
const verifier = randomBytes(48).toString('base64url');
async function authorize() {
  const target = await oauth.beginAuthorization({ response_type: 'code', client_id: client.client_id, redirect_uri: CHATGPT_STABLE_REDIRECT,
    state: 'test-connection-state', code_challenge: pkceChallenge(verifier), code_challenge_method: 'S256', resource: settings.resource, scope: settings.scopes.join(' ') });
  const ticket = new URL(target).searchParams.get('ticket');
  const result = await oauth.consent(ticket, owner, true);
  return { code: new URL(result.redirectUrl).searchParams.get('code'), ticket };
}
const exchange = code => oauth.exchange({ grant_type: 'authorization_code', client_id: client.client_id, code,
  redirect_uri: CHATGPT_STABLE_REDIRECT, resource: settings.resource, code_verifier: verifier });
const ask = (actor = alice, extra = {}) => requests.create(actor, { message: 'Tôi cần đặt phòng và xem giá thuê.', locale: 'vi', ...extra });
const subscribe = () => events.subscribe(grant, { name: EVENT_NAME, arguments: {}, delivery: { mode: 'webhook',
  url: 'https://receiver.example/questions', secret: 'whsec_' + randomBytes(32).toString('base64') } });
const rpc = async (method, params = {}, bearer = access) => {
  const response = await fetch(origin + '/mcp/support-bridge', { method: 'POST', headers: { 'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream', Authorization: `Bearer ${bearer}`, 'Mcp-Method': method,
    ...(method === 'tools/call' ? { 'Mcp-Name': params.name } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: randomUUID(), method, params: { ...params, _meta: { [PROTOCOL_VERSION_META_KEY]: '2026-07-28', [CLIENT_CAPABILITIES_META_KEY]: {} } } }) });
  return { status: response.status, challenge: response.headers.get('www-authenticate'), body: await response.json() };
};
test.before(async () => {
  assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, url.pathname.slice(1));
  assert.ok((await prisma.user.findMany({ select: { email: true } })).every(row => row.email.endsWith('@bridge.test')));
  await prisma.chatgptBridgeGrant.updateMany({ where: { revokedAt: null }, data: { revokedAt: clock } });
  await prisma.chatgptBridgeRequest.updateMany({ where: { status: 'PENDING' }, data: { status: 'CANCELLED' } });
  await prisma.chatgptBridgeDelivery.updateMany({ where: { status: 'PENDING' }, data: { status: 'CANCELLED' } });
  const marker = randomUUID();
  const user = role => prisma.user.create({ data: { id: randomUUID(), email: `${role.toLowerCase()}-${randomUUID()}@bridge.test`, fullName: role, role, passwordHash: 'test-only-not-a-password' } });
  owner = await user('ADMIN'); alice = await user('CUSTOMER'); bob = await user('CUSTOMER');
  client = await oauth.register({ client_name: 'Integration fixture', redirect_uris: [CHATGPT_STABLE_REDIRECT], token_endpoint_auth_method: 'none' });
  const campus = await prisma.campus.create({ data: { id: randomUUID(), code: 'BRIDGE-' + marker, name: 'Bridge Test Campus' } });
  const building = await prisma.building.create({ data: { id: randomUUID(), code: 'BRIDGE-' + marker, name: 'Bridge Test Building', campusId: campus.id } });
  fixtureLab = await prisma.laboratory.create({ data: { id: randomUUID(), buildingId: building.id, code: 'BRIDGE-' + marker, name: 'Bridge Test LAB' } });
  const resource = await prisma.resource.create({ data: { id: randomUUID(), code: 'BRIDGE-' + marker, name: 'Test booking resource',
    location: 'Test LAB', laboratoryId: fixtureLab.id, subtype: 'ROOM', category: 'ROOM', maxBookingMinutes: 120 } });
  fixtureBooking = await prisma.booking.create({ data: { id: randomUUID(), resourceId: resource.id, requestedById: bob.id, title: 'Private Bob booking',
    purpose: 'Private', startAt: new Date(clock.getTime() + 86400000), endAt: new Date(clock.getTime() + 90000000), status: 'CONFIRMED', feeAmountVnd: 60000 } });
  const app = express(); app.use(express.json()); app.post('/mcp/support-bridge', buildBridgeMcp({ oauth, requests, events, settings }));
  app.use(createBridgeOAuthRouters({ oauth, requireAuth }).publicRouter);
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: { code: error.code || 'FAILED' } }));
  server = await new Promise(resolve => { const http = app.listen(0, '127.0.0.1', () => resolve(http)); }); origin = 'http://127.0.0.1:' + server.address().port;
});
test.after(async () => { await new Promise(resolve => server?.close(resolve)); await prisma.$disconnect(); await toolDatabase.$disconnect(); });

test('OAuth HTTP ignores extensions without bypassing consent or required security fields', async () => {
  const required = { response_type: 'code', client_id: client.client_id, redirect_uri: CHATGPT_STABLE_REDIRECT,
    state: 'extension-connection-state', code_challenge: pkceChallenge(verifier), code_challenge_method: 'S256',
    resource: settings.resource, scope: settings.scopes.join(' ') };
  const beforeGrants = await prisma.chatgptBridgeGrant.count();
  const beforeCodes = await prisma.chatgptBridgeCode.count();
  const extension = 'ignored-oauth-extension-marker';
  const response = await fetch(origin + '/oauth/chatgpt/authorize?' + new URLSearchParams({ ...required,
    prompt: 'consent', extension_hint: extension, role: 'ADMIN', return_to: 'https://attacker.example' }), { redirect: 'manual' });
  assert.equal(response.status, 302); assert.equal(response.headers.get('cache-control'), 'no-store');
  const target = new URL(response.headers.get('location'));
  assert.equal(target.origin, settings.uiOrigin); assert.equal(target.pathname, '/workspace/chatgpt-bridge');
  assert.deepEqual([...target.searchParams.keys()], ['ticket']);
  const ticket = target.searchParams.get('ticket');
  assert.ok((await oauth.inspectConsent(ticket, owner)).scopes.includes('lab.assistant.read'));
  assert.equal(await prisma.chatgptBridgeGrant.count(), beforeGrants);
  const persisted = await prisma.chatgptBridgeCode.findFirst({ where: { state: required.state } });
  assert.ok(!JSON.stringify(persisted).includes(extension));
  const denied = new URL((await oauth.consent(ticket, owner, false)).redirectUrl);
  assert.equal(denied.origin + denied.pathname, CHATGPT_STABLE_REDIRECT);
  assert.equal(denied.searchParams.get('state'), required.state);
  assert.equal(denied.searchParams.get('error'), 'access_denied');
  assert.deepEqual([...denied.searchParams.keys()].sort(), ['error', 'iss', 'state']);
  for (const changed of [
    { response_type: 'token' }, { client_id: 'unregistered-client' }, { redirect_uri: 'https://attacker.example/callback' },
    { resource: 'https://attacker.example' }, { scope: 'lab.assistant.read' }, { code_challenge_method: 'plain' },
    { code_challenge: 'invalid' }, { state: '' },
  ]) {
    const invalid = await fetch(origin + '/oauth/chatgpt/authorize?' + new URLSearchParams({ ...required, ...changed,
      extension_hint: extension }), { redirect: 'manual' });
    assert.equal(invalid.status, 400); assert.equal(invalid.headers.get('location'), null);
  }
  const duplicate = new URLSearchParams(required); duplicate.append('resource', settings.resource);
  assert.equal((await fetch(origin + '/oauth/chatgpt/authorize?' + duplicate, { redirect: 'manual' })).status, 400);
  assert.equal(await prisma.chatgptBridgeCode.count(), beforeCodes + 1);
  assert.equal(await prisma.chatgptBridgeGrant.count(), beforeGrants);
});

test('OAuth exact callback, audience, S256 and administrator consent fail closed', async () => {
  await assert.rejects(oauth.register({ redirect_uris: ['https://attacker.example/callback'] }));
  const pending = await authorize();
  await assert.rejects(oauth.inspectConsent(pending.ticket, alice), error => error.status === 403);
  await assert.rejects(oauth.consent(pending.ticket, owner, true));
  await assert.rejects(oauth.exchange({ grant_type: 'authorization_code', client_id: client.client_id, code: pending.code,
    redirect_uri: CHATGPT_STABLE_REDIRECT, resource: settings.resource, code_verifier: randomBytes(48).toString('base64url') }));
  const exchanged = await fetch(origin + '/oauth/chatgpt/token', { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: client.client_id, code: pending.code,
      redirect_uri: CHATGPT_STABLE_REDIRECT, resource: settings.resource, code_verifier: verifier,
      extension_hint: 'ignored-token-extension' }) });
  assert.equal(exchanged.status, 200); assert.equal(exchanged.headers.get('cache-control'), 'no-store');
  const tokens = await exchanged.json(); access = tokens.access_token;
  grant = (await oauth.authenticate(access)).grant;
  const connection = await oauth.listConnections(owner);
  assert.equal(connection.authorized, true); assert.equal(connection.connected, false);
  await assert.rejects(exchange(pending.code));
  const stored = await prisma.chatgptBridgeToken.findMany({ where: { grantId: grant.id } });
  assert.ok(stored.every(row => row.tokenHash !== access && row.tokenHash.length === 64));
  assert.equal(await prisma.systemAuditEvent.count({ where: { targetId: grant.id, action: 'CHATGPT_CONNECTION_AUTHORIZED' } }), 1);
});

test('modern MCP discovery advertises Events and authenticated tools on the wire', async () => {
  const denied = await rpc('server/discover', {}, 'not-a-valid-token'); assert.equal(denied.status, 401); assert.ok(denied.challenge.includes('resource_metadata'));
  const discovery = await rpc('server/discover'); assert.equal(discovery.status, 200, JSON.stringify(discovery.body)); assert.deepEqual(discovery.body.result.capabilities.events, {});
  assert.ok(discovery.body.result.supportedVersions.includes('2026-07-28'));
  const list = await rpc('events/list'); assert.equal(list.body.result.events[0].name, EVENT_NAME);
  const tools = await rpc('tools/list'); assert.deepEqual(tools.body.result.tools.map(t => t.name).sort(), ['get_question_context', 'publish_question_partial', 'publish_question_reply', 'read_question_data']);
  const sub = await rpc('events/subscribe', { name: EVENT_NAME, arguments: {}, delivery: { mode: 'webhook', url: 'https://receiver.example/questions', secret: 'whsec_' + randomBytes(32).toString('base64') } });
  assert.ok(sub.body.result?.id, JSON.stringify(sub.body.error));
  const connection = await oauth.listConnections(owner);
  assert.equal(connection.authorized, true); assert.equal(connection.connected, true);
});

test('authenticated older clients discover the same tools without losing OAuth checks', async () => {
  const send = bearer => fetch(origin + '/mcp/support-bridge', { method: 'POST', headers: {
    'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {},
      clientInfo: { name: 'Legacy compatibility fixture', version: '1.0.0' } } }) });
  assert.equal((await send('invalid')).status, 401);
  const response = await send(access); assert.equal(response.status, 200);
  const body = await response.text();
  const initialized = JSON.parse(body.startsWith('event:') ? body.split('\n').find(line => line.startsWith('data: ')).slice(6) : body);
  assert.equal(initialized.result.protocolVersion, '2025-11-25');
  const listing = await fetch(origin + '/mcp/support-bridge', { method: 'POST', headers: {
    'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${access}`,
    'MCP-Protocol-Version': '2025-11-25' }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) });
  const listedBody = await listing.text();
  const listed = JSON.parse(listedBody.startsWith('event:') ? listedBody.split('\n').find(line => line.startsWith('data: ')).slice(6) : listedBody);
  assert.equal(listed.result.tools.length, 4);
});

test('simple app questions are answered and persisted without webhook work, with owner and busy guards', async () => {
  for (const [message, locale] of [['xin chào', 'vi'], ['Who are you?', 'en'], ['Hướng dẫn đặt lịch', 'vi']]) {
    const before = await prisma.chatgptBridgeDelivery.count();
    const job = await ask(alice, { message, locale });
    assert.equal(job.status, 'ANSWERED'); assert.equal(job.provider, 'local'); assert.equal(job.source, 'local_guidance');
    assert.ok(job.answer.includes('LAB') || job.answer.includes('15')); assert.equal(await prisma.chatgptBridgeDelivery.count(), before);
    assert.equal((await requests.read(alice, job.id)).answer, job.answer);
    await assert.rejects(requests.read(bob, job.id), error => error.status === 404);
  }
  const pending = await ask();
  await assert.rejects(ask(alice, { message: 'hello' }), error => error.code === 'ASSISTANT_BUSY');
  await requests.cancel(alice, pending.id);
});

test('durable request ownership, current business knowledge and read-only boundaries', async () => {
  await subscribe(); const job = await ask();
  await assert.rejects(requests.read(bob, job.id), error => error.status === 404);
  await assert.rejects(ask(), error => error.code === 'ASSISTANT_BUSY');
  const context = await requests.context(grant, job.id);
  assert.ok(context.businessKnowledge.topics.some(t => t.id === 'booking' && t.rules.includes('automatically')));
  assert.ok(context.tools.some(t => t.name === 'get_my_payment_status'));
  assert.equal(context.timeContext.timeZone, 'Asia/Ho_Chi_Minh');
  assert.equal(Date.parse(context.timeContext.nowVietnam), clock.getTime());
  assert.ok(!JSON.stringify(context).includes(alice.email));
  await assert.rejects(requests.readTool(grant, { requestId: job.id, tool: 'get_monitoring_summary', input: {} }), error => error.code === 'BRIDGE_TOOL_NOT_ALLOWED');
  await assert.rejects(requests.readTool(grant, { requestId: job.id, tool: 'get_my_bookings', input: { userId: bob.id } }), error => error.code === 'VALIDATION_ERROR');
  await assert.rejects(requests.readTool(grant, { requestId: job.id, tool: 'get_my_payment_status', input: { bookingId: fixtureBooking.id } }), error => error.status === 404);
  const own = await requests.readTool(grant, { requestId: job.id, tool: 'get_my_bookings', input: {} });
  assert.ok(!JSON.stringify(own).includes('Private Bob'));
  await requests.cancel(alice, job.id);
  await assert.rejects(requests.reply(grant, { requestId: job.id, generation: grant.generation, answer: 'A test protocol response.' }), error => error.code === 'BRIDGE_REQUEST_INACTIVE');
});

test('partial replies require current context, preserve order and ownership, and stop after cancellation', async () => {
  await subscribe(); const job = await ask();
  const input = { requestId: job.id, generation: grant.generation, sequence: 1, text: 'A booking preview does not reserve the resource.' };
  await assert.rejects(requests.partial(grant, input), error => error.code === 'BRIDGE_CONTEXT_REQUIRED');
  await requests.context(grant, job.id);
  assert.equal((await requests.partial(grant, input)).alreadyPublished, false);
  assert.equal((await requests.partial(grant, input)).alreadyPublished, true);
  const current = await requests.read(alice, job.id);
  assert.equal(current.status, 'PENDING'); assert.equal(current.partialReply.text, input.text);
  await assert.rejects(requests.read(bob, job.id), error => error.status === 404);
  await assert.rejects(requests.partial(grant, { ...input, sequence: 3 }), error => error.code === 'BRIDGE_REPLY_CONFLICT');
  await assert.rejects(requests.partial(grant, { ...input, sequence: 2, text: 'Rewrite a previously displayed sentence.' }), error => error.code === 'BRIDGE_REPLY_CONFLICT');
  await requests.partial(grant, { ...input, sequence: 2, text: input.text + ' Confirm through the regular form.' });
  await requests.cancel(alice, job.id);
  assert.equal((await requests.read(alice, job.id)).partialReply, undefined);
  await assert.rejects(requests.partial(grant, { ...input, sequence: 3 }), error => error.code === 'BRIDGE_REQUEST_INACTIVE');
});

test('operator tools enforce fresh LAB scope, contact permissions and bounded complete totals', async () => {
  const marker = randomUUID();
  const staff = await prisma.user.create({ data: { id: randomUUID(), email: `ops-${marker}@bridge.test`, fullName: 'Scoped operator', role: 'LAB_STAFF', passwordHash: 'never-project-this-secret' } });
  const emptyStaff = await prisma.user.create({ data: { id: randomUUID(), email: `empty-${marker}@bridge.test`, fullName: 'Unassigned operator', role: 'LAB_STAFF', passwordHash: 'fixture-only' } });
  const lab = await prisma.laboratory.create({ data: { id: randomUUID(), code: marker, name: 'Assigned operator LAB', buildingId: fixtureLab.buildingId } });
  await prisma.userLabAssignment.create({ data: { userId: staff.id, laboratoryId: lab.id } });
  const material = await prisma.resource.create({ data: { id: randomUUID(), code: 'OWN-' + marker, name: 'Scoped material', category: 'MATERIAL', subtype: 'MATERIAL', location: 'Assigned LAB', laboratoryId: lab.id } });
  await prisma.stockItem.create({ data: { resourceId: material.id, unit: 'pieces', balance: 120 } });
  const foreign = await prisma.resource.create({ data: { id: randomUUID(), code: 'FOREIGN-' + marker, name: 'Foreign confidential material', category: 'MATERIAL', subtype: 'MATERIAL', location: 'Other LAB', laboratoryId: fixtureLab.id } });
  const contact = await prisma.user.create({ data: { id: randomUUID(), email: `contact-${marker}@bridge.test`, fullName: marker, phone: '0900000001', organization: 'Test customer', role: 'CUSTOMER', passwordHash: 'customer-password-never-visible' } });
  const start = new Date(clock.getTime() + 5 * 86400000), end = new Date(+start + 3600000);
  for (const resourceId of [material.id, foreign.id]) await prisma.booking.create({ data: { id: randomUUID(), resourceId, requestedById: contact.id, title: 'Scope fixture booking', purpose: 'Test', status: 'CONFIRMED', startAt: start, endAt: end } });
  const message = 'Phân tích hoạt động của LAB và đề xuất hướng xử lý';
  const job = await ask(staff, { message });
  const context = await requests.context(grant, job.id);
  assert.equal(context.actorRole, 'LAB_STAFF'); assert.deepEqual(context.allowedProposals, []);
  assert.ok(context.tools.some(t => t.name === 'get_material_stock'));
  const read = (tool, input = {}) => requests.readTool(grant, { requestId: job.id, tool, input }).then(result => result.data);
  const stock = await read('get_material_stock');
  assert.equal(stock.total, 1); assert.equal(stock.items[0].stockItem.balance, 120);
  assert.ok(!JSON.stringify(stock).includes(foreign.code));
  const schedule = await read('get_lab_schedule', { startAt: start.toISOString(), endAt: end.toISOString() });
  assert.equal(schedule.total, 1); assert.equal(schedule.items[0].resource.id, material.id);
  const paidEnd = new Date(+end + 3600000);
  await prisma.booking.create({ data: { id: randomUUID(), resourceId: material.id, requestedById: contact.id, title: 'Payment hold scope fixture', purpose: 'Test',
    status: 'PENDING_APPROVAL', feeAmountVnd: 50000, paymentDueAt: new Date(+clock + 900000), startAt: end, endAt: paidEnd } });
  const withHold = await read('get_lab_schedule', { startAt: start.toISOString(), endAt: paidEnd.toISOString() });
  assert.equal(withHold.total, 2); assert.equal(withHold.awaitingPayment, 1, 'paid holds are counted separately from legacy approval');
  const contacts = await read('search_customers', { query: marker, limit: 1 });
  assert.equal(contacts.total, 1); assert.equal(contacts.items[0].phone, contact.phone);
  assert.ok(!JSON.stringify(contacts).includes('password'));
  const report = await read('get_operations_report', { days: 7 }); assert.equal(report.summary.resourceCount, 1);
  await assert.rejects(requests.reply(grant, { requestId: job.id, generation: grant.generation, answer: 'Forged proposal', proposals: [{ kind: 'STAFF_SUPPORT', laboratoryId: lab.id, category: 'OTHER', message: 'Not allowed for operators' }] }), error => error.status === 403);
  await prisma.userLabAssignment.delete({ where: { userId_laboratoryId: { userId: staff.id, laboratoryId: lab.id } } });
  assert.equal((await read('get_material_stock')).total, 0, 'removing an assignment takes effect within the same conversation');
  await requests.cancel(staff, job.id);

  for (const actor of [emptyStaff, owner, contact]) {
    const currentJob = await ask(actor, { message }); await requests.context(grant, currentJob.id);
    const currentRead = (tool, input = {}) => requests.readTool(grant, { requestId: currentJob.id, tool, input }).then(result => result.data);
    if (actor.role === 'CUSTOMER') {
      for (const tool of ['get_material_stock', 'search_customers', 'get_operations_report']) await assert.rejects(currentRead(tool), error => error.status === 403);
      assert.equal((await currentRead('get_lab_schedule', { startAt: start.toISOString(), endAt: end.toISOString() })).total, 2);
    } else {
      const result = await currentRead('get_material_stock', { limit: 1 });
      if (actor.role === 'ADMIN') { assert.ok(result.total > result.items.length); assert.ok((await currentRead('get_operations_report')).summary.resourceCount >= 2); }
      else { assert.equal(result.total, 0); assert.equal((await currentRead('search_customers', { query: marker })).total, 1); }
    }
    await requests.cancel(actor, currentJob.id);
  }
  const completed = await ask(staff, { message: 'Kiểm tra tồn kho' });
  const changed = await ask(staff, { message });
  await prisma.user.update({ where: { id: staff.id }, data: { role: 'CUSTOMER' } });
  await assert.rejects(requests.context(grant, changed.id), error => error.code === 'BRIDGE_REQUEST_INACTIVE');
  await assert.rejects(requests.read({ ...staff, role: 'CUSTOMER' }, completed.id), error => error.status === 404);
  await prisma.user.update({ where: { id: staff.id }, data: { role: 'LAB_STAFF' } }); await requests.cancel(staff, changed.id);
});

test('fast database replies persist without receiver events and never replay customer contacts as evidence', async () => {
  const before = await prisma.chatgptBridgeDelivery.count();
  const job = await ask(owner, { message: 'Danh sách khách hàng' });
  assert.equal(job.status, 'ANSWERED'); assert.equal(job.source, 'authenticated_mcp'); assert.equal(job.nextTab, 'users');
  assert.ok(!job.answer.includes('api.API_REQUEST_FAILED'));
  assert.equal(await prisma.chatgptBridgeDelivery.count(), before);
  const followup = await ask(owner, { message: 'Phân tích thêm các nhóm khách này', conversationId: job.conversation.id });
  const context = await requests.context(grant, followup.id);
  assert.ok(context.history[0].answer.includes('Read again for current facts'));
  assert.ok(!context.history[0].answer.includes('@bridge.test'));
  await requests.cancel(owner, followup.id);
  await assert.rejects(ask(alice, { message: 'Danh sách khách hàng' }), error => error.status === 403);
});

test('publish is idempotent and never settles bookings or payments', async () => {
  const job = await ask();
  const before = await prisma.booking.findUnique({ where: { id: fixtureBooking.id } });
  const input = { requestId: job.id, generation: grant.generation, answer: 'Protocol fixture: use the booking form.' };
  await assert.rejects(requests.reply(grant, input), error => error.code === 'BRIDGE_CONTEXT_REQUIRED');
  const context = await rpc('tools/call', { name: 'get_question_context', arguments: { requestId: job.id } });
  assert.ok(context.body.result?.structuredContent.businessKnowledge);
  const response = await rpc('tools/call', { name: 'publish_question_reply', arguments: input });
  assert.ok(response.body.result, JSON.stringify(response.body));
  assert.equal(response.body.result.structuredContent.status, 'ANSWERED');
  assert.equal((await requests.reply(grant, input)).alreadyPublished, true);
  await assert.rejects(requests.reply(grant, { ...input, answer: 'Different response' }), error => error.code === 'BRIDGE_REPLY_CONFLICT');
  const visible = await requests.read(alice, job.id); assert.equal(visible.provider, 'chatgpt'); assert.equal(visible.answer, input.answer);
  assert.deepEqual(await prisma.booking.findUnique({ where: { id: fixtureBooking.id } }), before);
  const continued = await ask(alice, { conversationId: visible.conversation.id });
  assert.equal((await requests.context(grant, continued.id)).history.length, 1); await requests.cancel(alice, continued.id);
  await assert.rejects(ask(bob, { conversationId: visible.conversation.id }), error => error.code === 'ASSISTANT_CONVERSATION_EXPIRED');
});

test('tariffs, owned settlement status and verified spending are read fresh without payment secrets', async () => {
  const ownBooking = await prisma.booking.create({ data: { id: randomUUID(), resourceId: fixtureBooking.resourceId,
    requestedById: alice.id, title: 'Alice tariff fixture', purpose: 'Service',
    startAt: new Date(clock.getTime() + 2 * 86400000), endAt: new Date(clock.getTime() + 2 * 86400000 + 3600000),
    status: 'CONFIRMED', feeAmountVnd: 60000 } });
  const rule = await prisma.resourcePricingRule.create({ data: { id: randomUUID(), resourceId: ownBooking.resourceId,
    purposeCode: 'SERVICE', label: 'Service', hourlyRateVnd: 60000 } });
  const payment = await prisma.paymentTransaction.create({ data: { id: randomUUID(), userId: alice.id,
    bookingId: ownBooking.id, txnRef: randomUUID(), amount: 60000, provider: 'vnpay',
    paymentUrl: 'https://provider.example/payment?secret=must-not-be-shared' } });
  const job = await ask(); await requests.context(grant, job.id);
  const read = (tool, input = {}) => requests.readTool(grant, { requestId: job.id, tool, input }).then(r => r.data);
  assert.equal((await read('get_resource_tariff', { resourceId: ownBooking.resourceId })).rules[0].hourlyRateVnd, 60000);
  await prisma.resourcePricingRule.update({ where: { id: rule.id }, data: { hourlyRateVnd: 75000, version: { increment: 1 } } });
  assert.equal((await read('get_resource_tariff', { resourceId: ownBooking.resourceId })).rules[0].hourlyRateVnd, 75000);
  const pending = await read('get_my_payment_status', { bookingId: ownBooking.id });
  assert.equal(pending.booking.payments[0].status, 'pending');
  assert.ok(!JSON.stringify(pending).includes('must-not-be-shared'));
  const prior = await read('get_my_loyalty');
  // Explicit provider-evidence fixture, never a claim of a live VNPAY payment.
  await prisma.paymentTransaction.update({ where: { id: payment.id }, data: { status: 'success', paidAt: clock } });
  assert.equal((await read('get_my_payment_status', { bookingId: ownBooking.id })).booking.payments[0].status, 'success');
  assert.equal((await read('get_my_loyalty')).totalSpendVnd, prior.totalSpendVnd + 60000);
  await requests.cancel(alice, job.id);
});

test('parallel data reads reserve a finite per-question budget', async () => {
  const job = await ask(); await requests.context(grant, job.id);
  const results = await Promise.allSettled(Array.from({ length: 14 }, () => requests.readTool(grant,
    { requestId: job.id, tool: 'get_my_bookings', input: { limit: 1 } })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 12);
  assert.ok(results.filter(result => result.status === 'rejected').every(result => result.reason.code === 'BRIDGE_CONTEXT_LIMIT'));
  assert.equal((await prisma.chatgptBridgeRequest.findUnique({ where: { id: job.id } })).readCount, 13);
  await requests.cancel(alice, job.id);
});

test('booking review drafts use live rules and quotes without creating bookings or payments', async () => {
  const proposal = { kind: 'BOOKING', resourceId: fixtureBooking.resourceId, title: 'Khách đặt phòng', purpose: 'Sử dụng phòng thí nghiệm', purposeCode: 'SERVICE',
    startAt: new Date(clock.getTime() + 3 * 86400000).toISOString(), endAt: new Date(clock.getTime() + 3 * 86400000 + 3600000).toISOString() };
  const job = await ask(); await requests.context(grant, job.id);
  const counts = await Promise.all([prisma.booking.count(), prisma.paymentTransaction.count(), prisma.supportSession.count()]);
  await assert.rejects(requests.reply(grant, { requestId: job.id, generation: grant.generation, answer: 'Xem đề xuất.', proposals: [{ ...proposal, userId: bob.id }] }));
  const input = { requestId: job.id, generation: grant.generation, answer: 'Xem và xác nhận khung giờ.', proposals: [proposal] };
  const response = await rpc('tools/call', { name: 'publish_question_reply', arguments: input });
  assert.equal(response.body.result?.structuredContent?.status, 'ANSWERED', JSON.stringify(response.body));
  const draft = (await requests.read(alice, job.id)).proposals[0];
  assert.equal(draft.resourceName, 'Test booking resource'); assert.equal(draft.quote.amountVnd, 75000); assert.equal(draft.quote.version, 2);
  assert.equal(Date.parse(draft.expiresAt) - clock.getTime(), 5 * 60000);
  assert.deepEqual(await Promise.all([prisma.booking.count(), prisma.paymentTransaction.count(), prisma.supportSession.count()]), counts);
  assert.equal((await requests.reply(grant, input)).alreadyPublished, true);
  await assert.rejects(requests.reply(grant, { ...input, proposals: [{ ...proposal, title: 'Đề xuất khác' }] }), error => error.code === 'BRIDGE_REPLY_CONFLICT');
});

test('review preparation rejects overlap, operational blocks, duration, past times and unsupported writes', async () => {
  const proposal = { kind: 'BOOKING', resourceId: fixtureBooking.resourceId, title: 'Đặt phòng kiểm thử', purpose: 'Sử dụng phòng thí nghiệm', purposeCode: 'SERVICE',
    startAt: fixtureBooking.startAt.toISOString(), endAt: fixtureBooking.endAt.toISOString() };
  const job = await ask(); await requests.context(grant, job.id);
  const publish = proposals => requests.reply(grant, { requestId: job.id, generation: grant.generation, answer: 'Xem đề xuất.', proposals });
  await assert.rejects(publish([proposal]), error => error.status === 409);
  const clear = { ...proposal, startAt: new Date(clock.getTime() + 4 * 86400000).toISOString(), endAt: new Date(clock.getTime() + 4 * 86400000 + 3600000).toISOString() };
  await prisma.resource.update({ where: { id: clear.resourceId }, data: { operationalStatus: 'BROKEN' } });
  await assert.rejects(publish([clear]), error => error.status === 409);
  await prisma.resource.update({ where: { id: clear.resourceId }, data: { operationalStatus: 'AVAILABLE' } });
  await assert.rejects(publish([{ ...clear, endAt: new Date(Date.parse(clear.startAt) + 180 * 60000).toISOString() }]), error => error.code === 'RESOURCE_DURATION_LIMIT');
  await assert.rejects(publish([{ ...clear, startAt: new Date(clock.getTime() - 3600000).toISOString(), endAt: clock.toISOString() }]), error => error.code === 'INVALID_BOOKING_TIME');
  for (const extra of [{ requestedById: bob.id }, { feeAmountVnd: 1 }, { kind: 'CANCEL_BOOKING' }, { role: 'ADMIN' }]) await assert.rejects(publish([{ ...clear, ...extra }]));
  await assert.rejects(publish([clear, clear]));
  assert.equal((await requests.read(alice, job.id)).status, 'PENDING'); await requests.cancel(alice, job.id);
});

test('staff-support review uses assigned active staff and does not dispatch until customer submission', async () => {
  const job = await ask(); await requests.context(grant, job.id);
  const proposal = { kind: 'STAFF_SUPPORT', laboratoryId: fixtureLab.id, category: 'BOOKING', message: 'Tôi cần trợ giúp chọn lịch phù hợp.' };
  const publish = () => requests.reply(grant, { requestId: job.id, generation: grant.generation, answer: 'Xem yêu cầu hỗ trợ.', proposals: [proposal] });
  await assert.rejects(publish(), error => error.code === 'SUPPORT_NO_STAFF');
  const staff = await prisma.user.create({ data: { id: randomUUID(), email: `${randomUUID()}@bridge.test`, fullName: 'Support fixture', role: 'LAB_STAFF', passwordHash: 'fixture-only' } });
  await prisma.userLabAssignment.create({ data: { userId: staff.id, laboratoryId: fixtureLab.id } });
  const options = await requests.readTool(grant, { requestId: job.id, tool: 'get_support_options', input: {} });
  assert.ok(options.data.laboratories.some(lab => lab.id === fixtureLab.id)); assert.ok(!JSON.stringify(options).includes(staff.email));
  const before = await prisma.supportSession.count(); await publish();
  assert.equal(await prisma.supportSession.count(), before);
  assert.equal((await requests.read(alice, job.id)).proposals[0].laboratoryName, fixtureLab.name);
  await prisma.user.update({ where: { id: staff.id }, data: { isActive: false } });
});

test('explicit normal booking confirmation rechecks changed price and overlapping reservations', async () => {
  const password = 'BridgeActions!2026';
  await prisma.user.update({ where: { id: alice.id }, data: { passwordHash: await bcrypt.hash(password, 4) } });
  const login = await request(businessApp).post('/api/auth/login').send({ email: alice.email, password });
  assert.equal(login.status, 200, JSON.stringify(login.body)); customerBearer = login.body.accessToken;
  const proposal = { kind: 'BOOKING', resourceId: fixtureBooking.resourceId, title: 'Khách xác nhận phòng', purpose: 'Sử dụng phòng thí nghiệm', purposeCode: 'SERVICE',
    startAt: new Date(clock.getTime() + 5 * 86400000).toISOString(), endAt: new Date(clock.getTime() + 5 * 86400000 + 3600000).toISOString() };
  const job = await ask(); await requests.context(grant, job.id);
  await requests.reply(grant, { requestId: job.id, generation: grant.generation, answer: 'Kiểm tra rồi xác nhận.', proposals: [proposal] });
  const draft = (await requests.read(alice, job.id)).proposals[0];
  await prisma.resourcePricingRule.updateMany({ where: { resourceId: proposal.resourceId }, data: { hourlyRateVnd: 90000, version: { increment: 1 } } });
  const { kind: _kind, ...bookingInput } = proposal;
  const body = { ...bookingInput, acceptedQuote: { amountVnd: draft.quote.amountVnd, version: draft.quote.version }, contact: { fullName: 'Khách kiểm thử', phone: '0900000001' } };
  const changed = await customerHttp('post', '/bookings', body);
  assert.equal(changed.status, 409); assert.equal(changed.body.error.code, 'PRICING_CHANGED');
  const fresh = await customerHttp('post', '/booking-pricing/quote', { resourceId: proposal.resourceId, purposeCode: proposal.purposeCode, startAt: proposal.startAt, endAt: proposal.endAt });
  assert.equal(fresh.status, 200, JSON.stringify(fresh.body));
  body.acceptedQuote = { amountVnd: fresh.body.amountVnd, version: fresh.body.version, loyaltyPolicyVersion: fresh.body.loyaltyPolicyVersion };
  const confirmed = await customerHttp('post', '/bookings', body);
  assert.equal(confirmed.status, 201, JSON.stringify(confirmed.body)); assert.equal(confirmed.body.status, 'PENDING_APPROVAL');
  assert.ok(confirmed.body.paymentDueAt, 'ADR-038: paid form submission holds the slot until verified payment');
  assert.equal(confirmed.body.requestedById, alice.id); assert.equal(confirmed.body.feeAmountVnd, fresh.body.amountVnd);
  assert.equal(await prisma.paymentTransaction.count({ where: { bookingId: confirmed.body.id, status: 'success' } }), 0);
  const overlap = await customerHttp('post', '/bookings', body); assert.equal(overlap.status, 409);
  assert.equal(await prisma.booking.count({ where: { resourceId: proposal.resourceId, startAt: new Date(proposal.startAt) } }), 1);
});

test('explicit normal staff-support submission is idempotent and preserves the customer message', async () => {
  const staff = await prisma.user.create({ data: { id: randomUUID(), email: `${randomUUID()}@bridge.test`, fullName: 'Staff confirm fixture', role: 'LAB_STAFF', passwordHash: 'fixture-only' } });
  await prisma.userLabAssignment.create({ data: { userId: staff.id, laboratoryId: fixtureLab.id } });
  const proposal = { kind: 'STAFF_SUPPORT', laboratoryId: fixtureLab.id, category: 'BOOKING', message: 'Tôi cần nhân viên hỗ trợ đặt lịch.' };
  const job = await ask(); await requests.context(grant, job.id);
  await requests.reply(grant, { requestId: job.id, generation: grant.generation, answer: 'Kiểm tra yêu cầu rồi gửi.', proposals: [proposal] });
  const { kind: _kind, ...supportInput } = proposal;
  const body = { ...supportInput, requestId: randomUUID() }, before = await prisma.supportSession.count();
  const first = await customerHttp('post', '/support/sessions', body);
  assert.equal(first.status, 201, JSON.stringify(first.body)); assert.equal(first.body.status, 'WAITING');
  const repeated = await customerHttp('post', '/support/sessions', body); assert.equal(repeated.status, 201); assert.equal(repeated.body.id, first.body.id);
  assert.equal(await prisma.supportSession.count(), before + 1);
  assert.equal((await prisma.supportMessage.findFirst({ where: { sessionId: first.body.id, kind: 'CUSTOMER' } })).body, proposal.message);
  const cancelled = await customerHttp('post', `/support/sessions/${first.body.id}/cancel`, { reason: 'Kết thúc kiểm thử' });
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
});

test('expiry, staff handoff and customer credentials reject late replies', async () => {
  const expired = await ask(); clock = new Date(clock.getTime() + settings.requestTtlMs + 1);
  assert.equal((await requests.read(alice, expired.id)).status, 'EXPIRED');
  await assert.rejects(requests.reply(grant, { requestId: expired.id, generation: grant.generation, answer: 'Late' }));
  const handedOff = await ask();
  const support = await prisma.supportSession.create({ data: { id: randomUUID(), laboratoryId: fixtureLab.id, requesterId: alice.id, category: 'OTHER', subject: 'Staff assistance', requestFingerprint: randomUUID(), status: 'WAITING' } });
  assert.equal((await requests.read(alice, handedOff.id)).status, 'HANDED_OFF');
  await assert.rejects(requests.reply(grant, { requestId: handedOff.id, generation: grant.generation, answer: 'Late reply' }));
  await prisma.supportSession.update({ where: { id: support.id }, data: { status: 'CANCELLED', closedAt: clock } });
  const changed = await ask(); await prisma.user.update({ where: { id: alice.id }, data: { authVersion: { increment: 1 } } });
  await assert.rejects(requests.reply(grant, { requestId: changed.id, generation: grant.generation, answer: 'Credential stale' }), error => error.status === 403);
  await prisma.chatgptBridgeRequest.update({ where: { id: changed.id }, data: { status: 'CANCELLED' } });
});

test('administrator disconnect is audited once and unknown grants leave no audit evidence', async () => {
  const before = await prisma.systemAuditEvent.count({ where: { action: 'CHATGPT_CONNECTION_REVOKED' } });
  await assert.rejects(oauth.revokeGrant(randomUUID(), owner), error => error.status === 404);
  assert.equal(await prisma.systemAuditEvent.count({ where: { action: 'CHATGPT_CONNECTION_REVOKED' } }), before);
  const authorized = await authorize(), tokens = await exchange(authorized.code);
  const current = (await oauth.authenticate(tokens.access_token)).grant;
  await assert.rejects(oauth.revokeGrant(current.id, bob), error => error.status === 403);
  await oauth.revokeGrant(current.id, owner);
  await oauth.revokeGrant(current.id, owner);
  assert.equal(await prisma.systemAuditEvent.count({ where: { targetId: current.id, action: 'CHATGPT_CONNECTION_REVOKED' } }), 1);
  await assert.rejects(oauth.authenticate(tokens.access_token));
});

test('refresh rotation detects replay and revokes the whole old connection', async () => {
  const authorized = await authorize(), tokens = await exchange(authorized.code);
  const refresh = { grant_type: 'refresh_token', client_id: client.client_id, resource: settings.resource, refresh_token: tokens.refresh_token };
  const renewed = await oauth.exchange({ ...refresh, extension_hint: 'ignored-refresh-extension' }); assert.ok(Boolean(renewed.access_token));
  await assert.rejects(oauth.exchange(refresh));
  await assert.rejects(oauth.authenticate(renewed.access_token));
  const authorizedAgain = await authorize(), fresh = await exchange(authorizedAgain.code);
  await prisma.user.update({ where: { id: owner.id }, data: { authVersion: { increment: 1 } } });
  await assert.rejects(oauth.authenticate(fresh.access_token), error => error.code === 'BRIDGE_CONNECTION_REVOKED');
  const connection = await oauth.listConnections({ ...owner, authVersion: owner.authVersion + 1 });
  assert.equal(connection.authorized, false); assert.equal(connection.connected, false);
});
