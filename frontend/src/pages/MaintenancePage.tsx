import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CalendarCheck2, CheckCircle2, Clock3, Search, Wrench } from 'lucide-react';
import { translate } from '../i18n.js';
import { apiRequest } from '../api.js';
import { formatVietnamDateTime } from '../utils/timezone';
import { maintenanceLocalTime, validateMaintenanceDraft, validateMaintenanceProgress } from '../utils/maintenanceValidation';
import type { MaintenanceDraft, MaintenanceErrors, MaintenanceField } from '../utils/maintenanceValidation';
import '../styles/maintenance-workspace.css';
import { MaintenanceCyclePanel } from '../components/features/monitoring/MaintenanceCyclePanel';

type Row = Record<string, any>;
type ImpactReview = { key: string; conflicts: Row[] };
const openStatuses = ['scheduled', 'in_progress'];
const blankDraft = (): MaintenanceDraft => ({ resourceId: '', title: '', kind: 'maintenance', startAt: '', endAt: '', notes: '', changeReason: '' });
const labelKeys: Record<MaintenanceField, string> = {
  resourceId: 'ui.resource_9a35ef53', title: 'ui.job_title_2dbcad3d', kind: 'ui.job_type_173c2afd',
  startAt: 'ui.start_utc_07_00_982bb1b8', endAt: 'ui.end_utc_07_00_9e37a119',
  notes: 'ui.work_notes_76158ed9', changeReason: 'ui.reason_for_rescheduling_6c9a5bb9'
};
function focusField(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLElement) field.focus();
}
function Status({ value }: { value: string }) {
  const keys: Record<string, string> = { scheduled: 'ui.scheduled_2cf00513', in_progress: 'ui.in_progress_50e04c04', completed: 'ui.completed_5eb36f8c', cancelled: 'ui.cancelled_2f777a90' };
  return <span className={'maintenance-status maintenance-status--' + value}>{translate(keys[value] || value)}</span>;
}

function ProgressForm({ row, busy, onTransition }: { row: Row; busy: boolean; onTransition: (data: { status: string; changeReason: string }) => Promise<void> }) {
  const [status, setStatus] = useState(row.status === 'scheduled' ? 'in_progress' : 'completed');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const [statusError, setStatusError] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const result = validateMaintenanceProgress(row.status, status, reason);
    setReasonError(!result.reasonValid); setStatusError(!result.statusValid);
    if (!result.reasonValid) { reasonRef.current?.focus(); return; }
    if (!result.statusValid) return;
    await onTransition({ status, changeReason: result.changeReason });
  }
  return <details className="maintenance-progress">
    <summary>{translate('ui.record_progress_or_cancellation_071fe841')}</summary>
    <form onSubmit={submit} noValidate>
      <p>{translate('ui.maintenance.progressHint')}</p>
      <fieldset disabled={busy}>
        <div className="maintenance-field">
          <label htmlFor="maintenance-progress-status">{translate('ui.new_status_96c219fc')}</label>
          <select id="maintenance-progress-status" name="status" value={status} onChange={e => { setStatus(e.target.value); setStatusError(false); }} aria-invalid={statusError} aria-describedby={statusError ? 'maintenance-progress-status-error' : undefined}>
            {row.status === 'scheduled' ? <option value="in_progress">{translate('ui.start_work_eee7d061')}</option> : <option value="completed">{translate('ui.complete_job_3d4ff945')}</option>}
            <option value="cancelled">{translate('ui.cancel_job_ec792b0b')}</option>
          </select>
          {statusError && <p id="maintenance-progress-status-error" className="maintenance-field-error" role="alert">{translate('ui.maintenance.invalidProgress')}</p>}
        </div>
        <div className="maintenance-field">
          <label htmlFor="maintenance-progress-reason">{translate('ui.outcome_reason_19097f99')} *</label>
          <textarea ref={reasonRef} id="maintenance-progress-reason" name="changeReason" required minLength={5} maxLength={500} rows={3} value={reason} onChange={e => { setReason(e.target.value); setReasonError(false); }} aria-invalid={reasonError} aria-describedby={'maintenance-progress-reason-hint' + (reasonError ? ' maintenance-progress-reason-error' : '')} />
          <small id="maintenance-progress-reason-hint">{translate('ui.maintenance.reasonHint')}</small>
          {reasonError && <p id="maintenance-progress-reason-error" className="maintenance-field-error" role="alert">{translate('ui.maintenance.reasonLength')}</p>}
        </div>
        <button className="primary-button" disabled={busy}>{translate(busy ? 'ui.maintenance.updating' : 'ui.save_progress_ea4d7f3f')}</button>
      </fieldset>
    </form>
  </details>;
}

