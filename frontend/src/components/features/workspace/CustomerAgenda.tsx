import { useId, useState } from 'react';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { toVietnamDateString, toVietnamTimeString } from '../../../utils/timezone';
import type { BookingRecord } from '../../../types/booking';
import { BookingStatusBadge } from '../../BookingStatusBadge';
import { EmptyState } from './HomeComponents';
import type { HomeNavigate } from './homeTypes';
import '../../../styles/customer-agenda.css';

export function CustomerAgenda({ rows, onNavigate, onCalendar }: {
  rows: BookingRecord[];
  onNavigate: HomeNavigate;
  onCalendar: () => void;
}) {
  const { tr, locale } = useLocale();
  const id = useId();
  const [selected, setSelected] = useState('');
  const language = locale === 'vi' ? 'vi-VN' : 'en-GB';
  const today = toVietnamDateString(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T00:00:00+07:00`);
    date.setUTCDate(date.getUTCDate() + index);
    return { date, key: toVietnamDateString(date) };
  });
  const selectedDate = days.some(day => day.key === selected) ? selected : '';
  const formatDay = new Intl.DateTimeFormat(language, { timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric', month: 'numeric' });
  const formatWeekday = new Intl.DateTimeFormat(language, { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' });
  const formatFullDate = new Intl.DateTimeFormat(language, { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full' });
  const visible = rows.filter(row => !selectedDate || toVietnamDateString(row.startAt) === selectedDate).slice(0, 5);

  return <section className="hub-panel hub-agenda" aria-labelledby={`${id}-title`}>
    <header className="hub-panel-heading">
      <h2 id={`${id}-title`}>{tr('ui.hub.agenda')}</h2>
      <button type="button" onClick={() => onNavigate('bookings')}>
        {tr('ui.view_all_44aeb8cb')} <ArrowRight size={15} aria-hidden="true" />
      </button>
    </header>
    <div className="hub-agenda-days" role="group" aria-label={tr('ui.hub.agendaDateFilter')}>
      <button type="button" aria-pressed={!selectedDate} aria-controls={`${id}-results`} onClick={() => setSelected('')}>
        <CalendarDays size={16} aria-hidden="true" /> <strong>{tr('ui.hub.agendaAllDates')}</strong>
      </button>
      {days.map(({ date, key }) => <button key={key} type="button" aria-pressed={selectedDate === key}
        aria-label={formatFullDate.format(date)} aria-current={key === today ? 'date' : undefined}
        aria-controls={`${id}-results`} onClick={() => setSelected(key)}>
        <span>{formatWeekday.format(date)}</span><strong>{formatDay.format(date)}</strong>
      </button>)}
    </div>
    <div id={`${id}-results`}>
      {visible.length ? <ul className="hub-agenda-list">
        {visible.map(row => {
          const name = row.resource?.name || row.title;
          const start = new Date(row.startAt);
          const end = new Date(row.endAt);
          const crossesMidnight = toVietnamDateString(start) !== toVietnamDateString(end);
          return <li key={row.id}>
            <button type="button" className="hub-agenda-entry" onClick={() => onNavigate('bookings', { booking: row.id })}>
              <span className="hub-agenda-time">
                <strong><time dateTime={row.startAt}>{toVietnamTimeString(start)}</time></strong>
                <span>{formatDay.format(start)}</span>
              </span>
              <span className="hub-agenda-detail">
                <strong>{name}</strong>
                <span>
                  <time dateTime={row.endAt}>{tr('ui.hub.agendaEnds', { time: toVietnamTimeString(end) })}{crossesMidnight && ` · ${formatDay.format(end)}`}</time>
                  <span className="hub-agenda-code">{row.bookingCode || row.id}</span>
                </span>
              </span>
              <BookingStatusBadge status={row.status} paymentDueAt={row.paymentDueAt} />
              <ArrowRight className="hub-agenda-arrow" size={16} aria-hidden="true" />
            </button>
          </li>;
        })}
      </ul> : selectedDate ? <p className="hub-agenda-empty" role="status">{tr('ui.hub.agendaDayEmpty')}</p> :
        <EmptyState titleKey="ui.home.next.empty" detail="ui.home.next.emptyHint" action="ui.home.findSlot" onAction={onCalendar} />}
    </div>
    {visible.length > 0 && <p className="hub-scope-note">{tr('ui.hub.agendaScope')}</p>}
  </section>;
}
