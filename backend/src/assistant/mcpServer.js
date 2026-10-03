import { McpServer, fromJsonSchema } from '@modelcontextprotocol/server';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import rateLimit from 'express-rate-limit';
import { assistantTools } from './toolHandlers.js';
import { config } from '../config.js';
import { HttpError } from '../middleware/errors.js';
import { localizeError } from '../locales/index.js';
import { RequestGate, closeWithin, assertNotAborted, withinSignal } from './assistantRuntime.js';
const gate = new RequestGate(config.assistantConcurrency * 2);
export const mcpRateLimit = rateLimit({ windowMs: 60000, limit: config.assistantRateLimit * 10 + 10, keyGenerator: req => req.user.id, standardHeaders: 'draft-7', legacyHeaders: false, handler: (_req, _res, next) => next(new HttpError(429, 'ASSISTANT_RATE_LIMITED', { retryAfterSeconds: 60 }, 'ASSISTANT_RATE_LIMITED')) });
export async function handleMcp(req, res, next) {
  let release, server, transport;
  const controller = new globalThis.AbortController();
  const timer = setTimeout(() => controller.abort(new HttpError(504, 'ASSISTANT_TIMEOUT', undefined, 'ASSISTANT_TIMEOUT')), config.assistantTimeoutMs);
  const pending = new Set();
  let cleanupPromise;
  const cleanup = () => {
    if (!cleanupPromise) cleanupPromise = (async () => {
      clearTimeout(timer);
      req.off('aborted', cancel); res.off('close', cancel); res.off('finish', finish);
      // Prisma reads cannot be forcibly cancelled. Keep admission occupied until
      // already-started work settles, even after its HTTP caller disconnects.
      await Promise.allSettled([...pending]);
      try { if (transport) await closeWithin(transport); if (server) await closeWithin(server); }
      finally { release?.(); release = undefined; }
    })();
    return cleanupPromise;
  };
  const cancel = () => {
    controller.abort(new HttpError(499, 'ASSISTANT_CANCELLED', undefined, 'ASSISTANT_CANCELLED'));
    void cleanup();
  };
  const finish = () => { void cleanup(); };
  req.once('aborted', cancel); res.once('close', cancel); res.once('finish', finish);
  try {
    assertNotAborted(controller.signal);
    if (req.headers.origin && !config.corsOrigins.includes(req.headers.origin)) throw new HttpError(403, 'FORBIDDEN', undefined, 'FORBIDDEN');
    release = gate.acquire(req.user.id);
    server = new McpServer({ name: 'lab-resource-manager', version: '1.0.0' });
    for (const tool of assistantTools) server.registerTool(tool.name, { description: tool.description, inputSchema: fromJsonSchema(tool.inputSchema), annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, async (input, context) => {
      const signal = globalThis.AbortSignal.any([controller.signal, context.signal].filter(Boolean));
      const work = (async () => {
        try {
          assertNotAborted(signal);
          const result = await tool.handler(input, req.user, { signal });
          assertNotAborted(signal);
          return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
        } catch (error) {
          const code = error instanceof HttpError ? error.code || 'DATA_UNAVAILABLE' : 'DATA_UNAVAILABLE';
          const result = { error: { code, message: localizeError(req.locale, code) } };
          return { isError: true, content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
        }
      })();
      pending.add(work);
      try { return await work; } finally { pending.delete(work); }
    });
    transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await withinSignal(() => server.connect(transport), controller.signal);
    await withinSignal(() => transport.handleRequest(req, res, req.body), controller.signal);
    if (res.writableEnded || res.destroyed) await cleanup();
  } catch (error) {
    controller.abort(error);
    void cleanup();
    if (!res.headersSent && !res.destroyed) next(error instanceof HttpError ? error : new HttpError(503, 'MCP_UNAVAILABLE', undefined, 'MCP_UNAVAILABLE'));
  }
}
