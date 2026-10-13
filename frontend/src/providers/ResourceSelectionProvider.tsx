import { useEffect, useRef, useState } from 'react';

export type SelectedResource = {
  id: string;
  name: string;
  code: string;
  category: string;
  laboratoryName: string;
};
type Selection = { userId: string; items: SelectedResource[] };
const keyFor = (id: string) => `lrm:resource-selection:v1:${id}`;
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const clip = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : '';
function project(value: any): SelectedResource | null {
  if (!validId(value?.id)) return null;
  return { id: value.id, name: clip(value.name, 240), code: clip(value.code, 120), category: clip(value.category, 40), laboratoryName: clip(value.laboratory?.name ?? value.laboratoryName, 240) };
}
function readItems(userId: string): SelectedResource[] {
  if (!validId(userId)) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(userId)) || '[]');
    if (!Array.isArray(parsed)) return [];
    const unique = new Map<string, SelectedResource>();
    for (const value of parsed.slice(0, 30)) { const item = project(value); if (item) unique.set(item.id, item); }
    return [...unique.values()];
  } catch { return []; }
}

// A shortlist holds display context only. It never promises a reservation or eligibility.
// Scope every read/update to the authenticated identity; remove it at logout/account switch.
export function useResourceSelection(userId: string | undefined) {
  const scope = validId(userId) ? userId : '';
  const [selection, setSelection] = useState<Selection>(() => ({ userId: scope, items: readItems(scope) }));
  const previous = useRef(scope);
  const items = selection.userId === scope ? selection.items : [];
  useEffect(() => {
    if (previous.current && previous.current !== scope) {
      try { localStorage.removeItem(keyFor(previous.current)); } catch { /* The in-memory scope still closes. */ }
      try { sessionStorage.removeItem(`lrm:resource-selection-progress:v1:${previous.current}`); } catch { /* Identity guard still closes the previous view. */ }
    }
    previous.current = scope;
    setSelection(current => current.userId === scope ? current : { userId: scope, items: readItems(scope) });
  }, [scope]);
  function update(change: (current: SelectedResource[]) => SelectedResource[]) {
    if (!scope) return;
    setSelection(current => {
      const next = change(current.userId === scope ? current.items : []);
      try { localStorage.setItem(keyFor(scope), JSON.stringify(next)); } catch { /* Shortlist remains usable in memory. */ }
      return { userId: scope, items: next };
    });
  }
  return {
    items,
    add: (resource: any) => { const item = project(resource); if (item) update(current => current.some(row => row.id === item.id) || current.length >= 30 ? current : [...current, item]); },
    remove: (id: string) => update(current => current.filter(row => row.id !== id)),
    clear: () => update(() => [])
  };
}
