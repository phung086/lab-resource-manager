const lifetime = 7 * 24 * 60 * 60 * 1000;
const key = (actorId: string) => actorId;
const memory = new Map<string, LocalDraft | null>();
const pending = new Set<string>();
export const draftChangeEvent='lrm:local-draft-change';
const notify=()=>{if(typeof window.dispatchEvent==='function')window.dispatchEvent(new Event(draftChangeEvent));};
const warn = (event: BeforeUnloadEvent) => { if (pending.size) { event.preventDefault(); event.returnValue = ''; } };
export function localDraftPending(actorId: string) { return pending.has(actorId); }
export type LocalDraft = {
  version: 1; savedAt: number; draft: Record<string,string>;
  original?: unknown;
};
export function readLocalDraft(actorId: string, valid: (value: LocalDraft) => boolean): LocalDraft | null {
  if (!actorId) return null;
  if (memory.has(actorId)) {
    const cached = memory.get(actorId) || null;
    return cached && Date.now() - cached.savedAt <= lifetime && valid(cached) ? cached : null;
  }
  const raw = localStorage.getItem(key(actorId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    try { if (sessionStorage.getItem(key(actorId)+':cleared') === String(value.savedAt)) return null; } catch { /* Memory still protects this session. */ }
    if (value.version !== 1 || !Number.isFinite(value.savedAt) || value.savedAt > Date.now() || Date.now() - value.savedAt > lifetime ||
      !value.draft || !valid(value)) return null;
    return value;
  } catch { return null; }
}
export function writeLocalDraft(actorId: string, value: LocalDraft) {
  if (!actorId) throw new Error('Missing draft owner');
  memory.set(actorId,value);
  try { localStorage.setItem(key(actorId), JSON.stringify(value)); pending.delete(actorId); }
  catch (error) { pending.add(actorId); window.addEventListener('beforeunload',warn); throw error; }
  finally { notify(); }
}
export function clearLocalDraft(actorId: string) {
  const cached = memory.get(actorId);
  try {
    const savedAt = cached?.savedAt ?? JSON.parse(localStorage.getItem(key(actorId)) || 'null')?.savedAt;
    if (savedAt) sessionStorage.setItem(key(actorId)+':cleared',String(savedAt));
  } catch { /* Clearing local storage below remains authoritative when available. */ }
  memory.set(actorId,null); pending.delete(actorId);
  try { localStorage.removeItem(key(actorId)); } finally { notify(); }
}
