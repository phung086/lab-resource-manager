import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const database = new URL(process.env.SESSION_TEST_DATABASE_URL || 'http://missing');
assert.ok(['localhost', '127.0.0.1'].includes(database.hostname));
assert.equal(database.port, '25439');
assert.equal(database.pathname, '/lab_resources_sessions_test', 'Never write to business databases');
Object.assign(process.env, { DATABASE_URL: database.href, NODE_ENV: 'test', LOG_FORMAT: 'dev',
  JWT_SECRET: 'isolated-session-test-secret-with-at-least-32-characters', RATE_LIMIT_MAX: '10000',
  SMTP_HOST: '', SMTP_USER: '', EMAIL_AUTOMATION_ENABLED: 'false', REMINDER_SCHEDULER_ENABLED: 'false' });
const [{ createApp }, { prisma }, { signUserToken, verifyUserToken }, { config }] = await Promise.all([
  import('../src/app.js'), import('../src/db.js'), import('../src/services/authTokens.js'), import('../src/config.js')
]);
const { startAuthSessionCleanup } = await import('../src/services/authSessionCleanup.js');
const app = createApp(), users = {}, password = 'Isolated-session-2026!';
const auth = token => ({ Authorization: `Bearer ${token}` });
const get = (path, token) => request(app).get('/api' + path).set(auth(token));
const post = (path, token, body = {}) => request(app).post('/api' + path).set(auth(token)).send(body);
test.before(async () => {
  assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_sessions_test');
  const passwordHash = await bcrypt.hash(password, 12);
  for (const name of ['alice', 'bob']) users[name] = await prisma.user.create({ data: {
    id: randomUUID(), email: `${name}@session.test`, fullName: name, role: 'CUSTOMER', passwordHash
  } });
});
test.after(() => prisma.$disconnect());

