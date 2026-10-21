import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, DoorOpen, ListFilter, Microscope, Search } from 'lucide-react';
import { apiRequest } from '../../api.js';
import { useLocale } from '../../providers/LocaleProvider';
import { freeWindows, intervalFor, policyFor, resourceBlocked, serviceWindow, timeLabel, upcomingFreeDays, type PlannerEvent, type PlannerResource } from './plannerModel';

type Interval = { startAt: string; endAt: string };
export function BookingSlotPicker({ resources, resourceId, onResource, date, dateTitle, events, busy, scheduleError, timeFilter, onFilterTime, onBook, entry, onEntry, duration, onDuration, rangeEnd, onChooseDate, onRefresh, selectedResourceIds, onAddToSelection, onViewSelection }: {
  resources: PlannerResource[]; resourceId: string; onResource: (id: string) => void; date: string; dateTitle: string;
  events: PlannerEvent[]; busy: boolean; scheduleError: string; timeFilter: Interval | null; onFilterTime: (value: Interval | null) => void;
  onBook: (slot: { resourceId: string; startAt: string; endAt: string }) => void;
  duration: number; onDuration: (value: number) => void; rangeEnd: string; onChooseDate: (date: string) => void; onRefresh: () => void;
  entry: 'resource'|'time';onEntry:(value:'resource'|'time')=>void;
  selectedResourceIds: string[]; onAddToSelection?: (resource: PlannerResource) => void; onViewSelection?: () => void;
}) {
  const { tr, locale } = useLocale();
  const [start, setStart] = useState(''), [end, setEnd] = useState('');
  const [customTime, setCustomTime] = useState(false);
  const [page, setPage] = useState(0), [findError, setFindError] = useState('');
  const [checkBusy, setCheckBusy] = useState(false), [checkError, setCheckError] = useState('');
  const controllerRef = useRef<AbortController | null>(null), checkingRef = useRef(false);
  const slotPanel = useRef<HTMLElement | null>(null);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => { const timer = setInterval(()=>setClock(Date.now()),30000); return ()=>clearInterval(timer); }, []);
  const resource = resources.find(row=>row.id===resourceId), interval = intervalFor(date,start,end);
  const checkKey = `${resourceId}|${interval?.startAt}|${interval?.endAt}`;
  const choiceRef=useRef({key:checkKey,resource});choiceRef.current={key:checkKey,resource};
  useEffect(() => { controllerRef.current?.abort(); checkingRef.current=false; setCheckBusy(false); setCheckError(''); }, [checkKey, resources]);
  useEffect(() => () => controllerRef.current?.abort(), []);
  useEffect(() => setPage(Math.max(0,Math.floor(resources.findIndex(row=>row.id===resourceId)/8))), [resources, resourceId]);
  const windows = useMemo(()=>resource ? freeWindows(resource,date,duration,events,clock) : [],[resource,date,duration,events,clock]);
  const nextDays = useMemo(()=>resource ? upcomingFreeDays(resource,date,duration,events,rangeEnd,clock) : [],[resource,date,duration,events,rangeEnd,clock]);
  useEffect(()=>setCustomTime(false),[resourceId,date,duration]);
  useEffect(()=>{
    if(entry!=='resource'||busy||customTime)return;
    const selected=windows.some(window=>window.start===start&&window.end===end);
    if(!selected){setStart(windows[0]?.start||'');setEnd(windows[0]?.end||'');}
  },[windows,start,end,entry,busy,customTime]);
  async function continueBooking() {
    if (!interval || !resource || checkingRef.current) return;
    controllerRef.current?.abort(); const controller = new AbortController(); controllerRef.current = controller;
    checkingRef.current=true; setCheckBusy(true); setCheckError('');
    try {
      const data = await apiRequest(`/bookings/availability?${new URLSearchParams({ resourceId:resource.id,...interval })}`, { signal:controller.signal });
      if (controller.signal.aborted || choiceRef.current.key!==checkKey || choiceRef.current.resource!==resource) return;
      if(data.available===true)onBook({resourceId:resource.id,...interval});
      else {setCheckError('ui.planner.justBooked');onRefresh();}
    } catch (error: unknown) { if (!controller.signal.aborted) setCheckError((error as Error).message || 'api.API_REQUEST_FAILED'); }
    finally { if (!controller.signal.aborted) {checkingRef.current=false;setCheckBusy(false);} }
  }
  const hours = resource && serviceWindow(resource);
  const formatDay=(value:string)=>new Date(`${value}T00:00:00Z`).toLocaleDateString(locale==='vi'?'vi-VN':'en-GB',{weekday:'short',day:'numeric',month:'numeric',timeZone:'UTC'});
  return <>
    <div className="planner-entry" role="group" aria-label={tr('ui.planner.searchBy')}><button type="button" aria-pressed={entry==='resource'} onClick={()=>{onEntry('resource');onFilterTime(null);}}><Microscope size={17}/>{tr('ui.planner.resourceFirst')}</button><button type="button" aria-pressed={entry==='time'} onClick={()=>{onEntry('time');setStart(start||'09:00');setEnd(end||'10:00');}}><Clock size={17}/>{tr('ui.planner.timeFirst')}</button></div>
    {entry==='time' && <form className="planner-time-search" onSubmit={event=>{event.preventDefault();if(interval){onFilterTime(interval);setFindError('');}else setFindError('ui.calendarWorkspace.futureTime');}}>
      <label>{tr('ui.planner.start')}<input type="time" required value={start} onChange={event=>{setStart(event.target.value);onFilterTime(null);}}/></label><label>{tr('ui.planner.end')}<input type="time" required value={end} onChange={event=>{setEnd(event.target.value);onFilterTime(null);}}/></label><button type="submit" className="btn btn-primary"><Search size={16}/>{tr('ui.planner.findCandidates')}</button><p>{tr(timeFilter ? 'ui.planner.candidateHint' : 'ui.planner.chooseTimeHint')}</p>{findError && <p role="alert">{tr(findError)}</p>}
    </form>}
    <div className="planner-booking-layout">
      <section className="planner-resource-picker" aria-label={tr('ui.choose_a_resource_1ba6fed9')}><header><h2>{tr('ui.planner.resourceHeading')}</h2><span>{tr('ui.planner.loadedResources',{count:resources.length})}</span></header>
        {busy && !resources.length ? <p role="status" className="planner-empty">{tr('ui.loading_laboratory_resources_e55dcf2e')}</p> : !resources.length ? <div className="planner-empty"><ListFilter size={28}/><h3>{tr('ui.planner.noMatch')}</h3><p>{tr('ui.planner.changeFilters')}</p></div> : <div className="planner-resource-options" role="group" aria-label={tr('ui.choose_a_resource_1ba6fed9')}>{resources.slice(page*8,page*8+8).map(row=><button type="button" className="planner-resource-option" key={row.id} aria-pressed={resourceId===row.id} onClick={()=>{onResource(row.id);if(window.matchMedia('(max-width:800px)').matches)slotPanel.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});}}><span className="planner-resource-symbol">{row.category==='ROOM'?<DoorOpen size={22}/>:<Microscope size={22}/>}</span><span><strong>{row.name}</strong><small>{row.code}</small><span>{row.laboratory?.name}</span>{resourceBlocked(row)&&<small>{tr('ui.this_resource_is_not_accepting_7365dfdb')}</small>}</span>{resourceId===row.id?<Check size={18}/>:<ChevronRight size={18}/>}</button>)}</div>}
        {resources.length>8&&<nav className="planner-pagination" aria-label={tr('ui.planner.resourcePages')}><button type="button" disabled={!page} onClick={()=>setPage(page-1)}><ChevronLeft size={17}/>{tr('ui.planner.previousResources')}</button><span>{page+1} / {Math.ceil(resources.length/8)}</span><button type="button" disabled={(page+1)*8>=resources.length} onClick={()=>setPage(page+1)}>{tr('ui.planner.nextResources')}<ChevronRight size={17}/></button></nav>}
      </section>
      <section className="planner-slot-panel" ref={slotPanel} aria-label={tr('ui.planner.chooseSlot')}>
        {!resource ? <div className="planner-empty"><CalendarDays size={36}/><h2>{tr('ui.choose_a_resource_before_booking_3cc84f6f')}</h2></div> : <>
          <header className="planner-slot-heading"><div><h2>{resource.name}</h2><p>{hours?`${timeLabel(hours.from)}–${timeLabel(hours.to)}`:tr('ui.planner.hoursUnknown')}{resource.category?` · ${tr(`enum.category.${resource.category}`)}`:''}</p></div><CalendarDays size={30}/></header>
          {entry==='resource'&&<>
            <div className="planner-duration"><label htmlFor="planner-duration">{tr('ui.planner.duration')}</label><select id="planner-duration" value={duration} onChange={event=>onDuration(Number(event.target.value))}>{[30,60,90,120,180,240].map(value=><option key={value} value={value}>{tr('ui.minutes_93e63a9e',{value0:value})}</option>)}</select></div>
            {busy?<p role="status">{tr('ui.planner.findingTime')}</p>:scheduleError?<p role="alert">{tr(scheduleError)}</p>:<>
              {windows.length>0?<><h3 className="planner-slot-caption">{tr('ui.planner.freeWindows')}</h3><div className="planner-free-windows">{windows.map(window=><button type="button" key={window.from} aria-pressed={start===window.start&&end===window.end} onClick={()=>{setCustomTime(false);setStart(window.start);setEnd(window.end);}}><Clock size={19}/><span><strong>{window.from}–{window.to}</strong><small>{tr('ui.planner.startsAt',{time:window.start})}</small></span><span>{start===window.start&&end===window.end?<Check size={18}/>:<ChevronRight size={18}/>}</span></button>)}</div></>:<div className="planner-no-time"><CalendarDays size={25}/><div><h3>{tr(resourceBlocked(resource)?'ui.this_resource_is_not_accepting_7365dfdb':!hours?'ui.planner.hoursUnknown':'ui.planner.noTimeToday')}</h3><p>{tr('ui.planner.tryNextDay')}</p></div></div>}
              {nextDays.length>0&&<section className="planner-next-times"><h3>{tr(windows.length?'ui.planner.otherDays':'ui.planner.nearestTimes')}</h3>{nextDays.map(next=><button key={next.date} type="button" onClick={()=>onChooseDate(next.date)}><span>{formatDay(next.date)}</span><strong>{next.window.start}–{next.window.end}</strong><ChevronRight size={16}/></button>)}</section>}
              {!windows.length&&!nextDays.length&&hours&&!resourceBlocked(resource)&&<p className="planner-policy-note">{tr('ui.planner.noTimeWeek')}</p>}
            </>}
            <details className="planner-custom-time" onToggle={event=>{if(event.currentTarget.open)setCustomTime(true);}}><summary>{tr('ui.planner.customTime')}</summary><div><label>{tr('ui.planner.start')}<input type="time" value={start} onChange={event=>{setCustomTime(true);setStart(event.target.value);}}/></label><label>{tr('ui.planner.end')}<input type="time" value={end} onChange={event=>{setCustomTime(true);setEnd(event.target.value);}}/></label></div></details>
          </>}
          {interval&&<div className="planner-choice"><div><strong>{start}–{end}</strong><span>{dateTitle}</span></div><span className="planner-choice-label">{tr('ui.planner.yourTime')}</span></div>}
          {checkError&&<p className="planner-check-status" role="alert">{tr(checkError)}</p>}
          {customTime&&start&&end&&!interval&&<p className="planner-check-status" role="alert">{tr('ui.calendarWorkspace.futureTime')}</p>}
          <div className="planner-booking-actions"><button type="button" className="btn btn-primary" disabled={!interval||resourceBlocked(resource)||checkBusy||busy} onClick={()=>void continueBooking()}>{tr(checkBusy?'ui.planner.checking':'ui.planner.continueBooking')}<ArrowRight size={18}/></button>{onAddToSelection&&<button type="button" className="btn btn-secondary" disabled={!selectedResourceIds.includes(resource.id)&&selectedResourceIds.length>=30} title={selectedResourceIds.length>=30?tr('ui.resourceSelection.limit'):undefined} onClick={()=>selectedResourceIds.includes(resource.id)?onViewSelection?.():onAddToSelection(resource)}>{tr(selectedResourceIds.includes(resource.id)?'ui.selectionTray.open':'ui.planner.addSelection')}</button>}</div>
          <p className="planner-policy-note">{tr('ui.planner.finalCheckNote')}</p>
          {policyFor(resource)?.allowWeekend===false&&<p className="planner-policy-note">{tr('ui.planner.weekdaysOnly')}</p>}
        </>}
      </section>
    </div>
  </>;
}