export function MaintenancePage({ locale, resources, maintenance, onChanged, onBookings }: { locale: string; resources: Row[]; maintenance: Row[]; onChanged: () => void; onBookings: () => void }) {
  const t = translate;
  const [editing, setEditing] = useState<Row | null>(null);
  const [draft, setDraft] = useState<MaintenanceDraft>(blankDraft);
  const [fieldErrors, setFieldErrors] = useState<MaintenanceErrors>({});
  const [review, setReview] = useState<ImpactReview | null>(null);
  const [operation, setOperation] = useState<'checking' | 'saving' | 'updating' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('open');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const impactAbort = useRef<AbortController | null>(null);
  const checkButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => () => impactAbort.current?.abort(), []);
  const busy = operation !== null;
  const searchText = query.trim().toLocaleLowerCase(locale);
  const visibleJobs = maintenance.filter(row => (filter === 'all' || (filter === 'open' ? openStatuses.includes(row.status) : row.status === filter)) && (!searchText || [row.title, row.resource?.code, row.resource?.name].some(value => String(value || '').toLocaleLowerCase(locale).includes(searchText))));
  const selected = visibleJobs.find(row => row.id === selectedId) || null;
  const original = editing?.id ? editing : null;
  const currentJob = original ? maintenance.find(row => row.id === original.id) : null;
  const staleJob = Boolean(original && (!currentJob || currentJob.status !== original.status || currentJob.updatedAt !== original.updatedAt));
  const validation = validateMaintenanceDraft(draft, resources.map(row => row.id), original);
  const reviewCurrent = review !== null && review.key === validation.windowKey;
  const canSave = Boolean(validation.data && reviewCurrent && review?.conflicts.length === 0 && !staleJob);

  function focusDetail() {
    requestAnimationFrame(() => {
      detailRef.current?.focus({ preventScroll: true });
      if (window.innerWidth < 1000) detailRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  }
  function openPlanner(row?: Row) {
    if (busy || editing) return;
    setEditing(row || {});
    const requestedResource = new URLSearchParams(window.location.search).get('resource');
    setDraft(row ? { resourceId: row.resource?.id || row.resourceId || '', title: row.title || '', kind: row.kind || 'maintenance', startAt: maintenanceLocalTime(row.startAt), endAt: maintenanceLocalTime(row.endAt), notes: row.notes || '', changeReason: '' } : { ...blankDraft(), resourceId: resources.some(item => item.id === requestedResource) ? requestedResource! : '' });
    setFieldErrors({}); setReview(null); setError(''); setNotice(''); focusDetail();
  }
  function closePlanner() {
    if (busy) return;
    setEditing(null); setReview(null); setFieldErrors({}); setError('');
    requestAnimationFrame(() => newButtonRef.current?.focus());
  }
  function updateDraft(field: MaintenanceField, value: string) {
    const next = { ...draft, [field]: value };
    setDraft(previous => ({ ...previous, [field]: value }));
    if (['resourceId', 'startAt', 'endAt'].includes(field)) setReview(null);
    if (fieldErrors[field]) {
      const nextErrors = validateMaintenanceDraft(next, resources.map(row => row.id), original).errors;
      setFieldErrors(previous => ({ ...previous, [field]: nextErrors[field] }));
    }
    setError('');
  }
  function showServerError(caught: unknown) {
    setError(caught instanceof Error ? caught.message : 'api.API_REQUEST_FAILED');
    requestAnimationFrame(() => errorRef.current?.focus());
  }
  function validateForm() {
    setFieldErrors(validation.errors);
    if (Object.keys(validation.errors).length) {
      const field = Object.keys(validation.errors)[0];
      if (formRef.current) focusField(formRef.current, field);
      return null;
    }
    if (staleJob) { setError('ui.maintenance.staleJob'); return null; }
    return validation;
  }
  async function checkImpact() {
    if (busy) return;
    const result = validateForm();
    if (!result?.data) return;
    setOperation('checking'); setError(''); setReview(null); setNotice('');
    const controller = new AbortController(); impactAbort.current = controller;
    try {
      const params = new URLSearchParams({ resourceId: result.data.resourceId, startAt: result.data.startAt, endAt: result.data.endAt });
      const response = await apiRequest('/maintenance/impact?' + params, { signal: controller.signal });
      if (!Array.isArray(response.conflicts)) throw new Error('api.API_REQUEST_FAILED');
      setReview({ key: result.windowKey, conflicts: response.conflicts });
    } catch (caught) { if (!controller.signal.aborted) showServerError(caught); }
    finally { if (!controller.signal.aborted) setOperation(null); impactAbort.current = null; }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const result = validateForm(); if (!result?.data) return;
    if (!canSave) { setError('ui.maintenance.needsCheck'); checkButtonRef.current?.focus(); return; }
    setOperation('saving'); setError(''); setNotice('');
    try {
      await apiRequest(original ? '/maintenance/' + original.id : '/maintenance', { method: original ? 'PATCH' : 'POST', body: JSON.stringify(result.data) });
      setEditing(null); setReview(null); setFieldErrors({}); onChanged(); setNotice('ui.maintenance_saved_after_rechecking_conflicts_e1c210d1');
      requestAnimationFrame(() => newButtonRef.current?.focus());
    } catch (caught: any) {
      showServerError(caught);
      setReview(Array.isArray(caught?.details?.conflicts) ? { key: result.windowKey, conflicts: caught.details.conflicts } : null);
    } finally { setOperation(null); }
  }
  async function transition(row: Row, data: { status: string; changeReason: string }) {
    if (busy) return;
    setOperation('updating'); setError(''); setNotice('');
    try { await apiRequest('/maintenance/' + row.id, { method: 'PATCH', body: JSON.stringify(data) }); onChanged(); setNotice('ui.job_updated_inspect_and_update_31b494ac'); }
    catch (caught) { showServerError(caught); }
    finally { setOperation(null); }
  }
  function field(name: MaintenanceField, control: React.ReactNode, hint?: string) {
    return <div className="maintenance-field">
      <label htmlFor={'maintenance-' + name}>{t(labelKeys[name])}{name !== 'notes' && ' *'}</label>
      {control}
      {hint && <small id={'maintenance-' + name + '-hint'}>{t(hint)}</small>}
      {fieldErrors[name] && <p id={'maintenance-' + name + '-error'} className="maintenance-field-error">{t(fieldErrors[name])}</p>}
    </div>;
  }
  function inputProps(name: MaintenanceField, hint = false) {
    return { id: 'maintenance-' + name, name, value: draft[name], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => updateDraft(name, event.target.value), 'aria-invalid': Boolean(fieldErrors[name]), 'aria-describedby': [hint ? 'maintenance-' + name + '-hint' : '', fieldErrors[name] ? 'maintenance-' + name + '-error' : ''].filter(Boolean).join(' ') || undefined };
  }
  const hasFilters = query.trim() || filter !== 'open';
  return <section className="maintenance-workspace">
    <header className="maintenance-heading">
      <div><h1>{t('ui.maintenance_and_calibration_fa8ebcfe')}</h1></div>
      <button ref={newButtonRef} className="primary-button" disabled={busy || Boolean(editing)} onClick={() => openPlanner()}><Wrench size={18} aria-hidden="true" />{t('ui.schedule_maintenance_c16a1e26')}</button>
    </header>
    <MaintenanceCyclePanel/>
    {notice && <p className="maintenance-notice" role="status"><CheckCircle2 size={18} aria-hidden="true" />{t(notice)}</p>}
    <div className="maintenance-toolbar">
      <div className="maintenance-search"><Search size={18} aria-hidden="true" /><label className="maintenance-sr-only" htmlFor="maintenance-search">{t('ui.maintenance.search')}</label><input id="maintenance-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('ui.maintenance.search')} disabled={busy} /></div>
      <div className="maintenance-filter"><label htmlFor="maintenance-status">{t('ui.maintenance.stateFilter')}</label><select id="maintenance-status" value={filter} onChange={e => setFilter(e.target.value)} disabled={busy}><option value="open">{t('ui.maintenance.openJobs')}</option><option value="all">{t('ui.maintenance.allJobs')}</option>{['scheduled','in_progress','completed','cancelled'].map(value => <option key={value} value={value}>{t(({ scheduled: 'ui.scheduled_2cf00513', in_progress: 'ui.in_progress_50e04c04', completed: 'ui.completed_5eb36f8c', cancelled: 'ui.cancelled_2f777a90' } as Record<string,string>)[value])}</option>)}</select></div>
    </div>
    <div className="maintenance-columns">
      <section className="maintenance-queue" aria-labelledby="maintenance-queue-title">
        <div className="maintenance-queue-heading"><h2 id="maintenance-queue-title">{t('ui.maintenance.queueTitle')}</h2><p role="status">{t('ui.maintenance.filteredCount', { count: visibleJobs.length })}</p></div>
        {visibleJobs.length > 0 ? <ul className="maintenance-job-list">{visibleJobs.map(row => <li key={row.id}><button className="maintenance-job" type="button" disabled={busy || Boolean(editing)} aria-pressed={selected?.id === row.id} onPointerEnter={() => { if(!busy&&!editing)setSelectedId(row.id); }} onFocus={() => { if(!busy&&!editing)setSelectedId(row.id); }} onClick={() => { setSelectedId(row.id); setError(''); focusDetail(); }}><span className="maintenance-job-title">{row.title}</span><Status value={row.status} /><span className="maintenance-job-resource">{row.resource?.code} · {row.resource?.name}</span><span className="maintenance-job-time"><Clock3 size={15} aria-hidden="true" />{formatVietnamDateTime(row.startAt)}</span></button></li>)}</ul> : <div className="maintenance-empty"><Wrench size={24} aria-hidden="true" /><h3>{t(hasFilters ? 'ui.maintenance.noMatches' : 'ui.no_open_maintenance_jobs_2ab3ecb0')}</h3>{hasFilters && <button className="secondary-button" onClick={() => { setQuery(''); setFilter('open'); }}>{t('ui.maintenance.clearFilters')}</button>}{filter === 'open' && !query.trim() && maintenance.length > 0 && <button className="secondary-button" onClick={() => setFilter('all')}>{t('ui.view_all_jobs_91067a97')}</button>}</div>}
      </section>
      <div ref={detailRef} className="maintenance-detail" tabIndex={-1}>
        {error && <div ref={errorRef} className="maintenance-error" tabIndex={-1} role="alert">{t(error)}</div>}
        {editing ? <form ref={formRef} className="maintenance-planner" noValidate onSubmit={save}>
          <div className="maintenance-detail-heading"><div><h2>{t(original ? 'ui.reschedule_maintenance_738f4cef' : 'ui.new_maintenance_job_537b8db7')}</h2><p>{t('ui.maintenance.newPlanHint')}</p></div><button type="button" className="secondary-button" disabled={busy} onClick={closePlanner}>{t('ui.close_5d54c2a1')}</button></div>
          {Object.values(fieldErrors).some(Boolean) && <div className="maintenance-error-summary" role="alert"><h3>{t('ui.maintenance.reviewErrors')}</h3><ul>{Object.entries(fieldErrors).filter(([,value]) => value).map(([name,key]) => <li key={name}><button type="button" onClick={() => { if(formRef.current) focusField(formRef.current,name); }}>{t(labelKeys[name as MaintenanceField]) + ': ' + t(key)}</button></li>)}</ul></div>}
          {staleJob && <p className="maintenance-error" role="alert">{t('ui.maintenance.staleJob')}</p>}
          {!resources.length && <p className="maintenance-context">{t('ui.maintenance.noResources')}</p>}
          <fieldset disabled={busy || staleJob} className="maintenance-form-section"><legend>{t('ui.maintenance.planResource')}</legend>
            {field('resourceId', <select {...inputProps('resourceId')} required disabled={busy || original?.status === 'in_progress'}><option value="">{t('ui.select_a_resource_8849f4e1')}</option>{resources.map(row => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select>)}
            {original?.status === 'in_progress' && <p className="maintenance-context">{t('ui.maintenance.lockedResource')}</p>}
            <div className="maintenance-fields">{field('title', <input {...inputProps('title')} required minLength={3} maxLength={255} />)}{field('kind', <select {...inputProps('kind')}><option value="maintenance">{t('ui.maintenance_8ad424bd')}</option><option value="calibration">{t('ui.calibration_a71e17c8')}</option></select>)}</div>
          </fieldset>
          <fieldset disabled={busy || staleJob} className="maintenance-form-section"><legend>{t('ui.maintenance.planWindow')}</legend><p className="maintenance-window-hint">{t('ui.maintenance.windowHint')}</p><div className="maintenance-fields">{field('startAt', <input {...inputProps('startAt')} type="datetime-local" required onInput={event => updateDraft('startAt',event.currentTarget.value)} />)}{field('endAt', <input {...inputProps('endAt')} type="datetime-local" required onInput={event => updateDraft('endAt',event.currentTarget.value)} />)}</div></fieldset>
          <fieldset disabled={busy || staleJob} className="maintenance-form-section">{field('notes', <textarea {...inputProps('notes',true)} rows={3} maxLength={2000} />, 'ui.maintenance.notesOptional')}{original && field('changeReason', <textarea {...inputProps('changeReason',true)} rows={2} required minLength={5} maxLength={500} />, 'ui.maintenance.reasonHint')}</fieldset>
          <section className={'maintenance-impact' + (reviewCurrent && review?.conflicts.length === 0 ? ' is-reviewed' : '')} aria-labelledby="maintenance-impact-heading" aria-live="polite">
            <div className="maintenance-impact-heading"><CalendarCheck2 size={20} aria-hidden="true" /><h3 id="maintenance-impact-heading">{t('ui.maintenance.impactHeading')}</h3></div>
            <p>{t(reviewCurrent ? (review?.conflicts.length ? 'ui.choose_another_maintenance_window_or_73fdedc9' : 'ui.maintenance.impactReady') : 'ui.maintenance.impactPending')}</p>
            {reviewCurrent && Boolean(review?.conflicts.length) && <><h4>{t('ui.conflicting_bookings_6ce77469')}</h4><ul>{review?.conflicts.map(row => <li key={row.id}><strong>{row.title || row.id}</strong><span>{formatVietnamDateTime(row.startAt) + ' — ' + formatVietnamDateTime(row.endAt)}</span></li>)}</ul><button type="button" className="secondary-button" disabled={busy} onClick={onBookings}>{t('ui.open_bookings_4df4b942')}<ArrowUpRight size={16} aria-hidden="true" /></button></>}
            <button ref={checkButtonRef} type="button" className="secondary-button" disabled={busy || staleJob} onClick={() => void checkImpact()}>{t(operation === 'checking' ? 'ui.maintenance.checking' : 'ui.check_affected_bookings_f7d4f35b')}</button>
          </section>
          <div className="maintenance-form-actions"><button className="primary-button" disabled={busy || !canSave}>{t(operation === 'saving' ? 'ui.maintenance.saving' : 'ui.save_maintenance_7bf4123f')}</button><span>{t('ui.maintenance.safetyHint')}</span></div>
        </form> : selected ? <section className="maintenance-dossier" aria-labelledby="maintenance-dossier-title">
          <div className="maintenance-detail-heading"><div><h2 id="maintenance-dossier-title">{selected.title}</h2><p>{t(selected.kind === 'calibration' ? 'ui.calibration_a71e17c8' : 'ui.maintenance_8ad424bd')}</p></div><Status value={selected.status} /></div>
          <div className="maintenance-resource"><Wrench size={20} aria-hidden="true" /><div><strong>{selected.resource?.name || selected.resourceId}</strong><span>{selected.resource?.code}{selected.resource?.lab?.name ? ' · ' + selected.resource.lab.name : ''}</span></div></div>
          <dl className="maintenance-facts"><div><dt>{t('ui.maintenance.plannedStart')}</dt><dd>{formatVietnamDateTime(selected.startAt)}</dd></div><div><dt>{t('ui.maintenance.plannedEnd')}</dt><dd>{formatVietnamDateTime(selected.endAt)}</dd></div>{selected.createdBy?.fullName && <div><dt>{t('ui.maintenance.createdBy')}</dt><dd>{selected.createdBy.fullName}</dd></div>}{selected.createdAt && <div><dt>{t('ui.maintenance.createdAt')}</dt><dd>{formatVietnamDateTime(selected.createdAt)}</dd></div>}</dl>
          <section className="maintenance-work-notes"><h3>{t('ui.work_notes_76158ed9')}</h3><p>{selected.notes || t('ui.maintenance.noNotes')}</p></section>
          {openStatuses.includes(selected.status) ? <><div className="maintenance-dossier-actions"><button className="secondary-button" disabled={busy} onClick={() => openPlanner(selected)}>{t('ui.reschedule_edit_job_125d619b')}</button><button className="secondary-button" disabled={busy} onClick={onBookings}>{t('ui.open_bookings_4df4b942')}<ArrowUpRight size={16} aria-hidden="true" /></button></div><ProgressForm key={selected.id + ':' + selected.status} row={selected} busy={busy} onTransition={data => transition(selected,data)} /></> : <p className="maintenance-context">{t('ui.maintenance.closedHint')}</p>}
          <p className="maintenance-safety">{t('ui.maintenance.safetyHint')}</p>
        </section> : <section className="maintenance-get-started"><CalendarCheck2 size={28} aria-hidden="true" /><h2>{t('ui.maintenance.planHeading')}</h2><button type="button" className="primary-button" onClick={() => openPlanner()}>{t('ui.new_maintenance_job_537b8db7')}</button></section>}
      </div>
    </div>
  </section>;
}
