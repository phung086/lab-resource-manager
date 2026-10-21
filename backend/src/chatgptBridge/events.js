import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { HttpError } from '../middleware/errors.js';
import { open, seal } from './crypto.js';
import { postWebhook, callbackUrl, signingKey, signedHeaders, equalChallenge, CallbackError } from './network.js';

export const EVENT_NAME = 'lab.assistant.question.created';
const args = z.object({}).strict();
const destination = z.object({ mode: z.literal('webhook'), url: z.string().max(2048) }).strict();
const subscribeSchema = z.object({ name: z.literal(EVENT_NAME), arguments: args,
  delivery: destination.extend({ secret: z.string().max(128) }), cursor: z.null().optional(),
  ttlMs: z.number().int().positive().max(30 * 86400000).nullable().optional() }).strict();
const unsubscribeSchema = z.object({ name: z.literal(EVENT_NAME), arguments: args, delivery: destination }).strict();
export const eventDefinitions = [{ name: EVENT_NAME,
  description: 'A signed-in customer submitted a LAB support question. Retrieve context using its requestId before publishing an answer.',
  delivery: ['webhook'], inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  payloadSchema: { type: 'object', properties: { requestId: { type: 'string', format: 'uuid' } }, required: ['requestId'], additionalProperties: false } }];

const locks = async tx => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('lrm-account-security'))`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('chatgpt-bridge:connection'))`;
};
const idFor = (grant, url) => 'sub_' + createHash('sha256').update(JSON.stringify([grant.id, url, EVENT_NAME, {}])).digest('hex').slice(0, 48);
const activeOwner = (grant, at) => grant && !grant.revokedAt && grant.expiresAt > at && grant.owner?.isActive &&
  !grant.owner.deletedAt && !grant.owner.passwordResetRequired && grant.owner.role === 'ADMIN' && grant.owner.authVersion === grant.ownerAuthVersion;

