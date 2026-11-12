import assert from 'node:assert/strict';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const url = new URL(process.env.CHATGPT_BRIDGE_PUBLIC_ORIGIN || '');
assert.equal(url.protocol, 'https:');
assert.equal(url.href, url.origin + '/');
const endpoint = url.origin + '/mcp/support-bridge';
const registeredAppId = process.env.CHATGPT_BRIDGE_REGISTERED_APP_ID?.replace(/^plugin_/, '');
if (registeredAppId !== undefined) assert.match(registeredAppId, /^asdk_app_[a-f0-9]{32}$/, 'Use the verified app ID from ChatGPT, not a URL');
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
const target = new URL('../logs/chatgpt-bridge-review/package/' +
  (registeredAppId ? 'lab-support-bridge-chatgpt/' : 'lab-support-bridge/'), import.meta.url);
await mkdir(target, { recursive: true }); await cp(source, target, { recursive: true });
const manifest = JSON.parse(await readFile(new URL('plugin.json', target), 'utf8'));
assert.equal(manifest.name, 'lab-support-bridge');
assert.ok(manifest.extensions['com.openai'].interface.shortDescription.length <= 30);
if (registeredAppId) {
  // Account-specific Cloud package reuses an already registered OAuth connection.
  // The portable package remains independent of any ChatGPT account ID.
  manifest.extensions['com.openai'].apps = './.app.json';
  await writeFile(new URL('.app.json', target), JSON.stringify({ apps: { 'lab-support': { id: registeredAppId, required: true } } }, null, 2) + '\n');
  await rm(new URL('mcp.json', target), { force: true });
} else {
  delete manifest.extensions['com.openai'].apps;
  await rm(new URL('.app.json', target), { force: true });
  await writeFile(new URL('mcp.json', target), JSON.stringify({
    $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
    mcpServers: { 'lab-support': { type: 'streamable-http', url: endpoint } }
  }, null, 2) + '\n');
}
await writeFile(new URL('plugin.json', target), JSON.stringify(manifest, null, 2) + '\n');
console.log('Verified ' + (registeredAppId ? 'ChatGPT Cloud' : 'portable') + ' plugin source: ' + fileURLToPath(target));
