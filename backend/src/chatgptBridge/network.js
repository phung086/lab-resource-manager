import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createHmac, timingSafeEqual } from 'node:crypto';

export class CallbackError extends Error {
  constructor(reason) { super('Callback endpoint unavailable'); this.reason = reason; }
}

export function publicAddress(address) {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 ||
      a === 172 && b >= 16 && b <= 31 ||
      a === 192 && (b === 168 || b === 88 && c === 99 || b === 0 && (c === 0 || c === 2)) ||
      a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) ||
      a === 203 && b === 0 && c === 113);
  }
  if (family !== 6) return false;
  const host = new URL(`https://[${address}]/`).hostname.slice(1, -1);
  const left = host.split('::')[0].split(':').filter(Boolean);
  const a = parseInt(left[0] || '0', 16), b = parseInt(left[1] || '0', 16);
  // Only ordinary globally routable unicast; exclude transition, documentation
  // and special-purpose blocks instead of accepting mapped private IPv4.
  return a >= 0x2000 && a <= 0x3fff && a !== 0x2002 &&
    !(a === 0x2001 && (b < 0x200 || b === 0xdb8)) &&
    !(a === 0x3fff && b < 0x1000);
}

export function callbackUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new CallbackError('invalid_url'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash ||
      url.port && url.port !== '443' || url.href.length > 2048) throw new CallbackError('invalid_url');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hostname) && !publicAddress(hostname)) throw new CallbackError('non_public_address');
  return url;
}

export function signingKey(secret) {
  if (typeof secret !== 'string' || !/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret)) throw new CallbackError('invalid_secret');
  const encoded = secret.slice(6), key = Buffer.from(encoded, 'base64');
  if (key.length < 24 || key.length > 64 || key.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) throw new CallbackError('invalid_secret');
  return key;
}

export function signedHeaders(secret, id, body, { timestamp = Math.floor(Date.now() / 1000), oldSecret } = {}) {
  const sign = value => 'v1,' + createHmac('sha256', signingKey(value)).update(`${id}.${timestamp}.${body}`).digest('base64');
  return { 'Content-Type': 'application/json', 'webhook-id': id,
    'webhook-timestamp': String(timestamp), 'webhook-signature': [sign(secret), ...(oldSecret ? [sign(oldSecret)] : [])].join(' ') };
}

export function equalChallenge(expected, received) {
  if (typeof received !== 'string' || received.length > 256) return false;
  const a = Buffer.from(expected), b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Resolve once, check every returned address, pin the connection to an approved
// address, and preserve the hostname for certificate verification. Never use
// fetch's unpinned second DNS resolution or a proxy/redirect for these callbacks.
export async function postWebhook(value, { body, headers, timeoutMs = 10000 }, { resolve = lookup, request = https.request } = {}) {
  const url = callbackUrl(value), hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (typeof body !== 'string' || Buffer.byteLength(body) > 262144) throw new CallbackError('payload_too_large');
  const deadline = globalThis.AbortSignal.timeout(Math.min(timeoutMs, 10000));
  let addresses;
  try {
    addresses = await Promise.race([
      resolve(hostname, { all: true, verbatim: true }),
      new Promise((_, reject) => deadline.addEventListener('abort', () => reject(new CallbackError('timeout')), { once: true }))
    ]);
  } catch (error) { throw error instanceof CallbackError ? error : new CallbackError('dns_failed'); }
  if (!addresses.length || addresses.some(row => !publicAddress(row.address))) throw new CallbackError('non_public_address');
  const destination = addresses[0];
  return new Promise((resolveResponse, reject) => {
    const req = request(url, { method: 'POST', agent: false, signal: deadline,
      servername: hostname, rejectUnauthorized: true,
      lookup: (_hostname, options, done) => {
        if (options?.all) done(null, [destination]); else done(null, destination.address, destination.family);
      }, headers: { ...headers, 'Content-Length': Buffer.byteLength(body) } }, response => {
      let responseBody = '', size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 16384) { response.destroy(); reject(new CallbackError('response_too_large')); }
        else responseBody += chunk.toString('utf8');
      });
      response.on('error', () => reject(new CallbackError('connection_failed')));
      response.on('end', () => resolveResponse({ status: response.statusCode, ok: response.statusCode >= 200 && response.statusCode < 300, body: responseBody }));
    });
    req.on('error', () => reject(new CallbackError(deadline.aborted ? 'timeout' : 'connection_failed')));
    req.end(body);
  });
}
