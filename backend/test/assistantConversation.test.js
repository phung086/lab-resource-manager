import assert from 'node:assert/strict';
import test from 'node:test';
import { AssistantConversationStore, CONVERSATION_LIMITS } from '../src/assistant/assistantConversation.js';
import { createAssistantService } from '../src/assistant/assistantService.js';

const context = (actorId = 'student', authorization = 'test-session') => ({ actorId, authorization, actorRole: 'STUDENT' });
const settings = { assistantConversationEnabled: true, assistantConcurrency: 2, assistantTimeoutMs: 1000, assistantToolTimeoutMs: 300, assistantModelFailureThreshold: 2, assistantModelCooldownMs: 1000, openaiApiKey: '', openaiModel: '', port: 8000 };
const configured = { ...settings, openaiApiKey: 'unit-only-key', openaiModel: 'unit-only-model' };
const chatPlan = reply => ({ kind: 'CHAT', reply, selectedSlotIndex: null, reads: [] });
const labPlan = reads => ({ kind: 'LAB', reply: '', selectedSlotIndex: null, reads });
const resource = id => ({ id, code: `EQ-${id}`, name: `Resource ${id}`, operationalStatus: 'AVAILABLE', location: 'Test LAB' });
const slots = [0, 1].map(i => ({ resourceId: 'a', resourceName: 'Resource a', resourceCode: 'EQ-a', startAt: new Date(1900000000000 + i * 3600000).toISOString(), endAt: new Date(1900003600000 + i * 3600000).toISOString() }));
const fixture = handler => () => ({ client: { connect: async () => {}, close: async () => {}, callTool: async request => ({ structuredContent: await handler(request.name, request.arguments) }) } });
const memory = () => new AssistantConversationStore({ sweepMs: 0 });

test('conversation IDs are bound to account, bearer session and current role without storing credentials', () => {
  const store = memory(), row = store.open(undefined, context());
  store.commit(row, 'Hello', { answer: 'Hi', source: 'model_conversation' });
  assert.equal(store.open(row.id, context()).turns[0].reply, 'Hi');
  for (const other of [context('peer'), context('student', 'other-session'), { ...context(), actorRole: 'ADMIN' }]) assert.throws(() => store.open(row.id, other), { code: 'ASSISTANT_CONVERSATION_EXPIRED' });
  assert.ok(!JSON.stringify([...store.sessions.values()]).includes('test-session'));
  assert.throws(() => store.remove(row.id, context('peer')), { code: 'ASSISTANT_CONVERSATION_EXPIRED' });
  store.remove(row.id, context()); assert.equal(store.sessions.size, 0);
});

test('history expires, has finite session/turn/byte limits and never replays private business prose', () => {
  let now = 1000;
  const store = new AssistantConversationStore({ sweepMs: 0, now: () => now, limits: { ...CONVERSATION_LIMITS, maxSessions: 2 } });
  const row = store.open(undefined, context());
  for (let i = 0; i < 20; i++) store.commit(row, `Question ${i}`, { answer: 'PRIVATE BOOKING TITLE', source: 'authenticated_mcp', toolResults: [{ result: { resources: [resource('a')] } }] });
  assert.equal(row.turns.length, 10); assert.ok(!JSON.stringify(row).includes('PRIVATE BOOKING TITLE'));
  assert.deepEqual(row.resources, [{ id: 'a' }]); assert.ok(!JSON.stringify(row).includes('Resource a'));
  store.commit(row, '\u0000'.repeat(2000), { answer: '\u0000'.repeat(12000), source: 'model_conversation' });
  assert.ok(Buffer.byteLength(JSON.stringify(row.turns)) <= CONVERSATION_LIMITS.maxBytes);
  store.commit(row, 'No results', { answer: '', source: 'authenticated_mcp', toolResults: [{ result: { resources: [] } }] });
  assert.deepEqual(row.resources, []);
  for (const id of ['b', 'c']) store.commit(store.open(undefined, context(id)), 'Hello', { answer: '', source: 'local_guidance' });
  assert.equal(store.sessions.size, 2); assert.throws(() => store.open(row.id, context()), { code: 'ASSISTANT_CONVERSATION_EXPIRED' });
  now += CONVERSATION_LIMITS.ttlMs; store.prune(); assert.equal(store.sessions.size, 0);
});

