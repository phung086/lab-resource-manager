import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { createBridgeEvents, EVENT_NAME } from '../src/chatgptBridge/events.js';
import { buildBridgeConfig } from '../src/chatgptBridge/config.js';
import { open } from '../src/chatgptBridge/crypto.js';

const url = new URL(process.env.CHATGPT_BRIDGE_TEST_DATABASE_URL || '');
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname)); assert.equal(url.pathname, '/lab_resources_chatgpt_bridge_test');
const prisma = new PrismaClient({ datasources: { db: { url: url.href } } });
const settings = buildBridgeConfig({ NODE_ENV: 'test', CHATGPT_BRIDGE_ENABLED: 'true', CHATGPT_BRIDGE_PUBLIC_ORIGIN: 'https://lab.example',
  CHATGPT_BRIDGE_SECRET_KEY: randomBytes(32).toString('base64') });
const secret = 'whsec_' + randomBytes(32).toString('base64');
const marker = randomUUID(); let grant, customer, subscriptionId, clock = new Date();
let deliveries = [], responseStatus = 200, verificationGood = true;
const events = createBridgeEvents({ prisma, settings, now: () => clock, sendWebhook: async (_url, request) => {
  const data = JSON.parse(request.body);
  if (data.type === 'verification') return { status: 200, ok: true, body: JSON.stringify({ challenge: verificationGood ? data.challenge : 'wrong' }) };
  deliveries.push({ ...data, headers: request.headers, bytes: request.body });
  return { status: responseStatus, ok: responseStatus >= 200 && responseStatus < 300, body: '{}' };
} });
const subscribe = () => events.subscribe(grant, { name: EVENT_NAME, arguments: {}, delivery: { mode: 'webhook', url: 'https://receiver.example/callback', secret }, cursor: null });

test.before(async () => {
  assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_chatgpt_bridge_test');
  assert.ok((await prisma.user.findMany({ select: { email: true } })).every(row => row.email.endsWith('@bridge.test')));
  // Expire/revoke only previous fixtures in this dedicated database; no reset or
  // delete of business records, and no fabricated GPT/provider reply.
  await prisma.chatgptBridgeGrant.updateMany({ where: { revokedAt: null }, data: { revokedAt: clock } });
  await prisma.chatgptBridgeRequest.updateMany({ where: { status: 'PENDING' }, data: { status: 'CANCELLED' } });
  await prisma.chatgptBridgeDelivery.updateMany({ where: { status: 'PENDING' }, data: { status: 'CANCELLED' } });
  const owner = await prisma.user.create({ data: { id: randomUUID(), email: `events-admin-${marker}@bridge.test`, fullName: 'Events Admin', role: 'ADMIN', passwordHash: 'test-only-not-a-password' } });
  customer = await prisma.user.create({ data: { id: randomUUID(), email: `events-customer-${marker}@bridge.test`, fullName: 'Events Customer', role: 'CUSTOMER', passwordHash: 'test-only-not-a-password' } });
  const client = await prisma.chatgptBridgeClient.create({ data: { id: randomUUID(), name: 'Events Fixture', redirectUris: ['https://chatgpt.com/connector_platform_oauth_redirect'] } });
  grant = await prisma.chatgptBridgeGrant.create({ data: { id: randomUUID(), ownerId: owner.id, ownerAuthVersion: owner.authVersion,
    clientId: client.id, audience: settings.resource, generation: randomUUID(), scope: settings.scopes.join(' '), expiresAt: new Date(clock.getTime() + 86400000) } });
});
test.after(() => prisma.$disconnect());

test('callback challenge must succeed before durable subscription activates', async () => {
  verificationGood = false;
  await assert.rejects(subscribe(), error => error.reason === 'challenge_failed');
  assert.equal(await prisma.chatgptBridgeSubscription.count({ where: { grantId: grant.id } }), 0);
  verificationGood = true; const result = await subscribe(); subscriptionId = result.id;
  const row = await prisma.chatgptBridgeSubscription.findUniqueOrThrow({ where: { id: subscriptionId } });
  assert.equal(row.status, 'VERIFIED'); assert.equal(open(row.secretCipher, settings.secretKey, row.id), secret);
  assert.ok(!row.secretCipher.includes(secret)); assert.equal(result.cursor, null);
  assert.equal((await subscribe()).id, subscriptionId);
  assert.equal(await prisma.chatgptBridgeSubscription.count({ where: { grantId: grant.id } }), 1);
});

