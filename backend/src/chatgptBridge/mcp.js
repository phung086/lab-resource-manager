import { McpServer, createMcpHandler, fromJsonSchema, ProtocolError } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { CallbackError } from './network.js';
import { bridgeError } from './access.js';
import { z } from 'zod';
import { RequestGate } from '../assistant/assistantRuntime.js';
const uuid = { type: 'string', format: 'uuid' };
const schema = properties => fromJsonSchema({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const arbitraryObject = fromJsonSchema({ type: 'object', additionalProperties: true });
export function buildBridgeMcp({ oauth, requests, events, settings }) {
  const gate = new RequestGate(settings.maxConcurrent || 4);
  return async (req, res, next) => {
    let release, handler, timer;
    const pending = new Set(), controller = new globalThis.AbortController();
    const abort = () => controller.abort(bridgeError(499, 'ASSISTANT_CANCELLED'));
    req.once('aborted', abort); res.once('close', abort);
    try {
      const value = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
      if (!value) throw bridgeError(401, 'AUTH_REQUIRED');
      const identity = await oauth.authenticate(value); release = gate.acquire(identity.grant.id);
      timer = setTimeout(() => controller.abort(bridgeError(504, 'ASSISTANT_TIMEOUT')), 15000);
      const run = async operation => {
        const work = Promise.resolve().then(operation); pending.add(work);
        try { return await work; } finally { pending.delete(work); }
      };
      handler = createMcpHandler(() => {
        const server = new McpServer({ name: 'lab-customer-support', version: '1.0.0' }, { capabilities: { events: {} } });
        const reply = async operation => {
          try { const result = await run(operation); return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result }; }
          catch (error) { const result = { error: { code: error.code || (error instanceof z.ZodError ? 'VALIDATION_ERROR' : 'DATA_UNAVAILABLE') } };
            return { isError: true, content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result }; }
        };
        server.registerTool('get_question_context', { description: 'Read a pending customer question, versioned LAB rules and request-bound read schemas. Never use admin identity for business reads.',
          inputSchema: schema({ requestId: uuid }), annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
        input => reply(() => requests.context(identity.grant, input.requestId)));
        server.registerTool('read_question_data', { description: 'Read fresh LAB data as the customer bound to this question. Allowlisted tools only, no identity overrides or business mutations.',
          inputSchema: schema({ requestId: uuid, tool: { type: 'string', maxLength: 80 }, input: { type: 'object', additionalProperties: true } }),
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
        (input, ctx) => reply(() => requests.readTool(identity.grant, input, { signal: globalThis.AbortSignal.any([controller.signal, ctx.signal].filter(Boolean)) })));
        server.registerTool('publish_question_reply', { description: 'Publish a plain-text AI reply to this pending question. No account, booking, payment, resource or staff mutations. Identical replay is idempotent.',
          inputSchema: schema({ requestId: uuid, generation: uuid, answer: { type: 'string', minLength: 2, maxLength: 6000 } }),
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
        input => reply(() => requests.reply(identity.grant, input)));
        for (const method of ['list', 'subscribe', 'unsubscribe']) {
          server.server.setRequestHandler(`events/${method}`, { params: arbitraryObject, result: arbitraryObject }, params => run(async () => {
            const { _meta, ...payload } = params; void _meta;
            try { return await events[method](identity.grant, payload); }
            catch (error) { throw new ProtocolError(error instanceof z.ZodError ? -32602 : -32015, 'Event request failed',
              { reason: error instanceof CallbackError ? error.reason : error.code || 'unavailable' }); }
          }));
        }
        return server;
      // Events use the modern protocol; authenticated 2025 clients can still
      // discover/call the same tools through the SDK's stateless adapter.
      }, { legacy: 'stateless', responseMode: 'json' });
      await toNodeHandler(handler)(req, res, req.body);
    } catch (error) {
      if (!res.headersSent && !res.destroyed) {
        if (error.status === 401 || error.status === 403) res.set('WWW-Authenticate', `Bearer resource_metadata="${settings.publicOrigin}/.well-known/oauth-protected-resource/mcp/support-bridge"`);
        next(error.status ? error : bridgeError(503, 'MCP_UNAVAILABLE'));
      }
    } finally {
      clearTimeout(timer); req.off('aborted', abort); res.off('close', abort);
      await Promise.allSettled([...pending]);
      try { if (handler) await handler.close(); } finally { release?.(); }
    }
  };
}
