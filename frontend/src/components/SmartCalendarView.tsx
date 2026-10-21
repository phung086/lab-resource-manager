import '../styles/calendar-workspace.css';
import '../styles/calendar-planner.css';
import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, RefreshCw } from 'lucide-react';
import { ResourceSearchField } from './base/ResourceSearchField';
import { apiRequest } from '../api.js';
import { useLocale } from '../providers/LocaleProvider';
import { QuickBookingModal } from './QuickBookingModal';
import { BaseModal2026 } from './BaseModal2026';
import { BookingStatusBadge } from './BookingStatusBadge';
import { ResourceWeekOverview } from './calendar/ResourceWeekOverview';
import { MonthSchedule } from './calendar/MonthSchedule';
import { ResourceDayBoard } from './calendar/ResourceDayBoard';
import { BookingSlotPicker } from './calendar/BookingSlotPicker';
import { RESOURCE_GROUPS, freeWindows, resourceBlocked, shiftDate, type PlannerEvent, type PlannerResource } from './calendar/plannerModel';
import { formatVietnamDateTime, getVietnamTodayDateString, vietnamTimeToIso } from '../utils/timezone';

export interface SmartCalendarViewProps {
  onOpenBooking?: (slot?: any) => void; onOpenCheckIn?: (booking?: any) => void; onPayment?: (booking: any) => void;
  user?: any; initialResourceId?: string; refreshKey?: number;
  selectedResourceIds?: string[]; onAddToSelection?: (resource: PlannerResource) => void; onViewSelection?: () => void;
}
type View = 'plan' | 'day' | 'week' | 'month';
type Laboratory = { id: string; name: string; code: string };
export function SmartCalendarView({ user, onOpenBooking, onPayment, initialResourceId = '', refreshKey = 0, selectedResourceIds = [], onAddToSelection, onViewSelection }: SmartCalendarViewProps) {
  const { tr, locale } = useLocale();
  const operator = ['ADMIN', 'LAB_STAFF'].includes(user?.role);
  const [view, setView] = useState<View>(operator ? 'day' : 'plan');
  const [date, setDate] = useState(getVietnamTodayDateString);
  const [planAnchor,setPlanAnchor]=useState(getVietnamTodayDateString),[duration,setDuration]=useState(60);
  const [entry,setEntry]=useState<'resource'|'time'>('resource');
  const [labs, setLabs] = useState<Laboratory[]>([]), [lab, setLab] = useState('');
  const [ready, setReady] = useState(false), [scopeError, setScopeError] = useState('');
  const [resources, setResources] = useState<PlannerResource[]>([]), [resourceId, setResourceId] = useState(initialResourceId);
  const [group, setGroup] = useState(''), [search, setSearch] = useState(''), [query, setQuery] = useState('');
  const [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [scheduleRevision,setScheduleRevision]=useState(0);
  const [resourceBusy, setResourceBusy] = useState(true), [resourceError, setResourceError] = useState('');
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loadedCalendarKey,setLoadedCalendarKey]=useState('');
  const [scheduleBusy, setScheduleBusy] = useState(false), [scheduleError, setScheduleError] = useState('');
  const [timeFilter, setTimeFilter] = useState<{ startAt: string; endAt: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PlannerEvent | null>(null), [modalSlot, setModalSlot] = useState<any>(null);
  useEffect(() => {
    const controller = new AbortController(); setScopeError(''); setReady(false);
    apiRequest('/laboratories', { signal: controller.signal }).then(async rows => {
      let targetLab='';
      if (operator && initialResourceId) {
        const target=await apiRequest(`/resources/${encodeURIComponent(initialResourceId)}`,{signal:controller.signal});
        targetLab=target.laboratoryId || target.laboratory?.id || '';
      }
      if (controller.signal.aborted) return;
      setLabs(rows); if (operator) setLab(current => rows.some((row: Laboratory)=>row.id===current) ? current : rows.find((row: Laboratory)=>row.id===targetLab)?.id || rows[0]?.id || ''); setReady(true);
    }).catch(error => { if (!controller.signal.aborted) setScopeError(error.message); });
    return () => controller.abort();
  }, [operator, user?.id, initialResourceId, revision]);
  useEffect(() => {
    if (!ready) return;
    if (operator && !lab) { setResources([]); setResourceBusy(false); return; }
    const controller = new AbortController(); setResourceBusy(true); setResourceError(''); setResources([]);
    const params = new URLSearchParams(); if (lab) params.set('laboratoryId',lab); if (group) params.set('category',group); if (query) params.set('search',query);
    if (view === 'plan' && timeFilter) { params.set('availableFrom',timeFilter.startAt); params.set('availableTo',timeFilter.endAt); params.set('availability','AVAILABLE'); }
    (async () => {
      try {
        const response = await apiRequest(`/resources?${params}`, { signal: controller.signal });
        const rows: PlannerResource[] = Array.isArray(response) ? response : response.items || [];
        if (initialResourceId && !group && !query && !timeFilter && !rows.some(resource => resource.id === initialResourceId)) {
          const target=await apiRequest(`/resources/${encodeURIComponent(initialResourceId)}`, { signal: controller.signal });
          if (!lab || (target.laboratoryId || target.laboratory?.id) === lab) {if(rows.length>=250)rows.pop();rows.unshift(target);}
        }
        if (controller.signal.aborted) return;
        setResources(rows); setPage(0); setResourceId(current => rows.some(resource => resource.id === current) ? current : rows[0]?.id || '');
      } catch (error: any) { if (!controller.signal.aborted) setResourceError(error.message); }
      finally { if (!controller.signal.aborted) setResourceBusy(false); }
    })();
    return () => controller.abort();
  }, [ready, lab, group, query, view, timeFilter, initialResourceId, revision, operator]);
  const resource = resources.find(row => row.id === resourceId);
  const calendarFrom=view==='plan'?planAnchor:view==='month'?`${date.slice(0,7)}-01`:view==='week'?shiftDate(date,-((new Date(`${date}T00:00:00Z`).getUTCDay()+6)%7)):date;
  const nextMonth=new Date(`${calendarFrom}T00:00:00Z`);nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1);
  const calendarTo=view==='month'?nextMonth.toISOString().slice(0,10):shiftDate(calendarFrom,['plan','week'].includes(view)?7:1);
  const calendarKey=`${view}|${lab}|${resourceId}|${calendarFrom}|${calendarTo}|${revision}|${refreshKey}|${scheduleRevision}`;
  useEffect(() => {
    if (!ready || resourceBusy || (view !== 'day' && !resourceId) || (operator && !lab)) { setEvents([]);setLoadedCalendarKey('');setScheduleBusy(false);setScheduleError('');return; }
    const controller = new AbortController(); setScheduleBusy(true); setScheduleError(''); setEvents([]);
    const params = new URLSearchParams();
    {
      params.set('start',vietnamTimeToIso(calendarFrom,'00:00')); params.set('end',vietnamTimeToIso(calendarTo,'00:00'));
      if (view === 'day') params.set('laboratory_id',lab); else params.set('resource_id',resourceId);
    }
    apiRequest(`/calendar/events?${params}`, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      setEvents(data.events || []);
      setLoadedCalendarKey(calendarKey);
    }).catch(error => { if (!controller.signal.aborted) setScheduleError(error.message); }).finally(() => { if (!controller.signal.aborted) setScheduleBusy(false); });
    return () => controller.abort();
  }, [ready, resourceBusy, resourceId, operator, lab, view, calendarFrom, calendarTo, calendarKey]);
  useEffect(() => {
    const visible = events;
    const deadlines = visible.map((event: PlannerEvent) => Date.parse(event.paymentDueAt || '')).filter((time: number) => time > Date.now());
    if (!deadlines.length) return;
    const timer = setTimeout(() => setRevision(value => value+1),Math.min(...deadlines)-Date.now()+300);
    return () => clearTimeout(timer);
  }, [events]);
  function openBooking(slot: any) {
    const exact=resources.find(row=>row.id===slot.resourceId);
    if (!exact) return;
    // Carry the exact loaded resource into the shared form, including deep links beyond the list cap.
    const context={...slot,resources:[exact]};
    if (onOpenBooking) onOpenBooking(context); else setModalSlot(context);
  }
  const dateTitle = new Date(`${date}T00:00:00Z`).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  const changeDate = (value: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return; setDate(value); if(value<planAnchor||value>=shiftDate(planAnchor,7))setPlanAnchor(value);setTimeFilter(null); };
  function moveDate(direction: number) {
    if (view !== 'month') changeDate(shiftDate(date,direction*(view === 'week' ? 7 : 1)));
    else { const carrier = new Date(`${date.slice(0,7)}-01T00:00:00Z`); carrier.setUTCMonth(carrier.getUTCMonth()+direction); changeDate(carrier.toISOString().slice(0,10)); }
  }
  const busy = resourceBusy || scheduleBusy || (ready&&resources.length>0&&loadedCalendarKey!==calendarKey&&!scheduleError);
  const visibleEvents=loadedCalendarKey===calendarKey?events:[];
  return <div className="calendar-workspace calendar-planner">
    <header className="planner-heading"><div><h1>{tr(operator ? 'ui.planner.operationsTitle' : 'ui.planner.customerTitle')}</h1><p>{tr(operator ? 'ui.planner.operationsIntro' : 'ui.planner.customerIntro')}</p></div><span className="planner-timezone"><Clock size={15} />{tr('ui.calendarWorkspace.timezone')}</span></header>
    <div className="planner-topline"><div className="planner-views" role="group" aria-label={tr('ui.calendar_view_6ff1148e')}>
      <button type="button" aria-pressed={view === (operator ? 'day' : 'plan')} onClick={() => {setView(operator ? 'day' : 'plan');setPage(0);}}><CalendarDays size={17} />{tr(operator ? 'ui.planner.dayView' : 'ui.planner.chooseSlot')}</button>
      {operator && <button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>{tr('ui.planner.chooseSlot')}</button>}
      <button type="button" aria-pressed={view === 'week'} onClick={() => setView('week')}>{tr('ui.planner.weekView')}</button>
      <button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>{tr('ui.month_10276db1')}</button>
    </div><button type="button" className="btn btn-secondary" disabled={busy && !scopeError} onClick={() => setRevision(value=>value+1)}><RefreshCw size={16} />{tr('ui.refresh_calendar_5cd617b0')}</button></div>
    {(scopeError || resourceError) && <div className="alert danger" role="alert">{tr(scopeError || resourceError)} <button type="button" className="btn btn-secondary" onClick={() => setRevision(value=>value+1)}>{tr('ui.retry_c58d068c')}</button></div>}
    <div className="planner-filters">
      <label>{tr('ui.planner.laboratory')}<select value={lab} onChange={event=>{setLab(event.target.value);setPage(0);}}>{!operator && <option value="">{tr('ui.planner.allLabs')}</option>}{labs.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label>{tr('ui.resource_category_5fc170bb')}<select value={group} onChange={event=>{setGroup(event.target.value);setPage(0);}}><option value="">{tr('ui.planner.allGroups')}</option>{RESOURCE_GROUPS.map(category=><option key={category} value={category}>{tr(`enum.category.${category}`)}</option>)}</select></label>
      <ResourceSearchField className="planner-resource-search" value={search} onChange={setSearch} onSearch={value=>{setQuery(value);setPage(0);}} label={tr('ui.planner.findResource')} placeholder={tr('ui.planner.searchPlaceholder')} allowEmpty/>
    </div>
    {ready && operator && !labs.length && <p className="empty-state">{tr('ui.planner.noAssignedLabs')}</p>}
    <div className="planner-datebar"><div className="planner-date-controls"><button type="button" aria-label={tr('ui.previous_period_b5ef94e1')} onClick={()=>moveDate(-1)}><ChevronLeft size={19}/></button><button type="button" className="planner-today" onClick={()=>changeDate(getVietnamTodayDateString())}>{tr('ui.today_e6747a82')}</button><button type="button" aria-label={tr('ui.next_period_117cfb3c')} onClick={()=>moveDate(1)}><ChevronRight size={19}/></button></div><h2>{dateTitle}</h2><label className="planner-date-input"><CalendarDays size={17}/><span className="sr-only">{tr('ui.planner.chooseDate')}</span><input type="date" value={date} onChange={event=>changeDate(event.target.value)}/></label></div>
    {view==='plan'&&entry==='resource'&&<div className="planner-date-strip" role="group" aria-label={tr('ui.planner.chooseDate')}>{Array.from({length:7},(_,index)=>{
      const day=shiftDate(planAnchor,index), carrier=new Date(`${day}T00:00:00Z`);
      const hasTime=resource&&freeWindows(resource,day,duration,visibleEvents).length>0;
      return <button type="button" key={day} aria-pressed={date===day} aria-label={carrier.toLocaleDateString(locale==='vi'?'vi-VN':'en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})} onClick={()=>changeDate(day)}><span>{carrier.toLocaleDateString(locale==='vi'?'vi-VN':'en-GB',{weekday:'short',timeZone:'UTC'})}</span><strong>{carrier.getUTCDate()}</strong><small>{busy?'…':scheduleError?'—':tr(hasTime?'ui.planner.hasTime':'ui.planner.noTime')}</small></button>;
    })}</div>}
    {view === 'plan' ? <BookingSlotPicker resources={resources} resourceId={resourceId} onResource={setResourceId} date={date} dateTitle={dateTitle} events={visibleEvents} busy={busy} scheduleError={scheduleError} onFilterTime={setTimeFilter} timeFilter={timeFilter} onBook={openBooking} entry={entry} onEntry={setEntry} duration={duration} onDuration={setDuration} rangeEnd={calendarTo} onChooseDate={changeDate} onRefresh={()=>setScheduleRevision(value=>value+1)} selectedResourceIds={selectedResourceIds} onAddToSelection={onAddToSelection} onViewSelection={onViewSelection}/> : <>
      {view !== 'day' && <label className="planner-week-resource">{tr('ui.planner.singleResource')}<select value={resourceId} onChange={event=>setResourceId(event.target.value)}>{resources.map(row=><option key={row.id} value={row.id}>{row.name} ({row.code})</option>)}</select></label>}
      <div className="planner-legend"><span><i className="is-booked"/>{tr('ui.reserved_f20b6ee2')}</span><span><i className="is-mine"/>{tr('ui.your_booking_72ef015d')}</span><span><i className="is-maintenance"/>{tr('ui.maintenance_calibration_79fdebcb')}</span><span><i/>{tr('ui.planner.neutralLegend')}</span></div>
      {busy ? <p role="status" className="planner-empty">{tr('ui.loading_resource_calendar_08975674')}</p> : scheduleError ? <div className="alert danger" role="alert">{tr(scheduleError)}<button className="btn btn-secondary" type="button" onClick={()=>setRevision(value=>value+1)}>{tr('ui.retry_c58d068c')}</button></div> : view === 'day' ? <ResourceDayBoard resources={resources} events={events} date={date} page={Math.min(page,Math.max(0,Math.ceil(resources.length/12)-1))} onPage={setPage} onBook={row=>openBooking({resourceId:row.id,date})} onEvent={setSelectedEvent}/> : resource && <>
        <div className="planner-week-context"><strong>{resource.name}</strong><button className="btn btn-primary" type="button" disabled={resourceBlocked(resource)} onClick={()=>openBooking({resourceId:resource.id,date})}>{tr('ui.book_a_time_slot_0003e14b')}</button></div>
        {view==='week' ? <ResourceWeekOverview resource={resource} date={date} events={events} onDay={day=>{changeDate(day);setView('plan');}} onEvent={setSelectedEvent}/> : <MonthSchedule blocked={resourceBlocked(resource)} anchorDate={new Date(`${date}T00:00:00Z`)} events={events} selectedResourceName={resource.name} onSelectSlot={day=>{changeDate(day);setView('plan');}} onSelectBooking={setSelectedEvent}/>}
      </>}
    </>}
    {resources.length>=250 && <p className="planner-limit">{tr('ui.planner.limit')}</p>}
    {modalSlot && <QuickBookingModal isOpen initialSlot={modalSlot} resources={resources} onClose={()=>setModalSlot(null)} onProceedPayment={onPayment} onConfirmBooking={()=>setRevision(value=>value+1)}/>}
    <BaseModal2026 isOpen={!!selectedEvent} onClose={()=>setSelectedEvent(null)} title={selectedEvent?.titleKey ? tr(selectedEvent.titleKey,selectedEvent.titleParams) : selectedEvent?.title || tr('ui.booking_details_89353735')} subtitle={selectedEvent?.resourceName || ''} icon={CalendarDays} footer={<button className="btn btn-secondary" type="button" onClick={()=>setSelectedEvent(null)}>{tr('ui.close_5d54c2a1')}</button>}>
      {selectedEvent && <div className="planner-event-detail"><BookingStatusBadge status={selectedEvent.status} occupancy={selectedEvent.occupancy} paymentDueAt={selectedEvent.paymentDueAt}/><p>{formatVietnamDateTime(selectedEvent.start)} – {formatVietnamDateTime(selectedEvent.end)}</p>{selectedEvent.paymentDueAt && <p>{tr('ui.planner.paymentDeadline',{time:formatVietnamDateTime(selectedEvent.paymentDueAt)})}</p>}{selectedEvent.requestedBy && <p>{selectedEvent.requestedBy.fullName || selectedEvent.requestedBy.email}</p>}</div>}
    </BaseModal2026>
  </div>;
}
