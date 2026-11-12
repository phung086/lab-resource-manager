// UI eligibility mirrors the API only to explain available actions.
// The backend remains authoritative when saving.
export function checklistAvailability(stage: string, status: string, recorded: boolean) {
  if (recorded) return 'planning.checklistRecorded';
  const statuses: Record<string, string[]> = {
    HANDOVER: ['CONFIRMED', 'CHECKED_OUT'],
    RETURN: ['CHECKED_OUT', 'RETURNED'],
    INSPECTION: ['RETURNED']
  };
  return statuses[stage]?.includes(status) ? '' : 'planning.checklistUnavailable';
}

export function intervalError(start: string, end: string) {
  if (!start || !end) return 'planning.chooseTime';
  const from = Date.parse(`${start}:00+07:00`), to = Date.parse(`${end}:00+07:00`);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 'planning.invalidTime';
  if (to - from > 86400000) return 'planning.intervalLimit';
  return '';
}

export function matchesResource(query: string, ...fields: (string | undefined)[]) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  return normalize(fields.filter(Boolean).join(' ')).includes(normalize(query.trim()));
}

export function bundleSelectionError(ids: string[], resources: { id: string; laboratoryId?: string }[]) {
  if (!ids.length || ids.length > 5) return 'planning.bundleLimit';
  const chosen = ids.map(id => resources.find(resource => resource.id === id));
  if (chosen.some(resource => !resource?.laboratoryId)) return 'planning.bundleMissingLab';
  return chosen.some(resource => resource!.laboratoryId !== chosen[0]!.laboratoryId) ? 'api.PLAN_SAME_LAB_REQUIRED' : '';
}

// Authentication, timeout and throttling cannot resolve whether an earlier POST committed.
export function definitiveBundleRejection(status: number) {
  return status >= 400 && status < 500 && ![401, 403, 408, 429].includes(status);
}