test('login persists a revocable session with bounded JWT, cache protection and no raw token in storage', async () => {
  const result = await request(app).post('/api/auth/login').send({ email: users.alice.email, password });
  assert.equal(result.status, 200); assert.equal(result.headers['cache-control'], 'no-store');
  const claims = verifyUserToken(result.body.accessToken);
  assert.equal(claims.iss, config.jwtIssuer); assert.equal(claims.aud, config.jwtAudience);
  assert.ok(claims.exp - claims.iat <= 8 * 3600);
  const session = await prisma.authSession.findUniqueOrThrow({ where: { id: claims.sid } });
  assert.equal(session.userId, users.alice.id); assert.ok(+session.idleExpiresAt <= +session.expiresAt);
  assert.ok(!JSON.stringify(session).includes(result.body.accessToken));
  assert.equal((await get('/auth/session', result.body.accessToken)).status, 200);
});
test('wrong algorithm, issuer, audience, missing expiry/session and legacy tokens fail before database access', async () => {
  const claims = { sub: users.alice.id, sid: randomUUID(), authVersion: 0 };
  const valid = { issuer: config.jwtIssuer, audience: config.jwtAudience, expiresIn: 3600 };
  for (const [payload, options] of [[claims, { ...valid, algorithm: 'HS384' }], [claims, { ...valid, issuer: 'other' }],
    [claims, { ...valid, audience: 'other' }], [claims, { issuer: config.jwtIssuer, audience: config.jwtAudience }],
    [{ sub: users.alice.id }, { expiresIn: 3600 }]]) {
    const token = jwt.sign(payload, config.jwtSecret, options);
    assert.equal((await get('/auth/me', token)).status, 401);
  }
});
test('a caller transaction rollback also rolls back its newly issued session and account', async () => {
  const userId = randomUUID();
  await assert.rejects(prisma.$transaction(async tx => {
    const user = await tx.user.create({ data: { id: userId, email: 'rollback@session.test', role: 'CUSTOMER', passwordHash: 'test-only-unusable-hash' } });
    await signUserToken(user, { transaction: tx });
    assert.equal(await tx.authSession.count({ where: { userId } }), 1);
    throw new Error('Caller transaction aborted');
  }), /Caller transaction aborted/);
  assert.equal(await prisma.user.findUnique({ where: { id: userId } }), null);
  assert.equal(await prisma.authSession.count({ where: { userId } }), 0);
});
test('polling does not extend idle expiry; expired sessions cannot be revived by activity', async () => {
  const token = await signUserToken(users.alice), { sid } = verifyUserToken(token);
  const before = await prisma.authSession.findUniqueOrThrow({ where: { id: sid } });
  assert.equal((await get('/auth/me', token)).status, 200);
  assert.equal((await get('/notifications', token)).status, 200);
  const after = await prisma.authSession.findUniqueOrThrow({ where: { id: sid } });
  assert.equal(+before.idleExpiresAt, +after.idleExpiresAt);
  await prisma.authSession.update({ where: { id: sid }, data: { idleExpiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await get('/auth/me', token)).status, 401);
  assert.equal((await post('/auth/activity', token)).status, 401);
  assert.equal((await prisma.authSession.findUniqueOrThrow({ where: { id: sid } })).revokedAt, null);
});
test('explicit activity extends idle deadline but never the absolute deadline', async () => {
  const token = await signUserToken(users.alice), { sid } = verifyUserToken(token);
  const expiresAt = new Date(Date.now() + 60000);
  await prisma.authSession.update({ where: { id: sid }, data: { expiresAt, idleExpiresAt: new Date(Date.now() + 10000) } });
  const result = await post('/auth/activity', token); assert.equal(result.status, 200);
  assert.equal(Date.parse(result.body.expiresAt), +expiresAt); assert.equal(Date.parse(result.body.idleExpiresAt), +expiresAt);
  assert.equal((await post('/auth/activity', token, { userId: users.bob.id })).status, 400);
});
test('logout revokes only its session, including copied tokens and across a new app instance', async () => {
  const first = await signUserToken(users.alice), second = await signUserToken(users.alice);
  assert.equal((await post('/auth/logout', first)).status, 204);
  assert.equal((await get('/auth/me', first)).status, 401);
  assert.equal((await get('/auth/me', second)).status, 200);
  assert.equal((await request(createApp()).get('/api/auth/me').set(auth(first))).status, 401);
  assert.equal((await post('/auth/activity', first)).status, 401);
});
test('logout-all invalidates every prior credential, keeps another account valid and rejects stale login snapshots', async () => {
  const first = await signUserToken(users.alice), second = await signUserToken(users.alice), bob = await signUserToken(users.bob);
  assert.equal((await post('/auth/logout-all', first)).status, 204);
  for (const token of [first, second]) assert.equal((await get('/auth/me', token)).status, 401);
  assert.equal((await get('/auth/me', bob)).status, 200);
  await assert.rejects(signUserToken(users.alice), error => error.code === 'AUTH_INVALID');
  users.alice = await prisma.user.findUniqueOrThrow({ where: { id: users.alice.id } });
  assert.equal((await get('/auth/me', await signUserToken(users.alice))).status, 200);
});
test('session identity cannot be transplanted between users; expired absolute deadline denies requests', async () => {
  const token = await signUserToken(users.bob), { sid } = verifyUserToken(token);
  const forged = jwt.sign({ sub: users.alice.id, sid, authVersion: users.alice.authVersion }, config.jwtSecret,
    { issuer: config.jwtIssuer, audience: config.jwtAudience, expiresIn: 3600 });
  assert.equal((await get('/auth/me', forged)).status, 401);
  const now = Date.now();
  await prisma.authSession.update({ where: { id: sid }, data: { createdAt: new Date(now - 10000), expiresAt: new Date(now - 1000), idleExpiresAt: new Date(now - 1000) } });
  assert.equal((await post('/auth/activity', token)).status, 401);
  const cleanup = startAuthSessionCleanup(prisma); await cleanup();
  assert.equal(await prisma.authSession.findUnique({ where: { id: sid } }), null);
  assert.ok(await prisma.authSession.count({ where: { userId: users.alice.id, expiresAt: { gt: new Date() } } }));
});
