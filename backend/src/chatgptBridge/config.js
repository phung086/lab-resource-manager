import { isIP } from 'node:net';

export const BRIDGE_SCOPES = Object.freeze(['lab.assistant.read', 'lab.assistant.reply', 'lab.assistant.events']);
export const CHATGPT_STABLE_REDIRECT = 'https://chatgpt.com/connector_platform_oauth_redirect';
const loopback = host => host === 'localhost' || host === '[::1]' || (isIP(host) === 4 && host.startsWith('127.'));

function origin(value, { allowLoopback = false } = {}) {
  let url;
  try { url = new URL(value); } catch { throw new Error('CHATGPT_BRIDGE_ORIGIN_INVALID'); }
  if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname) ||
      (url.protocol !== 'https:' && !(allowLoopback && url.protocol === 'http:' && loopback(url.hostname))))
    throw new Error('CHATGPT_BRIDGE_ORIGIN_INVALID');
  return url.origin;
}

// OpenAI's auth contract documents these two callback modes. Registration still
// requires an exact configured URI; no arbitrary path/subdomain wildcard is used.
export function isChatgptRedirect(value) {
  if (typeof value !== 'string' || value.length > 1024) return false;
  let url;
  try { url = new URL(value); } catch { return false; }
  if (url.origin !== 'https://chatgpt.com' || url.username || url.password || url.search || url.hash) return false;
  return value === CHATGPT_STABLE_REDIRECT || /^https:\/\/chatgpt\.com\/connector\/oauth\/[A-Za-z0-9_-]{1,200}$/.test(value);
}

export function buildBridgeConfig(env = process.env) {
  const enabled = env.CHATGPT_BRIDGE_ENABLED === 'true';
  if (!enabled) return Object.freeze({ enabled: false, publicOrigin: null, uiOrigin: null, resource: null, issuer: null,
    secretKey: null, redirectUris: Object.freeze([CHATGPT_STABLE_REDIRECT]), scopes: BRIDGE_SCOPES });
  const publicOrigin = origin(env.CHATGPT_BRIDGE_PUBLIC_ORIGIN);
  const uiOrigin = origin(env.CHATGPT_BRIDGE_UI_ORIGIN || 'http://localhost:5173', { allowLoopback: env.NODE_ENV !== 'production' });
  const secretKey = String(env.CHATGPT_BRIDGE_SECRET_KEY || '');
  if (!/^[A-Za-z0-9+/]{43}=$/.test(secretKey) || Buffer.from(secretKey, 'base64').length !== 32)
    throw new Error('CHATGPT_BRIDGE_SECRET_KEY_INVALID');
  const redirectUris = (env.CHATGPT_BRIDGE_REDIRECT_URIS || CHATGPT_STABLE_REDIRECT).split(',').map(x => x.trim());
  if (!redirectUris.length || redirectUris.length > 8 || redirectUris.some(uri => !isChatgptRedirect(uri)))
    throw new Error('CHATGPT_BRIDGE_REDIRECT_INVALID');
  return Object.freeze({ enabled, publicOrigin, uiOrigin, resource: `${publicOrigin}/mcp/support-bridge`, issuer: publicOrigin,
    secretKey, redirectUris: Object.freeze([...new Set(redirectUris)]), scopes: BRIDGE_SCOPES,
    consentTtlMs: 5 * 60_000, accessTtlMs: 15 * 60_000, refreshTtlMs: 7 * 86400_000, grantTtlMs: 30 * 86400_000,
    requestTtlMs: 10 * 60_000, toolTimeoutMs: 10_000, maxConcurrent: 4, subscriptionTtlMs: 86400_000 });
}

export const settings = buildBridgeConfig();
