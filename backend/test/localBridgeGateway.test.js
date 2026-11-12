import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import test from 'node:test';
import { createLocalBridgeGateway } from '../scripts/startLocalBridgeGateway.mjs';

test('local gateway preserves main callback bytes and routes only the exact OAuth/MCP allowlist', async () => {
  const received = [];
  const upstream = area => createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    received.push({ area, path: req.url, body: Buffer.concat(chunks).toString(), headers: req.headers });
    res.writeHead(200, { 'content-type': 'application/json', 'x-fixture-upstream': area });
    res.end(JSON.stringify({ area }));
  });
  const main = upstream('main'), bridge = upstream('bridge');
  const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  await listen(main); await listen(bridge);
  const gateway = createLocalBridgeGateway({ backendPort: main.address().port, bridgePort: bridge.address().port });
  await listen(gateway);
  const call = (path, method = 'GET', body = '') => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: gateway.address().port, path, method,
      headers: { 'x-forwarded-for': '203.0.113.1', forwarded: 'for=203.0.113.1', authorization: 'Bearer transport-fixture' } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString() }));
    }); req.on('error', reject); req.end(body);
  });
  try {
    const ipn = '/api/payments/vnpay/ipn?vnp_TxnRef=transport-fixture&literal=a%2Bb';
    assert.equal((await call(ipn)).headers['x-fixture-upstream'], 'main');
    assert.equal(received.at(-1).path, ipn);
    const body = '{"jsonrpc":"2.0","method":"server/discover","params":{}}';
    assert.equal((await call('/mcp/support-bridge', 'POST', body)).headers['x-fixture-upstream'], 'bridge');
    assert.equal(received.at(-1).body, body);
    assert.equal(received.at(-1).headers.authorization, 'Bearer transport-fixture');
    assert.equal(received.at(-1).headers['x-forwarded-for'], undefined);
    assert.equal(received.at(-1).headers.forwarded, undefined);
    assert.equal((await call('/.well-known/oauth-protected-resource/mcp/support-bridge')).headers['x-fixture-upstream'], 'bridge');
    const before = received.length;
    for (const path of ['/oauth/chatgpt/unknown', '/mcp/support-bridge/extra', '//example.com/private']) assert.equal((await call(path)).status, path.startsWith('//') ? 400 : 404);
    assert.equal(received.length, before, 'Rejected paths never reach either backend');
    assert.equal((await call('/api/resources')).headers['x-fixture-upstream'], 'main', 'Review business API is never publicly routed');
  } finally {
    await Promise.all([gateway, main, bridge].map(server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); })));
  }
});