test('configured casual chat uses server history, locale and workspace with no business reads or actions', async () => {
  const payloads = [], store = memory();
  const service = createAssistantService({ settings: configured, conversations: store, clientFactory: () => assert.fail('Casual chat must not read LAB records'), plannerCall: async input => { payloads.push(input); return chatPlan(input.locale === 'vi' ? 'Mình có thể giúp chia nhỏ việc học.' : 'We can split the work into smaller steps.'); } });
  const first = await service.answer({ message: 'Tôi đang mệt vì đồ án', locale: 'vi', workspace: 'resources' }, context());
  const next = await service.answer({ message: 'What should I do first?', locale: 'en', conversationId: first.conversation.id }, context());
  assert.equal(first.source, 'model_conversation'); assert.equal(next.provider, 'openai'); assert.deepEqual(next.actions, []);
  assert.equal(payloads[0].payload.workspace, 'resources'); assert.equal(payloads[1].locale, 'en');
  assert.match(payloads[1].payload.history[0].question, /đồ án/); assert.match(payloads[1].payload.history[0].reply, /chia nhỏ/);
  assert.equal(next.conversation.id, first.conversation.id); assert.deepEqual(next.toolsUsed, []);
});

test('missing credentials never call the model and local follow-up rechecks the exact historical slot', async () => {
  let unavailable = false; const calls = [];
  const service = createAssistantService({ settings, conversations: memory(), plannerCall: () => assert.fail('No key'), modelCall: () => assert.fail('No key'), clientFactory: fixture((name, input) => {
    calls.push({ name, input });
    if (name === 'find_available_slots') return { slots: unavailable ? [] : input.limit === 1 ? [slots[1]] : slots };
    return { bookable: true, missingTraining: [] };
  }) });
  const first = await service.answer({ message: 'Find slots', locale: 'en' }, context());
  unavailable = true;
  const next = await service.answer({ message: 'Lấy khung thứ hai nhé', locale: 'vi', conversationId: first.conversation.id }, context());
  assert.deepEqual(calls[2], { name: 'find_available_slots', input: { resourceId: 'a', from: slots[1].startAt, to: slots[1].endAt, durationMinutes: 60, limit: 1 } });
  assert.equal(next.summary[0].key, 'assistant.recheckedChoice'); assert.ok(next.summary.some(item => item.key === 'assistant.noSlots')); assert.deepEqual(next.actions, []);
});

test('model plans read through MCP; explicit form values win and business history is not sent as evidence', async () => {
  let summarized; const calls = [];
  const service = createAssistantService({ settings: configured, conversations: memory(), plannerCall: async () => labPlan([{ name: 'find_available_slots', input: { resourceId: 'inferred', from: '2030-01-01T00:00:00Z', to: '2030-01-02T00:00:00Z', durationMinutes: 90 } }]), modelCall: async input => { summarized = input; return 'A candidate is available for review.'; }, clientFactory: fixture((name, input) => { calls.push({ name, input }); return name === 'find_available_slots' ? { slots: [slots[0]] } : { bookable: true, missingTraining: [] }; }) });
  const response = await service.answer({ message: 'Find an hour tomorrow', locale: 'en', resourceId: 'explicit', startAt: '2030-02-01T01:00:00Z', endAt: '2030-02-01T09:00:00Z', durationMinutes: 60 }, context());
  assert.deepEqual(calls[0].input, { resourceId: 'explicit', from: '2030-02-01T01:00:00Z', to: '2030-02-01T09:00:00Z', durationMinutes: 60, limit: 5 });
  assert.equal(summarized.toolResults[0].tool, 'find_available_slots'); assert.equal(response.provider, 'openai');
  assert.equal(response.actions[0].type, 'PREFILL_BOOKING'); assert.ok(response.actions.every(action => action.type !== 'CREATE_BOOKING'));
  assert.ok(!JSON.stringify(service.conversations.open(response.conversation.id, context()).turns).includes('A candidate is available'));
});

