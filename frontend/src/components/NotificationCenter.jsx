import { HelpDisclosure } from "./base/HelpDisclosure";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { workspacePathForTab, readRouteParams, navigateApp } from '../workspaceRoutes.js';
import { localizeNotification } from '../i18n.js';
import { useLocale } from '../providers/LocaleProvider';
import { apiRequest } from '../api.js';
import { formatVietnamDateTime } from '../utils/timezone.js';
import '../styles/notifications-workspace.css';
const typeLabels = {BOOKING_APPROVED:'ui.booking_approved_fbab3009',BOOKING_REJECTED:'ui.booking_rejected_7d50d88b',BOOKING_UPCOMING:'ui.upcoming_booking_65fe3d5f',RETURN_REMINDER:'ui.return_reminder_92b7e4bb'};
const filterFromRoute = () => ['all','unread','read'].includes(readRouteParams().get('filter')) ? readRouteParams().get('filter') : 'all';
export function NotificationCenter({ onChanged, onOpenBookings }) {
 const { tr } = useLocale(), controllerRef=useRef(null), busyRef=useRef(false), detailRef=useRef(null);
 const [notifications,setNotifications]=useState([]), [loading,setLoading]=useState(true), [readError,setReadError]=useState('');
 const [filter,setFilter]=useState(filterFromRoute), [selected,setSelected]=useState(()=>readRouteParams().get('notification') || '');
 const [search,setSearch]=useState(''), [busy,setBusy]=useState(''), [error,setError]=useState('');
 const records=notifications.map(localizeNotification);
 const unread=notifications.filter(item=>!item.readAt);
 const visible=records.filter(item=>(filter==='all'||(filter==='unread'?!item.readAt:!!item.readAt)) && (item.title+' '+item.message).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 const current=records.find(item=>item.id===selected);
 const load=useCallback(async()=>{
   controllerRef.current?.abort();const controller=new AbortController();controllerRef.current=controller;setLoading(true);setReadError('');
   try {const payload=await apiRequest('/notifications?take=50',{signal:controller.signal});if(!controller.signal.aborted)setNotifications(payload);}
   catch(cause){if(!controller.signal.aborted)setReadError(cause?.message || 'ui.could_not_load_notifications_ba2db1e3');}
   finally{if(!controller.signal.aborted)setLoading(false);}
 },[]);
 useEffect(()=>{void load();return()=>controllerRef.current?.abort();},[load]);
 useEffect(()=>{const sync=()=>{setSelected(readRouteParams().get('notification') || '');setFilter(filterFromRoute());};window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[]);
 function choose(id){setSelected(id);setError('');const params=readRouteParams();params.set('notification',id);navigateApp(workspacePathForTab('escalations',params),{notify:false});if(window.matchMedia('(max-width:900px)').matches)requestAnimationFrame(()=>{detailRef.current?.scrollIntoView({block:'start'});detailRef.current?.focus({preventScroll:true});});}
 function chooseFilter(value){setFilter(value);const params=readRouteParams();params.set('filter',value);navigateApp(workspacePathForTab('escalations',params),{notify:false});}
 async function markRead(id){
  if(busyRef.current)return;busyRef.current=true;setBusy(id);setError('');
  try{await apiRequest(id==='all'?'/notifications/read-all':'/notifications/'+id+'/read',{method:'POST'});await load();await onChanged?.();}
  catch(cause){setError(cause?.message || 'ui.could_not_update_notification_e051a61d');}
  finally{busyRef.current=false;setBusy('');}
 }
 return <section className="notifications-workspace" aria-labelledby="inbox-title" aria-busy={loading}>
  <header className="inbox-heading"><div><h1 id="inbox-title">{tr('ui.notifications_0c951eef')}</h1><HelpDisclosure>{tr('ui.inbox.subtitle')}</HelpDisclosure></div><div className="inbox-actions"><button type="button" className="btn btn-secondary" disabled={loading||!!busy} onClick={()=>void load()}><RefreshCw size={16} />{tr('ui.refresh_46140fa8')}</button><button type="button" className="btn btn-secondary" disabled={!unread.length||loading||!!busy} onClick={()=>void markRead('all')}><CheckCheck size={16} />{tr(busy==='all'?'ui.updating_01c0991e':'ui.mark_all_as_read_4b943674')}</button></div></header>
  {error && <p className="inbox-error" role="alert">{tr(error)}</p>}
  <div className="inbox-layout">
   <div className="inbox-register">
    <div className="inbox-toolbar"><div role="group" aria-label={tr('ui.filter_notifications_3694490f')}>{['all','unread','read'].map(value=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>chooseFilter(value)}>{tr('ui.inbox.'+value)} <span>{value==='all'?notifications.length:value==='unread'?unread.length:notifications.length-unread.length}</span></button>)}</div><label className="inbox-search">{tr('ui.inbox.search')}<input type="search" maxLength={120} placeholder={tr('ui.inbox.searchHint')} value={search} onChange={event=>setSearch(event.target.value)} /></label></div>
    <HelpDisclosure>{tr('ui.inbox.listLimit')}</HelpDisclosure>
    {loading ? <p className="inbox-empty" role="status">{tr('ui.loading_notifications_cc8a441b')}</p> : readError ? <div className="inbox-error" role="alert"><p>{tr(readError)}</p><button type="button" className="btn btn-secondary" onClick={()=>void load()}>{tr('ui.users.retry')}</button></div> : !visible.length ? <div className="inbox-empty"><CheckCircle2 size={28} aria-hidden="true" /><h2>{tr(search?'ui.inbox.noMatches':filter==='unread'?'ui.you_re_all_caught_up_0fa21c8c':'ui.inbox.empty')}</h2><p>{tr('ui.inbox.emptyHint')}</p>{onOpenBookings && <button type="button" className="btn btn-secondary" onClick={onOpenBookings}>{tr('ui.open_bookings_a9348073')}</button>}</div> :
     <ul className="inbox-list">{visible.map(item=><li key={item.id}><button type="button" className={'inbox-row'+(item.id===selected?' is-selected':'')+(item.readAt?' is-read':'')} aria-pressed={item.id===selected} onClick={()=>choose(item.id)}><div className="inbox-row-top"><span className="inbox-type">{tr(typeLabels[item.type] || 'ui.system_notification_72387b29')}</span><time dateTime={item.sentAt || item.createdAt}>{formatVietnamDateTime(item.sentAt || item.createdAt)}</time></div><strong>{item.title}</strong><p>{item.message}</p><span className="inbox-read-state">{tr(item.readAt?'ui.inbox.read':'ui.inbox.unread')}<ArrowRight size={15} aria-hidden="true" /></span></button></li>)}</ul>}
   </div>
   <aside className="inbox-detail" ref={detailRef} tabIndex={-1} aria-label={tr('ui.inbox.details')}>
    {!current || readError ? <div className="inbox-empty"><Bell size={28} aria-hidden="true" /><h2>{tr(selected&&!loading?'ui.inbox.unavailable':'ui.inbox.select')}</h2><p>{tr('ui.inbox.selectHint')}</p></div> : <><span className="inbox-type">{tr(typeLabels[current.type] || 'ui.system_notification_72387b29')}</span><h2>{current.title}</h2><time dateTime={current.sentAt || current.createdAt}>{formatVietnamDateTime(current.sentAt || current.createdAt)} · {tr('ui.vietnam_time_896f6f2f')}</time><p className="inbox-message">{current.message}</p><dl><div><dt>{tr('ui.status_cb31de81')}</dt><dd>{tr(current.readAt?'ui.inbox.read':'ui.inbox.unread')}</dd></div>{current.readAt && <div><dt>{tr('ui.inbox.readAt')}</dt><dd>{formatVietnamDateTime(current.readAt)}</dd></div>}</dl><div className="inbox-detail-actions">{current.messageParams?.bookingId && <a className="btn btn-primary" href={workspacePathForTab('bookings',{booking:current.messageParams.bookingId})}>{tr('ui.view_related_booking_af785d42')}<ArrowRight size={16} /></a>}{!current.readAt && <button type="button" className="btn btn-secondary" disabled={loading||!!busy} onClick={()=>void markRead(current.id)}>{tr(busy===current.id?'ui.saving_2b5c2a46':'ui.mark_read_2e5a0c72')}</button>}</div><HelpDisclosure>{tr('ui.inbox.deliveryHint')}</HelpDisclosure></>}
   </aside>
  </div>
 </section>;
}
