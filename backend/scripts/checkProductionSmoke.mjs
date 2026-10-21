import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

const { AbortSignal } = globalThis;

// Run against an isolated production-mode API behind its actual Nginx image.
// No business mutation; the only POST is sign-in to the seeded QA account.
const base = new URL(process.env.RELEASE_SMOKE_URL || 'http://127.0.0.1:25440');
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname));
assert.equal(base.port, '25440');
const email = process.env.RELEASE_SMOKE_EMAIL;
assert.ok(email?.endsWith('@production.qa.test'), 'Only a dedicated QA account is allowed');
assert.ok(process.env.RELEASE_SMOKE_PASSWORD);
let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; };
const get = path => fetch(new URL(path, base), { signal: AbortSignal.timeout(10000) });

for (const route of ['/', '/workspace/calendar']) {
  const response = await get(route);
  check(response.ok && response.headers.get('content-type')?.includes('text/html'), `${route}: SPA reachable`);
  check(response.headers.get('x-frame-options') === 'DENY', 'Frame protection');
  check(response.headers.get('x-content-type-options') === 'nosniff', 'MIME protection');
}
const missingAsset = await get('/assets/missing-release-qa.js');
check(missingAsset.status === 404, 'Missing static asset never returns SPA HTML');
const health = await get('/api/health/ready');
check(health.ok && (await health.json()).database === 'ready', 'Nginx -> production API -> PostgreSQL');
for (const route of ['/.well-known/oauth-authorization-server', '/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp/support-bridge']) {
  const response = await get(route);
  check(response.ok && response.headers.get('content-type')?.includes('application/json'), `${route}: protocol reaches backend`);
  check(response.headers.get('cache-control')?.includes('no-store'), 'OAuth metadata cache policy retained');
  const body = await response.json();
  check(body.issuer === 'https://lab.qa.invalid' || body.resource === 'https://lab.qa.invalid/mcp/support-bridge', 'Configured issuer/resource preserved');
}
const invalidToken = await fetch(new URL('/oauth/chatgpt/token', base), {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=invalid', signal: AbortSignal.timeout(10000)
});
check(invalidToken.status === 400 && invalidToken.headers.get('content-type')?.includes('application/json'), 'OAuth POST reaches protocol validation');
for (const route of ['/api/users', '/api/bookings', '/mcp']) {
  const response = await get(route);
  check(response.status === 401, `${route}: unauthenticated request denied through proxy`);
  check(response.headers.get('content-type')?.includes('application/json'), 'Denied protocol never becomes SPA success');
}
check((await get('/mcp/support-bridge')).status === 405, 'Bridge rejects unsupported GET');
const bridgePost = await fetch(new URL('/mcp/support-bridge', base), {
  method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
});
check(bridgePost.status === 401, 'Bridge POST requires OAuth credentials');
const deniedOrigin = await fetch(new URL('/api/health', base), { headers: { Origin: 'https://not-allowed.qa.invalid' } });
check(deniedOrigin.headers.get('access-control-allow-origin') !== 'https://not-allowed.qa.invalid', 'Unapproved CORS origin denied');
const login = await fetch(new URL('/api/auth/login', base), {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: process.env.RELEASE_SMOKE_PASSWORD }), signal: AbortSignal.timeout(10000)
});
check(login.ok, 'Production sign-in uses persisted credentials');
const session = await login.json();
check(session.user.role === 'ADMIN' && session.accessToken, 'Canonical persisted admin identity');
const users = await fetch(new URL('/api/users', base), { headers: { Authorization: `Bearer ${session.accessToken}` } });
check(users.ok, 'Authorized read through production proxy');
const rows = await users.json();
check(Array.isArray(rows) && rows.every(row => !('passwordHash' in row) && !('authVersion' in row)), 'User projection omits private credentials');
const start = performance.now();
const durations = await Promise.all(Array.from({ length: 20 }, async () => {
  const at = performance.now();
  const response = await get('/api/health/ready');
  check(response.ok && (await response.json()).database === 'ready', 'Concurrent readiness remains healthy');
  return performance.now() - at;
}));
durations.sort((a, b) => a - b);
console.log(JSON.stringify({ checks, concurrentReads: 20, durationMs: Math.round(performance.now() - start), p95Ms: Math.round(durations[18]), scope: 'isolated containers, not a capacity benchmark' }));
