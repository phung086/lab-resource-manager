import { toVietnamDateString, toVietnamTimeString, vietnamTimeToIso } from './timezone.ts';

export type MaintenanceDraft = {
  resourceId: string; title: string; kind: string; startAt: string; endAt: string; notes: string; changeReason: string;
};
export type MaintenanceField = keyof MaintenanceDraft;
export type MaintenanceErrors = Partial<Record<MaintenanceField, string>>;
type OriginalWindow = { resourceId?: string; resource?: { id?: string }; startAt?: string; endAt?: string };

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();
export const normalizeMaintenanceNote = (value: string) => value.split(/\r?\n/).map(normalizeText).filter(Boolean).join('\n');
export const maintenanceLocalTime = (iso?: string) => iso ? toVietnamDateString(iso) + 'T' + toVietnamTimeString(iso) : '';

function strictVietnamTime(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  try {
    const [date, time] = value.split('T');
    const iso = vietnamTimeToIso(date, time);
    return maintenanceLocalTime(iso) === value ? iso : null;
  } catch { return null; }
}

export function validateMaintenanceDraft(draft: MaintenanceDraft, resourceIds: string[], original?: OriginalWindow | null) {
  const errors: MaintenanceErrors = {};
  const title = normalizeText(draft.title);
  const notes = normalizeMaintenanceNote(draft.notes);
  const changeReason = normalizeMaintenanceNote(draft.changeReason);
  if (!draft.resourceId) errors.resourceId = 'ui.maintenance.resourceRequired';
  else if (!resourceIds.includes(draft.resourceId)) errors.resourceId = 'ui.maintenance.resourceUnavailable';
  if (title.length < 3 || title.length > 255) errors.title = 'ui.maintenance.titleLength';
  if (!['maintenance', 'calibration'].includes(draft.kind)) errors.kind = 'ui.maintenance.kindInvalid';
  let startAt = strictVietnamTime(draft.startAt);
  let endAt = strictVietnamTime(draft.endAt);
  if (!startAt) errors.startAt = 'ui.maintenance.startRequired';
  if (!endAt) errors.endAt = 'ui.maintenance.endRequired';
  // A title/notes-only edit must not silently truncate existing timestamp seconds.
  if (startAt && original?.startAt && maintenanceLocalTime(original.startAt) === draft.startAt) startAt = original.startAt;
  if (endAt && original?.endAt && maintenanceLocalTime(original.endAt) === draft.endAt) endAt = original.endAt;
  if (startAt && endAt) {
    const minutes = Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
    if (new Date(startAt) >= new Date(endAt)) errors.endAt = 'ui.maintenance.endAfterStart';
    else if (minutes < 15 || minutes > 90 * 24 * 60) errors.endAt = 'ui.maintenance.durationRange';
  }
  if (notes.length > 2000) errors.notes = 'ui.maintenance.notesLength';
  if (original && (changeReason.length < 5 || changeReason.length > 500)) errors.changeReason = 'ui.maintenance.reasonLength';
  if (Object.keys(errors).length || !startAt || !endAt) return { errors, data: null, windowKey: null };
  const data = { resourceId: draft.resourceId, title, kind: draft.kind, startAt, endAt, notes, ...(original ? { changeReason } : { status: 'scheduled' }) };
  return { errors, data, windowKey: JSON.stringify([draft.resourceId, startAt, endAt]) };
}

export function validateMaintenanceProgress(current: string, next: string, reason: string) {
  const allowed = current === 'scheduled' ? ['in_progress', 'cancelled'] : current === 'in_progress' ? ['completed', 'cancelled'] : [];
  const changeReason = normalizeMaintenanceNote(reason);
  return { statusValid: allowed.includes(next), reasonValid: changeReason.length >= 5 && changeReason.length <= 500, changeReason };
}
