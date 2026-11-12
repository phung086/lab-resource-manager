import { HttpError } from '../middleware/errors.js';
import { CANONICAL_ROLES } from '../constants/roles.js';

export const bridgeError = (status, code) => new HttpError(status, code, undefined, code);
export const activeUser = (user, role, version) => Boolean(user?.isActive && !user.deletedAt &&
  !user.passwordResetRequired && user.role === role && user.authVersion === version);
export const requestRole = job => job.context?.actorRole || 'CUSTOMER';
export const activeRequester = job => CANONICAL_ROLES.includes(requestRole(job)) && activeUser(job.customer, requestRole(job), job.customerAuthVersion);
export const bridgeLocks = async tx => {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('lrm-account-security'))::text`;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('chatgpt-bridge:connection'))::text`;
};
export async function assertGrant(tx, identity, settings, at, scope) {
  const grant = await tx.chatgptBridgeGrant.findUnique({ where: { id: identity.id }, include: { owner: true } });
  if (!grant || grant.revokedAt || grant.expiresAt <= at || grant.generation !== identity.generation ||
      grant.audience !== settings.resource || !activeUser(grant.owner, 'ADMIN', grant.ownerAuthVersion) ||
      (scope && !grant.scope.split(' ').includes(scope))) throw bridgeError(403, 'BRIDGE_CONNECTION_REVOKED');
  return grant;
}
export async function revokeConnection(tx, grantId, at) {
  await tx.chatgptBridgeGrant.updateMany({ where: { id: grantId, revokedAt: null }, data: { revokedAt: at } });
  await tx.chatgptBridgeToken.updateMany({ where: { grantId, revokedAt: null }, data: { revokedAt: at } });
  await tx.chatgptBridgeSubscription.updateMany({ where: { grantId }, data: { status: 'REVOKED' } });
  await tx.chatgptBridgeRequest.updateMany({ where: { grantId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
  await tx.chatgptBridgeDelivery.updateMany({ where: { request: { grantId }, status: 'PENDING' },
    data: { status: 'CANCELLED', leaseToken: null, leaseUntil: null } });
}
