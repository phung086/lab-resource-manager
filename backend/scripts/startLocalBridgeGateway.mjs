// Local routing only: preserve the existing main backend, expose only the review
// OAuth/MCP allowlist. Neither database nor business authentication is changed.
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

assert.notEqual(process.env.NODE_ENV, 'production', 'This gateway is for local development only');
const bridgePaths = new Set(['/mcp/support-bridge', '/.well-known/oauth-authorization-server',
  '/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp/support-bridge',
  '/oauth/chatgpt/register', '/oauth/chatgpt/authorize', '/oauth/chatgpt/token', '/oauth/chatgpt/revoke']);
const reserved = path => path.startsWith('/mcp/support-bridge') || path.startsWith('/oauth/chatgpt') || path.startsWith('/.well-known/oauth');
export function createLocalBridgeGateway({ backendPort = 8000, bridgePort = 8002 } = {}) {
  for (const port of [backendPort, bridgePort]) assert.ok(Number.isInteger(port) && port > 0 && port < 65536);
  const server = createServer((incoming, outgoing) => {
    if (!incoming.url?.startsWith('/') || incoming.url.startsWith('//')) { outgoing.writeHead(400).end(); return; }
    let path;
    try { path = new URL(incoming.url, 'http://127.0.0.1').pathname; }
    catch { outgoing.writeHead(400).end(); return; }
    if (reserved(path) && !bridgePaths.has(path)) { outgoing.writeHead(404).end(); return; }
    const port = bridgePaths.has(path) ? bridgePort : backendPort;
    const headers = { ...incoming.headers, host: `127.0.0.1:${port}` };
    delete headers['x-forwarded-for']; delete headers.forwarded;
    const upstream = request({ hostname: '127.0.0.1', port, path: incoming.url, method: incoming.method,
      headers, timeout: 30_000 }, response => {
      outgoing.writeHead(response.statusCode, response.headers); response.pipe(outgoing);
      response.on('error', () => outgoing.destroy());
    });
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(); });
    incoming.on('aborted', () => upstream.destroy());
    outgoing.on('close', () => { if (!outgoing.writableFinished) upstream.destroy(); });
    incoming.pipe(upstream);
  });
  server.requestTimeout = 35_000;
  server.headersTimeout = 10_000;
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createLocalBridgeGateway();
  server.listen(8003, '127.0.0.1', () => console.log('Local gateway 8003: main backend 8000; allowlisted OAuth/MCP review gateway 8002.'));
  server.on('error', error => { console.error('Local gateway failed:', error.code); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    server.close(() => process.exit(0)); server.closeAllConnections();
  });
}