test('bounded planning accommodates all refreshed choices and eligibility reads and labels inferred windows accurately', async () => {
  const store = memory(), row = store.open(undefined, context());
  const resources = Array.from({ length: 5 }, (_, i) => resource(String(i)));
  store.commit(row, 'Find equipment', { source: 'authenticated_mcp', toolResults: [{ result: { resources } }] });
  const candidates = resources.map((r, i) => ({ ...slots[0], resourceId: r.id, resourceName: r.name, resourceCode: r.code, startAt: slots[i % 2].startAt, endAt: slots[i % 2].endAt }));
  const calls = [];
  const service = createAssistantService({ settings: configured, conversations: store, plannerCall: async () => labPlan([{ name: 'find_available_slots', input: { from: '2030-03-17T01:00:00Z', to: '2030-03-17T09:00:00Z' } }, { name: 'get_my_bookings', input: {} }, { name: 'list_notifications', input: {} }]), modelCall: async () => 'Review these candidates.', clientFactory: fixture((name, input) => {
    calls.push({ name, input });
    if (name === 'get_resource_detail') return { resource: resource(input.resourceId) };
    if (name === 'find_available_slots') return { slots: candidates };
    if (name === 'check_user_eligibility') return { bookable: true, missingTraining: [] };
    return name === 'get_my_bookings' ? { bookings: [] } : { notifications: [] };
  }) });
  const response = await service.answer({ message: 'Find slots and my bookings and notifications', locale: 'en', conversationId: row.id }, context());
  assert.equal(calls.length, 13); assert.equal(response.actions.length, 5);
  assert.equal(response.summary[0].key, 'assistant.requestedWindow');
  assert.equal(response.provider, 'openai'); assert.equal(service.gate.active.size, 0);
});

test('model slot selection rechecks its exact interval and supplies current eligibility to synthesis without a booking action', async () => {
  const store = memory(), row = store.open(undefined, context()); let synthesis;
  store.commit(row, 'Find slots', { source: 'authenticated_mcp', toolResults: [{ result: { slots } }] });
  const calls = [];
  const service = createAssistantService({ settings: configured, conversations: store, plannerCall: async () => ({ kind: 'LAB', reply: '', selectedSlotIndex: 1, reads: [] }), modelCall: async input => { synthesis = input; return 'Review the training requirement before requesting this slot.'; }, clientFactory: fixture((name, input) => {
    calls.push({ name, input });
    if (name === 'get_resource_detail') return { resource: resource(input.resourceId) };
    if (name === 'find_available_slots') return { slots: [slots[1]] };
    return { bookable: false, missingTraining: [{ name: 'Safety induction' }], requiresApproval: true };
  }) });
  const result = await service.answer({ message: 'Take that later slot', locale: 'en', conversationId: row.id, resourceId: 'other', startAt: '2030-04-01T00:00:00Z', endAt: '2030-04-02T00:00:00Z' }, context());
  assert.deepEqual(calls[1], { name: 'find_available_slots', input: { resourceId: 'a', from: slots[1].startAt, to: slots[1].endAt, durationMinutes: 60, limit: 1 } });
  assert.equal(result.summary[0].key, 'assistant.recheckedChoice'); assert.deepEqual(result.actions, []);
  assert.equal(synthesis.eligibility[0].resourceId, 'a'); assert.equal(synthesis.eligibility[0].result.bookable, false);
  assert.equal(synthesis.eligibility[0].result.missingTraining[0].name, 'Safety induction');
});

test('references losing LAB access fail closed before another model call and cannot replay earlier names', async () => {
  let permitted = true, planning = 0;
  const service = createAssistantService({ settings: configured, conversations: memory(), plannerCall: async () => { planning++; return labPlan([{ name: 'search_resources', input: {} }]); }, modelCall: async () => 'Authorized resource', clientFactory: fixture(name => name === 'search_resources' ? { resources: [resource('a')] } : permitted ? { resource: resource('a') } : { error: { code: 'NOT_FOUND' } }) });
  const first = await service.answer({ message: 'Find equipment', locale: 'en' }, context());
  permitted = false;
  const next = await service.answer({ message: 'Tell me about the first one', locale: 'en', conversationId: first.conversation.id }, context());
  assert.equal(planning, 1); assert.equal(next.modelStatus, 'TOOL_UNAVAILABLE'); assert.deepEqual(next.actions, []);
  assert.ok(!next.answer.includes('Resource a')); assert.deepEqual(service.conversations.open(first.conversation.id, context()).resources, []);
});

