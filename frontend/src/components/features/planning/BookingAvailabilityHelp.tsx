import { useState } from 'react';
import { planningApi } from '../../../services/planningApi';
import { useLocale } from '../../../providers/LocaleProvider';
import { toVietnamDateString, toVietnamTimeString } from '../../../utils/timezone.js';
export function BookingAvailabilityHelp({ resourceId, startAt, endAt, purposeCode, onChoose }: {
  resourceId: string; startAt: string; endAt: string; purposeCode: string;
  onChoose: (date: string, start: string, end: string) => void;
}) {
  const { tr, locale } = useLocale();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [slots, setSlots] = useState<{ startAt: string; endAt: string }[]>([]);
  async function run(wait: boolean) {
    setBusy(true); setMessage(''); setSlots([]);
    try {
      const body = { resourceIds: [resourceId], startAt, endAt, purposeCode: purposeCode || 'STUDY' };
      if (wait) { await planningApi.post('/waitlist', body); setMessage('planning.waitSaved'); }
      else {
        const result = await planningApi.post<{ suggestions: typeof slots }>('/suggestions', body);
        setSlots(result.suggestions); if (!result.suggestions.length) setMessage('planning.noSuggestions');
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : 'planning.failed'); }
    finally { setBusy(false); }
  }
  return <div className="booking-availability-help">
    <div className="planning-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => void run(false)}>{tr('planning.suggest')}</button>
      <button type="button" className="secondary-button" disabled={busy} onClick={() => void run(true)}>{tr('planning.joinWait')}</button></div>
    {busy && <p role="status">{tr('planning.loading')}</p>}
    {message && <p role="status">{tr(message)}</p>}
    {slots.map(slot => <button type="button" className="secondary-button" key={slot.startAt} onClick={() => onChoose(toVietnamDateString(slot.startAt), toVietnamTimeString(slot.startAt), toVietnamTimeString(slot.endAt))}>{new Date(slot.startAt).toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</button>)}
  </div>;
}
