import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Printer } from 'lucide-react';
import { planningApi } from '../../../services/planningApi';
import { useLocale } from '../../../providers/LocaleProvider';
import { checklistAvailability } from './planningPresentation';
type Entry = { id: string; stage: string; actorId: string; items: string[]; notes: string; createdAt: string };
type Dossier = { booking: { id: string; title: string; status: string; startAt: string; endAt: string; policySnapshot: Record<string, unknown>;
  resource: { name: string; code: string }; checklistEntries: Entry[]; incidents: { id: string; title: string; status: string }[];
  usageLogs: { id: string; action: string; createdAt: string; conditionBefore?: string; conditionAfter?: string }[] }; templates: Record<string,string[]> };
export function DossierPanel({ bookingId, role }: { bookingId: string; role: string }) {
  const { t, locale } = useLocale();
  const [data, setData] = useState<Dossier | null>(null), [stage, setStage] = useState(role === 'CUSTOMER' ? 'RETURN' : 'HANDOVER');
  const [checked, setChecked] = useState<string[]>([]), [notes, setNotes] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [revision, refresh] = useState(0);
  useEffect(() => { const controller = new AbortController(); setData(null); setError('');
    planningApi.get<Dossier>(`/dossiers/${bookingId}`, controller.signal).then(setData).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort();
  }, [bookingId, revision]);
  async function save() {
    setBusy(true); setError('');
    try { await planningApi.post(`/dossiers/${bookingId}/checklist`, { stage, items: checked, notes }); setChecked([]); setNotes(''); refresh(value => value + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'planning.failed'); } finally { setBusy(false); }
  }
  const date = (value: string) => new Date(value).toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' });
  const unavailable = data ? checklistAvailability(stage, data.booking.status, data.booking.checklistEntries.some(entry => entry.stage === stage)) : '';
  return <section className="planning-paper planning-dossier"><header><ClipboardCheck size={23}/><div><h2>{data?.booking.title || t('planning.dossier')}</h2><p>{data?.booking.resource.name}</p></div>
    <button className="secondary-button planning-no-print" disabled={!data} onClick={() => window.print()}><Printer size={17}/>{t('planning.print')}</button></header>
    {error && <p role="alert" className="planning-error">{t(error)}</p>}
    {!data && !error && <p role="status">{t('planning.loading')}</p>}
    {data && <><p><strong>{data.booking.resource.code} · {t(`enum.booking.${data.booking.status}`)}</strong></p><p>{date(data.booking.startAt)} — {date(data.booking.endAt)}</p><p>{t('planning.declaredEvidence')}</p>
      <ol className="planning-timeline">{data.booking.usageLogs.map(log => <li key={log.id}><time>{date(log.createdAt)}</time><strong>{t(`planning.action.${log.action}`)}</strong><p>{log.conditionBefore || log.conditionAfter}</p></li>)}</ol>
      <div className="planning-grid">{data.booking.checklistEntries.map(entry => <article className="planning-evidence" key={entry.id}><h3>{t(`planning.${entry.stage}`)}</h3><small>{date(entry.createdAt)} · {entry.actorId.slice(0,8)}</small><ul>{entry.items.map(key => <li key={key}>{t(`planning.check.${entry.stage}.${key}`)}</li>)}</ul><p>{entry.notes}</p></article>)}</div>
      {data.booking.incidents.length > 0 && <section><h3>{t('planning.incidents')}</h3>{data.booking.incidents.map(incident => <p key={incident.id}>{incident.title} · {incident.status}</p>)}</section>}
      <fieldset className="planning-fields planning-no-print" disabled={busy}><h3>{t('planning.recordEvidence')}</h3><label>{t('planning.stage')}<select value={stage} onChange={e => { setStage(e.target.value); setChecked([]); }}>{(role === 'CUSTOMER' ? ['RETURN'] : ['HANDOVER','RETURN','INSPECTION']).map(value => <option key={value} value={value}>{t(`planning.${value}`)}</option>)}</select></label>
        {unavailable && <p role="status">{t(unavailable)}</p>}
        <fieldset className="planning-fields" disabled={!!unavailable}>
        {(data.templates[stage] || []).map(key => <label className="planning-check" key={key}><input type="checkbox" checked={checked.includes(key)} onChange={e => setChecked(e.target.checked ? [...checked, key] : checked.filter(item => item !== key))}/>{t(`planning.check.${stage}.${key}`)}</label>)}
        <label>{t('planning.notes')}<textarea value={notes} maxLength={2000} onChange={e => setNotes(e.target.value)}/></label>
        <button className="primary-button" disabled={checked.length !== 3 || notes.trim().length < 5 || data.booking.checklistEntries.some(entry => entry.stage === stage)} onClick={() => void save()}>{t('planning.record')}</button>
        </fieldset>
      </fieldset></>}
  </section>;
}
