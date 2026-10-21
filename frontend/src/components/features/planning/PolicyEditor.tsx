import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { planningApi, type Lab, type Policy } from '../../../services/planningApi';
import { useLocale } from '../../../providers/LocaleProvider';
const defaults: Policy = { revision: 0, minAdvanceBookingMinutes: 30, minBookingMinutes: 15, maxBookingMinutes: 480,
  maxAdvanceBookingDays: 30, allowWeekend: false, workDayStartHour: 8, workDayEndHour: 18, turnaroundMinutes: 0 };
type Preview = { affected: { id: string; title: string; reason: string }[]; scanned: number; total: number; truncated: boolean };
const numericFields: (keyof Omit<Policy, 'revision' | 'allowWeekend'>)[] = ['minAdvanceBookingMinutes','turnaroundMinutes','minBookingMinutes','maxBookingMinutes','maxAdvanceBookingDays','workDayStartHour','workDayEndHour'];
export function PolicyEditor() {
  const { t, locale } = useLocale();
  const [labs, setLabs] = useState<Lab[]>([]), [id, setId] = useState(''), [policy, setPolicy] = useState<Policy>(defaults);
  const [reason, setReason] = useState(''), [preview, setPreview] = useState<Preview | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<{ id: string; createdAt: string; reason: string; afterState: { revision?: number } }[]>([]);
  useEffect(() => { if (!id) return; const controller = new AbortController(); setHistory([]);
    planningApi.get<typeof history>(`/policies/${id}/history`, controller.signal).then(setHistory).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [id, policy.revision]);
  useEffect(() => { const controller = new AbortController(); planningApi.labs(controller.signal).then(setLabs).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, []);
  function choose(value: string) {
    const stored = labs.find(lab => lab.id === value)?.labPolicy;
    setId(value); setPolicy(Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, stored?.[key as keyof Policy] ?? fallback])) as Policy);
    setPreview(null); setSaved(false);
  }
  async function submit(save: boolean) {
    setBusy(true); setError(''); setSaved(false);
    const { revision, ...fields } = policy;
    const body = { ...fields, expectedRevision: revision, reason };
    try {
      if (save) {
        const result = await planningApi.policy(id, body);
        // Pick editable fields only; Prisma metadata must not be sent back.
        const next = Object.fromEntries(Object.keys(defaults).map(key => [key, result[key as keyof Policy]])) as Policy;
        setPolicy(next); setLabs(rows => rows.map(lab => lab.id === id ? { ...lab, labPolicy: next } : lab)); setPreview(null); setSaved(true);
      } else setPreview(await planningApi.post<Preview>(`/policies/${id}/preview`, body));
    } catch (e) { setError(e instanceof Error ? e.message : 'planning.failed'); } finally { setBusy(false); }
  }
  return <section className="planning-paper"><header><ShieldCheck size={23} /><div><h2>{t('planning.policy')}</h2><p>{t('planning.policyHint')}</p></div></header>
    <fieldset disabled={busy} className="planning-fields"><label>{t('planning.lab')}<select value={id} onChange={e => choose(e.target.value)}><option value="">{t('planning.chooseLab')}</option>{labs.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}</select></label>
    {id && <><p>{t('planning.revision', { version: policy.revision })}</p><div className="planning-grid">{numericFields.map(key => <label key={key}>{t(`planning.${key}`)}<input type="number" value={policy[key]} min={0} step={1} onChange={e => { setPolicy({ ...policy, [key]: Number(e.target.value) }); setPreview(null); setSaved(false); }} /></label>)}</div>
      <label className="planning-check"><input type="checkbox" checked={policy.allowWeekend} onChange={e => { setPolicy({ ...policy, allowWeekend: e.target.checked }); setPreview(null); }} />{t('planning.allowWeekend')}</label>
      <label>{t('planning.reason')}<textarea value={reason} minLength={10} maxLength={500} onChange={e => { setReason(e.target.value); setPreview(null); }} /></label>
      <button className="secondary-button" disabled={reason.trim().length < 10} onClick={() => void submit(false)}>{t('planning.preview')}</button></>}
    {preview && <section className="planning-impact"><h3>{t('planning.impact')}</h3><p>{t('planning.impactCount', { count: preview.affected.length, scanned: preview.scanned, total: preview.total })}</p>
      {preview.truncated && <p>{t('planning.truncated')}</p>}{preview.affected.map(row => <div className="planning-row" key={row.id}><span>{row.title}</span><span>{t(`api.${row.reason}`)}</span></div>)}
      <p>{t('planning.preserve')}</p><button className="primary-button" onClick={() => void submit(true)}>{t('planning.savePolicy')}</button></section>}
    </fieldset>{error && <p role="alert" className="planning-error">{t(error)}</p>}{saved && <p role="status">{t('planning.saved')}</p>}
    {history.length > 0 && <section><h3>{t('planning.policyHistory')}</h3>{history.map(row => <div className="planning-row" key={row.id}><time>{new Date(row.createdAt).toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</time><span>{row.reason}</span>{row.afterState.revision != null && <strong>{t('planning.revision', { version: row.afterState.revision })}</strong>}</div>)}</section>}</section>;
}
