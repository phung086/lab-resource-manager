import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import express from 'express';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { handleMcp } from '../src/assistant/mcpServer.js';
import { assistantTools } from '../src/assistant/toolHandlers.js';
import { localeMiddleware } from '../src/locales/index.js';
import { errorHandler } from '../src/middleware/errors.js';

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const tool = assistantTools.find(item => item.name === 'search_resources');
async function serve(app, run) {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
function toolApp(actorId) {
  const app = express(); app.use(express.json(), localeMiddleware);
  // Transport-only harness; the real-auth/database suite remains separate.
  app.post('/mcp', (req, res, next) => { req.user = { id: actorId, role: 'STUDENT' }; void handleMcp(req, res, next); });
  app.use(errorHandler); return app;
}
const call = (base, signal) => fetch(`${base}/mcp`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'Accept-Language': 'en' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_resources', arguments: {} } }) });
async function recovered(base) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await call(base); const body = await response.json();
    if (body.error?.code !== 'ASSISTANT_BUSY') { assert.equal(response.status, 200, JSON.stringify(body)); return body; }
    await delay(10);
  }
  assert.fail('MCP admission did not recover');
}

test('MCP ingress is independently bounded and cannot consume ordinary API allowance', async () => {
  const previous = { rateLimitMax: config.rateLimitMax, mcpAssistantEnabled: config.mcpAssistantEnabled };
  let app;
  try { Object.assign(config, { rateLimitMax: 2, mcpAssistantEnabled: true }); app = createApp(); }
  finally { Object.assign(config, previous); }
  await serve(app, async base => {
    for (let i = 0; i < 20; i += 1) assert.equal((await call(base)).status, 401);
    const excess = await call(base); assert.equal(excess.status, 429); assert.equal((await excess.json()).error.code, 'RATE_LIMITED');
    for (let i = 0; i < 2; i += 1) assert.equal((await fetch(`${base}/health`)).status, 200);
    const apiExcess = await fetch(`${base}/health`); assert.equal(apiExcess.status, 429);
  });
});
test('disconnect aborts an active MCP tool and releases admission for the same account', async () => {
  const original = tool.handler, entered = deferred(), aborted = deferred(); let stalled = true;
  tool.handler = async (_input, _actor, { signal }) => {
    if (!stalled) return { resources: [], source: 'unit-fixture' };
    entered.resolve();
    await new Promise((_, reject) => { signal.addEventListener('abort', () => { aborted.resolve(); reject(signal.reason); }, { once: true }); });
  };
  try {
    await serve(toolApp('transport-cancel'), async base => {
      const controller = new AbortController(), pending = call(base, controller.signal);
      await entered.promise; controller.abort(); await assert.rejects(pending, { name: 'AbortError' }); await aborted.promise;
      stalled = false; assert.deepEqual((await recovered(base)).result.structuredContent.resources, []);
    });
  } finally { tool.handler = original; }
});
test('a cancelled non-cooperative read retains its MCP admission until the read really settles', async () => {
  const original = tool.handler, entered = deferred(), aborted = deferred(), readDone = deferred(); let stalled = true;
  tool.handler = async (_input, _actor, { signal }) => {
    if (stalled) { entered.resolve(); signal.addEventListener('abort', () => aborted.resolve(), { once: true }); await readDone.promise; }
    return { resources: [], source: 'unit-fixture' };
  };
  try {
    await serve(toolApp('transport-drain'), async base => {
      const controller = new AbortController(), pending = call(base, controller.signal);
      await entered.promise; controller.abort(); await assert.rejects(pending, { name: 'AbortError' }); await aborted.promise;
      const duplicate = await call(base); assert.equal(duplicate.status, 409); assert.equal((await duplicate.json()).error.code, 'ASSISTANT_BUSY');
      stalled = false; readDone.resolve(); await recovered(base);
    });
  } finally { readDone.resolve(); tool.handler = original; }
});
test('the direct MCP deadline aborts an active tool and returns a localized timeout', async () => {
  const original = tool.handler, previous = config.assistantTimeoutMs; let aborted = false;
  config.assistantTimeoutMs = 50;
  tool.handler = async (_input, _actor, { signal }) => new Promise((_, reject) => { signal.addEventListener('abort', () => { aborted = true; reject(signal.reason); }, { once: true }); });
  try {
    await serve(toolApp('transport-deadline'), async base => {
      const response = await call(base); assert.equal(response.status, 504);
      const body = await response.json(); assert.equal(body.error.code, 'ASSISTANT_TIMEOUT'); assert.match(body.error.message, /time|long/i); assert.equal(aborted, true);
    });
  } finally { config.assistantTimeoutMs = previous; tool.handler = original; }
});
