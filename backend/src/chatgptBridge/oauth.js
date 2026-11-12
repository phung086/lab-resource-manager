import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { hashToken, newOpaque, pkceChallenge, equalSecret } from './crypto.js';
import { activeUser, assertGrant, bridgeLocks, bridgeError, revokeConnection } from './access.js';
import { recordSystemAuditEvent } from '../services/systemAuditService.js';

const opaque = z.string().min(32).max(256).regex(/^[A-Za-z0-9_-]+$/);
const clientId = z.string().min(1).max(128);
const registration = z.object({ client_name: z.string().trim().min(1).max(80).optional(),
  redirect_uris: z.array(z.string().max(1024)).min(1).max(8), token_endpoint_auth_method: z.literal('none').optional(),
  grant_types: z.array(z.enum(['authorization_code', 'refresh_token'])).optional(),
  response_types: z.array(z.literal('code')).optional(), scope: z.string().max(200).optional() }).strict();
// RFC 6749 sections 3.1/3.2 require unknown request parameters to be ignored.
// Strip extensions rather than persist or forward them; known security fields
// still require their exact types and the checks below.
const authorization = z.object({ response_type: z.literal('code'), client_id: clientId, redirect_uri: z.string().max(1024),
  state: z.string().min(8).max(1024), code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  code_challenge_method: z.literal('S256'), resource: z.string().max(2048), scope: z.string().max(200) }).strip();
const codeExchange = z.object({ grant_type: z.literal('authorization_code'), client_id: clientId,
  code: opaque, redirect_uri: z.string().max(1024), resource: z.string().max(2048),
  code_verifier: z.string().min(43).max(128).regex(/^[A-Za-z0-9._~-]+$/) }).strip();
const refreshExchange = z.object({ grant_type: z.literal('refresh_token'), client_id: clientId,
  refresh_token: opaque, resource: z.string().max(2048), scope: z.string().max(200).optional() }).strip();
const oauthError = (error = 'invalid_grant') => Object.assign(bridgeError(400, 'BRIDGE_OAUTH_INVALID'), { oauthError: error });

