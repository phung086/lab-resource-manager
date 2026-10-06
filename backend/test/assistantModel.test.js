import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { modelPlanFormat, validateModelPlan, planWithModel, summarizeWithModel } from '../src/assistant/assistantModel.js';
import { listAssistantTools } from '../src/assistant/assistantService.js';

test('strict planner schema only exposes existing read-only tools and validates the original MCP contracts', () => {
  const variants = modelPlanFormat.schema.properties.reads.items.anyOf;
  assert.deepEqual(variants.map(item => item.properties.name.enum[0]), listAssistantTools().map(tool => tool.name));
  for (const item of variants) assert.deepEqual(item.properties.input.required, Object.keys(item.properties.input.properties));
  const parsed = validateModelPlan({ kind: 'LAB', reply: '', selectedSlotIndex: null, reads: [{ name: 'search_resources', input: { query: null, category: 'EQUIPMENT', limit: 5 } }] });
  assert.deepEqual(parsed.reads[0].input, { category: 'EQUIPMENT', limit: 5 });
  for (const read of [{ name: 'get_resource_detail', input: {} }, { name: 'search_resources', input: { limit: 200 } }, { name: 'search_resources', input: { laboratoryId: 'foreign' } }, { name: 'search_resources', input: { category: 'INSTRUCTOR' } }]) assert.throws(() => validateModelPlan({ kind: 'LAB', reply: '', selectedSlotIndex: null, reads: [read] }));
  assert.throws(() => validateModelPlan({ kind: 'CHAT', reply: 'Hi', selectedSlotIndex: 0, reads: [] }));
  assert.throws(() => validateModelPlan({ kind: 'LAB', reply: 'There are 10 free rooms', selectedSlotIndex: null, reads: [] }));
  assert.throws(() => validateModelPlan({ kind: 'LAB', reply: '', selectedSlotIndex: 0, reads: [{ name: 'search_resources', input: {} }] }));
  assert.throws(() => validateModelPlan({ kind: 'LAB', reply: '', selectedSlotIndex: null, reads: [{ name: 'find_available_slots', input: {} }, { name: 'find_available_slots', input: {} }] }));
});

test('installed OpenAI SDK serializes real Responses requests with strict planning, history, no storage and finite output', async t => {
  const requests = [];
  const plan = { kind: 'CHAT', reply: 'Hello from the unit fixture.', selectedSlotIndex: null, reads: [] };
  const server = http.createServer(async (req, res) => {
    let text = ''; for await (const chunk of req) text += chunk;
    requests.push({ path: req.url, body: JSON.parse(text) });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ id: 'unit-response', object: 'response', status: 'completed', model: 'unit-model', output: [{ id: 'unit-message', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: requests.length === 1 ? JSON.stringify(plan) : 'Only current data are summarized.', annotations: [] }] }] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const previous = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${server.address().port}/v1`;
  t.after(async () => { if (previous === undefined) delete process.env.OPENAI_BASE_URL; else process.env.OPENAI_BASE_URL = previous; await new Promise(resolve => server.close(resolve)); });
  const settings = { openaiApiKey: 'unit-key-not-a-real-secret', openaiModel: 'unit-model', assistantTimeoutMs: 1000 };
  const payload = { question: 'Hello', history: [{ question: 'Earlier question', reply: 'Earlier casual reply' }], now: '2030-01-01T00:00:00Z' };
  assert.deepEqual(await planWithModel({ payload, locale: 'en', settings }), plan);
  const eligibility = [{ resourceId: 'unit-resource', result: { bookable: false, missingTraining: [{ name: 'Safety induction' }] } }];
  assert.equal(await summarizeWithModel({ question: 'Find equipment', history: payload.history, toolResults: [{ tool: 'search_resources', result: { resources: [] } }], eligibility, locale: 'en', settings }), 'Only current data are summarized.');
  assert.equal(requests.length, 2);
  for (const request of requests) { assert.equal(request.path, '/v1/responses'); assert.equal(request.body.store, false); assert.ok(request.body.max_output_tokens <= 2000); assert.match(request.body.instructions, /untrusted/); assert.equal(request.body.model, 'unit-model'); }
  assert.equal(requests[0].body.text.format.type, 'json_schema'); assert.equal(requests[0].body.text.format.strict, true);
  assert.deepEqual(JSON.parse(requests[1].body.input).history, payload.history);
  assert.deepEqual(JSON.parse(requests[1].body.input).eligibility, eligibility);
  assert.ok(!JSON.stringify(requests).includes('unit-key-not-a-real-secret'));
});
