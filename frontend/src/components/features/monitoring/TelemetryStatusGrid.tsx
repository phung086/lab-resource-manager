import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import type { TelemetryResourceView, TelemetryState } from '../../../types/telemetry';
import { formatVietnamDateTime } from '../../../utils/timezone';
import { navigateApp, readRouteParams, workspacePathForTab } from '../../../workspaceRoutes.js';
import { TelemetryHistoryChart } from './TelemetryHistoryChart';
import { monitoringText } from './monitoringText';
const states: Record<TelemetryState,string>={HEALTHY:'ui.stable_a9849d38',WARNING:'ui.warning_a7acbcf4',STALE:'ui.stale_data_11e8dde0',UNAVAILABLE:'ui.unavailable_567f82dd',NO_DATA:'ui.no_data_79d2a95c'};
const physical: Record<string,string>={AVAILABLE:'ui.available_d654065d',IN_USE:'ui.in_use_a07a3647',MAINTENANCE:'ui.maintenance_8ad424bd',CALIBRATION:'ui.calibration_a71e17c8',BROKEN:'ui.broken_fd69bba6',RETIRED:'ui.monitor.retired',OFFLINE:'ui.offline_96a8bb03'};
export const TelemetryStatusGrid: React.FC<{telemetry:TelemetryResourceView[]}> = ({telemetry})=>{
 const {tr}=useLocale(),detailRef=useRef<HTMLElement>(null);
 const [search,setSearch]=useState(''),[state,setState]=useState(''),[selected,setSelected]=useState(()=>readRouteParams().get('resource') || '');
 const visible=[...telemetry].sort((a,b)=>Number(!!b.sourceHealth)-Number(!!a.sourceHealth)).filter(item=>(!state||item.monitoring.state===state)&&(item.resource.name+' '+item.resource.code).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 const item=selected?telemetry.find(record=>record.resource.id===selected):(telemetry.find(record=>record.sourceHealth?.kind==='SIMULATED')||telemetry[0]);
 useEffect(()=>{const sync=()=>setSelected(readRouteParams().get('resource')||'');window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[]);
 function choose(id:string){setSelected(id);const params=readRouteParams();params.set('resource',id);navigateApp(workspacePathForTab('monitoring',params),{notify:false});if(window.matchMedia('(max-width:1000px)').matches)requestAnimationFrame(()=>{detailRef.current?.scrollIntoView({block:'start'});detailRef.current?.focus({preventScroll:true});});}
 function sourceState(record:TelemetryResourceView){return !record.sourceHealth || record.sourceHealth.reportedOnline==null ? tr('ui.monitor.sourceUnknown') : record.sourceHealth.reportedOnline ? tr('ui.monitor.reportedOnline') : tr('ui.monitor.reportedOffline');}
 return <div className="monitor-telemetry-layout">
  <section className="monitor-register"><h2>{tr('ui.telemetry_status_1f1f6882')}</h2><div className="monitor-filters"><label>{tr('ui.monitor.searchResource')}<input type="search" maxLength={120} value={search} onChange={event=>setSearch(event.target.value)} /></label><label>{tr('ui.monitor.dataState')}<select value={state} onChange={event=>setState(event.target.value)}><option value="">{tr('ui.all_49c73a31')}</option>{Object.entries(states).map(([value,label])=><option key={value} value={value}>{tr(label)}</option>)}</select></label></div>
   {visible.length ? <div className="table-wrap"><table><caption className="sr-only">{tr('ui.telemetry_status_1f1f6882')}</caption><thead><tr><th>{tr('ui.resource_9a35ef53')}</th><th>{tr('ui.monitor.dataState')}</th><th>{tr('ui.last_seen_c40fd69c')}</th></tr></thead><tbody>{visible.map(record=><tr key={record.resource.id} className={item?.resource.id===record.resource.id?'is-selected':''}><td><button type="button" aria-pressed={item?.resource.id===record.resource.id} onClick={()=>choose(record.resource.id)}><span><strong>{record.resource.name}</strong><small>{record.resource.code}</small></span><ArrowRight size={15} /></button></td><td><span className={'monitor-state state-'+record.monitoring.state.toLowerCase()}>{tr(states[record.monitoring.state])}</span><small>{sourceState(record)}</small></td><td>{record.sourceHealth?.lastSeenAt?formatVietnamDateTime(record.sourceHealth.lastSeenAt):'—'}</td></tr>)}</tbody></table></div> : <p className="monitor-empty">{tr(telemetry.length?'ui.monitor.noMatches':'ui.no_resources_in_your_monitoring_547b1bd5')}</p>}
  </section>
  <aside ref={detailRef} tabIndex={-1} className="monitor-dossier" aria-label={tr('ui.monitor.resourceDetail')}>
   {!item?<p className="monitor-empty">{tr('ui.monitor.selectResource')}</p>:<>
    <h2>{item.resource.name}</h2><p className="monitor-resource-code">{item.resource.code}</p><span className={'monitor-state state-'+item.monitoring.state.toLowerCase()}>{tr(states[item.monitoring.state])}</span>
    {item.sourceHealth?.kind==='SIMULATED'&&<span className="monitor-simulation-badge">{tr('ui.telemetryDetail.simulated')}</span>}
    <dl className="monitor-reading-list"><div><dt>{tr('ui.physical_status_34d66dbe')}</dt><dd>{tr(physical[item.resource.operationalStatus]) || item.resource.operationalStatus}</dd></div><div><dt>{tr('ui.source_c76d57b3')}</dt><dd>{item.sourceHealth?.code || item.latestTelemetry?.source || tr('ui.none_recorded_bc2b97d6')}</dd></div><div><dt>{tr('ui.source_health_45a57e95')}</dt><dd>{sourceState(item)}{item.sourceHealth && ' · '+tr('ui.monitor.'+item.sourceHealth.freshness)}</dd></div><div><dt>{tr('ui.latest_sample_8875351d')}</dt><dd>{item.latestTelemetry?formatVietnamDateTime(item.latestTelemetry.sampledAt):'—'}</dd></div>
     {[{key:'temperatureC',label:'ui.temperature_d792b875',unit:' °C'},{key:'humidityPercent',label:'ui.humidity_83aa327b',unit:'%'},{key:'cpuPercent',label:'ui.monitor.cpu',unit:'%'},{key:'gpuPercent',label:'ui.monitor.gpu',unit:'%'},{key:'gpuMemoryPercent',label:'ui.monitor.gpuMemory',unit:'%'},{key:'ramPercent',label:'ui.monitor.ram',unit:'%'},{key:'diskPercent',label:'ui.monitor.disk',unit:'%'}].filter(field=>['temperatureC','humidityPercent'].includes(field.key)||(item.latestTelemetry as any)?.[field.key]!=null).map(field=><div key={field.key}><dt>{tr(field.label)}</dt><dd>{(item.latestTelemetry as any)?.[field.key]!=null?Number((item.latestTelemetry as any)[field.key]).toFixed(1)+field.unit:'—'}</dd></div>)}
    </dl>
    {!item.latestTelemetry && <p className="monitor-source-note">{tr('ui.no_accepted_telemetry_samples_resource_73375f55')}</p>}
    <TelemetryHistoryChart record={item}/>
    {item.monitoring.reasons.length>0 && <ul className="monitor-reasons">{item.monitoring.reasons.map(reason=><li key={reason}>{monitoringText(reason,reason,tr)}</li>)}</ul>}
    <a className="btn btn-secondary" href={workspacePathForTab('resources',{resource:item.resource.id})}>{tr('ui.monitor.openResource')}<ArrowRight size={16} /></a>
    <details className="monitor-thresholds"><summary>{tr('ui.monitor.thresholds')}</summary><dl className="monitor-reading-list">{Object.entries(item.thresholds.values).map(([key,value])=><div key={key}><dt>{tr("ui.telemetryDetail.threshold."+key)}</dt><dd>{value} <small>{tr("ui.telemetryDetail.threshold."+item.thresholds.sourceByField[key])}</small></dd></div>)}</dl></details>
    <details className="telemetry-history"><summary>{tr('ui.accepted_sample_history_9e425c37')}</summary>{item.history?.length ? <ul>{item.history.slice(0,5).map(sample=><li key={sample.id}><time dateTime={sample.sampledAt}>{formatVietnamDateTime(sample.sampledAt)}</time><span>{sample.temperatureC!=null?sample.temperatureC.toFixed(1)+' °C':'—'} · {sample.humidityPercent!=null?sample.humidityPercent.toFixed(1)+'%':'—'}</span><small>{sample.source}</small></li>)}</ul> : <p>{tr('ui.monitor.noSamples')}</p>}</details>
    <p className="monitor-source-note">{tr('ui.monitor.physicalAuthority')}</p>
   </>}
  </aside>
 </div>;
};
