import { CalendarDays, ChevronRight, Plus, DoorOpen, Microscope } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '../../providers/LocaleProvider';
import { BookingStatusBadge } from '../BookingStatusBadge';
import { toVietnamTimeString, vietnamTimeToIso } from '../../utils/timezone';
import { RESOURCE_GROUPS, serviceWindow, policyFor, resourceBlocked, type PlannerResource, type PlannerEvent } from './plannerModel';

export function ResourceDayBoard({ resources, events, date, onBook, onEvent, page, onPage }: {
  resources: PlannerResource[]; events: PlannerEvent[]; date: string; page: number; onPage: (page: number) => void;
  onBook: (resource: PlannerResource) => void; onEvent: (event: PlannerEvent) => void;
}) {
  const { tr } = useLocale();
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
  const visible = resources.slice(page * 12, page * 12 + 12);
  const midnight = Date.parse(vietnamTimeToIso(date, '00:00'));
  const windows = visible.map(serviceWindow);
  const minutes = (value: string) => (Date.parse(value) - midnight) / 60000;
  const visibleIds = new Set(visible.map(resource => resource.id));
  const scopedEvents = events.filter(event => visibleIds.has(event.resourceId));
  const hasUnknownHours = windows.some(hours => !hours);
  const from = Math.max(0, Math.floor(Math.min(hasUnknownHours ? 0 : 1440, ...windows.map(hours => hours?.from ?? 0), ...scopedEvents.map(event => minutes(event.start))) / 60) * 60);
  const to = Math.min(1440, Math.ceil(Math.max(hasUnknownHours ? 1440 : 0, ...windows.map(hours => hours?.to ?? 1440), ...scopedEvents.map(event => minutes(event.end))) / 60) * 60);
  const span = Math.max(60, to - from);
  const ticks = Array.from({ length: Math.floor(span / 120) + 1 }, (_, index) => from + index * 120);
  const title = (event: PlannerEvent) => event.titleKey ? tr(event.titleKey, event.titleParams) : event.title || tr('ui.reserved_f20b6ee2');
  const pastUntil = Math.max(0,Math.min(100,((now-midnight)/60000-from)/span*100));
  const weekend=[0,6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
  const eventButton = (event: PlannerEvent, style?: React.CSSProperties) => <button key={event.id} type="button" aria-label={`${title(event)} · ${toVietnamTimeString(event.start)}–${toVietnamTimeString(event.end)}`} title={`${title(event)} · ${toVietnamTimeString(event.start)}–${toVietnamTimeString(event.end)}`} style={style} onClick={() => onEvent(event)} className={`planner-session ${style && minutes(event.start) > from + span * .75 ? 'is-near-end' : ''} ${event.type === 'maintenance' || event.type === 'calibration' ? 'is-maintenance' : event.isMine ? 'is-mine' : ''}`}>
    <span className="planner-session-details">
    <span className="planner-session-time">{toVietnamTimeString(event.start)}–{toVietnamTimeString(event.end)}</span>
    <strong>{title(event)}</strong>
    {event.type === 'booking' ? <BookingStatusBadge status={event.status} occupancy={event.occupancy} paymentDueAt={event.paymentDueAt} /> : <span>{tr(event.type === 'preparation' ? 'planning.preparation' : 'ui.maintenance_calibration_79fdebcb')}</span>}
    </span>
  </button>;
  return <section className="planner-board" aria-label={tr('ui.planner.dayBoard')}>
    <div className="planner-board-intro"><div><h2>{tr('ui.planner.dayBoard')}</h2><p>{tr('ui.planner.boardHint')}</p></div><span>{tr('ui.planner.loadedResources', { count: resources.length })}</span></div>
    <div className="planner-board-desktop">
      <div className="planner-axis"><span>{tr('ui.resource_9a35ef53')}</span><div>{ticks.map(tick => <span key={tick} style={{ left: `${(tick - from) / span * 100}%` }}>{String(Math.floor(tick / 60)).padStart(2,'0')}:00</span>)}</div></div>
      {RESOURCE_GROUPS.filter(group => visible.some(resource => resource.category === group)).concat(visible.some(resource => !RESOURCE_GROUPS.includes(resource.category || '')) ? ['OTHER'] : []).map(group => <section key={group} className="planner-resource-group">
        <h3>{group === 'OTHER' ? tr('ui.planner.other') : tr(`enum.category.${group}`)}</h3>
        {visible.filter(resource => group === 'OTHER' ? !RESOURCE_GROUPS.includes(resource.category || '') : resource.category === group).map(resource => {
          const rows = scopedEvents.filter(event => event.resourceId === resource.id), window = policyFor(resource)?.allowWeekend===false&&weekend ? null : serviceWindow(resource);
          // Each event occupies its own line: overlapping maintenance and booking never hide one another.
          return <div className="planner-lane" key={resource.id}>
            <div className="planner-lane-resource"><span className="planner-resource-symbol">{resource.category === 'ROOM' ? <DoorOpen size={19} /> : <Microscope size={19} />}</span><div><strong>{resource.name}</strong><small>{resource.code}</small><button type="button" onClick={() => onBook(resource)} disabled={resourceBlocked(resource)}><Plus size={14} />{tr('ui.book_f0937e77')}</button></div></div>
            <div className="planner-lane-track" style={{ minHeight: Math.max(110, rows.length * 104 + 16) }}>
              {window && <div className="planner-service-window" style={{ left: `${Math.max(0,(window.from-from)/span*100)}%`, width: `${Math.max(0,(window.to-window.from)/span*100)}%` }} aria-hidden="true" />}
              <div className="planner-past" style={{width:`${pastUntil}%`}} aria-hidden="true"/>
              {!rows.length && <p className="planner-lane-empty">{tr(resourceBlocked(resource) ? 'ui.this_resource_is_not_accepting_7365dfdb' : 'ui.planner.noEvents')}</p>}
              {rows.map((event, index) => {
                const left = Math.max(from, minutes(event.start)), right = Math.min(to, minutes(event.end));
                return eventButton(event, { left: `${(left-from)/span*100}%`, width: `${Math.max(1,(right-left)/span*100)}%`, top: index * 104 + 8 });
              })}
            </div>
          </div>;
        })}
      </section>)}
    </div>
    <div className="planner-agenda">
      {visible.map(resource => <section className="planner-agenda-resource" key={resource.id}>
        <header><div><h3>{resource.name}</h3><small>{resource.code}</small></div><button type="button" className="btn btn-secondary" disabled={resourceBlocked(resource)} onClick={() => onBook(resource)}><Plus size={16} />{tr('ui.book_f0937e77')}</button></header>
        {scopedEvents.filter(event => event.resourceId === resource.id).map(event => eventButton(event))}
        {!scopedEvents.some(event => event.resourceId === resource.id) && <p>{tr(resourceBlocked(resource) ? 'ui.this_resource_is_not_accepting_7365dfdb' : 'ui.planner.noEvents')}</p>}
      </section>)}
    </div>
    {!resources.length && <div className="planner-empty"><CalendarDays size={32} /><h3>{tr('ui.planner.noMatch')}</h3><p>{tr('ui.planner.changeFilters')}</p></div>}
    {resources.length > 12 && <nav className="planner-pagination" aria-label={tr('ui.planner.resourcePages')}><button type="button" className="btn btn-secondary" disabled={page === 0} onClick={() => onPage(page-1)}>{tr('ui.previous_period_b5ef94e1')}</button><span>{page*12+1}–{Math.min((page+1)*12,resources.length)} / {resources.length}</span><button type="button" className="btn btn-secondary" disabled={(page+1)*12 >= resources.length} onClick={() => onPage(page+1)}>{tr('ui.next_period_117cfb3c')}<ChevronRight size={16} /></button></nav>}
  </section>;
}
