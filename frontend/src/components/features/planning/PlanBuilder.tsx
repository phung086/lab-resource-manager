import { formatVnd } from '../../../utils/currency';
import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, CheckCircle2, Layers, Search, X } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { planningApi, vietnamInput, vietnamInputToIso, type Plan, type Review } from '../../../services/planningApi';
import { navigateApp, workspacePathForTab } from '../../../workspaceRoutes.js';
import { bundleSelectionError, definitiveBundleRejection, intervalError, matchesResource } from './planningPresentation';
import { getStoredUser } from '../../../api.js';
import { CHECK_TTL_MS } from '../../calendar/plannerModel';
import { PAYMENT_FEATURES_ENABLED } from '../../../config/featureFlags';
type Resource = { id: string; name: string; code: string; laboratoryId?: string; laboratory?: { id: string; name: string } };
type Payload = { plan: Plan; requestKey: string; title: string; purpose: string; contact: { fullName: string; phone: string }; quotes: unknown[] };
export function PlanBuilder({ resources, onSaved, initialIds = [], onPending, repeatSourceId }: { onPending?: (ids: string[], uncertain: boolean) => void; initialIds?: string[]; resources: Resource[]; onSaved: (bookings: { id: string; resourceId: string; status: string; feeAmountVnd?: number }[]) => void; repeatSourceId?: string }) {
  const { t, locale } = useLocale();
  const submitting = useRef(false);
  const checking = useRef(false);
  const storageKey = `lrm:bundle-request:${getStoredUser()?.id}${repeatSourceId ? `:repeat:${repeatSourceId}` : ''}`;
  const [recovered] = useState<Payload | null>(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      return value && typeof value.requestKey === 'string' && Array.isArray(value.plan?.resourceIds)
        && value.plan.resourceIds.length > 0 && value.plan.resourceIds.length <= 5
        && Number.isFinite(Date.parse(value.plan.startAt)) && Number.isFinite(Date.parse(value.plan.endAt))
        && typeof value.contact?.fullName === 'string' && typeof value.contact?.phone === 'string'
        && typeof value.title === 'string' && Array.isArray(value.quotes) ? value : null;
    } catch { return null; }
  });
  const [query, setQuery] = useState('');
  const [ids, setIds] = useState<string[]>(recovered?.plan.resourceIds || initialIds);
  const [start, setStart] = useState(() => repeatSourceId && !recovered ? '' : vietnamInput(recovered?.plan.startAt || Date.now() + 86400000));
  const [end, setEnd] = useState(() => repeatSourceId && !recovered ? '' : vietnamInput(recovered?.plan.endAt || Date.now() + 90000000));
  const [title, setTitle] = useState(recovered?.title || ''), [name, setName] = useState(recovered?.contact.fullName || ''), [phone, setPhone] = useState(recovered?.contact.phone || ''), [purpose, setPurpose] = useState(recovered?.plan.purposeCode || 'STUDY');
  const [review, setReview] = useState<Review | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [reviewedAt, setReviewedAt] = useState(0);
  const [pending, setPending] = useState<Payload | null>(recovered), [created, setCreated] = useState<{ id: string; resourceId: string; status: string; feeAmountVnd?: number }[]>([]);
  const [suggestions, setSuggestions] = useState<{ startAt: string; endAt: string; amountVnd: number }[]>([]);
  const [alternatives, setAlternatives] = useState<{ original: { name: string }; replacement: { id: string; name: string }; resourceIds: string[]; amountVnd: number }[]>([]);
  const plan = (): Plan => ({ resourceIds: ids, startAt: vietnamInputToIso(start), endAt: vietnamInputToIso(end), purposeCode: purpose });
  const timeError = intervalError(start, end);
  const showTimeError = Boolean(timeError && (!repeatSourceId || (start && end)));
  const selectionError = bundleSelectionError(ids, resources);
  const visibleResources = resources.filter(resource => matchesResource(query, resource.name, resource.code, resource.laboratory?.name));
  function changed() { setReview(null); setSuggestions([]); setAlternatives([]); setError(''); setNotice(''); }
  useEffect(() => {
    if (!review || pending) return;
    const timer = window.setTimeout(() => {
      setReview(null);
      setNotice('ui.planner.checkStale');
    }, Math.max(0, reviewedAt + CHECK_TTL_MS - Date.now()));
    return () => window.clearTimeout(timer);
  }, [review, reviewedAt, pending]);
  async function check(mode: 'review' | 'suggestions' | 'waitlist' | 'alternatives') {
    if (checking.current || submitting.current || pending) return;
    if (timeError || selectionError) { setError(timeError || selectionError); return; }
    checking.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const input = plan();
      if (mode === 'review') {
        setReview(null);
        const next = await planningApi.post<Review>('/review', input);
        setReviewedAt(Date.now());
        setReview(next);
      }
      if (mode === 'suggestions') {
        const result = await planningApi.post<{ suggestions: typeof suggestions }>('/suggestions', input);
        setSuggestions(result.suggestions); if (!result.suggestions.length) setNotice('planning.noSuggestions');
      }
      if (mode === 'waitlist') { await planningApi.post('/waitlist', input); setNotice('planning.waitSaved'); onSaved([]); }
      if (mode === 'alternatives') {
        const result = await planningApi.post<{ suggestions: typeof alternatives }>('/alternatives', input);
        setAlternatives(result.suggestions); if (!result.suggestions.length) setNotice('planning.noAlternatives');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'planning.failed'); }
    finally { checking.current = false; setBusy(false); }
  }
  async function save() {
    if (checking.current || submitting.current || (!review && !pending)) return;
    if (!pending && Date.now() - reviewedAt >= CHECK_TTL_MS) {
      setReview(null);
      setNotice('ui.planner.checkStale');
      return;
    }
    const body = pending || { plan: plan(), requestKey: crypto.randomUUID(), title, purpose: '', contact: { fullName: name, phone },
      quotes: review!.items.map(item => ({ resourceId: item.resource.id, amountVnd: item.quote.amountVnd, version: item.quote.version, loyaltyPolicyVersion: item.quote.loyaltyPolicyVersion })) };
    try {
      // Persist before sending: leaving the page cannot turn an ambiguous result into a new request.
      sessionStorage.setItem(storageKey, JSON.stringify(body));
      onPending?.(body.plan.resourceIds, true);
    } catch { setError('ui.resourceSelection.storageError'); return; }
    submitting.current = true;
    setPending(body); setBusy(true); setError('');
    try {
      const result = await planningApi.post<{ bookings: typeof created }>('/bundles', body);
      setCreated(result.bookings); setPending(null); setReview(null);
      onSaved(result.bookings); sessionStorage.removeItem(storageKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'planning.failed');
      // Network/timeout may have committed. Keep the original key and payload.
      if (typeof e === 'object' && e && 'status' in e && definitiveBundleRejection(Number(e.status))) {
        setReview(null); setPending(null); sessionStorage.removeItem(storageKey); onPending?.(body.plan.resourceIds, false);
      }
    } finally { submitting.current = false; setBusy(false); }
  }
  if (created.length) return <section className="planning-paper"><CheckCircle2 size={32} /><h2>{t('planning.created')}</h2><p>{t('planning.individualPayments')}</p>
    {created.map(row => {
      const pendingPayment = row.status === 'PENDING_APPROVAL' && Number(row.feeAmountVnd) > 0;
      return <div className="planning-row" key={row.id}>
        <span>{resources.find(resource => resource.id === row.resourceId)?.name || row.id.slice(0, 8)} · {t(pendingPayment ? 'ui.paymentHold.pending' : `enum.booking.${row.status}`)}</span>
        <button type="button" className="secondary-button" onClick={() => navigateApp(workspacePathForTab('bookings', { booking: row.id }))}>{t('planning.dossier')}</button>
        {pendingPayment && PAYMENT_FEATURES_ENABLED && <button type="button" className="secondary-button" onClick={() => navigateApp(workspacePathForTab('payments', { booking: row.id }))}>{t('planning.openBooking')}</button>}
      </div>;
    })}
    {!repeatSourceId && <button className="primary-button" onClick={() => { setCreated([]); setIds([]); }}>{t('planning.newPlan')}</button>}</section>;
  return <div className="planning-layout"><section className="planning-paper">
    <header><Layers size={22} /><div><h2>{t('planning.selectResources')}</h2><p>{t('planning.sameLab')}</p></div></header>
    <fieldset disabled={busy || !!pending} className="planning-fields">
    {!repeatSourceId && <label className="planning-search">{t('planning.searchResources')}<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>}
    <p className="planning-selection-hint" id="planning-selection-hint">{ids.length > 0 && !repeatSourceId ? t('planning.selectionLocked') : t('planning.selected', { count: ids.length })}</p>
    <div className="planning-resource-list" aria-describedby="planning-selection-hint">
      {!visibleResources.length && <p className="planning-empty">{t('planning.noResourceMatches')}</p>}
      {visibleResources.map(resource => <label className="planning-resource" key={resource.id}><input type="checkbox" checked={ids.includes(resource.id)} disabled={!ids.includes(resource.id) && (ids.length >= 5 || !resource.laboratoryId || (ids.length > 0 && resource.laboratoryId !== resources.find(row => row.id === ids[0])?.laboratoryId))}
        onChange={event => { changed(); setIds(event.target.checked ? [...ids, resource.id] : ids.filter(id => id !== resource.id)); }} />
        <span><strong>{resource.name}</strong><small>{resource.code} · {resource.laboratory?.name || t('planning.unassigned')}</small></span></label>)}
    </div><div className="planning-grid"><label>{t('planning.start')}<input type="datetime-local" value={start} onInput={e => { changed(); setStart(e.currentTarget.value); }} /></label>
      <label>{t('planning.end')}<input type="datetime-local" value={end} min={start} aria-invalid={showTimeError} aria-describedby={showTimeError ? 'planning-time-error' : undefined} onInput={e => { changed(); setEnd(e.currentTarget.value); }} /></label>
      <label>{t('planning.purpose')}<select value={purpose} onChange={e => { changed(); setPurpose(e.target.value); }}>{['STUDY','TEACHING','RESEARCH','SERVICE'].map(value => <option key={value} value={value}>{t(`planning.${value}`)}</option>)}</select></label>
      <label>{t('planning.titleField')}<input value={title} maxLength={255} onChange={e => setTitle(e.target.value)} /></label>
      <label>{t('planning.contactName')}<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label>
      <label>{t('planning.phone')}<input type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} /></label></div>
    {selectionError && ids.length > 0 && <p className="planning-error" role="alert">{t(selectionError)}</p>}
    {showTimeError && <p id="planning-time-error" role="alert" className="planning-error">{t(timeError)}</p>}
    <div className="planning-actions"><button className="primary-button" disabled={!!selectionError || !!timeError} onClick={() => void check('review')}><Search size={17} />{t('planning.review')}</button>
      <button className="secondary-button" disabled={!!selectionError || !!timeError} onClick={() => void check('suggestions')}><CalendarClock size={17} />{t('planning.suggest')}</button>
      <button className="secondary-button" disabled={!!selectionError || !!timeError} onClick={() => void check('alternatives')}>{t('planning.alternatives')}</button>
      {ids.length === 1 && <button className="secondary-button" onClick={() => void check('waitlist')}>{t('planning.joinWait')}</button>}</div></fieldset>
    {busy && <p role="status">{t('planning.loading')}</p>}{error && <p className="planning-error" role="alert">{t(error)}</p>}{notice && <p role="status">{t(notice)}</p>}
    {alternatives.length > 0 && <section><h3>{t('planning.alternatives')}</h3><p>{t('planning.alternativeHint')}</p>{alternatives.map(item => <button className="planning-slot" key={item.replacement.id} disabled={busy || !!pending} onClick={() => { changed(); setIds(item.resourceIds); }}><span>{item.original.name} → {item.replacement.name}</span><strong>{formatVnd(item.amountVnd, locale)}</strong></button>)}</section>}
    {suggestions.length > 0 && <section><h3>{t('planning.suggestions')}</h3>{suggestions.map(slot => <button className="planning-slot" key={slot.startAt} disabled={busy || !!pending} onClick={() => { setStart(vietnamInput(slot.startAt)); setEnd(vietnamInput(slot.endAt)); changed(); }}>
      <span>{new Date(slot.startAt).toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</span><strong>{formatVnd(slot.amountVnd, locale)}</strong></button>)}<p>{t('planning.suggestionHint')}</p></section>}
  </section><aside className="planning-summary"><h2>{t('planning.summary')}</h2><p>{t('planning.selected', { count: ids.length })}</p>
    {!review && ids.length > 0 && <ul className="planning-selected">{ids.map(id => <li key={id}><span>{resources.find(row => row.id === id)?.name}</span><button type="button" disabled={busy || !!pending} aria-label={t('planning.removeResource', { name: resources.find(row => row.id === id)?.name || '' })} onClick={() => { changed(); setIds(ids.filter(value => value !== id)); }}><X size={16} aria-hidden="true" /></button></li>)}</ul>}
    {review ? <>{review.items.map(item => <div className="planning-row" key={item.resource.id}><span>{item.resource.name}</span><strong>{formatVnd(item.quote.amountVnd, locale)}</strong></div>)}
      <div className="planning-total"><span>{t('planning.total')}</span><strong>{formatVnd(review.amountVnd, locale)}</strong></div><p>{t('planning.individualPayments')}</p></> : <p>{t('planning.reviewHint')}</p>}
    {pending && <p role="status">{t('planning.uncertain')}</p>}
    <button className="primary-button" disabled={busy || (!pending && (!review || title.trim().length < 2 || name.trim().length < 2 || !phone))} onClick={() => void save()}>{t(pending ? 'planning.retrySame' : 'planning.confirm')}</button>
    <p>{t('planning.noHardware')}</p></aside></div>;
}
