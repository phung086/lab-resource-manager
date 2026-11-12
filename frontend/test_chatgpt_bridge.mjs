import test from 'node:test';
import assert from 'node:assert/strict';
import { askChatgptBridge, bridgeRedirectUrl } from './src/services/chatgptBridgeApi.ts';
import { parseBridgeProposals, reviewBridgeProposal } from './src/services/chatgptBridgeProposals.ts';
import { randomUUID } from 'node:crypto';

const originalStorage = globalThis.sessionStorage;
test.before(() => { globalThis.sessionStorage = { getItem: () => 'old-customer-session' }; });
test.after(() => { if (originalStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = originalStorage; });
const pending = () => ({ id: 'request-one', status: 'PENDING', expiresAt: new Date(Date.now() + 60000).toISOString() });
const question = { message: 'Tôi muốn đặt phòng.', locale: 'vi' };
test('partial content is delivered while pending; completion still requires an actual final answer', async () => {
  const seen = []; let reads = 0;
  const result = await askChatgptBridge(question, { signal: new AbortController().signal, pollMs: 1,
    onPending: job => { if (job.partialReply) seen.push(job.partialReply.text); },
    transport: async (_path, options = {}) => {
      if (options.method === 'POST') return pending();
      if (++reads < 3) return { ...pending(), partialReply: { text: reads === 1 ? 'Verified first sentence.' : 'Verified first sentence. A second fact.', sequence: reads, generatedAt: new Date().toISOString() } };
      return { ...pending(), status: 'ANSWERED', provider: 'chatgpt', source: 'chatgpt_bridge', answer: 'The complete verified answer.' };
    } });
  assert.deepEqual(seen, ['Verified first sentence.', 'Verified first sentence. A second fact.']);
  assert.equal(result.status, 'ANSWERED'); assert.equal(reads, 3);
});
test('regressing or malformed partial content fails closed and cancels pending work without retrying create', async () => {
  const methods = []; let reads = 0;
  await assert.rejects(askChatgptBridge(question, { signal: new AbortController().signal, pollMs: 1,
    transport: async (_path, options = {}) => {
      methods.push(options.method || 'GET'); if (options.method === 'POST') return pending(); if (options.method === 'DELETE') return '';
      return { ...pending(), partialReply: { text: ++reads === 1 ? 'First verified fact.' : 'Different overwritten fact.', sequence: reads, generatedAt: new Date().toISOString() } };
    } }), { code: 'bridge.invalidResponse' });
  assert.deepEqual(methods, ['POST', 'GET', 'GET', 'DELETE']);
});
test('reviewed local guidance returns immediately without polling or pretending to be a model', async () => {
  const calls = [];
  const answer = await askChatgptBridge({ message: 'xin chào', locale: 'vi' }, { signal: new AbortController().signal,
    transport: async (_path, options) => {
      calls.push(options);
      return { ...pending(), status: 'ANSWERED', provider: 'local', source: 'local_guidance', answer: 'Chào bạn! Tìm phòng tại LAB.' };
    } });
  assert.equal(answer.provider, 'local'); assert.equal(calls.length, 1);
  assert.equal(calls[0].headers['X-LRM-Locale'], 'vi');
});
const bookingDraft = () => ({ kind: 'BOOKING', id: randomUUID(), resourceId: randomUUID(), resourceName: 'Phòng điện tử', resourceCode: 'LAB-01',
  expiresAt: new Date(Date.now() + 300000).toISOString(), startAt: new Date(Date.now() + 86400000).toISOString(), endAt: new Date(Date.now() + 90000000).toISOString(),
  title: 'Đặt phòng', purpose: 'Thực hành điện tử', purposeCode: 'SERVICE', quote: { amountVnd: 60000, currency: 'VND', version: 1 } });

test('receipt stays pending until a genuine request-bound reply is returned', async () => {
  const job = pending(), calls = [], observations = [];
  const transport = async (path, options = {}) => {
    calls.push([path, options]);
    if (options.method === 'POST') return job;
    if (calls.length === 2) return job;
    return { ...job, status: 'ANSWERED', provider: 'chatgpt', source: 'chatgpt_bridge', answer: 'Hãy chọn phòng và khung giờ.' };
  };
  const answer = await askChatgptBridge(question, { signal: new AbortController().signal, pollMs: 1, transport, onPending: v => observations.push(v.status) });
  assert.equal(answer.status, 'ANSWERED'); assert.deepEqual(observations, ['PENDING', 'PENDING']);
  assert.deepEqual(calls.map(([path, options]) => [path, options.method || 'GET']), [
    ['/assistant/bridge/requests', 'POST'], ['/assistant/bridge/requests/request-one', 'GET'], ['/assistant/bridge/requests/request-one', 'GET']
  ]);
});
test('a temporary status-read outage recovers without repeating create or cancelling valid work', async () => {
  const methods = []; let reads = 0;
  const result = await askChatgptBridge(question, { signal: new AbortController().signal, pollMs: 1,
    transport: async (_path, options = {}) => {
      methods.push(options.method || 'GET');
      if (options.method === 'POST') return pending();
      if (++reads === 1) throw Object.assign(new Error('Temporary network outage'), { code: 'NETWORK_UNAVAILABLE' });
      return { ...pending(), status: 'ANSWERED', provider: 'local', source: 'authenticated_mcp', answer: 'Fresh scoped schedule.' };
    } });
  assert.equal(result.status, 'ANSWERED'); assert.deepEqual(methods, ['POST', 'GET', 'GET']);
});
test('authorization failures on status reads are never retried', async () => {
  const methods = [];
  await assert.rejects(askChatgptBridge(question, { signal: new AbortController().signal, pollMs: 1,
    transport: async (_path, options = {}) => {
      methods.push(options.method || 'GET');
      if (options.method === 'POST') return pending();
      if (!options.method) throw Object.assign(new Error('Forbidden'), { status: 403 });
    } }), /Forbidden/);
  assert.deepEqual(methods, ['POST', 'GET', 'DELETE']);
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

test('customer proposals open review data without submitting business mutations', async () => {
  const job = pending(), proposal = bookingDraft(), methods = [];
  const result = await askChatgptBridge(question, { signal: new AbortController().signal, pollMs: 1, transport: async (_path, options = {}) => {
    methods.push(options.method || 'GET');
    return options.method === 'POST' ? job : { ...job, status: 'ANSWERED', provider: 'chatgpt', source: 'chatgpt_bridge', answer: 'Xem đề xuất.', proposals: [proposal] };
  } });
  assert.deepEqual(reviewBridgeProposal(result.proposals[0]), proposal);
  assert.deepEqual(methods, ['POST', 'GET']);
});

test('expired proposals, forged actor/price fields, unsupported writes and duplicates fail closed', () => {
  const proposal = bookingDraft();
  assert.throws(() => reviewBridgeProposal(proposal, Date.parse(proposal.expiresAt)), { code: 'bridge.proposalExpired' });
  for (const item of [{ ...proposal, userId: randomUUID() }, { ...proposal, confirmUrl: 'https://attacker.example' },
    { ...proposal, kind: 'REFUND' }, { ...proposal, quote: { ...proposal.quote, amountVnd: -1 } }, { ...proposal, endAt: proposal.startAt }])
    assert.throws(() => parseBridgeProposals([item]), { code: 'bridge.invalidResponse' });
  assert.throws(() => parseBridgeProposals([proposal, proposal]), { code: 'bridge.invalidResponse' });
  const support = { kind: 'STAFF_SUPPORT', id: randomUUID(), expiresAt: proposal.expiresAt, laboratoryId: randomUUID(), laboratoryName: 'LAB điện tử', category: 'BOOKING', message: 'Tôi cần hỗ trợ đặt lịch.' };
  assert.deepEqual(reviewBridgeProposal(support), support);
  assert.throws(() => parseBridgeProposals([{ ...support, category: 'ADMIN' }]), { code: 'bridge.invalidResponse' });
});
