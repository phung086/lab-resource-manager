import assert from 'node:assert/strict';
import test from 'node:test';
import { RequestGate, ModelCircuitBreaker } from '../src/assistant/assistantRuntime.js';
import { createAssistantService, listAssistantTools, planAssistantQuestion } from '../src/assistant/assistantService.js';
import { requestLocale, localize } from '../src/locales/index.js';
import { buildDashboard } from '../src/services/dashboardService.js';
const settings = { assistantConcurrency: 2, assistantTimeoutMs: 40, assistantToolTimeoutMs: 30, assistantModelFailureThreshold: 2, assistantModelCooldownMs: 1000, openaiApiKey: '', openaiModel: '', port: 8000 };
const clientFactory = () => ({ client: { connect: async () => {}, callTool: async () => ({ structuredContent: { resources: [], source: 'database' } }), close: async () => {} } });
const context = actorId => ({ actorId, authorization: 'test-only' });
test('request gate bounds capacity, isolates users and releases exactly once', () => {
  const gate = new RequestGate(2), first = gate.acquire('a'), second = gate.acquire('b');
  assert.throws(() => gate.acquire('a'), { code: 'ASSISTANT_BUSY' });
  assert.throws(() => gate.acquire('c'), { code: 'ASSISTANT_OVERLOADED' });
  first(); first(); const third = gate.acquire('c'); assert.equal(gate.active.size, 2); second(); third(); assert.equal(gate.active.size, 0);
});
test('circuit breaker pauses failures, admits one recovery probe and rejects stale completions', () => {
  let now = 0; const breaker = new ModelCircuitBreaker({ threshold: 2, cooldownMs: 100, now: () => now });
  const stale = breaker.enter(); breaker.finish(breaker.enter(), 'failure'); breaker.finish(breaker.enter(), 'failure');
  assert.equal(breaker.enter(), null); breaker.finish(stale, 'success'); assert.equal(breaker.enter(), null);
  now = 101; const probe = breaker.enter(); assert.ok(probe); assert.equal(breaker.enter(), null);
  breaker.finish(probe, 'success'); assert.ok(breaker.enter());
});
test('language negotiation honors quality, explicit selection and unsupported tags', () => {
  assert.equal(requestLocale({ headers: { 'accept-language': 'fr, en-GB;q=0.9,vi;q=0.5' } }), 'en');
  assert.equal(requestLocale({ headers: { 'accept-language': 'en;q=0,vi;q=0.9' } }), 'vi');
  assert.equal(requestLocale({ headers: { 'x-lrm-locale': 'vi', 'accept-language': 'en' } }), 'vi');
  assert.equal(requestLocale({ headers: { 'accept-language': 'fr' } }), 'vi');
});
test('VI and EN summaries retain original resource names and report provider truthfully', async () => {
  const service = createAssistantService({ settings, clientFactory: () => ({ client: { connect: async () => {}, callTool: async () => ({ structuredContent: { resources: [{ code: 'EQ-01', name: 'Tên thiết bị gốc', operationalStatus: 'AVAILABLE' }] } }), close: async () => {} } }) });
  for (const locale of ['vi', 'en']) { const response = await service.answer({ message: 'Find equipment', locale }, context(locale)); assert.match(response.answer, /Tên thiết bị gốc/); assert.equal(response.locale, locale); assert.equal(response.provider, 'local'); assert.equal(response.modelStatus, 'NOT_CONFIGURED'); assert.equal(response.source, 'authenticated_mcp'); }
  assert.equal(service.gate.active.size, 0);
});
test('deadline during MCP connect releases capacity and permits a subsequent request', async () => {
  let stall = true;
  const service = createAssistantService({ settings, clientFactory: () => ({ client: { connect: () => stall ? new Promise(() => {}) : Promise.resolve(), callTool: clientFactory().client.callTool, close: async () => {} } }) });
  await assert.rejects(service.answer({ message: 'Find equipment', locale: 'en' }, context('a')), { code: 'ASSISTANT_TIMEOUT' });
  assert.equal(service.gate.active.size, 0); stall = false; assert.equal((await service.answer({ message: 'Find equipment', locale: 'en' }, context('a'))).provider, 'local');
});
test('cancellation during a tool read preserves capacity and does not count as a model failure', async () => {
  let stall = true; const controller = new AbortController();
  const service = createAssistantService({ settings: { ...settings, assistantTimeoutMs: 500 }, clientFactory: () => ({ client: { connect: async () => {}, callTool: () => stall ? new Promise(() => {}) : Promise.resolve({ structuredContent: { resources: [] } }), close: async () => {} } }) });
  const pending = service.answer({ message: 'Find equipment', locale: 'en' }, { ...context('a'), signal: controller.signal });
  await new Promise(resolve => setImmediate(resolve)); controller.abort();
  await assert.rejects(pending, { code: 'ASSISTANT_CANCELLED' }); assert.equal(service.gate.active.size, 0); assert.equal(service.breaker.failures, 0);
  stall = false; await service.answer({ message: 'Find equipment', locale: 'en' }, context('a'));
});
test('MCP failure releases capacity and never claims verified data', async () => {
  const service = createAssistantService({ settings, clientFactory: () => ({ client: { connect: async () => { throw new Error('Disconnected'); }, close: async () => {} } }) });
  await assert.rejects(service.answer({ message: 'Find equipment' }, context('a')), { code: 'MCP_UNAVAILABLE' }); assert.equal(service.gate.active.size, 0);
});
test('external model failures fall back to tool results and open a bounded circuit', async () => {
  let calls = 0;
  const service = createAssistantService({ settings: { ...settings, openaiApiKey: 'unit-fixture', openaiModel: 'unit-fixture' }, clientFactory, modelCall: async () => { calls += 1; throw new Error('Provider failure'); } });
  for (let i = 0; i < 3; i += 1) { const response = await service.answer({ message: 'Find equipment', locale: 'en' }, context('a')); assert.equal(response.provider, 'local'); assert.equal(response.modelStatus, i < 2 ? 'MODEL_UNAVAILABLE' : 'CIRCUIT_OPEN'); assert.equal(response.answer, 'No matching resources within the authorized data.'); }
  assert.equal(calls, 2);
});
test('model receives the request locale without controlling workflow actions', async () => {
  let observed;
  const service = createAssistantService({ settings: { ...settings, openaiApiKey: 'unit-fixture', openaiModel: 'unit-fixture' }, clientFactory, modelCall: async input => { observed = input; return 'Unit model result'; } });
  const response = await service.answer({ message: 'Find equipment', locale: 'en' }, context('a'));
  assert.equal(observed.locale, 'en'); assert.equal(response.provider, 'openai'); assert.deepEqual(response.actions, []); assert.equal(response.summary[0].key, 'assistant.noResources');
});
test('VI and EN intents share the same read-only tool plan and never produce write tools', () => {
  for (const message of ['Tôi có lịch đặt nào sắp tới?', 'What are my upcoming bookings?']) assert.equal(planAssistantQuestion({ message })[0].name, 'get_my_bookings');
  for (const message of ['Tôi có thông báo chưa đọc?', 'Do I have unread notifications?']) assert.equal(planAssistantQuestion({ message })[0].name, 'list_notifications');
  assert.deepEqual(planAssistantQuestion({ message: 'Confirm payment for booking' }), []);
  assert.deepEqual(planAssistantQuestion({ message: 'Tìm thiết bị' }), planAssistantQuestion({ message: 'Find equipment' }));
  assert.equal(planAssistantQuestion({ message: 'Find available room slots' })[0].input.category, 'ROOM');
  assert.ok(!planAssistantQuestion({ message: 'Find available room slots' })[0].input.query, 'Room lookup uses canonical category rather than a language-dependent name');
  assert.ok(listAssistantTools().every(tool => tool.readOnly));
  const tools = new Map(listAssistantTools().map(tool => [tool.name, tool]));
  for (const message of ['Recommend suitable equipment', 'Find available room slots', 'Tìm thiết bị']) for (const step of planAssistantQuestion({ message })) {
    assert.ok(Object.keys(step.input).every(key => Object.hasOwn(tools.get(step.name).inputSchema.properties, key)), 'Planned arguments are supported by the registered MCP schema');
  }
  assert.match(localize('en', 'api.ASSISTANT_OVERLOADED'), /busy/);
});