export function createBridgeEvents({ prisma, settings, sendWebhook = postWebhook, now = () => new Date() }) {
  async function currentGrant(tx, identity) {
    const row = await tx.chatgptBridgeGrant.findUnique({ where: { id: identity.id }, include: { owner: true } });
    if (!activeOwner(row, now()) || row.audience !== settings.resource || row.generation !== identity.generation || !row.scope.split(' ').includes('lab.assistant.events'))
      throw new HttpError(403, 'BRIDGE_CONNECTION_REVOKED', undefined, 'BRIDGE_CONNECTION_REVOKED');
    return row;
  }
  const list = async (grant, params = {}) => {
    z.object({ cursor: z.string().optional() }).strict().parse(params);
    await currentGrant(prisma, grant);
    return { events: eventDefinitions };
  };
  async function subscribe(identity, raw) {
    const data = subscribeSchema.parse(raw), url = callbackUrl(data.delivery.url).href;
    signingKey(data.delivery.secret);
    const grant = await currentGrant(prisma, identity), id = idFor(grant, url);
    const challenge = randomUUID(), verificationId = 'verification_' + randomUUID();
    const body = JSON.stringify({ type: 'verification', challenge });
    let response;
    try {
      response = await sendWebhook(url, { body,
        headers: { ...signedHeaders(data.delivery.secret, verificationId, body), 'X-MCP-Subscription-Id': id } });
      let decoded;
      try { decoded = JSON.parse(response.body); } catch { throw new CallbackError('challenge_failed'); }
      if (!response.ok || !equalChallenge(challenge, decoded?.challenge)) throw new CallbackError('challenge_failed');
    } catch (error) { throw new CallbackError(error instanceof CallbackError ? error.reason : 'connection_failed'); }
    const ttl = Math.min(data.ttlMs ?? settings.subscriptionTtlMs, settings.subscriptionTtlMs);
    const expiresAt = new Date(Math.min(now().getTime() + Math.max(60000, ttl), grant.expiresAt.getTime()));
    await prisma.$transaction(async tx => {
      await locks(tx); await currentGrant(tx, identity);
      await tx.$queryRaw`SELECT id FROM chatgpt_bridge_grants WHERE id=${identity.id} FOR UPDATE`;
      const previous = await tx.chatgptBridgeSubscription.findUnique({ where: { id } });
      const oldSecret = previous?.status === 'VERIFIED' ? open(previous.secretCipher, settings.secretKey, id) : null;
      const rotating = oldSecret && oldSecret !== data.delivery.secret;
      const value = { grantId: grant.id, eventType: EVENT_NAME, webhookId: id, callbackUrl: url,
        secretCipher: seal(data.delivery.secret, settings.secretKey, id), arguments: {}, status: 'VERIFIED',
        verifiedAt: now(), expiresAt,
        oldSecretCipher: rotating ? previous.secretCipher : previous?.oldSecretUntil > now() ? previous.oldSecretCipher : null,
        oldSecretUntil: rotating ? new Date(now().getTime() + 120000) : previous?.oldSecretUntil > now() ? previous.oldSecretUntil : null };
      // One consumer at a time avoids replies competing from multiple Work chats.
      await tx.chatgptBridgeSubscription.updateMany({ where: { grantId: grant.id, id: { not: id }, status: 'VERIFIED' }, data: { status: 'REVOKED' } });
      await tx.chatgptBridgeSubscription.upsert({ where: { id }, create: { id, ...value }, update: value });
    });
    return { id, refreshBefore: expiresAt.toISOString(), cursor: null, truncated: false };
  }
  async function unsubscribe(identity, raw) {
    const data = unsubscribeSchema.parse(raw), id = idFor(identity, callbackUrl(data.delivery.url).href);
    await prisma.$transaction(async tx => {
      await locks(tx); await currentGrant(tx, identity);
      await tx.chatgptBridgeSubscription.updateMany({ where: { id, grantId: identity.id }, data: { status: 'REVOKED' } });
      await tx.chatgptBridgeDelivery.updateMany({ where: { subscriptionId: id, status: 'PENDING' }, data: { status: 'CANCELLED', leaseToken: null, leaseUntil: null } });
    });
    return {};
  }
  async function dispatchOne() {
    const at = now(), leaseToken = randomUUID();
    const claimed = await prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw`SELECT id FROM chatgpt_bridge_deliveries WHERE status='PENDING' AND "nextAttemptAt" <= ${at}
        AND ("leaseUntil" IS NULL OR "leaseUntil" < ${at}) ORDER BY "nextAttemptAt",id FOR UPDATE SKIP LOCKED LIMIT 1`;
      if (!rows.length) return null;
      return tx.chatgptBridgeDelivery.update({ where: { id: rows[0].id }, data: { leaseToken, leaseUntil: new Date(at.getTime() + 20000) },
        include: { subscription: { include: { grant: { include: { owner: true } } } }, request: { include: { customer: true } } } });
    });
    if (!claimed) return false;
    const sub = claimed.subscription, job = claimed.request;
    const valid = sub.status === 'VERIFIED' && sub.expiresAt > at && activeOwner(sub.grant, at) &&
      job.status === 'PENDING' && job.expiresAt > at && job.generation === sub.grant.generation &&
      job.customer.isActive && !job.customer.deletedAt && !job.customer.passwordResetRequired &&
      job.customer.role === (job.context?.actorRole || 'CUSTOMER') && job.customer.authVersion === job.customerAuthVersion;
    const finish = data => prisma.chatgptBridgeDelivery.updateMany({ where: { id: claimed.id, leaseToken, status: 'PENDING' },
      data: { ...data, leaseToken: null, leaseUntil: null } });
    if (!valid) { await finish({ status: 'CANCELLED' }); return true; }
    const body = JSON.stringify({ eventId: claimed.eventId, name: EVENT_NAME, timestamp: job.createdAt.toISOString(), data: { requestId: job.id }, cursor: null });
    let status, lastError;
    try {
      const secret = open(sub.secretCipher, settings.secretKey, sub.id);
      const oldSecret = sub.oldSecretUntil > at ? open(sub.oldSecretCipher, settings.secretKey, sub.id) : undefined;
      const response = await sendWebhook(sub.callbackUrl, { body,
        headers: { ...signedHeaders(secret, claimed.eventId, body, { oldSecret }), 'X-MCP-Subscription-Id': sub.id } });
      status = response.status;
      if (response.ok) { await finish({ status: 'DELIVERED', attempts: { increment: 1 }, lastError: null }); return true; }
      lastError = `HTTP_${Number.isInteger(status) ? status : 'ERROR'}`;
    } catch (error) { lastError = error instanceof CallbackError ? error.reason : 'connection_failed'; }
    const attempts = claimed.attempts + 1;
    const transient = !status || status === 408 || status === 429 || status >= 500;
    await finish({ attempts, lastError,
      status: transient && attempts < 5 && job.expiresAt.getTime() > now().getTime() + 5000 ? 'PENDING' : 'FAILED',
      nextAttemptAt: new Date(now().getTime() + Math.min(60000, 2000 * 2 ** (attempts - 1))) });
    if (status === 410) await prisma.chatgptBridgeSubscription.updateMany({ where: { id: sub.id }, data: { status: 'REVOKED' } });
    return true;
  }
  async function dispatchOnce() {
    if (!settings.enabled) return;
    await prisma.chatgptBridgeRequest.updateMany({ where: { status: 'PENDING', expiresAt: { lte: now() } }, data: { status: 'EXPIRED' } });
    for (let index = 0; index < 4; index++) if (!await dispatchOne()) break;
  }
  return { definitions: eventDefinitions, list, subscribe, unsubscribe, dispatchOnce };
}

export function startBridgeScheduler({ events, enabled, intervalMs = 500 }) {
  if (!enabled) return () => Promise.resolve();
  let running = null, stopped = false;
  const tick = () => {
    if (running || stopped) return;
    running = events.dispatchOnce().catch(() => { console.error('ChatGPT bridge delivery unavailable'); }).finally(() => { running = null; });
  };
  const timer = setInterval(tick, intervalMs); timer.unref(); tick();
  return () => { stopped = true; clearInterval(timer); return running || Promise.resolve(); };
}
