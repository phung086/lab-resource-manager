import { HttpError } from '../middleware/errors.js';
export class RequestGate {
  constructor(limit = 4) { this.limit = limit; this.active = new Set(); }
  acquire(actorId) {
    if (this.active.has(actorId)) throw new HttpError(409, 'ASSISTANT_BUSY', { retryAfterSeconds: 2 }, 'ASSISTANT_BUSY');
    if (this.active.size >= this.limit) throw new HttpError(503, 'ASSISTANT_OVERLOADED', { retryAfterSeconds: 2 }, 'ASSISTANT_OVERLOADED');
    this.active.add(actorId); let released = false;
    return () => { if (!released) { released = true; this.active.delete(actorId); } };
  }
}
export class ModelCircuitBreaker {
  constructor({ threshold = 3, cooldownMs = 30000, now = Date.now } = {}) {
    this.threshold = threshold; this.cooldownMs = cooldownMs; this.now = now;
    this.failures = 0; this.openUntil = 0; this.probing = false; this.generation = 0;
  }
  enter() {
    if (this.openUntil) {
      if (this.now() < this.openUntil || this.probing) return null;
      this.probing = true; this.generation += 1;
    }
    return { generation: this.generation, probe: this.probing };
  }
  finish(lease, outcome) {
    if (!lease || lease.generation !== this.generation) return;
    if (lease.probe) this.probing = false;
    if (outcome === 'cancelled') return;
    if (outcome === 'success') { this.failures = 0; this.openUntil = 0; return; }
    this.failures += 1;
    if (lease.probe || this.failures >= this.threshold) { this.openUntil = this.now() + this.cooldownMs; this.generation += 1; }
  }
}
export function abortReason(signal) {
  if (signal?.reason instanceof HttpError) return signal.reason;
  return new HttpError(499, 'ASSISTANT_CANCELLED', undefined, 'ASSISTANT_CANCELLED');
}
export function assertNotAborted(signal) { if (signal?.aborted) throw abortReason(signal); }
export async function withinSignal(work, signal) {
  assertNotAborted(signal);
  let listener;
  try {
    return await Promise.race([Promise.resolve().then(work), new Promise((_, reject) => {
      listener = () => reject(abortReason(signal)); signal.addEventListener('abort', listener, { once: true });
      if (signal.aborted) listener();
    })]);
  } finally { if (listener) signal.removeEventListener('abort', listener); }
}
export async function closeWithin(client, milliseconds = 1000) {
  let timeout;
  try { await Promise.race([Promise.resolve().then(() => client.close()).catch(() => {}), new Promise(resolve => { timeout = setTimeout(resolve, milliseconds); })]); }
  finally { clearTimeout(timeout); }
}