test('VI/EN slot duration supports hours, minutes, decimals and an explicit form override', () => {
  for (const [message, minutes] of [['Find slots for 2 hours', 120], ['Tìm khung giờ trống trong 2 giờ', 120], ['Find slots for 90 minutes', 90], ['Tìm khung giờ trong 90 phút', 90], ['Find slots for 1.5 hours', 90], ['Tìm khung giờ trong 1,5 giờ', 90], ['Find slots for 1 hour and 30 minutes', 90], ['Tìm khung giờ trong 1 giờ 30 phút', 90], ['Find slots', 60]]) {
    assert.equal(planAssistantQuestion({ message })[0].input.durationMinutes, minutes, message);
  }
  assert.equal(planAssistantQuestion({ message: 'Find slots for 2 hours', durationMinutes: 45 })[0].input.durationMinutes, 45);
  assert.equal(planAssistantQuestion({ message: 'ĐIỀU KIỆN ĐẶT THIẾT BỊ', resourceId: 'equipment' })[0].name, 'check_user_eligibility');
  for (const message of ['Find slots for 0 minutes', 'Find slots for -30 minutes', 'Find slots for 10 hours', 'Find slots for 15.5 minutes', 'Find slots for 60 minutes or 90 minutes', 'Find slots for 1 hour and -30 minutes']) assert.throws(() => planAssistantQuestion({ message }), { code: 'VALIDATION_ERROR' });
});
test('guidance without a read plan neither connects MCP nor invokes the model', async () => {
  const service = createAssistantService({ settings: { ...settings, openaiApiKey: 'unit-fixture', openaiModel: 'unit-fixture' }, clientFactory: () => { assert.fail('No data read was requested'); }, modelCall: () => { assert.fail('No grounded evidence was available'); } });
  const response = await service.answer({ message: 'Confirm payment for booking', locale: 'en' }, context('a'));
  assert.equal(response.source, 'local_guidance'); assert.equal(response.modelStatus, 'LOCAL_ONLY'); assert.deepEqual(response.toolsUsed, []); assert.equal(service.gate.active.size, 0);
});
test('eligibility is read once per resource for repeated slot suggestions and never grants a denied action', async () => {
  const slots = [0, 1, 2, 3, 4].map(i => ({ resourceId: i < 4 ? 'allowed' : 'denied', resourceCode: 'EQ', startAt: new Date(1800000000000 + i * 3600000).toISOString(), endAt: new Date(1800003600000 + i * 3600000).toISOString() }));
  const calls = [];
  const service = createAssistantService({ settings, clientFactory: () => ({ client: {
    connect: async () => {}, close: async () => {}, callTool: async request => {
      calls.push(request);
      return { structuredContent: request.name === 'find_available_slots' ? { slots } : { bookable: request.arguments.resourceId === 'allowed', missingTraining: [] } };
    }
  } }) });
  const response = await service.answer({ message: 'Find slots', locale: 'en' }, context('a'));
  assert.equal(calls.length, 3); assert.equal(response.actions.length, 4);
  assert.ok(response.actions.every(action => action.type === 'PREFILL_BOOKING' && action.payload.resourceId === 'allowed'));
});
test('missing, deferred and oversized evidence do not start a model request', async () => {
  let calls = 0, result = { error: { code: 'FORBIDDEN', message: 'original server text' } };
  const service = createAssistantService({ settings: { ...settings, openaiApiKey: 'unit-fixture', openaiModel: 'unit-fixture' }, clientFactory: () => ({ client: { connect: async () => {}, close: async () => {}, callTool: async () => ({ structuredContent: result }) } }), modelCall: async () => { calls += 1; return 'Unexpected provider request'; } });
  const request = message => service.answer({ message, locale: 'en' }, context('a'));
  assert.equal((await request('Find equipment')).modelStatus, 'TOOL_UNAVAILABLE');
  result = { deferred: true, source: 'deferred' };
  const deferred = await request('Monitoring'); assert.equal(deferred.modelStatus, 'LOCAL_ONLY'); assert.match(deferred.answer, /deferred/);
  assert.equal((await request('Confirm payment')).modelStatus, 'LOCAL_ONLY');
  // The complete UTF-8 model input, including the question, has a byte budget.
  result = { resources: [{ code: 'EQ', name: 'a'.repeat(23800), operationalStatus: 'AVAILABLE' }] };
  assert.equal((await request('Find equipment ' + 'đ'.repeat(200))).modelStatus, 'INPUT_TOO_LARGE');
  assert.equal(calls, 0); assert.equal(service.breaker.failures, 0);
});
test('business-only dashboard preserves counts and scope without requesting hardware relations', async () => {
  let resourceQuery, cameraReads = 0;
  const client = {
    resource: { findMany: async query => { resourceQuery = query; return [{ id: 'equipment', operationalStatus: 'AVAILABLE' }]; } },
    booking: { findMany: async () => [] }, incident: { findMany: async () => [{ status: 'reported', severity: 'high' }] },
    notification: { count: async () => 3 }, camera: { findMany: async () => { cameraReads += 1; throw new Error('Hardware must not be read'); } }
  };
  const result = await buildDashboard(client, { id: 'staff', role: 'LAB_STAFF' }, new Date(), { includeTelemetry: false });
  assert.equal(result.summary.totalResources, 1); assert.equal(result.summary.openIncidentCount, 1); assert.equal(result.summary.unreadNotifications, 3);
  assert.deepEqual(resourceQuery.where, { laboratory: { staffAssignments: { some: { userId: 'staff' } } } });
  assert.deepEqual(resourceQuery.include, { laboratory: true }); assert.equal(cameraReads, 0);
  assert.equal(result.telemetryIncluded, false); assert.equal(result.telemetrySummary, null); assert.deepEqual(result.telemetry, []); assert.deepEqual(result.cameras, []);
  assert.equal(Object.hasOwn(result.summary, 'activeMonitoringAlertCount'), false, 'Deferred monitoring does not report a fabricated healthy zero');
});
