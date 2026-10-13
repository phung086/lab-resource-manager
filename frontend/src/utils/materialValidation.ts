export type Material = { id: string; code: string; name: string; laboratoryId: string; stockItem: { balance: number; unit: string } | null };
export type MaterialMaintenance = { id: string; title: string; status: string; resource?: { laboratoryId?: string } };
export type MaterialDraft = { kind: string; quantity: string; unit: string; reference: string; reason: string; maintenanceId: string };
export type MaterialErrors = Partial<Record<keyof MaterialDraft | 'resourceId', string>>;
export const emptyMaterialDraft = (): MaterialDraft => ({ kind: 'RECEIPT', quantity: '', unit: '', reference: '', reason: '', maintenanceId: '' });
export function validateMaterialMovement(draft: MaterialDraft, item: Material | undefined, role: string, maintenance: MaterialMaintenance[]) {
  const errors: MaterialErrors = {};
  if (!item) errors.resourceId = 'ui.materials.selectRequired';
  if (!['RECEIPT', 'ISSUE', 'ADJUSTMENT'].includes(draft.kind) || !['ADMIN', 'LAB_STAFF'].includes(role) || (draft.kind === 'ADJUSTMENT' && role !== 'ADMIN')) errors.kind = 'ui.materials.kindInvalid';
  else if (!item?.stockItem && draft.kind !== 'RECEIPT') errors.kind = 'ui.materials.openingRequired';
  const quantity = Number(draft.quantity), unit = (item?.stockItem?.unit || draft.unit).trim();
  if (!draft.quantity.trim() || !Number.isInteger(quantity) || Math.abs(quantity) > 1000000 || quantity === 0 || (draft.kind !== 'ADJUSTMENT' && quantity < 0)) errors.quantity = 'ui.materials.quantityInvalid';
  const delta = draft.kind === 'ISSUE' ? -quantity : quantity;
  const balanceAfter = (item?.stockItem?.balance || 0) + delta;
  if (!errors.quantity && balanceAfter < 0) errors.quantity = 'ui.materials.insufficient';
  if (!errors.quantity && balanceAfter > 2147483647) errors.quantity = 'ui.materials.balanceLimit';
  if (!unit || unit.length > 30) errors.unit = 'ui.materials.unitLength';
  const reference = draft.reference.trim(), reason = draft.reason.trim();
  if (reference.length < 2 || reference.length > 120) errors.reference = 'ui.materials.referenceLength';
  if (reason.length < 5 || reason.length > 500) errors.reason = 'ui.materials.reasonLength';
  if (draft.maintenanceId && (draft.kind !== 'ISSUE' || !maintenance.some(job => job.id === draft.maintenanceId && ['scheduled', 'in_progress'].includes(job.status) && job.resource?.laboratoryId === item?.laboratoryId))) errors.maintenanceId = 'ui.materials.maintenanceInvalid';
  return { errors, balanceAfter, data: Object.keys(errors).length ? null : { resourceId: item!.id, kind: draft.kind, quantity, unit, reference, reason, ...(draft.maintenanceId ? { maintenanceId: draft.maintenanceId } : {}) } };
}
