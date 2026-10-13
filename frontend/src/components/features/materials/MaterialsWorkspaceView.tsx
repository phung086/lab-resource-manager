import { HelpDisclosure } from "../../base/HelpDisclosure";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { navigateApp, readRouteParams, workspacePathForTab } from '../../../workspaceRoutes.js';
import { formatVietnamDateTime } from '../../../utils/timezone';
import { emptyMaterialDraft, validateMaterialMovement } from '../../../utils/materialValidation';
import type { Material, MaterialDraft, MaterialErrors, MaterialMaintenance } from '../../../utils/materialValidation';
import '../../../styles/materials-workspace.css';

type Movement = { id: string; delta: number; reference: string; reason: string; createdAt: string; balanceAfter: number; actor: { fullName: string }; maintenance?: { title: string } };
const errorText = (error: unknown) => error instanceof Error ? error.message : 'ui.materials.requestFailed';
export function MaterialsWorkspaceView({ user, maintenance = [] }: { user: { role: string }; maintenance?: MaterialMaintenance[] }) {
  const { t } = useLocale();
  const [rows, setRows] = useState<Material[]>([]), [selected, setSelected] = useState(() => readRouteParams().get('resource') || '');
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true), [listError, setListError] = useState(''), [revision, setRevision] = useState(0);
  const [ledger, setLedger] = useState<{ resourceId: string; rows: Movement[] }>({ resourceId: '', rows: [] }), [rawHistoryLoading, setHistoryLoading] = useState(false), [rawHistoryError, setHistoryError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, MaterialDraft>>({}), [errors, setErrors] = useState<MaterialErrors>({});
  const [busy, setBusy] = useState(false), [submitError, setSubmitError] = useState(''), [notice, setNotice] = useState('');
  const busyRef = useRef(false), requests = useRef<Record<string, { fingerprint: string; id: string }>>({}), formRef = useRef<HTMLFormElement>(null), dossierRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setListError('');
    apiRequest('/lab-workspace/stock', { signal: controller.signal }).then((data: Material[]) => { if (!controller.signal.aborted) setRows(data); }).catch((e: unknown) => { if (!controller.signal.aborted) setListError(errorText(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController(); setLedger({ resourceId: selected, rows: [] }); setHistoryError(''); setHistoryLoading(Boolean(selected));
    if (selected) apiRequest(`/lab-workspace/stock/${encodeURIComponent(selected)}`, { signal: controller.signal }).then((data: Movement[]) => { if (!controller.signal.aborted) setLedger({ resourceId: selected, rows: data }); }).catch((e: unknown) => { if (!controller.signal.aborted) setHistoryError(errorText(e)); }).finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [selected, revision]);
  useEffect(() => { const sync = () => { if (!busyRef.current) { setSelected(readRouteParams().get('resource') || ''); setErrors({}); setSubmitError(''); setNotice(''); } }; window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync); }, []);
  const item = rows.find(row => row.id === selected), draft = drafts[selected] || emptyMaterialDraft();
  const history = ledger.resourceId === selected ? ledger.rows : [];
  const historyLoading = ledger.resourceId !== selected || rawHistoryLoading;
  const historyError = ledger.resourceId === selected ? rawHistoryError : '';
  const update = (field: keyof MaterialDraft, value: string) => { setDrafts(previous => ({ ...previous, [selected]: { ...(previous[selected] || emptyMaterialDraft()), [field]: value, ...(field === 'kind' ? { maintenanceId: '' } : {}) } })); setErrors(previous => ({ ...previous, [field]: undefined })); setSubmitError(''); setNotice(''); };
  const select = useCallback((id: string) => {
    if (busyRef.current) return;
    setSelected(id); setErrors({}); setSubmitError(''); setNotice('');
    const params = readRouteParams(); if (id) params.set('resource', id); else params.delete('resource');
    navigateApp(workspacePathForTab('stock', params), { notify: false });
    if (id && window.matchMedia('(max-width: 900px)').matches) requestAnimationFrame(() => { dossierRef.current?.scrollIntoView({ block: 'start' }); dossierRef.current?.focus({ preventScroll: true }); });
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busyRef.current) return;
    const result = validateMaterialMovement(draft, item, user.role, maintenance); setErrors(result.errors); setSubmitError(''); setNotice('');
    if (!result.data) { const first = Object.keys(result.errors)[0]; formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(); return; }
    const fingerprint = JSON.stringify(result.data);
    if (requests.current[selected]?.fingerprint !== fingerprint) requests.current[selected] = { fingerprint, id: crypto.randomUUID() };
    const request = requests.current[selected];
    busyRef.current = true; setBusy(true);
    try {
      await apiRequest('/lab-workspace/stock', { method: 'POST', body: JSON.stringify({ id: request.id, ...result.data }) });
      delete requests.current[selected];
      setDrafts(previous => ({ ...previous, [selected]: emptyMaterialDraft() })); setNotice('ui.movement_recorded_with_an_immutable_6ec6e97b'); setRevision(value => value + 1);
    } catch (error) { setSubmitError(errorText(error)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const visible = rows.filter(row => `${row.name} ${row.code}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && (filter === 'all' || (filter === 'uninitialized' ? !row.stockItem : Boolean(row.stockItem))));
  const valid = validateMaterialMovement(draft, item, user.role, maintenance);
  const fieldError = (field: keyof MaterialDraft) => errors[field] ? <span className="materials-field-error" id={`material-${field}-error`}>{t(errors[field]!)}</span> : null;
  const attrs = (field: keyof MaterialDraft) => ({ id: `material-${field}`, name: field, 'aria-invalid': Boolean(errors[field]), 'aria-describedby': errors[field] ? `material-${field}-error` : undefined });
  const labels: Record<keyof MaterialDraft, string> = { kind: 'ui.movement_8296d601', quantity: 'ui.quantity_bdb17c5e', unit: 'ui.unit_6af0c374', reference: 'ui.receipt_or_count_reference_462a5a35', reason: 'ui.reason_and_recipient_or_department_782a5850', maintenanceId: 'ui.issue_for_maintenance_220c2978' };
  return <section className="materials-workspace" aria-labelledby="materials-title">
    <header className="materials-heading"><div><h1 id="materials-title">{t('ui.materials_inventory_2b570ac6')}</h1><HelpDisclosure>{t('ui.receive_against_a_reference_issue_6e507385')}</HelpDisclosure></div><button className="secondary-button" disabled={loading || busy} onClick={() => setRevision(value => value + 1)}>{t('ui.refresh_46140fa8')}</button></header>
    {listError && <div className="alert danger" role="alert">{t(listError)} <button className="secondary-button" disabled={loading || busy} onClick={() => setRevision(value => value + 1)}>{t('ui.materials.retry')}</button></div>}
    <div className="materials-layout">
      <section className="materials-register" aria-labelledby="materials-register-title" aria-busy={loading}>
        <div className="materials-section-heading"><div><h2 id="materials-register-title">{t('ui.material_register_88fc469e')}</h2><p>{t('ui.materials.resultCount', { shown: visible.length, total: rows.length })}</p></div></div>
        <div className="materials-toolbar"><label>{t('ui.materials.search')}<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label><label>{t('ui.materials.balanceFilter')}<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">{t('ui.materials.all')}</option><option value="initialized">{t('ui.materials.counted')}</option><option value="uninitialized">{t('ui.not_counted_1f853a6b')}</option></select></label></div>
        {loading && <p role="status">{t('ui.loading_inventory_c6e34310')}</p>}
        {!loading && !rows.length && !listError && <div className="materials-empty">{t('ui.no_materials_in_your_assigned_638a41b2')}</div>}
        {rows.length > 0 && <><div className="materials-table-scroll"><table><thead><tr><th scope="col">{t('ui.materials.material')}</th><th scope="col">{t('ui.recorded_balance_a69afd19')}</th></tr></thead><tbody>{visible.map(row => <tr key={row.id} className={row.id === selected ? 'is-selected' : ''}><td><button disabled={busy} className="materials-row-button" aria-pressed={row.id === selected} onClick={() => select(row.id)}><span className="materials-code">{row.code}</span><strong>{row.name}</strong><span className="materials-open">{t('ui.materials.viewRecord')} →</span></button></td><td>{row.stockItem ? <><strong className="materials-balance">{row.stockItem.balance.toLocaleString()}</strong><span className="materials-unit">{row.stockItem.unit}</span></> : <span className="materials-uninitialized">{t('ui.not_counted_1f853a6b')}</span>}</td></tr>)}</tbody></table></div>{!visible.length && <p className="materials-empty">{t('ui.materials.noMatches')}</p>}<HelpDisclosure>{t('ui.materials.unitNote')}</HelpDisclosure></>}
      </section>
      <aside className="materials-dossier" ref={dossierRef} tabIndex={-1} aria-label={t('ui.materials.record')}>
        {!selected ? <div className="materials-empty"><h2>{t('ui.materials.record')}</h2><p>{t('ui.select_a_material_to_inspect_add32751')}</p></div> : !item ? <div className="materials-empty"><p role={loading ? 'status' : 'alert'}>{t(loading ? 'ui.loading_inventory_c6e34310' : 'ui.materials.unavailable')}</p><button className="secondary-button" onClick={() => select('')}>{t('ui.materials.close')}</button></div> : <>
          <div className="materials-section-heading"><div><p className="materials-code">{item.code}</p><h2>{item.name}</h2></div><button className="materials-close" disabled={busy} onClick={() => select('')}>{t('ui.materials.close')}</button></div>
          <div className="materials-balance-card"><span>{t('ui.recorded_balance_a69afd19')}</span>{item.stockItem ? <p><strong>{item.stockItem.balance.toLocaleString()}</strong> {item.stockItem.unit}</p> : <p>{t('ui.no_opening_balance_record_the_aaf229d8')}</p>}</div>
          <form ref={formRef} noValidate onSubmit={submit} className="materials-form">
            <h3>{t('ui.record_movement_17b93ee3')}</h3>
            {Object.values(errors).some(Boolean) && <div className="materials-error-summary" role="alert"><strong>{t('ui.materials.correctFields')}</strong><ul>{Object.entries(errors).filter(([, value]) => value).map(([field, key]) => <li key={field}><button type="button" onClick={() => formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus()}>{t(key!)}</button></li>)}</ul></div>}
            {submitError && <p className="alert danger" role="alert">{t(submitError)}</p>}{notice && <p className="alert success" role="status">{t(notice)}</p>}
            <fieldset disabled={busy}>
              <label htmlFor="material-kind">{t(labels.kind)}<select {...attrs('kind')} value={draft.kind} onChange={event => update('kind', event.target.value)}><option value="RECEIPT">{t('ui.receipt_baac5c24')}</option><option value="ISSUE" disabled={!item.stockItem}>{t('ui.issue_d121ba48')}</option>{user.role === 'ADMIN' && <option value="ADJUSTMENT" disabled={!item.stockItem}>{t('ui.count_adjustment_e6596ca2')}</option>}</select>{fieldError('kind')}</label>
              <div className="materials-fields"><label htmlFor="material-quantity">{t(labels.quantity)}<input {...attrs('quantity')} type="number" step="1" min={draft.kind === 'ADJUSTMENT' ? -1000000 : 1} max={1000000} value={draft.quantity} onChange={event => update('quantity', event.target.value)} required />{fieldError('quantity')}</label><label htmlFor="material-unit">{t(labels.unit)}<input {...attrs('unit')} value={item.stockItem?.unit || draft.unit} onChange={event => update('unit', event.target.value)} readOnly={Boolean(item.stockItem)} maxLength={30} required />{fieldError('unit')}</label></div>
              <p className="materials-help">{t(draft.kind === 'ADJUSTMENT' ? 'ui.enter_a_signed_difference_2_8b95c334' : 'ui.materials.quantityHint')}</p>
              <label htmlFor="material-reference">{t(labels.reference)}<input {...attrs('reference')} value={draft.reference} onChange={event => update('reference', event.target.value)} minLength={2} maxLength={120} required />{fieldError('reference')}</label>
              <label htmlFor="material-reason">{t(labels.reason)}<textarea {...attrs('reason')} value={draft.reason} onChange={event => update('reason', event.target.value)} minLength={5} maxLength={500} rows={3} required />{fieldError('reason')}</label>
              {draft.kind === 'ISSUE' && <label htmlFor="material-maintenanceId">{t(labels.maintenanceId)}<select {...attrs('maintenanceId')} value={draft.maintenanceId} onChange={event => update('maintenanceId', event.target.value)}><option value="">{t('ui.not_related_to_maintenance_5028ec8b')}</option>{maintenance.filter(job => ['scheduled', 'in_progress'].includes(job.status) && job.resource?.laboratoryId === item.laboratoryId).map(job => <option key={job.id} value={job.id}>{job.title}</option>)}</select>{fieldError('maintenanceId')}</label>}
              {draft.quantity.trim() && !valid.errors.quantity && !valid.errors.kind && <p className="materials-preview">{t('ui.materials.preview')} <strong>{valid.balanceAfter.toLocaleString()} {item.stockItem?.unit || draft.unit}</strong></p>}
              <button className="primary-button" type="submit">{t(busy ? 'ui.recording_ef1d9622' : 'ui.record_movement_17b93ee3')}</button>
            </fieldset>
          </form>
          <section className="materials-ledger" aria-labelledby="materials-ledger-title" aria-busy={historyLoading}><h3 id="materials-ledger-title">{t('ui.recent_movement_ledger_be1a2b3f')}</h3><HelpDisclosure>{t('ui.latest_100_entries_correct_errors_3d61d73a')}</HelpDisclosure>{historyLoading && <p role="status">{t('ui.materials.ledgerLoading')}</p>}{historyError && <p className="alert danger" role="alert">{t(historyError)} <button className="secondary-button" disabled={busy} onClick={() => setRevision(value => value + 1)}>{t('ui.materials.retry')}</button></p>}{!historyLoading && !historyError && !history.length && <p>{t('ui.materials.noMovements')}</p>}{history.map(row => <article key={row.id}><div className="materials-ledger-heading"><strong>{row.delta > 0 ? '+' : ''}{row.delta} {item.stockItem?.unit}</strong><time dateTime={row.createdAt}>{formatVietnamDateTime(row.createdAt)}</time></div><p>{row.reason}</p><p className="materials-ledger-meta">{row.reference} · {row.actor.fullName}<br />{t('ui.balance_after_2a765c6f')}: {row.balanceAfter}{row.maintenance && ` · ${row.maintenance.title}`}</p></article>)}</section>
        </>}
      </aside>
    </div>
  </section>;
}