test('malformed/write plans and attempted operational facts in casual mode use truthful local recovery', async () => {
  for (const invalid of [labPlan([{ name: 'create_booking', input: {} }]), labPlan([{ name: 'search_resources', input: { userId: 'peer' } }]), labPlan([]), chatPlan('There are 10 free rooms')]) {
    let reads = 0;
    const service = createAssistantService({ settings: configured, conversations: memory(), plannerCall: async () => invalid, modelCall: () => assert.fail('Invalid planner must not synthesize'), clientFactory: fixture(() => { reads++; return { resources: [] }; }) });
    const response = await service.answer({ message: 'Find equipment', locale: 'en' }, context());
    assert.equal(response.provider, 'local'); assert.equal(response.modelStatus, 'MODEL_UNAVAILABLE'); assert.equal(reads, 1);
    assert.ok(!response.answer.includes('10 free rooms')); assert.deepEqual(response.actions, []);
  }
});

test('planner failure circuit is bounded; cancellation and logout cannot commit late history', async () => {
  let calls = 0;
  const failed = createAssistantService({ settings: configured, conversations: memory(), plannerCall: async () => { calls++; throw new Error('Provider down'); }, clientFactory: fixture(() => ({ resources: [] })) });
  for (let i = 0; i < 3; i++) assert.equal((await failed.answer({ message: 'Hello', locale: 'en' }, context())).modelStatus, i < 2 ? 'MODEL_UNAVAILABLE' : 'CIRCUIT_OPEN');
  assert.equal(calls, 2);
  let unblock;
  const service = createAssistantService({ settings: configured, conversations: memory(), plannerCall: () => new Promise(resolve => { unblock = resolve; }) });
  const pending = service.answer({ message: 'Hello', locale: 'en' }, context());
  await new Promise(resolve => setImmediate(resolve)); service.forgetSession(context());
  await assert.rejects(pending, { code: 'ASSISTANT_CANCELLED' });
  unblock(chatPlan('Late reply')); await new Promise(resolve => setImmediate(resolve));
  assert.equal(service.conversations.sessions.size, 0); assert.equal(service.gate.active.size, 0); assert.equal(service.breaker.failures, 0);
});

test('denied/deferred evidence never reaches grounded synthesis', async () => {
  for (const name of ['get_monitoring_summary', 'find_available_slots']) for (const result of [{ error: { code: 'FORBIDDEN' } }, { deferred: true }]) {
    const service = createAssistantService({ settings: configured, conversations: memory(), plannerCall: async () => labPlan([{ name, input: {} }]), modelCall: () => assert.fail('No usable evidence'), clientFactory: fixture(tool => tool === 'find_available_slots' ? { slots: [slots[0]] } : result) });
    const response = await service.answer({ message: 'Monitoring', locale: 'en' }, context());
    assert.equal(response.provider, 'local'); assert.equal(response.modelStatus, result.error ? 'TOOL_UNAVAILABLE' : 'LOCAL_ONLY'); assert.deepEqual(response.actions, []);
  }
});

test('planner and synthesis history payloads respect the UTF-8 budget without provider calls', async () => {
  const store = memory(), row = store.open(undefined, context());
  // Explicit unit-only oversized fixture bypasses the store's normal caps.
  store.commit(row, 'Hello', { answer: '', source: 'local_guidance' });
  store.sessions.get(row.id).turns = [{ question: 'đ'.repeat(15000), reply: '' }];
  const service = createAssistantService({ settings: configured, conversations: store, plannerCall: () => assert.fail('Oversized history'), clientFactory: () => assert.fail('No read intent') });
  const response = await service.answer({ message: 'Hello', locale: 'en', conversationId: row.id }, context());
  assert.equal(response.modelStatus, 'INPUT_TOO_LARGE'); assert.equal(response.provider, 'local');
});
