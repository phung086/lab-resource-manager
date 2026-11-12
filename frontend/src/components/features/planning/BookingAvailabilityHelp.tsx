import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Bell, CalendarClock, Replace } from 'lucide-react';
import { planningApi } from '../../../services/planningApi';
import { useLocale } from '../../../providers/LocaleProvider';
import { toVietnamDateString, toVietnamTimeString } from '../../../utils/timezone';
import '../../../styles/customer-booking.css';

type Slot = { startAt: string; endAt: string };
type Replacement = { replacement: { id: string; name: string; code: string }; amountVnd: number };
type Action = 'suggestions' | 'alternatives' | 'waitlist';

export function BookingAvailabilityHelp({ resourceId, startAt, endAt, purposeCode, onChoose, onAlternative }: Slot & {
  resourceId: string;
  purposeCode: string;
  onChoose: (date: string, start: string, end: string) => void;
  onAlternative?: (resourceId: string, purposeCode: string, signal: AbortSignal) => Promise<void>;
}) {
  const { tr, locale } = useLocale();
  const title = useId();
  const request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState('STUDY');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  useEffect(() => () => request.current?.abort(), []);

  async function run(action: Action, replacement?: string) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(action);
    setNotice('');
    setError('');
    try {
      const body = { resourceIds: [resourceId], startAt, endAt, purposeCode: purposeCode || selectedPurpose };
      if (replacement && onAlternative) {
        await onAlternative(replacement, body.purposeCode, controller.signal);
      } else if (action === 'waitlist') {
        await planningApi.post('/waitlist', body, controller.signal);
        if (!controller.signal.aborted) { setSaved(true); setNotice('planning.waitSaved'); }
      } else if (action === 'suggestions') {
        setSlots([]);
        const result = await planningApi.post<{ suggestions: Slot[] }>('/suggestions', body, controller.signal);
        if (!controller.signal.aborted) {
          const sameDaySlots = result.suggestions.filter(slot => toVietnamDateString(slot.startAt) === toVietnamDateString(slot.endAt));
          setSlots(sameDaySlots);
          if (!sameDaySlots.length) setNotice('planning.noSuggestions');
        }
      } else {
        setReplacements([]);
        const result = await planningApi.post<{ suggestions: Replacement[] }>('/alternatives', body, controller.signal);
        if (!controller.signal.aborted) {
          setReplacements(result.suggestions);
          if (!result.suggestions.length) setNotice('planning.noAlternatives');
        }
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'planning.failed');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }
  return <section className="booking-availability-help" aria-labelledby={title}>
    <h3 id={title}>{tr('ui.customerBooking.otherOptions')}</h3>
    {!purposeCode && <label className="booking-recovery-purpose">{tr('planning.purpose')}
      <select disabled={Boolean(busy) || saved} value={selectedPurpose} onChange={event => {
        setSelectedPurpose(event.target.value);
        setSlots([]); setReplacements([]); setError(''); setNotice('');
      }}>
        {['STUDY', 'TEACHING', 'RESEARCH', 'SERVICE'].map(value => <option key={value} value={value}>{tr(`planning.${value}`)}</option>)}
      </select>
    </label>}
    <div className="booking-recovery-actions">
      <button type="button" className="btn btn-secondary" disabled={Boolean(busy)} onClick={() => void run('suggestions')}>
        <CalendarClock size={17} aria-hidden="true" />{tr('planning.suggest')}
      </button>
      {onAlternative && <button type="button" className="btn btn-secondary" disabled={Boolean(busy)} onClick={() => void run('alternatives')}>
        <Replace size={17} aria-hidden="true" />{tr('planning.alternatives')}
      </button>}
      <button type="button" className="btn btn-secondary" disabled={Boolean(busy) || saved} onClick={() => void run('waitlist')}>
        <Bell size={17} aria-hidden="true" />{tr(saved ? 'ui.customerBooking.following' : 'planning.joinWait')}
      </button>
    </div>
    <p className="booking-recovery-note">{tr('ui.customerBooking.optionsHint')}</p>
    {(busy || notice) && <p role="status">{tr(busy ? 'planning.loading' : notice)}</p>}
    {error && <p role="alert" className="planning-error">{tr(error)}</p>}
    {(slots.length > 0 || replacements.length > 0) && <ul className="booking-recovery-results">
      {slots.map(slot => <li key={slot.startAt}><button type="button" disabled={Boolean(busy)} onClick={() => onChoose(toVietnamDateString(slot.startAt), toVietnamTimeString(slot.startAt), toVietnamTimeString(slot.endAt))}>
        <CalendarClock size={17} aria-hidden="true" /><span>{new Date(slot.startAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-GB', { timeZone: 'Asia/Ho_Chi_Minh' })}
          <strong>{toVietnamTimeString(slot.startAt)}–{toVietnamTimeString(slot.endAt)}</strong></span><ArrowUpRight size={17} aria-hidden="true" />
      </button></li>)}
      {replacements.map(({ replacement }) => <li key={replacement.id}><button type="button" disabled={Boolean(busy)} onClick={() => void run('alternatives', replacement.id)}>
        <Replace size={17} aria-hidden="true" /><span>{replacement.code}<strong>{replacement.name}</strong></span><ArrowUpRight size={17} aria-hidden="true" />
      </button></li>)}
    </ul>}
  </section>;
}
