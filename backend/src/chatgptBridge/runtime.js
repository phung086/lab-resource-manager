import { EventEmitter } from 'node:events';
import { prisma } from '../db.js';
import { settings } from './config.js';
import { createBridgeOAuth } from './oauth.js';
import { createBridgeRequests } from './requests.js';
import { createBridgeEvents } from './events.js';
import { buildBridgeMcp } from './mcp.js';

export const bridgeOAuth = createBridgeOAuth({ prisma, settings });
export const bridgeRequests = createBridgeRequests({ prisma, settings });
export const bridgeEvents = createBridgeEvents({ prisma, settings });
export const bridgeDeliverySignal = new EventEmitter();
export const bridgeMcp = buildBridgeMcp({ oauth: bridgeOAuth, requests: bridgeRequests, events: bridgeEvents, settings });
export const bridgeSettings = settings;

export async function bridgeConnectionStatus() {
  if (!settings.enabled) return { enabled: false, connected: false, mode: 'chatgpt_bridge' };
  const at = new Date();
  const grant = await prisma.chatgptBridgeGrant.findFirst({
    where: { revokedAt: null, expiresAt: { gt: at } },
    select: {
      ownerAuthVersion: true,
      owner: { select: { role: true, isActive: true, deletedAt: true, passwordResetRequired: true, authVersion: true } },
      subscriptions: { where: { status: 'VERIFIED', expiresAt: { gt: at } }, select: { id: true }, take: 1 }
    }
  });
  const connected = Boolean(grant && grant.subscriptions.length && grant.owner.role === 'ADMIN' &&
    grant.owner.isActive && !grant.owner.deletedAt && !grant.owner.passwordResetRequired && grant.owner.authVersion === grant.ownerAuthVersion);
  return { enabled: true, connected, mode: 'chatgpt_bridge' };
}
