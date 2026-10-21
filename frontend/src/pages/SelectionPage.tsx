import { SelectedBundle } from '../components/features/planning/SelectedBundle';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CalendarClock, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { apiRequest, getStoredUser, hasStoredSession } from '../api.js';
import { QuickBookingModal, type BookingDraft } from '../components/QuickBookingModal';
import type { SelectedResource } from '../providers/ResourceSelectionProvider';
import { useLocale, type LocaleMessage } from '../providers/LocaleProvider';
import '../styles/resource-selection.css';
import { CHECK_TTL_MS, intervalFor } from '../components/calendar/plannerModel';
import { getVietnamTomorrowDateString } from '../utils/timezone';
import { checkSelectedDrafts, timeDraftKey, type SelectionCheck } from '../components/calendar/selectionPrecheck';

type Result = { status: 'pending' | 'saved' | 'failed' | 'uncertain'; bookingId?: string; bookingStatus?: string; message?: LocaleMessage; feeAmountVnd?: number };
type Progress = { drafts: Record<string, BookingDraft>; results: Record<string, Result> };
const keyFor = (userId: string) => `lrm:resource-selection-progress:v1:${userId}`;
function readProgress(userId: string): Progress {
  try {
    const value = JSON.parse(sessionStorage.getItem(keyFor(userId)) || '{}');
    const results: Record<string, Result> = {};
    for (const [id, result] of Object.entries(value.results || {}).slice(0, 100)) {
      const row = result as Result;
      if (/^[a-zA-Z0-9_-]{1,128}$/.test(id) && ['pending', 'saved', 'failed', 'uncertain'].includes(row?.status)) {
        results[id] = { ...row, status: row.status === 'pending' ? 'uncertain' : row.status };
      }
    }
    const drafts: Record<string, BookingDraft> = {};
    for (const [id, candidate] of Object.entries(value.drafts || {}).slice(0,100)) {
      const draft = candidate as BookingDraft;
      if (/^[a-zA-Z0-9_-]{1,128}$/.test(id) && draft && ['date','start','end','title','purpose','purposeCode'].every(key => typeof (draft as any)[key] === 'string')) drafts[id] = { date: draft.date.slice(0,10), start: draft.start.slice(0,5), end: draft.end.slice(0,5), title: draft.title.slice(0,255), purpose: draft.purpose.slice(0,2000), purposeCode: draft.purposeCode.slice(0,100) };
    }
    return { drafts, results };
  } catch { return { drafts: {}, results: {} }; }
}

