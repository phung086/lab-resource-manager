import type { IncidentSeverity } from '../types/incident';
export type IncidentDraft = { resourceId: string; severity: IncidentSeverity; category: string; title: string; description: string };
export type IncidentField = keyof IncidentDraft | 'resolution';
export type IncidentErrors = Partial<Record<IncidentField, string>>;
export function validateIncidentDraft(draft: IncidentDraft, resourceIds: string[]) {
  const errors: IncidentErrors = {};
  const title = draft.title.trim(), description = draft.description.trim(), category = draft.category.trim();
  if (!draft.resourceId) errors.resourceId = 'ui.incident.resourceRequired';
  else if (!resourceIds.includes(draft.resourceId)) errors.resourceId = 'ui.incident.resourceUnavailable';
  if (!['low', 'medium', 'high', 'critical'].includes(draft.severity)) errors.severity = 'ui.incident.severityInvalid';
  if (category.length > 100) errors.category = 'ui.incident.categoryLength';
  if (title.length < 3 || title.length > 255) errors.title = 'ui.incident.titleLength';
  if (description.length < 3 || description.length > 4000) errors.description = 'ui.incident.descriptionLength';
  return { errors, data: Object.keys(errors).length ? null : { resourceId: draft.resourceId, severity: draft.severity, category: category || null, title, description } };
}
export function validateIncidentResolution(value: string) {
  const resolution = value.trim();
  return { resolution, error: resolution.length < 3 || resolution.length > 4000 ? 'ui.incident.resolutionLength' : '' };
}
