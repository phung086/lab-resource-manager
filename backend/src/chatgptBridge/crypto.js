import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const newOpaque = () => randomBytes(32).toString('base64url');
export const hashToken = token => createHash('sha256').update(String(token)).digest('hex');
export const pkceChallenge = verifier => createHash('sha256').update(verifier, 'ascii').digest('base64url');
export function equalSecret(left, right) {
  const a = Buffer.from(String(left)); const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function encryptionKey(value) {
  const key = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'base64');
  if (key.length !== 32) throw new Error('BRIDGE_SECRET_KEY_INVALID');
  return key;
}

export function seal(value, key, context) {
  if (typeof value !== 'string' || Buffer.byteLength(value) > 4096 || typeof context !== 'string' || !context)
    throw new Error('BRIDGE_SECRET_INVALID');
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', encryptionKey(key), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function open(value, key, context) {
  try {
    if (typeof value !== 'string' || value.length > 6000 || typeof context !== 'string' || !context) throw new Error();
    const parts = value.split('.');
    if (parts.length !== 4 || parts[0] !== 'v1' || parts.slice(1).some(p => !/^[A-Za-z0-9_-]*$/.test(p))) throw new Error();
    const iv = Buffer.from(parts[1], 'base64url'); const tag = Buffer.from(parts[2], 'base64url');
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(key), iv);
    decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
  } catch { throw new Error('BRIDGE_SECRET_UNAVAILABLE'); }
}
