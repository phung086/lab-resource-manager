import { CalendarDays } from 'lucide-react';
import { useLocale } from '../../providers/LocaleProvider';
import { BookingStatusBadge } from '../BookingStatusBadge';
import { toVietnamTimeString, vietnamTimeToIso } from '../../utils/timezone';
import { policyFor, resourceBlocked, serviceWindow, shiftDate, timeLabel, type PlannerEvent, type PlannerResource } from './plannerModel';

export function ResourceWeekOverview({ date, resource, events, onDay, onEvent }: {
  date: string; resource: PlannerResource; events: PlannerEvent[]; onDay: (date: string) => void; onEvent: (event: PlannerEvent) => void;
}) {
  const { tr, locale } = useLocale();
  const monday=shiftDate(date,-((new Date(`${date}T00:00:00Z`).getUTCDay()+6)%7));
  const hours=serviceWindow(resource), policy=policyFor(resource);
  return <div className="planner-week-overview">{Array.from({length:7},(_,index)=>{
    const day=shiftDate(monday,index), start=Date.parse(vietnamTimeToIso(day,'00:00'));
    const rows=events.filter(event=>Date.parse(event.start)<start+86400000&&Date.parse(event.end)>start);
    const closed=resourceBlocked(resource)||(policy?.allowWeekend===false&&index>=5);
    const past=start+86400000<=Date.now();
    return <section key={day} className={`planner-week-day ${past?'is-past':''}`}>
      <header><span>{new Date(`${day}T00:00:00Z`).toLocaleDateString(locale==='vi'?'vi-VN':'en-GB',{weekday:'short',timeZone:'UTC'})}</span><strong>{day.slice(8)}<small>/{day.slice(5,7)}</small></strong><p>{tr(closed?'ui.this_resource_is_not_accepting_7365dfdb':'ui.planner.hoursLabel')}{!closed&&hours?` ${timeLabel(hours.from)}–${timeLabel(hours.to)}`:!closed?` ${tr('ui.planner.hoursUnknown')}`:''}</p></header>
      <div>{rows.map(event=><button key={event.id} type="button" className={`planner-week-event ${event.type==='maintenance'||event.type==='calibration'?'is-maintenance':''}`} onClick={()=>onEvent(event)}><span>{toVietnamTimeString(event.start)}–{toVietnamTimeString(event.end)}</span><strong>{event.titleKey?tr(event.titleKey,event.titleParams):event.title||tr('ui.reserved_f20b6ee2')}</strong>{event.type==='booking'?<BookingStatusBadge status={event.status} occupancy={event.occupancy} paymentDueAt={event.paymentDueAt}/>:<small>{tr('ui.maintenance_calibration_79fdebcb')}</small>}</button>)}{!rows.length&&<p className="planner-week-empty">{tr('ui.planner.noEvents')}</p>}</div>
      <button className="planner-week-choose" type="button" disabled={closed||past} onClick={()=>onDay(day)}><CalendarDays size={15}/>{tr('ui.planner.chooseSlot')}</button>
    </section>;
  })}</div>;
}
