import type { MaintenanceDraft } from './maintenanceValidation';
import { readLocalDraft, writeLocalDraft, clearLocalDraft, localDraftPending } from './localDraftStore.ts';
export type StoredMaintenanceDraft = { version:1; savedAt:number; draft:MaintenanceDraft; original:{id:string;status:string;updatedAt:string;resourceId:string;startAt:string;endAt:string}|null };
const key=(actor:string)=>actor ? `lrm.maintenance-draft.v1:${actor}` : '';
export function readMaintenanceDraft(actor:string):StoredMaintenanceDraft|null {
  return readLocalDraft(key(actor), value => {
    const original=value.original as StoredMaintenanceDraft['original'];
    return ['resourceId','title','kind','startAt','endAt','notes','changeReason'].every(field=>typeof value.draft[field]==='string' && value.draft[field].length<=20000) &&
      (original===null || Boolean(original && ['id','status','updatedAt','resourceId','startAt','endAt'].every(field=>typeof (original as Record<string,unknown>)[field]==='string')));
  }) as StoredMaintenanceDraft|null;
}
export const writeMaintenanceDraft=(actor:string,value:StoredMaintenanceDraft)=>writeLocalDraft(key(actor),value);
export const clearMaintenanceDraft=(actor:string)=>clearLocalDraft(key(actor));
export const maintenanceDraftPending=(actor:string)=>localDraftPending(key(actor));