export function SelectionPage({ userId, items, onRemove, onBrowse, onDetails, onViewBookings, onConfirmed, onPayment }: {
  userId: string; items: SelectedResource[]; onRemove: (id: string) => void;
  onBrowse: () => void; onDetails: (id: string) => void; onViewBookings: (id?: string) => void;
  onConfirmed: () => void; onPayment?: (booking: any) => void;
}) {
  const { tr, locale } = useLocale();
  const [together, setTogether] = useState(false);
  const [bundleIds, setBundleIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<Progress>(() => readProgress(userId));
  const progressRef = useRef(progress);
  const [activeResource, setActiveResource] = useState<any>(null);
  const [loadingId, setLoadingId] = useState('');
  const loadingRef = useRef(false);
  const [resourceError, setResourceError] = useState<{ id: string; message: string } | null>(null);
  const [liveQuote, setLiveQuote] = useState<{ amountVnd: number; version: string } | null>(null);
  const [initialDraft, setInitialDraft] = useState<BookingDraft | undefined>();
  const [sharedTime, setSharedTime] = useState({ date: getVietnamTomorrowDateString(), start: '09:00', end: '10:00' });
  const [checks, setChecks] = useState<Record<string, SelectionCheck>>({});
  const checksRef = useRef(checks);
  const [checking, setChecking] = useState(false), [timeError, setTimeError] = useState('');
  const listController = useRef<AbortController | null>(null), listBusy = useRef(false);
  const [checkClock, setCheckClock] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setCheckClock(Date.now()), 15000); return () => { clearInterval(timer); listController.current?.abort(); }; }, []);
  useEffect(() => { listController.current?.abort(); listBusy.current=false; setChecking(false); }, [items]);
  const saveChecks = (next: typeof checks) => { checksRef.current=next; setChecks(next); };
  const draftKey = (id: string) => timeDraftKey(progressRef.current.drafts[id]);
  const slot = useMemo(() => activeResource ? { resourceId: activeResource.id } : null, [activeResource]);
  const modalResources = useMemo(() => activeResource ? [activeResource] : [], [activeResource]);
  const money = (amount: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
  const write = useCallback((change: (value: Progress) => Progress, required = false) => {
    if (!hasStoredSession() || getStoredUser()?.id !== userId) {
      if (required) throw new Error('api.UNAUTHORIZED');
      return;
    }
    const next = change(progressRef.current);
    // Persist the pending fence before POST. A lost response must never enable a blind retry.
    try { sessionStorage.setItem(keyFor(userId), JSON.stringify(next)); }
    catch { if (required) throw new Error('ui.resourceSelection.storageError'); }
    progressRef.current = next; setProgress(next);
  }, [userId]);
  const draftChanged = useCallback((draft: BookingDraft) => {
    if (activeResource) {
      const prior=progressRef.current.drafts[activeResource.id];
      if (!prior || prior.date!==draft.date || prior.start!==draft.start || prior.end!==draft.end) {
        listController.current?.abort(); listBusy.current=false; setChecking(false);
        const next={...checksRef.current}; delete next[activeResource.id]; checksRef.current=next; setChecks(next);
      }
      write(value => ({ ...value, drafts: { ...value.drafts, [activeResource.id]: draft } }));
    }
  }, [activeResource, write]);
  const quoteChanged = useCallback((quote: { amountVnd: number; version: string } | null) => setLiveQuote(quote), []);
  function recordResult(id: string, result: Result, required = false) {
    write(value => ({ ...value, results: { ...value.results, [id]: result } }), required);
  }
  async function review(id: string) {
    if (loadingRef.current || ['saved', 'pending', 'uncertain'].includes(progressRef.current.results[id]?.status)) return;
    loadingRef.current = true; setLoadingId(id); setResourceError(null);
    try {
      const resource = await apiRequest(`/resources/${encodeURIComponent(id)}`);
      if (resource?.id !== id) throw new Error('ui.resourceDiscovery.notFound');
      setInitialDraft(progressRef.current.drafts[id]); setLiveQuote(null); setActiveResource(resource);
    } catch (error: any) { setResourceError({ id, message: error.message }); }
    finally { loadingRef.current = false; setLoadingId(''); }
  }
  const saved = items.filter(item => progress.results[item.id]?.status === 'saved').length;
  function applySharedTime() {
    if (!intervalFor(sharedTime.date,sharedTime.start,sharedTime.end)) { setTimeError('ui.calendarWorkspace.futureTime'); return; }
    listController.current?.abort(); listBusy.current=false; setChecking(false); saveChecks({}); setTimeError('');
    write(value => {
      const drafts={...value.drafts};
      for (const item of items) if (!['saved','pending','uncertain'].includes(value.results[item.id]?.status)) drafts[item.id]={title:'',purpose:'',purposeCode:'',...drafts[item.id],...sharedTime};
      return {...value,drafts};
    });
  }
  async function checkSelection() {
    if (listBusy.current) return;
    const pending=items.filter(item=>!['saved','pending','uncertain'].includes(progressRef.current.results[item.id]?.status));
    if (!pending.some(item=>{const draft=progressRef.current.drafts[item.id];return draft&&intervalFor(draft.date,draft.start,draft.end);})) {setTimeError('ui.planner.noDraftTime');return;}
    const controller=new AbortController(); listController.current=controller;listBusy.current=true;setChecking(true);setTimeError('');
    try {
      await checkSelectedDrafts({ids:pending.map(item=>item.id),signal:controller.signal,draftFor:id=>progressRef.current.drafts[id],previousFor:id=>checksRef.current[id],
        request:(id,interval,signal)=>apiRequest(`/bookings/availability?${new URLSearchParams({resourceId:id,...interval})}`,{signal}),
        onResult:(id,result)=>saveChecks({...checksRef.current,[id]:result})});
    } finally { if (!controller.signal.aborted) {listBusy.current=false;setChecking(false);setCheckClock(Date.now());} }
  }
  return <section className="resource-selection" aria-labelledby="selection-heading">
    <header className="selection-heading">
      <div><button type="button" className="btn btn-secondary" onClick={onBrowse}><ArrowLeft size={16} aria-hidden="true" />{tr('ui.resourceSelection.continue')}</button>
        <h1 id="selection-heading">{tr('ui.resourceDiscovery.viewSelection')}</h1>
        <p>{tr(together ? 'planning.atomicHint' : 'ui.resourceSelection.independent')}</p>
      </div>
      <div className="selection-progress" role="status">{tr('ui.resourceSelection.progress', { saved, total: items.length })}</div>
    </header>
    {items.length > 1 && <label className="selection-time-panel selection-bundle-toggle"><input type="checkbox" checked={together} onChange={event => { let recovery: string[] | undefined; try { recovery = JSON.parse(sessionStorage.getItem(`lrm:bundle-request:${userId}`) || 'null')?.plan?.resourceIds; } catch { /* Keep the existing uncertain fence. */ } if (!bundleIds.length || recovery) setBundleIds(recovery || items.filter(item => !['saved','pending','uncertain'].includes(progress.results[item.id]?.status)).map(item => item.id)); setTogether(event.target.checked); }}/>{tr('planning.bookTogether')}</label>}
    {bundleIds.length > 0 && <div hidden={!together}><SelectedBundle onPending={(ids, uncertain) => { for (const id of ids) recordResult(id, { status: uncertain ? 'uncertain' : 'failed' }, true); }} ids={bundleIds} onSaved={rows => { for (const row of rows) recordResult(row.resourceId, { status: 'saved', bookingId: row.id, bookingStatus: row.status, feeAmountVnd: row.feeAmountVnd }); onConfirmed(); }}/></div>}
    <div hidden={together}>
    {items.length > 0 && <section className="selection-time-panel" aria-labelledby="selection-time-heading"><h2 id="selection-time-heading">{tr('ui.planner.sharedTime')}</h2><div className="selection-time-controls"><label>{tr('ui.planner.chooseDate')}<input type="date" value={sharedTime.date} onChange={event=>setSharedTime({...sharedTime,date:event.target.value})}/></label><label>{tr('ui.planner.start')}<input type="time" value={sharedTime.start} onChange={event=>setSharedTime({...sharedTime,start:event.target.value})}/></label><label>{tr('ui.planner.end')}<input type="time" value={sharedTime.end} onChange={event=>setSharedTime({...sharedTime,end:event.target.value})}/></label><button type="button" className="btn btn-secondary" disabled={checking||!!loadingId} onClick={applySharedTime}>{tr('ui.planner.applyTime')}</button><button type="button" className="btn btn-primary" disabled={checking||!!loadingId} onClick={()=>void checkSelection()}>{tr(checking?'ui.planner.checking':'ui.planner.checkList')}</button></div><p>{tr('ui.planner.checkListHint')}</p>{timeError&&<p role="alert" className="selection-error">{tr(timeError)}</p>}</section>}
    {items.length === 0 ? <p className="empty-state">{tr('ui.resourceSelection.empty')}</p> : <ol className="selection-register">
      {items.map((item, index) => {
        const result = progress.results[item.id];
        const blocked = result && ['saved', 'pending', 'uncertain'].includes(result.status);
        const draft=progress.drafts[item.id], checked=checks[item.id];
        const fresh=checked&&checked.key===draftKey(item.id)&&checkClock-checked.at<CHECK_TTL_MS;
        return <li key={item.id} className="selection-row">
          <span className="selection-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <div className="selection-resource"><button type="button" className="selection-name" onClick={() => onDetails(item.id)}>{item.name || item.code}</button><p>{item.code} · {item.laboratoryName}</p>
            {draft && <p className="selection-draft-time"><CalendarClock size={15} aria-hidden="true"/>{draft.date} · {draft.start}–{draft.end}</p>}
            {!blocked&&<p className={`selection-check-result ${fresh&&checked.status==='ready'?'is-ready':''}`} role="status">{checked?.status==='error'?tr(checked.message||'api.API_REQUEST_FAILED'):tr(!checked?'ui.planner.notChecked':checked.status==='paused'?'ui.planner.checkPaused':!fresh?'ui.planner.checkStale':checked.status==='ready'?'ui.planner.checkReady':'ui.planner.checkUnavailable')}</p>}
            {result?.status === 'saved' && <div className="selection-result" role="status"><CheckCircle2 size={18} aria-hidden="true" /><div>{tr('ui.resourceSelection.saved', { id: result.bookingId || '', status: tr(result.bookingStatus === 'CONFIRMED' ? 'ui.confirmed_e72d13e3' : (result.feeAmountVnd || 0) > 0 ? 'ui.paymentHold.pending' : 'ui.pending_approval_6af96613') })}{typeof result.feeAmountVnd === 'number' && <p>{tr('ui.resourceSelection.fee', { amount: money(result.feeAmountVnd) })}</p>}</div></div>}
            {result?.status === 'failed' && <p role="alert" className="selection-error">{tr(result.message || 'ui.could_not_create_the_booking_ead473e4')}</p>}
            {(result?.status === 'uncertain' || result?.status === 'pending') && <div className="selection-error" role="status"><AlertCircle size={18} aria-hidden="true" /><span>{tr(result.status === 'pending' ? 'ui.submitting_abf01d43' : 'ui.resourceSelection.uncertain')}</span></div>}
            {resourceError?.id === item.id && <p role="alert" className="selection-error">{tr(resourceError.message)}</p>}
          </div>
          <div className="selection-actions">
            {blocked ? <button type="button" className="btn btn-secondary" disabled={result.status === 'pending'} onClick={() => onViewBookings(result.bookingId)}>{tr('ui.view_my_bookings_7130520e')}</button> : <button type="button" className="btn btn-primary" disabled={!!loadingId||checking} onClick={() => void review(item.id)}><CalendarClock size={16} aria-hidden="true" />{loadingId === item.id ? tr('ui.loading_148ded83') : tr('ui.resourceSelection.review')}</button>}
            <button type="button" className="btn btn-secondary" disabled={!!blocked || !!loadingId||checking} onClick={() => onRemove(item.id)} aria-label={tr('ui.resourceSelection.remove', { name: item.name || item.code })}><Trash2 size={16} aria-hidden="true" />{tr('ui.resourceSelection.removeShort')}</button>
          </div>
        </li>;
      })}
    </ol>}
    {activeResource && <div className="selection-quote" role="status">{liveQuote ? tr('ui.resourceSelection.quote', { name: activeResource.name, amount: money(liveQuote.amountVnd) }) : tr('ui.resourceSelection.quotePending', { name: activeResource.name })}</div>}
    </div>
    {activeResource && <QuickBookingModal key={activeResource.id} isOpen onClose={() => setActiveResource(null)} resources={modalResources} initialSlot={slot} initialDraft={initialDraft} onDraftChange={draftChanged} onQuoteChanged={quoteChanged}
      onAttempt={() => recordResult(activeResource.id, { status: 'pending' }, true)}
      onBookingError={(message, uncertain) => recordResult(activeResource.id, { status: uncertain ? 'uncertain' : 'failed', message })}
      onConfirmBooking={booking => { recordResult(activeResource.id, { status: 'saved', bookingId: booking.id, bookingStatus: booking.status, feeAmountVnd: booking.feeAmountVnd }); onConfirmed(); }}
      onViewBookings={() => onViewBookings(progressRef.current.results[activeResource.id]?.bookingId)} onProceedPayment={onPayment} />}
  </section>;
}
