// Isolated browser review, never the shared application database or runtime.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer, request } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

assert.notEqual(process.env.NODE_ENV, 'production');
const dbUrl = new URL(process.env.CHATGPT_BRIDGE_TEST_DATABASE_URL || '');
assert.ok(['localhost', '127.0.0.1'].includes(dbUrl.hostname));
assert.equal(dbUrl.pathname, '/lab_resources_chatgpt_bridge_test');
assert.equal(dbUrl.searchParams.get('schema') || 'public', 'public');
const publicOrigin = new URL(process.env.CHATGPT_BRIDGE_PUBLIC_ORIGIN || '');
assert.equal(publicOrigin.protocol, 'https:');
assert.equal(publicOrigin.origin + '/', publicOrigin.href);
const directory = fileURLToPath(new URL('../logs/chatgpt-bridge-review/', import.meta.url));
await mkdir(directory, { recursive: true });
// The runtime must not load an ignored checkout .env containing real secrets.
process.chdir(directory);
const secretFile = new URL('../logs/chatgpt-bridge-review/private-runtime.json', import.meta.url);
let privateConfig;
try { privateConfig = JSON.parse(await readFile(secretFile, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  privateConfig = { jwtSecret: randomBytes(48).toString('base64url'), bridgeKey: randomBytes(32).toString('base64') };
  await writeFile(secretFile, JSON.stringify(privateConfig), { mode: 0o600 });
}
Object.assign(process.env, {
  NODE_ENV: 'test', DATABASE_URL: dbUrl.href, JWT_SECRET: privateConfig.jwtSecret,
  CHATGPT_BRIDGE_ENABLED: 'true', CHATGPT_BRIDGE_SECRET_KEY: privateConfig.bridgeKey,
  CHATGPT_BRIDGE_UI_ORIGIN: 'http://127.0.0.1:5174',
  CORS_ORIGINS: 'http://127.0.0.1:5174', PORT: '8001', LOG_FORMAT: 'dev',
  MCP_ASSISTANT_ENABLED: 'true',
  // Optional isolated quote/pending-charge checks; no provider can transfer money.
  PAYMENTS_ENABLED: process.env.CHATGPT_BRIDGE_REVIEW_PRICING_ENABLED === 'true' ? 'true' : 'false',
  VNPAY_ENABLED: 'false',
  OPENAI_API_KEY: '', SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', EMAIL_ENABLED: 'false'
});
const db = new PrismaClient({ datasources: { db: { url: dbUrl.href } } });
assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, 'lab_resources_chatgpt_bridge_test');
assert.ok((await db.user.findMany({ select: { email: true } })).every(user => user.email.endsWith('@bridge.test')));
const passwordHash = await bcrypt.hash('BridgeReview-2026!Lab', 12);
for (const [role, email, fullName] of [
  ['ADMIN', 'review-admin@bridge.test', 'LAB Review Administrator'],
  ['CUSTOMER', 'review-customer@bridge.test', 'LAB Review Customer']
]) await db.user.upsert({ where: { email }, create: { id: randomUUID(), email, role, fullName, passwordHash, phone: '0900000001' },
  update: { isActive: true, deletedAt: null } });
await db.$disconnect();
const { createApp } = await import('../src/app.js');
const { prisma } = await import('../src/db.js');
const { bridgeEvents } = await import('../src/chatgptBridge/runtime.js');
const { startBridgeScheduler } = await import('../src/chatgptBridge/events.js');
const api = createApp().listen(8001, '127.0.0.1');
// Public tunnel forwards only OAuth/MCP, never test account or business APIs.
const allowedPaths = new Set(['/mcp/support-bridge', '/.well-known/oauth-authorization-server',
  '/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp/support-bridge',
  '/oauth/chatgpt/register', '/oauth/chatgpt/authorize', '/oauth/chatgpt/token', '/oauth/chatgpt/revoke']);
const gateway = createServer((incoming, outgoing) => {
  let path;
  try { path = new URL(incoming.url, 'http://127.0.0.1').pathname; } catch { outgoing.writeHead(400).end(); return; }
  if (!allowedPaths.has(path)) { outgoing.writeHead(404).end(); return; }
  const headers = { ...incoming.headers, host: '127.0.0.1:8001' };
  delete headers['x-forwarded-for']; delete headers.forwarded;
  const proxy = request({ hostname: '127.0.0.1', port: 8001, path: incoming.url, method: incoming.method,
    headers, timeout: 30000 }, response => {
    outgoing.writeHead(response.statusCode, response.headers); response.pipe(outgoing);
  });
  proxy.on('timeout', () => proxy.destroy());
  proxy.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(); });
  incoming.on('aborted', () => proxy.destroy()); incoming.pipe(proxy);
}).listen(8002, '127.0.0.1');
const stopBridge = startBridgeScheduler({ events: bridgeEvents, enabled: true });
console.log('Isolated bridge review: API 127.0.0.1:8001, OAuth/MCP gateway 127.0.0.1:8002.');
console.log('Only @bridge.test users and the dedicated bridge test database are used.');
let stopping = false;
async function shutdown() {
  if (stopping) return; stopping = true;
  await stopBridge();
  await Promise.all([new Promise(resolve => api.close(resolve)), new Promise(resolve => gateway.close(resolve))]);
  await prisma.$disconnect(); process.exit(0);
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
