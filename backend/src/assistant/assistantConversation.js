import { createHash, randomUUID } from 'node:crypto';
import { HttpError } from '../middleware/errors.js';

export const CONVERSATION_LIMITS = Object.freeze({ ttlMs: 30 * 60_000, maxSessions: 200, maxTurns: 10, maxBytes: 12_000, maxChoices: 5 });
const digest = value => createHash('sha256').update(value || '').digest('hex');
const expired = () => new HttpError(409, 'ASSISTANT_CONVERSATION_EXPIRED', undefined, 'ASSISTANT_CONVERSATION_EXPIRED');
function boundedText(value, bytes) {
  let text = value;
  while (text && Buffer.byteLength(JSON.stringify(text)) > bytes) text = text.slice(0, Math.max(0, text.length - 100));
  return text;
}

// This is temporary conversational context, never a business record or an
// authorization cache. No bearer credential or raw tool result is retained.
// A bounded display transcript is separate from provider history and can be
// shared only through an explicit, owner-validated human-support request.
export class AssistantConversationStore {
  constructor({ now = Date.now, limits = CONVERSATION_LIMITS, sweepMs = 60_000 } = {}) {
    this.now = now; this.limits = limits; this.sessions = new Map();
    if (sweepMs) { this.timer = setInterval(() => this.prune(), sweepMs); this.timer.unref?.(); }
  }
  dispose() { clearInterval(this.timer); this.sessions.clear(); }
  prune() { for (const [id, row] of this.sessions) if (row.expiresAt <= this.now()) this.sessions.delete(id); }
  owner({ actorId, authorization, actorRole }) { return `${actorId}:${digest(authorization)}:${actorRole || ''}`; }
  open(id, context) {
    this.prune();
    if (!id) return { id: randomUUID(), owner: this.owner(context), actorId: context.actorId, session: digest(context.authorization), turns: [], supportTranscript: [], resources: [], slots: [] };
    const row = this.sessions.get(id);
    if (!row || row.owner !== this.owner(context)) throw expired();
    return structuredClone(row);
  }
  commit(row, question, response) {
    const safeReply = response.source === 'model_conversation' ? boundedText(response.answer, 3000) : '[LAB guidance or lookup; previous business results are not current evidence.]';
    row.turns.push({ question: boundedText(question, 5000), reply: safeReply });
    row.turns = row.turns.slice(-this.limits.maxTurns);
    while (row.turns.length > 1 && Buffer.byteLength(JSON.stringify(row.turns)) > this.limits.maxBytes) row.turns.shift();
    // Explicit human handoff may copy these server-owned display messages.
    // They are never replayed to the model as current business evidence.
    const createdAt = new Date(this.now()).toISOString();
    row.supportTranscript = [...(row.supportTranscript || []),
      { kind: 'CUSTOMER', body: boundedText(question, 5000), createdAt },
      { kind: 'ASSISTANT', body: boundedText(response.answer || '', 5000), createdAt },
    ].slice(-this.limits.maxTurns * 2);
    while (row.supportTranscript.length > 2 && Buffer.byteLength(JSON.stringify(row.supportTranscript)) > this.limits.maxBytes) row.supportTranscript.splice(0, 2);
    const results = response.toolResults || [];
    const slots = results.flatMap(({ result }) => result.slots || []);
    const resources = results.flatMap(({ result }) => Array.isArray(result.resources) ? result.resources : result.resource ? [result.resource] : []);
    if (slots.length) {
      row.slots = slots.slice(0, this.limits.maxChoices).map(({ resourceId, startAt, endAt }) => ({ resourceId, startAt, endAt }));
      row.resources = [...new Set(row.slots.map(slot => slot.resourceId))].map(id => ({ id }));
    } else if (results.some(({ result }) => 'slots' in result)) { row.slots = []; row.resources = []; }
    else if (resources.length) { row.resources = resources.slice(0, this.limits.maxChoices).map(({ id }) => ({ id })); row.slots = []; }
    else if (results.some(({ result }) => Array.isArray(result.resources))) { row.resources = []; row.slots = []; }
    if (results.some(({ result }) => ['NOT_FOUND', 'FORBIDDEN'].includes(result.error?.code))) { row.resources = []; row.slots = []; }
    row.expiresAt = this.now() + this.limits.ttlMs;
    this.prune();
    if (!this.sessions.has(row.id) && this.sessions.size >= this.limits.maxSessions) this.sessions.delete(this.sessions.keys().next().value);
    this.sessions.delete(row.id); this.sessions.set(row.id, structuredClone(row));
    return { id: row.id, expiresAt: new Date(row.expiresAt).toISOString(), retainedTurns: row.turns.length };
  }
  remove(id, context) { this.open(id, context); this.sessions.delete(id); }
  forgetSession({ actorId, authorization }) {
    const session = digest(authorization);
    for (const [id, row] of this.sessions) if (row.actorId === actorId && row.session === session) this.sessions.delete(id);
  }
}