export function createBridgeOAuth({ prisma, settings, now = () => new Date() }) {
  const enabled = () => { if (!settings.enabled) throw bridgeError(503, 'BRIDGE_UNAVAILABLE'); };
  const scopeValue = value => {
    const scopes = [...new Set(String(value || '').split(' ').filter(Boolean))].sort();
    if (scopes.join(' ') !== [...settings.scopes].sort().join(' ')) throw oauthError('invalid_scope');
    return scopes.join(' ');
  };
  const admin = async (tx, actor) => {
    const user = await tx.user.findUnique({ where: { id: actor.id } });
    if (!activeUser(user, 'ADMIN', actor.authVersion)) throw bridgeError(403, 'FORBIDDEN');
    return user;
  };
  const audit = (tx, actor, action, targetId) => recordSystemAuditEvent(tx, {
    actor, action, targetType: 'CHATGPT_CONNECTION', targetId, metadata: { audience: settings.resource } });

  function metadata() {
    enabled(); return { issuer: settings.issuer, authorization_endpoint: `${settings.issuer}/oauth/chatgpt/authorize`,
      token_endpoint: `${settings.issuer}/oauth/chatgpt/token`, registration_endpoint: `${settings.issuer}/oauth/chatgpt/register`,
      revocation_endpoint: `${settings.issuer}/oauth/chatgpt/revoke`, response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'], token_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'], scopes_supported: settings.scopes,
      authorization_response_iss_parameter_supported: true };
  }
  function resourceMetadata() {
    enabled(); return { resource: settings.resource, authorization_servers: [settings.issuer],
      scopes_supported: settings.scopes, bearer_methods_supported: ['header'], resource_name: 'LAB customer support' };
  }
  async function register(raw) {
    enabled(); const input = registration.parse(raw);
    if (input.redirect_uris.some(uri => !settings.redirectUris.includes(uri))) throw oauthError('invalid_client_metadata');
    if (input.scope) scopeValue(input.scope);
    if (await prisma.chatgptBridgeClient.count() >= 1000) throw bridgeError(429, 'BRIDGE_REGISTRATION_LIMIT');
    const id = 'lab_' + newOpaque();
    await prisma.chatgptBridgeClient.create({ data: { id, name: input.client_name || 'ChatGPT', redirectUris: input.redirect_uris } });
    return { client_id: id, client_id_issued_at: Math.floor(now().getTime() / 1000), client_name: input.client_name || 'ChatGPT',
      redirect_uris: input.redirect_uris, token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope: settings.scopes.join(' ') };
  }
  async function beginAuthorization(raw) {
    enabled(); const input = authorization.parse(raw), scope = scopeValue(input.scope);
    const client = await prisma.chatgptBridgeClient.findUnique({ where: { id: input.client_id } });
    if (!client || !client.redirectUris.includes(input.redirect_uri) || !settings.redirectUris.includes(input.redirect_uri) ||
        input.resource !== settings.resource) throw oauthError('invalid_request');
    const ticket = newOpaque();
    await prisma.chatgptBridgeCode.create({ data: { id: randomUUID(), ticketHash: hashToken(ticket), clientId: client.id,
      redirectUri: input.redirect_uri, state: input.state, codeChallenge: input.code_challenge, audience: input.resource,
      scope, expiresAt: new Date(now().getTime() + settings.consentTtlMs) } });
    return `${settings.uiOrigin}/workspace/chatgpt-bridge?ticket=${encodeURIComponent(ticket)}`;
  }
  async function ticketFor(tx, ticket) {
    opaque.parse(ticket);
    const row = await tx.chatgptBridgeCode.findUnique({ where: { ticketHash: hashToken(ticket) }, include: { client: true } });
    if (!row || row.consentedAt || row.consumedAt || row.expiresAt <= now()) throw oauthError();
    return row;
  }
  async function inspectConsent(ticket, actor) {
    enabled(); await admin(prisma, actor); const row = await ticketFor(prisma, ticket);
    return { clientName: row.client.name, scopes: row.scope.split(' '), expiresAt: row.expiresAt.toISOString(),
      replacesConnection: Boolean(await prisma.chatgptBridgeGrant.findFirst({ where: { revokedAt: null, expiresAt: { gt: now() } } })) };
  }
  async function consent(ticket, actor, approved) {
    enabled(); if (typeof approved !== 'boolean') throw oauthError('invalid_request');
    return prisma.$transaction(async tx => {
      await bridgeLocks(tx); const user = await admin(tx, actor), row = await ticketFor(tx, ticket);
      const redirect = new URL(row.redirectUri); redirect.searchParams.set('state', row.state); redirect.searchParams.set('iss', settings.issuer);
      await tx.chatgptBridgeCode.update({ where: { id: row.id }, data: { consentedAt: now() } });
      if (!approved) { redirect.searchParams.set('error', 'access_denied'); return { redirectUrl: redirect.href }; }
      const previous = await tx.chatgptBridgeGrant.findMany({ where: { revokedAt: null }, select: { id: true } });
      for (const item of previous) { await revokeConnection(tx, item.id, now()); await audit(tx, user, 'CHATGPT_CONNECTION_REVOKED', item.id); }
      const grant = await tx.chatgptBridgeGrant.create({ data: { id: randomUUID(), ownerId: user.id,
        ownerAuthVersion: user.authVersion, clientId: row.clientId, generation: randomUUID(), audience: row.audience,
        scope: row.scope, expiresAt: new Date(now().getTime() + settings.grantTtlMs) } });
      const code = newOpaque();
      await tx.chatgptBridgeCode.update({ where: { id: row.id }, data: { grantId: grant.id, codeHash: hashToken(code) } });
      await audit(tx, user, 'CHATGPT_CONNECTION_AUTHORIZED', grant.id);
      redirect.searchParams.set('code', code); return { redirectUrl: redirect.href };
    });
  }
  async function mint(tx, grant) {
    const access = newOpaque(), refresh = newOpaque(), at = now();
    for (const [type, token, ttl] of [['ACCESS', access, settings.accessTtlMs], ['REFRESH', refresh, settings.refreshTtlMs]]) {
      await tx.chatgptBridgeToken.create({ data: { id: randomUUID(), tokenHash: hashToken(token), type,
        grantId: grant.id, clientId: grant.clientId, audience: grant.audience, scope: grant.scope,
        expiresAt: new Date(Math.min(at.getTime() + ttl, grant.expiresAt.getTime())) } });
    }
    return { access_token: access, token_type: 'Bearer', refresh_token: refresh,
      expires_in: Math.floor(Math.min(settings.accessTtlMs, grant.expiresAt - at) / 1000), scope: grant.scope };
  }
  async function exchange(raw) {
    enabled(); const input = raw?.grant_type === 'refresh_token' ? refreshExchange.parse(raw) : codeExchange.parse(raw);
    if (input.resource !== settings.resource) throw oauthError('invalid_target');
    if (input.scope) scopeValue(input.scope);
    const result = await prisma.$transaction(async tx => {
      await bridgeLocks(tx);
      if (input.grant_type === 'authorization_code') {
        const row = await tx.chatgptBridgeCode.findUnique({ where: { codeHash: hashToken(input.code) } });
        if (!row?.grantId || !row.consentedAt || row.consumedAt || row.expiresAt <= now() || row.clientId !== input.client_id ||
            row.redirectUri !== input.redirect_uri || row.audience !== input.resource ||
            !equalSecret(row.codeChallenge, pkceChallenge(input.code_verifier))) throw oauthError();
        const grant = await tx.chatgptBridgeGrant.findUnique({ where: { id: row.grantId } });
        await assertGrant(tx, grant, settings, now());
        await tx.chatgptBridgeCode.update({ where: { id: row.id }, data: { consumedAt: now() } });
        return mint(tx, grant);
      }
      const token = await tx.chatgptBridgeToken.findUnique({ where: { tokenHash: hashToken(input.refresh_token) }, include: { grant: true } });
      if (!token || token.type !== 'REFRESH' || token.clientId !== input.client_id || token.audience !== input.resource) throw oauthError();
      if (token.consumedAt) { await revokeConnection(tx, token.grantId, now()); return { replay: true }; }
      if (token.revokedAt || token.expiresAt <= now()) throw oauthError();
      await assertGrant(tx, token.grant, settings, now());
      await tx.chatgptBridgeToken.update({ where: { id: token.id }, data: { consumedAt: now() } });
      return mint(tx, token.grant);
    });
    if (result.replay) throw oauthError();
    return result;
  }
  async function authenticate(value) {
    enabled(); if (!opaque.safeParse(value).success) throw bridgeError(401, 'AUTH_INVALID');
    const token = await prisma.chatgptBridgeToken.findUnique({ where: { tokenHash: hashToken(value) }, include: { grant: true } });
    if (!token || token.type !== 'ACCESS' || token.revokedAt || token.expiresAt <= now() || token.audience !== settings.resource ||
        token.clientId !== token.grant.clientId || token.scope !== token.grant.scope) throw bridgeError(401, 'AUTH_INVALID');
    const grant = await assertGrant(prisma, token.grant, settings, now());
    return { grant, scopes: token.scope.split(' ') };
  }
  async function revokeToken(raw) {
    enabled(); const input = z.object({ token: opaque, client_id: clientId, token_type_hint: z.enum(['access_token', 'refresh_token']).optional() }).strict().parse(raw);
    await prisma.$transaction(async tx => {
      await bridgeLocks(tx); const token = await tx.chatgptBridgeToken.findUnique({ where: { tokenHash: hashToken(input.token) } });
      if (token?.clientId === input.client_id) await revokeConnection(tx, token.grantId, now());
    });
  }
  async function listConnections(actor) {
    if (!settings.enabled) return { enabled: false, authorized: false, connected: false, connections: [] };
    await admin(prisma, actor);
    const rows = await prisma.chatgptBridgeGrant.findMany({ where: { revokedAt: null, expiresAt: { gt: now() } },
      include: { owner: true, client: true, subscriptions: { where: { status: 'VERIFIED', expiresAt: { gt: now() } } } } });
    return { enabled: true, publicUrl: settings.resource, authorized: rows.some(g => activeUser(g.owner, 'ADMIN', g.ownerAuthVersion)),
      connected: rows.some(g => activeUser(g.owner, 'ADMIN', g.ownerAuthVersion) && g.subscriptions.length),
      connections: rows.map(g => ({ id: g.id, clientName: g.client.name, createdAt: g.createdAt.toISOString(),
        expiresAt: g.expiresAt.toISOString(), subscriptionCount: activeUser(g.owner, 'ADMIN', g.ownerAuthVersion) ? g.subscriptions.length : 0 })) };
  }
  async function revokeGrant(id, actor) {
    enabled(); z.string().uuid().parse(id);
    await prisma.$transaction(async tx => {
      await bridgeLocks(tx); const user = await admin(tx, actor);
      const existing = await tx.chatgptBridgeGrant.findUnique({ where: { id } });
      if (!existing) throw bridgeError(404, 'NOT_FOUND');
      if (existing.revokedAt) return;
      await revokeConnection(tx, id, now()); await audit(tx, user, 'CHATGPT_CONNECTION_REVOKED', id);
    });
  }
  return { metadata, resourceMetadata, register, beginAuthorization, inspectConsent, consent, exchange, authenticate, revokeToken, listConnections, revokeGrant };
}
