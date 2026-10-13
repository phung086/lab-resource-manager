import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const url = new URL(process.env.CHATGPT_BRIDGE_PUBLIC_ORIGIN || '');
assert.equal(url.protocol, 'https:');
assert.equal(url.href, url.origin + '/');
const endpoint = url.origin + '/mcp/support-bridge';
const response = await fetch(endpoint, { method: 'POST', redirect: 'error', signal: globalThis.AbortSignal.timeout(10000),
  headers: { 'Content-Type': 'application/json', 'Mcp-Method': 'server/discover' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: {} }) });
assert.equal(response.status, 401, 'Bridge must require OAuth');
assert.ok(response.headers.get('www-authenticate')?.includes('resource_metadata'));
const metadata = await fetch(url.origin + '/.well-known/oauth-protected-resource/mcp/support-bridge',
  { redirect: 'error', signal: globalThis.AbortSignal.timeout(10000) }).then(result => result.json());
assert.equal(metadata.resource, endpoint);
assert.deepEqual(metadata.authorization_servers, [url.origin]);
const source = new URL('../../plugins/lab-support-bridge/', import.meta.url);
const target = new URL('../logs/chatgpt-bridge-review/package/lab-support-bridge/', import.meta.url);
await mkdir(target, { recursive: true }); await cp(source, target, { recursive: true });
const manifest = JSON.parse(await readFile(new URL('plugin.json', target), 'utf8'));
assert.equal(manifest.name, 'lab-support-bridge');
assert.ok(manifest.extensions['com.openai'].interface.shortDescription.length <= 30);
await writeFile(new URL('mcp.json', target), JSON.stringify({
  $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
  mcpServers: { 'lab-support': { type: 'streamable-http', url: endpoint } }
}, null, 2) + '\n');
console.log('Verified private plugin source: ' + fileURLToPath(target));
