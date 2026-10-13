import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import { PROTOCOL_VERSION_META_KEY, CLIENT_CAPABILITIES_META_KEY } from '@modelcontextprotocol/server';
import { buildBridgeConfig, CHATGPT_STABLE_REDIRECT } from '../src/chatgptBridge/config.js';
import { createBridgeOAuth } from '../src/chatgptBridge/oauth.js';
import { createBridgeEvents, EVENT_NAME } from '../src/chatgptBridge/events.js';
import { buildBridgeMcp } from '../src/chatgptBridge/mcp.js';
import { pkceChallenge } from '../src/chatgptBridge/crypto.js';

const url = new URL(process.env.CHATGPT_BRIDGE_TEST_DATABASE_URL || '');
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname)); assert.equal(url.pathname, '/lab_resources_chatgpt_bridge_test');
process.env.DATABASE_URL = url.href;
const { createBridgeRequests } = await import('../src/chatgptBridge/requests.js');
const { prisma: toolDatabase } = await import('../src/db.js');
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
  assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_chatgpt_bridge_test');
  assert.ok((await prisma.user.findMany({ select: { email: true } })).every(row => row.email.endsWith('@bridge.test')));
  await prisma.chatgptBridgeGrant.updateMany({ where: { revokedAt: null }, data: { revokedAt: clock } });
  await prisma.chatgptBridgeRequest.updateMany({ where: { status: 'PENDING' }, data: { status: 'CANCELLED' } });
  await prisma.chatgptBridgeDelivery.updateMany({ where: { status: 'PENDING' }, data: { status: 'CANCELLED' } });
  const marker = randomUUID();
  const user = role => prisma.user.create({ data: { id: randomUUID(), email: `${role}-${randomUUID()}@bridge.test`, fullName: role, role, passwordHash: 'test-only-not-a-password' } });
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
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: { code: error.code || 'FAILED' } }));
  server = await new Promise(resolve => { const http = app.listen(0, '127.0.0.1', () => resolve(http)); }); origin = 'http://127.0.0.1:' + server.address().port;
});
test.after(async () => { await new Promise(resolve => server?.close(resolve)); await prisma.$disconnect(); await toolDatabase.$disconnect(); });

test('OAuth exact callback, audience, S256 and administrator consent fail closed', async () => {
  await assert.rejects(oauth.register({ redirect_uris: ['https://attacker.example/callback'] }));
  const pending = await authorize();
  await assert.rejects(oauth.inspectConsent(pending.ticket, alice), error => error.status === 403);
  await assert.rejects(oauth.consent(pending.ticket, owner, true));
  await assert.rejects(oauth.exchange({ grant_type: 'authorization_code', client_id: client.client_id, code: pending.code,
    redirect_uri: CHATGPT_STABLE_REDIRECT, resource: settings.resource, code_verifier: randomBytes(48).toString('base64url') }));
  const tokens = await exchange(pending.code); access = tokens.access_token;
  grant = (await oauth.authenticate(access)).grant;
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
  const tools = await rpc('tools/list'); assert.deepEqual(tools.body.result.tools.map(t => t.name).sort(), ['get_question_context', 'publish_question_reply', 'read_question_data']);
  const sub = await rpc('events/subscribe', { name: EVENT_NAME, arguments: {}, delivery: { mode: 'webhook', url: 'https://receiver.example/questions', secret: 'whsec_' + randomBytes(32).toString('base64') } });
  assert.ok(sub.body.result?.id, JSON.stringify(sub.body.error));
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
  assert.equal(listed.result.tools.length, 3);
});

test('durable request ownership, current business knowledge and read-only boundaries', async () => {
  await subscribe(); const job = await ask();
  await assert.rejects(requests.read(bob, job.id), error => error.status === 404);
  await assert.rejects(ask(), error => error.code === 'ASSISTANT_BUSY');
  const context = await requests.context(grant, job.id);
  assert.ok(context.businessKnowledge.topics.some(t => t.id === 'booking' && t.rules.includes('automatically')));
  assert.ok(context.tools.some(t => t.name === 'get_my_payment_status'));
  assert.ok(!JSON.stringify(context).includes(alice.email));
  await assert.rejects(requests.readTool(grant, { requestId: job.id, tool: 'get_monitoring_summary', input: {} }), error => error.code === 'BRIDGE_TOOL_NOT_ALLOWED');
  await assert.rejects(requests.readTool(grant, { requestId: job.id, tool: 'get_my_bookings', input: { userId: bob.id } }), error => error.code === 'VALIDATION_ERROR');
  await assert.rejects(requests.readTool(grant, { requestId: job.id, tool: 'get_my_payment_status', input: { bookingId: fixtureBooking.id } }), error => error.status === 404);
  const own = await requests.readTool(grant, { requestId: job.id, tool: 'get_my_bookings', input: {} });
  assert.ok(!JSON.stringify(own).includes('Private Bob'));
  await requests.cancel(alice, job.id);
  await assert.rejects(requests.reply(grant, { requestId: job.id, generation: grant.generation, answer: 'A test protocol response.' }), error => error.code === 'BRIDGE_REQUEST_INACTIVE');
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
  const renewed = await oauth.exchange(refresh); assert.ok(Boolean(renewed.access_token));
  await assert.rejects(oauth.exchange(refresh));
  await assert.rejects(oauth.authenticate(renewed.access_token));
  const authorizedAgain = await authorize(), fresh = await exchange(authorizedAgain.code);
  await prisma.user.update({ where: { id: owner.id }, data: { authVersion: { increment: 1 } } });
  await assert.rejects(oauth.authenticate(fresh.access_token), error => error.code === 'BRIDGE_CONNECTION_REVOKED');
});
