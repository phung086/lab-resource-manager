import { CHECK_TTL_MS, intervalFor } from './plannerModel.ts';

export type TimeDraft = { date: string; start: string; end: string };
export type SelectionCheck = { key: string; at: number; status: 'ready' | 'unavailable' | 'paused' | 'error'; message?: string };
export function timeDraftKey(draft?: TimeDraft) { return draft ? `${draft.date}|${draft.start}|${draft.end}` : ''; }

// Read-only queue: bounded to one in flight; transport failure never becomes a booking retry.
export async function checkSelectedDrafts({ ids, signal, draftFor, previousFor, request, onResult }: {
  ids: string[]; signal: AbortSignal; draftFor: (id: string) => TimeDraft | undefined;
  previousFor: (id: string) => SelectionCheck | undefined;
  request: (id: string, interval: { startAt: string; endAt: string }, signal: AbortSignal) => Promise<{ available: boolean }>;
  onResult: (id: string, result: SelectionCheck) => void;
}) {
  for (const id of ids) {
    if (signal.aborted) break;
    const draft=draftFor(id), key=timeDraftKey(draft), prior=previousFor(id);
    const interval=draft&&intervalFor(draft.date,draft.start,draft.end);
    if (!interval) {onResult(id,{key,at:Date.now(),status:'error',message:'ui.calendarWorkspace.futureTime'});continue;}
    if (prior?.key===key && Date.now()-prior.at<CHECK_TTL_MS && ['ready','unavailable'].includes(prior.status)) continue;
    try {
      const result=await request(id,interval,signal);
      if (!signal.aborted && timeDraftKey(draftFor(id))===key) onResult(id,{key,at:Date.now(),status:result.available===true?'ready':'unavailable'});
    } catch (error: unknown) {
      if (signal.aborted) break;
      const cause=error as { status?: number; message?: string };
      if(timeDraftKey(draftFor(id))===key)onResult(id,{key,at:Date.now(),status:cause.status===429?'paused':'error',message:cause.message||'api.API_REQUEST_FAILED'});
      if ([0,401,429].includes(cause.status ?? 0)) break;
    }
  }
}
