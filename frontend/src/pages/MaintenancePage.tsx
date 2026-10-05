import { translate } from "../i18n.js";
import React, { useState } from 'react';
import { apiRequest } from '../api.js';
import { formatVietnamDateTime, toVietnamDateString, toVietnamTimeString, vietnamTimeToIso } from '../utils/timezone';
import '../styles/lab-workspace.css';
type Row = Record<string, any>;
export function MaintenancePage({ locale, resources, maintenance, onChanged, onBookings }: { locale: string; resources: Row[]; maintenance: Row[]; onChanged: () => void; onBookings: () => void }) {
  const t = translate;
  const [editing, setEditing] = useState<Row | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [conflicts, setConflicts] = useState<Row[] | null>(null), [filter, setFilter] = useState('open');
  const [notice, setNotice] = useState('');
  const statusLabel = (status: string) => ({ scheduled: t("ui.scheduled_2cf00513"), in_progress: t("ui.in_progress_50e04c04"), completed: t("ui.completed_5eb36f8c"), cancelled: t("ui.cancelled_2f777a90") } as Record<string,string>)[status] || status;
  const local = (iso: string) => `${toVietnamDateString(iso)}T${toVietnamTimeString(iso)}`;
  const parse = (value: FormDataEntryValue | null) => { const [date,time] = String(value || '').split('T'); return vietnamTimeToIso(date, time); };
  const payload = (form: HTMLFormElement) => { const values = new FormData(form); return { resourceId: values.get('resourceId'), title: values.get('title'), kind: values.get('kind'), startAt: parse(values.get('startAt')), endAt: parse(values.get('endAt')), notes: String(values.get('notes') || '').trim(), ...(editing?.id ? { changeReason: values.get('changeReason') } : { status: 'scheduled' }) }; };
  async function check(form: HTMLFormElement) {
    if (!form.reportValidity()) return;
    setBusy(true); setError(''); setConflicts(null);
    try { const data = payload(form); const query = new URLSearchParams({resourceId: String(data.resourceId), startAt: data.startAt, endAt: data.endAt}); const result = await apiRequest(`/maintenance/impact?${query}`); setConflicts(result.conflicts); } catch (e) { setError(e instanceof Error ? e.message : 'Request failed'); } finally { setBusy(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; const data = payload(event.currentTarget); setBusy(true); setError(''); setNotice('');
    try { await apiRequest(editing?.id ? `/maintenance/${editing.id}` : '/maintenance', { method: editing?.id ? 'PATCH' : 'POST', body: JSON.stringify(data) }); setEditing(null); setConflicts(null); onChanged(); setNotice("ui.maintenance_saved_after_rechecking_conflicts_e1c210d1"); } catch (e: any) { setError(e.message); if (e.details?.conflicts) setConflicts(e.details.conflicts); } finally { setBusy(false); }
  }
  async function transition(event: React.FormEvent<HTMLFormElement>, row: Row) {
    event.preventDefault(); if (busy) return; const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); setBusy(true); setError('');
    try { await apiRequest(`/maintenance/${row.id}`, { method: 'PATCH', body: JSON.stringify(data) }); onChanged(); setNotice("ui.job_updated_inspect_and_update_31b494ac"); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  const visibleJobs = maintenance.filter(row => filter === 'all' || ['scheduled','in_progress'].includes(row.status));
  return <section className="lab-workspace"><header className="lab-page-heading"><div><h1>{t("ui.maintenance_and_calibration_fa8ebcfe")}</h1><p>{t("ui.plan_equipment_downtime_review_affected_dcb30fd6")}</p></div><button className="primary-button" disabled={busy} onClick={() => { setEditing({}); setConflicts(null); setError(''); }}>{t("ui.schedule_maintenance_c16a1e26")}</button></header>
    {error && <p className="alert danger" role="alert">{translate(error)}</p>}{notice && <p role="status">{translate(notice)}</p>}
    {editing && <form key={editing.id || "new"} className="lab-form" onSubmit={save} onChange={() => setConflicts(null)}><h2>{editing.id ? t("ui.reschedule_maintenance_738f4cef") : t("ui.new_maintenance_job_537b8db7")}</h2><fieldset disabled={busy}>
      <label>{t("ui.resource_9a35ef53")}<select name="resourceId" required defaultValue={editing.resource?.id || editing.resourceId || ''}><option value="">{t("ui.select_a_resource_8849f4e1")}</option>{resources.map(row => <option value={row.id} key={row.id}>{row.code} · {row.name}</option>)}</select></label>
      <div className="lab-fields"><label>{t("ui.job_title_2dbcad3d")}<input name="title" required minLength={3} maxLength={255} defaultValue={editing.title || ''}/></label><label>{t("ui.job_type_173c2afd")}<select name="kind" defaultValue={editing.kind || 'maintenance'}><option value="maintenance">{t("ui.maintenance_8ad424bd")}</option><option value="calibration">{t("ui.calibration_a71e17c8")}</option></select></label></div>
      <div className="lab-fields"><label>{t("ui.start_utc_07_00_982bb1b8")}<input type="datetime-local" name="startAt" required defaultValue={editing.startAt ? local(editing.startAt) : ''} /></label><label>{t("ui.end_utc_07_00_9e37a119")}<input type="datetime-local" name="endAt" required defaultValue={editing.endAt ? local(editing.endAt) : ''} /></label></div>
      <label>{t("ui.work_notes_76158ed9")}<textarea name="notes" maxLength={2000} rows={3} defaultValue={editing.notes || ''} /></label>{editing.id && <label>{t("ui.reason_for_rescheduling_6c9a5bb9")}<input name="changeReason" required minLength={5} maxLength={500} /></label>}
      <div className="lab-inline-actions"><button type="button" className="secondary-button" onClick={event => { const form = event.currentTarget.form; if (form) void check(form); }}>{t("ui.check_affected_bookings_f7d4f35b")}</button><button className="primary-button" disabled={conflicts === null || conflicts.length > 0}>{t("ui.save_maintenance_7bf4123f")}</button><button type="button" className="secondary-button" onClick={() => setEditing(null)}>{t("ui.close_5d54c2a1")}</button></div>
    </fieldset>{conflicts !== null && <div role="status"><h3>{conflicts.length ? t("ui.conflicting_bookings_6ce77469") : t("ui.no_booking_conflicts_at_this_e0265831")}</h3>{conflicts.map(row => <p key={row.id}>{row.title || row.id} · {formatVietnamDateTime(row.startAt)} — {formatVietnamDateTime(row.endAt)}</p>)}{conflicts.length > 0 && <><p>{t("ui.choose_another_maintenance_window_or_73fdedc9")}</p><button type="button" className="secondary-button" onClick={onBookings}>{t("ui.open_bookings_4df4b942")}</button></>}</div>}</form>}
    <label>{t("ui.show_jobs_75e59663")} <select value={filter} onChange={e => setFilter(e.target.value)}><option value="open">{t("ui.open_36766b6a")}</option><option value="all">{t("ui.all_49c73a31")}</option></select></label>
    {visibleJobs.map(row => <article className="lab-ledger-row" key={row.id}><div><strong>{row.title}</strong><span>{statusLabel(row.status)}</span></div><p>{row.resource?.code} · {row.resource?.name}</p><p>{formatVietnamDateTime(row.startAt)} — {formatVietnamDateTime(row.endAt)}</p>{row.notes && <p>{row.notes}</p>}{['scheduled','in_progress'].includes(row.status) && <><button className="secondary-button" disabled={busy} onClick={() => { setEditing(row); setConflicts(null); window.scrollTo({top:0,behavior:'auto'}); }}>{t("ui.reschedule_edit_job_125d619b")}</button><details className="lab-disclosure"><summary>{t("ui.record_progress_or_cancellation_071fe841")}</summary><form className="lab-form" onSubmit={event => void transition(event,row)}><fieldset disabled={busy}><label>{t("ui.new_status_96c219fc")}<select name="status">{row.status === 'scheduled' ? <option value="in_progress">{t("ui.start_work_eee7d061")}</option> : <option value="completed">{t("ui.complete_job_3d4ff945")}</option>}<option value="cancelled">{t("ui.cancel_job_ec792b0b")}</option></select></label><label>{t("ui.outcome_reason_19097f99")}<textarea name="changeReason" required minLength={5} maxLength={500}/></label><button className="primary-button">{t("ui.save_progress_ea4d7f3f")}</button></fieldset></form></details></>}</article>)}
    {!visibleJobs.length && <div className="lab-empty"><p>{filter === 'open' ? t("ui.no_open_maintenance_jobs_2ab3ecb0") : t("ui.no_maintenance_jobs_within_your_94478cd8")}</p>{filter === 'open' && maintenance.length > 0 && <button className="secondary-button" onClick={() => setFilter('all')}>{t("ui.view_all_jobs_91067a97")}</button>}</div>}
  </section>;
}
