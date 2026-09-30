import { translate } from "../i18n.js";
import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import { useLocale } from '../providers/LocaleProvider';
import { CANONICAL_BOOKING_STATUS_LABELS } from '../constants.js';
import { formatVietnamDateTime } from '../utils/timezone';
import '../styles/lab-workspace.css';

type Row = Record<string, any>;
type Props = { locale: string; user: { id: string; role: string }; bookings?: Row[]; maintenance?: Row[] };
const send = (path: string, body: Row, method = 'POST') => apiRequest(`/lab-workspace${path}`, { method, body: JSON.stringify(body) });
const message = (error: unknown) => error instanceof Error ? error.message : 'Request failed';

export function StockPage({ locale, user, maintenance = [] }: Props) {
  const t = translate;
  const [rows, setRows] = useState<Row[]>([]), [history, setHistory] = useState<Row[]>([]);
  const [selected, setSelected] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [kind, setKind] = useState('RECEIPT');
  const load = useCallback(() => { setLoading(true); setError(''); return apiRequest('/lab-workspace/stock').then(setRows).catch((e: unknown) => setError(message(e))).finally(() => setLoading(false)); }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { let active = true; setHistory([]); if (selected) apiRequest(`/lab-workspace/stock/${selected}`).then((data: Row[]) => { if (active) setHistory(data); }).catch((e: unknown) => { if (active) setError(message(e)); }); return () => { active = false; }; }, [selected, revision]);
  const item = rows.find(row => row.id === selected);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget, values = new FormData(form);
    setBusy(true); setError(''); setNotice('');
    try {
      await send('/stock', { id: requestId, resourceId: selected, kind, quantity: Number(values.get('quantity')), unit: item?.stockItem?.unit || String(values.get('unit')).trim(), reason: values.get('reason'), reference: values.get('reference'), ...(values.get('maintenanceId') ? { maintenanceId: values.get('maintenanceId') } : {}) });
      setRequestId(crypto.randomUUID()); form.reset(); setRevision(value => value + 1); await load(); setNotice("ui.movement_recorded_with_an_immutable_6ec6e97b");
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <section className="lab-workspace" aria-labelledby="stock-title">
    <header className="lab-page-heading"><div><h1 id="stock-title">{t("ui.materials_inventory_2b570ac6")}</h1><p>{t("ui.receive_against_a_reference_issue_6e507385")}</p></div><button className="secondary-button" onClick={load} disabled={busy || loading}>{t("ui.refresh_46140fa8")}</button></header>
    {error && <p className="alert danger" role="alert">{translate(error)}</p>}{notice && <p className="alert success" role="status">{translate(notice)}</p>}
    {loading ? <p role="status">{t("ui.loading_inventory_c6e34310")}</p> : <div className="lab-split">
      <div className="lab-register"><h2>{t("ui.material_register_88fc469e")}</h2>{!rows.length && <p>{t("ui.no_materials_in_your_assigned_638a41b2")}</p>}
        {rows.map(row => <button className="lab-register-row" key={row.id} aria-pressed={selected === row.id} disabled={busy} onClick={() => { setSelected(row.id); setKind('RECEIPT'); setError(''); setNotice(''); setRequestId(crypto.randomUUID()); }}><span><small>{row.code}</small><strong>{row.name}</strong></span><span>{row.stockItem ? `${row.stockItem.balance} ${row.stockItem.unit}` : t("ui.not_counted_1f853a6b")}</span></button>)}
      </div>
      <div>{item ? <><form key={selected} className="lab-form" onSubmit={submit} onChange={() => setRequestId(crypto.randomUUID())}><h2>{item.name}</h2><p>{item.stockItem ? `${t("ui.recorded_balance_a69afd19")}: ${item.stockItem.balance} ${item.stockItem.unit}` : t("ui.no_opening_balance_record_the_aaf229d8")}</p>
        <fieldset disabled={busy}><label>{t("ui.movement_8296d601")}<select value={kind} onChange={e => { setKind(e.target.value); setRequestId(crypto.randomUUID()); }}><option value="RECEIPT">{t("ui.receipt_baac5c24")}</option><option value="ISSUE" disabled={!item.stockItem}>{t("ui.issue_d121ba48")}</option>{user.role === 'ADMIN' && <option value="ADJUSTMENT" disabled={!item.stockItem}>{t("ui.count_adjustment_e6596ca2")}</option>}</select></label>
        <div className="lab-fields"><label>{t("ui.quantity_bdb17c5e")}<input name="quantity" type="number" step="1" min={kind === 'ADJUSTMENT' ? -1000000 : 1} max="1000000" required /></label><label>{t("ui.unit_6af0c374")}<input name="unit" defaultValue={item.stockItem?.unit || ''} readOnly={Boolean(item.stockItem)} required maxLength={30} placeholder={t("ui.piece_box_roll_a4040736")} /></label></div>
        {kind === 'ADJUSTMENT' && <p className="lab-help">{t("ui.enter_a_signed_difference_2_8b95c334")}</p>}
        <label>{t("ui.receipt_or_count_reference_462a5a35")}<input name="reference" required minLength={2} maxLength={120} /></label><label>{t("ui.reason_and_recipient_or_department_782a5850")}<textarea name="reason" required minLength={5} maxLength={500} rows={3} /></label>
        {kind === 'ISSUE' && <label>{t("ui.issue_for_maintenance_220c2978")}<select name="maintenanceId"><option value="">{t("ui.not_related_to_maintenance_5028ec8b")}</option>{maintenance.filter(job => ['scheduled', 'in_progress'].includes(job.status) && job.resource?.laboratoryId === item.laboratoryId).map(job => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>}
        <button className="primary-button" type="submit">{busy ? t("ui.recording_ef1d9622") : t("ui.record_movement_17b93ee3")}</button></fieldset></form>
        <section className="lab-history"><h2>{t("ui.recent_movement_ledger_be1a2b3f")}</h2><p className="lab-help">{t("ui.latest_100_entries_correct_errors_3d61d73a")}</p>{history.map(row => <article className="lab-ledger-row" key={row.id}><div><strong>{row.delta > 0 ? '+' : ''}{row.delta} {item.stockItem?.unit}</strong><span>{row.reference} · {formatVietnamDateTime(row.createdAt)}</span></div><p>{row.reason}</p><small>{row.actor.fullName} · {t("ui.balance_after_2a765c6f")}: {row.balanceAfter}{row.maintenance && ` · ${row.maintenance.title}`}</small></article>)}</section></> : <p className="lab-empty">{t("ui.select_a_material_to_inspect_add32751")}</p>}</div>
    </div>}
  </section>;
}

export function TeachingPage({ locale, user, bookings = [] }: Props) {
  const { tr } = useLocale();
  const t = translate;
  const [groups, setGroups] = useState<Row[]>([]), [detail, setDetail] = useState<Row | null>(null);
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('group') || ''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0);
  const manager = user.role !== 'STUDENT';
  useEffect(() => { let active = true; setLoading(true); apiRequest('/lab-workspace/groups').then((data: Row[]) => { if (active) setGroups(data); }).catch((e: unknown) => { if (active) setError(message(e)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [revision]);
  useEffect(() => { let active = true; setDetail(null); if (selected) apiRequest(`/lab-workspace/groups/${selected}`).then((data: Row) => { if (active) setDetail(data); }).catch((e: unknown) => { if (active) setError(message(e)); }); return () => { active = false; }; }, [selected, revision]);
  function selectGroup(id: string) {
    setSelected(id); setError('');
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    params.set('group', id);
    window.history.replaceState(null, '', `${window.location.hash.split('?')[0]}?${params}`);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>, path: string, method = 'POST') {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    setBusy(true); setError(''); setNotice('');
    try { await send(path, Object.fromEntries(new FormData(form)), method); form.reset(); setRevision(value => value + 1); setNotice("ui.changes_saved_237d3a2c"); } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <section className="lab-workspace" aria-labelledby="teaching-title"><header className="lab-page-heading"><div><h1 id="teaching-title">{t("ui.classes_and_course_groups_5aa872e3")}</h1><p>{t("ui.track_practical_learning_goals_and_0713a2b7")}</p></div></header>
    {error && <p className="alert danger" role="alert">{translate(error)}</p>}{notice && <p className="alert success" role="status">{translate(notice)}</p>}
    {user.role === 'ADMIN' && <details className="lab-disclosure"><summary>{t("ui.create_a_group_and_assign_a45b1990")}</summary><form className="lab-form" onSubmit={event => void submit(event, '/groups')}><fieldset disabled={busy}><div className="lab-fields"><label>{t("ui.group_code_21445b53")}<input name="code" required minLength={2} maxLength={40} /></label><label>{t("ui.term_0df39c2e")}<input name="term" required minLength={2} maxLength={80} /></label></div><label>{t("ui.class_or_course_name_3dd74b37")}<input name="name" required minLength={3} maxLength={160} /></label><label>{t("ui.existing_lecturer_account_email_928740f4")}<input name="lecturerEmail" type="email" required /></label><button className="primary-button">{t("ui.create_group_25ac5057")}</button></fieldset></form></details>}
    {loading ? <p role="status">{t("ui.loading_42d77f3a")}</p> : <div className="lab-split"><div className="lab-register"><h2>{t("ui.assigned_groups_586253c2")}</h2>{!groups.length && <p className="lab-empty">{t("ui.no_assigned_groups_contact_your_6443059b")}</p>}{groups.map(group => <button className="lab-register-row" disabled={busy} key={group.id} aria-pressed={selected === group.id} onClick={() => selectGroup(group.id)}><span><small>{group.code} · {group.term}</small><strong>{group.name}</strong><small>{group.lecturer.fullName}</small></span></button>)}</div>
    <div>{!detail ? <p className="lab-empty">{t("ui.select_a_group_to_view_54e21ee6")}</p> : <><h2>{detail.name}</h2>{manager && <><details className="lab-disclosure"><summary>{t("ui.members_and_student_enrollment_2c48ce38")} ({detail.members.length})</summary><ul>{detail.members.map((member: Row) => <li key={member.userId}>{member.user.fullName}</li>)}</ul><form className="lab-form" onSubmit={event => void submit(event, `/groups/${selected}/members`)}><fieldset disabled={busy}><label>{t("ui.existing_student_account_email_fa715e2e")}<input name="email" type="email" required /></label><button className="secondary-button">{t("ui.add_to_group_3b0e8d25")}</button></fieldset></form></details></>}
    {!manager && <form className="lab-form" onSubmit={event => void submit(event, `/groups/${selected}/activities`)}><h3>{t("ui.submit_a_practical_activity_6c367468")}</h3><fieldset disabled={busy}><label>{t("ui.your_booking_a73784e6")}<select name="bookingId" required><option value="">{t("ui.select_a_booking_ee647416")}</option>{bookings.filter(row => row.requestedById === user.id && !['REJECTED', 'CANCELLED'].includes(row.status) && !detail.activities.some((a: Row) => a.bookingId === row.id)).map(row => <option value={row.id} key={row.id}>{row.title} · {formatVietnamDateTime(row.startAt)}</option>)}</select></label><label>{t("ui.learning_objective_a0d2bc9b")}<textarea name="learningGoal" required minLength={10} maxLength={1000} rows={3} /></label><button className="primary-button">{t("ui.submit_to_lecturer_a213afda")}</button></fieldset></form>}
    <section className="lab-history"><h3>{t("ui.submitted_activities_8a922016")}</h3>{!detail.activities.length && <p>{t("ui.no_submitted_activities_6ea2553e")}</p>}{detail.activities.map((activity: Row) => <article className="lab-ledger-row" key={activity.id}><strong>{activity.booking.requestedBy.fullName} · {activity.booking.resource.name}</strong><p>{activity.learningGoal}</p><small>{formatVietnamDateTime(activity.booking.startAt)} · {tr(CANONICAL_BOOKING_STATUS_LABELS[activity.booking.status] || activity.booking.status)}</small><p>{activity.decision === 'SUBMITTED' ? t("ui.awaiting_review_3b3d82dd") : activity.decision === 'ENDORSED' ? t("ui.learning_goal_endorsed_8d160073") : t("ui.changes_requested_7babf7a3")}</p>{activity.feedback && <blockquote>{activity.feedback}</blockquote>}{!manager && activity.decision === 'CHANGES_REQUESTED' && <form className="lab-form" onSubmit={event => void submit(event, `/groups/${selected}/activities/${activity.id}/revision`, 'PATCH')}><fieldset disabled={busy}><label>{t("ui.revise_your_learning_goal_eedd54b0")}<textarea name="learningGoal" required minLength={10} maxLength={1000} defaultValue={activity.learningGoal} rows={3} /></label><button className="primary-button">{t("ui.resubmit_for_review_971f72f7")}</button></fieldset></form>}{manager && <form className="lab-form" onSubmit={event => void submit(event, `/groups/${selected}/activities/${activity.id}`, 'PATCH')}><fieldset disabled={busy}><label>{t("ui.feedback_b6b691ee")}<textarea name="feedback" required minLength={5} maxLength={1000} rows={2} defaultValue={activity.feedback || ''} /></label><label>{t("ui.academic_review_8f266b30")}<select name="decision" defaultValue={activity.decision === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED' : 'ENDORSED'}><option value="ENDORSED">{t("ui.endorse_learning_goal_9ff5b307")}</option><option value="CHANGES_REQUESTED">{t("ui.request_changes_c3ec3ee0")}</option></select></label><button className="secondary-button">{t("ui.save_feedback_d40b3784")}</button></fieldset></form>}</article>)}</section></>}</div></div>}
  </section>;
}
