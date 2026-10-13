import test from 'node:test';
import assert from 'node:assert/strict';
import { askChatgptBridge, bridgeRedirectUrl } from './src/services/chatgptBridgeApi.ts';

const originalStorage = globalThis.localStorage;
test.before(() => { globalThis.localStorage = { getItem: () => 'old-customer-session' }; });
test.after(() => { if (originalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalStorage; });
const pending = () => ({ id: 'request-one', status: 'PENDING', expiresAt: new Date(Date.now() + 60000).toISOString() });
const question = { message: 'Tôi muốn đặt phòng.', locale: 'vi' };

test('receipt stays pending until a genuine request-bound reply is returned', async () => {
  const job = pending(), calls = [], observations = [];
  const transport = async (path, options = {}) => {
    calls.push([path, options]);
    if (options.method === 'POST') return job;
    if (calls.length === 2) return job;
    return { ...job, status: 'ANSWERED', provider: 'chatgpt', source: 'chatgpt_bridge', answer: 'Hãy chọn phòng và khung giờ.' };
  };
  const answer = await askChatgptBridge(question, { signal: new AbortController().signal, pollMs: 1, transport, onPending: v => observations.push(v.status) });
  assert.equal(answer.status, 'ANSWERED'); assert.deepEqual(observations, ['PENDING']);
  assert.deepEqual(calls.map(([path, options]) => [path, options.method || 'GET']), [
    ['/assistant/bridge/requests', 'POST'], ['/assistant/bridge/requests/request-one', 'GET'], ['/assistant/bridge/requests/request-one', 'GET']
  ]);
});
test('cancelling during creation cancels the persisted request with its original session', async () => {
  const controller = new AbortController(), job = pending(), calls = [];
  const transport = async (path, options) => {
    calls.push([path, options]);
    if (options.method === 'POST') { controller.abort(); return job; }
  };
  await assert.rejects(askChatgptBridge(question, { signal: controller.signal, transport }), { name: 'AbortError' });
  assert.equal(calls.length, 2); assert.equal(calls[1][1].method, 'DELETE');
  assert.equal(calls[1][1].headers.Authorization, 'Bearer old-customer-session');
});
test('lost mutation responses are never retried as a new question', async () => {
  let count = 0;
  await assert.rejects(askChatgptBridge(question, { signal: new AbortController().signal,
    transport: async () => { count++; throw new Error('Connection lost'); } }), /Connection lost/);
  assert.equal(count, 1);
});
test('expiry and staff handoff do not produce a successful answer', async () => {
  for (const [status, code] of [['EXPIRED', 'bridge.expired'], ['HANDED_OFF', 'bridge.cancelled']]) {
    const job = pending();
    await assert.rejects(askChatgptBridge(question, { signal: new AbortController().signal, pollMs: 1,
      transport: async (_path, options = {}) => options.method === 'POST' ? job : { ...job, status } }), { code });
  }
});
test('mismatched identities or answer provenance are rejected and pending jobs cancelled', async () => {
  for (const change of [{ id: 'different-request' }, { source: 'fabricated' }]) {
    const job = pending(), methods = [];
    await assert.rejects(askChatgptBridge(question, { signal: new AbortController().signal, pollMs: 1,
      transport: async (_path, options = {}) => {
        methods.push(options.method || 'GET');
        return options.method === 'POST' ? job : { ...job, status: 'ANSWERED', answer: 'Invalid answer', source: 'chatgpt_bridge', provider: 'chatgpt', ...change };
      } }), { code: 'bridge.invalidResponse' });
    assert.deepEqual(methods, ['POST', 'GET', 'DELETE']);
  }
});
test('an unconfirmed cancellation is visible instead of claiming cancellation succeeded', async () => {
  const controller = new AbortController();
  await assert.rejects(askChatgptBridge(question, { signal: controller.signal,
    transport: async (_path, options) => {
      if (options.method === 'POST') { controller.abort(); return pending(); }
      throw new Error('Delete unavailable');
    } }), { code: 'bridge.cancelFailed' });
});
test('OAuth redirects remain on exact supported ChatGPT paths', () => {
  assert.equal(bridgeRedirectUrl('https://chatgpt.com/connector_platform_oauth_redirect?state=test&code=test'), 'https://chatgpt.com/connector_platform_oauth_redirect?state=test&code=test');
  assert.ok(bridgeRedirectUrl('https://chatgpt.com/connector/oauth/abc_123?error=access_denied'));
  for (const url of ['https://attacker.example/connector_platform_oauth_redirect', 'https://chatgpt.com.evil.test/connector/oauth/x',
    'https://chatgpt.com/other', 'https://chatgpt.com/connector/oauth/x#secret', 'https://user@chatgpt.com/connector/oauth/x'])
    assert.throws(() => bridgeRedirectUrl(url), { code: 'bridge.invalidRedirect' });
});