async function job() {
  await prisma.chatgptBridgeRequest.updateMany({ where: { customerId: customer.id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
  const request = await prisma.chatgptBridgeRequest.create({ data: { id: randomUUID(), customerId: customer.id,
    customerAuthVersion: customer.authVersion, grantId: grant.id, generation: grant.generation, conversationId: randomUUID(),
    message: 'Which room can I book?', expiresAt: new Date(clock.getTime() + 600000) } });
  const delivery = await prisma.chatgptBridgeDelivery.create({ data: { id: randomUUID(), requestId: request.id, subscriptionId,
    eventId: 'evt_' + randomUUID(), nextAttemptAt: clock } });
  return { request, delivery };
}

test('receipt acknowledgement leaves the customer request pending; transient retries keep event identity', async () => {
  const value = await job(); deliveries = []; responseStatus = 503;
  await events.dispatchOnce();
  const first = await prisma.chatgptBridgeDelivery.findUniqueOrThrow({ where: { id: value.delivery.id } });
  assert.equal(first.status, 'PENDING'); assert.equal(first.attempts, 1); assert.equal(first.leaseToken, null);
  clock = new Date(clock.getTime() + 3000); responseStatus = 202; await events.dispatchOnce();
  const saved = await prisma.chatgptBridgeDelivery.findUniqueOrThrow({ where: { id: value.delivery.id } });
  assert.equal(saved.status, 'DELIVERED'); assert.equal(deliveries.length, 2);
  assert.equal(deliveries[0].eventId, deliveries[1].eventId);
  assert.deepEqual(deliveries[0].data, { requestId: value.request.id });
  assert.equal(deliveries[0].headers['webhook-id'], deliveries[0].eventId);
  assert.equal((await prisma.chatgptBridgeRequest.findUniqueOrThrow({ where: { id: value.request.id } })).status, 'PENDING');
});

test('parallel workers claim one delivery; permanent rejection is not retried', async () => {
  const value = await job(); deliveries = []; responseStatus = 413;
  await Promise.all([events.dispatchOnce(), events.dispatchOnce()]);
  const row = await prisma.chatgptBridgeDelivery.findUniqueOrThrow({ where: { id: value.delivery.id } });
  assert.equal(deliveries.length, 1); assert.equal(row.status, 'FAILED'); assert.equal(row.attempts, 1);
  clock = new Date(clock.getTime() + 60000); await events.dispatchOnce(); assert.equal(deliveries.length, 1);
});

test('cancelled/expired requests and changed credentials never emit a new event', async () => {
  const value = await job(); deliveries = [];
  await prisma.user.update({ where: { id: customer.id }, data: { authVersion: { increment: 1 } } });
  await events.dispatchOnce(); assert.equal(deliveries.length, 0);
  assert.equal((await prisma.chatgptBridgeDelivery.findUniqueOrThrow({ where: { id: value.delivery.id } })).status, 'CANCELLED');
  const next = await job(); await prisma.chatgptBridgeRequest.update({ where: { id: next.request.id }, data: { expiresAt: new Date(clock.getTime() - 1) } });
  await events.dispatchOnce(); assert.equal(deliveries.length, 0);
  assert.equal((await prisma.chatgptBridgeRequest.findUniqueOrThrow({ where: { id: next.request.id } })).status, 'EXPIRED');
});

test('unsubscribe and owner revocation stop access and delivery', async () => {
  await events.unsubscribe(grant, { name: EVENT_NAME, arguments: {}, delivery: { mode: 'webhook', url: 'https://receiver.example/callback' } });
  await events.unsubscribe(grant, { name: EVENT_NAME, arguments: {}, delivery: { mode: 'webhook', url: 'https://receiver.example/callback' } });
  assert.equal((await prisma.chatgptBridgeSubscription.findUniqueOrThrow({ where: { id: subscriptionId } })).status, 'REVOKED');
  await prisma.chatgptBridgeGrant.update({ where: { id: grant.id }, data: { revokedAt: clock } });
  await assert.rejects(events.list(grant), error => error.code === 'BRIDGE_CONNECTION_REVOKED');
});
