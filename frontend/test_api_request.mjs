import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { apiRequest, ApiError } from './src/api.js';
import { loadLocale, activateLocale, translate } from './src/i18n.js';

const original = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, window: globalThis.window };
const stored = new Map([['lrm_token', 'unit-session']]), events = [];
test.before(async () => {
  globalThis.localStorage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) };
  globalThis.window = { dispatchEvent: event => events.push(event.type) };
  globalThis.fetch = async url => new Response(readFileSync(new URL(`./src/locales/catalog/${String(url).includes('en.json') ? 'en' : 'vi'}.json`, import.meta.url)));
  await Promise.all([loadLocale('vi'), loadLocale('en')]); activateLocale('en');
});
test.after(() => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } });
const untilAbort = signal => new Promise((_, reject) => {
  if (signal.aborted) reject(signal.reason);
  else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
});

test('API deadlines abort stalled fetches without retrying a mutation or discarding the session', async () => {
  let calls = 0, observed;
  globalThis.fetch = (_url, options) => { calls += 1; observed = options; return untilAbort(options.signal); };
  await assert.rejects(apiRequest('/bookings', { method: 'POST', body: '{}', timeoutMs: 15 }), error => error instanceof ApiError && error.code === 'REQUEST_TIMEOUT' && error.message === 'api.REQUEST_TIMEOUT');
  assert.equal(calls, 1); assert.equal(observed.signal.aborted, true); assert.equal('timeoutMs' in observed, false); assert.equal(stored.get('lrm_token'), 'unit-session');
  const en = translate('api.REQUEST_TIMEOUT'); activateLocale('vi'); assert.notEqual(translate('api.REQUEST_TIMEOUT'), en); activateLocale('en');
});
test('the deadline covers reading the response body after headers arrive', async () => {
  globalThis.fetch = async (_url, { signal }) => ({ ok: true, headers: new Headers({ 'Content-Type': 'application/json' }), json: () => untilAbort(signal) });
  await assert.rejects(apiRequest('/resources', { timeoutMs: 15 }), { code: 'REQUEST_TIMEOUT' });
});
test('caller cancellation is preserved before a request and during a body read', async () => {
  globalThis.fetch = async (_url, { signal }) => ({ ok: true, headers: new Headers({ 'Content-Type': 'application/json' }), json: () => untilAbort(signal) });
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(apiRequest('/resources', { signal: cancelled.signal }), { name: 'AbortError' });
  const controller = new AbortController(), pending = apiRequest('/resources', { signal: controller.signal });
  controller.abort(); await assert.rejects(pending, { name: 'AbortError' });
});
test('body read failures use localized feedback rather than exposing a raw runtime error', async () => {
  globalThis.fetch = async () => ({ ok: true, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => { throw new TypeError('Untranslated runtime details'); } });
  await assert.rejects(apiRequest('/resources'), { code: 'NETWORK_UNAVAILABLE', message: 'api.NETWORK_UNAVAILABLE' });
});
test('locale headers and stable server codes survive API deadlines', async () => {
  let headers;
  globalThis.fetch = async (_url, options) => { headers = options.headers; return new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Original server text', details: { retryAfterSeconds: 2 } } }), { status: 403, headers: { 'Content-Type': 'application/json' } }); };
  await assert.rejects(apiRequest('/resources'), error => error.status === 403 && error.code === 'FORBIDDEN' && error.message === 'api.FORBIDDEN' && error.details.retryAfterSeconds === 2);
  assert.equal(headers['Accept-Language'], 'en'); assert.equal(headers['X-LRM-Locale'], 'en'); assert.equal(headers.Authorization, 'Bearer unit-session');
});
test('expired sessions still clear credentials and notify the shared shell', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  await assert.rejects(apiRequest('/auth/me'), { status: 401 });
  assert.equal(stored.has('lrm_token'), false); assert.deepEqual(events, ['lrm:session-invalid']);
});
