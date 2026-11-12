import { useEffect, useState } from 'react';
import { planningApi } from '../../../services/planningApi';
import { useLocale } from '../../../providers/LocaleProvider';
export function BookingWaitlist() {
  const { tr, locale } = useLocale();
  const [rows, setRows] = useState<{ id: string; status: string; startAt: string; resource?: { name: string } }[]>([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(''), [revision, refresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError('');
    planningApi.get<typeof rows>('/waitlist', controller.signal).then(setRows).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [revision]);
  async function cancel(id: string) {
    setBusy(id); try { await planningApi.cancelWait(id); refresh(n => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'planning.failed'); } finally { setBusy(''); }
  }
  return <details><summary>{tr('planning.waitlist')}</summary><p>{tr('planning.waitHint')}</p>
    {error && <p role="alert">{tr(error)}</p>}
    {rows.map(row => <div className="planning-row" key={row.id}><span>{row.resource?.name} · {new Date(row.startAt).toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</span><span>{tr(`planning.wait.${row.status}`)}</span>
      {['WAITING','NOTIFIED'].includes(row.status) && <button className="secondary-button" type="button" disabled={!!busy} onClick={() => void cancel(row.id)}>{tr('planning.stopWaiting')}</button>}</div>)}
  </details>;
}
