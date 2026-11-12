import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlaskConical, Play, Square, Cpu, Radio, ChevronDown } from 'lucide-react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { formatVietnamDateTime } from '../../../utils/timezone';
import '../../../styles/monitoring-lab.css';

type Run = { id:string; resourceId:string; resourceName:string; scenario:string; status:string; phase:string; acceptedCount:number; totalSteps:number; startedAt:string; lastError:string|null };
type Snapshot = { enabled:boolean; resources:Array<{id:string;code:string;name:string;profile:string}>; runs:Run[] };
export function MonitoringSimulationPanel({ onChange }: { onChange:()=>void }) {
  const { tr } = useLocale();
  const [data,setData] = useState<Snapshot|null>(null), [resourceId,setResourceId] = useState(''), [scenario,setScenario] = useState('THERMAL_RISE');
  const [readError,setReadError] = useState(''), [actionError,setActionError] = useState('');
  const [busy,setBusy] = useState(false), [expanded,setExpanded] = useState(false);
  const controller = useRef<AbortController|null>(null);
  const refresh = useCallback(async () => {
    if (controller.current) return;
    const request = new AbortController(); controller.current = request;
    try {
      const result = await apiRequest('/telemetry/simulations',{ signal:request.signal });
      if (!request.signal.aborted) { setData(result); setReadError(''); }
    } catch (cause) {
      if (!request.signal.aborted) setReadError(cause instanceof Error ? cause.message : 'ui.monitorLab.failed');
    }
    finally { if (controller.current === request) controller.current = null; }
  },[]);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); },5000);
    return () => { clearInterval(timer); controller.current?.abort(); controller.current=null; };
  },[refresh]);
  const selected = data?.resources.find(r=>r.id===resourceId) || data?.resources[0];
  const scenarios = ['NORMAL','THERMAL_RISE','HIGH_LOAD','REPORTED_OFFLINE','RECOVERY'].filter(s=>selected?.profile!=='ROOM'||s!=='HIGH_LOAD');
  const effectiveScenario = scenarios.includes(scenario) ? scenario : 'THERMAL_RISE';
  async function mutate(run?:Run) {
    if (busy || (!run && !selected)) return;
    setBusy(true); setActionError('');
    try {
      await apiRequest(run ? `/telemetry/simulations/${run.id}/stop` : '/telemetry/simulations', {
        method:'POST', body:JSON.stringify(run ? {} : {resourceId:selected?.id,scenario:effectiveScenario})
      });
      controller.current?.abort(); controller.current=null;
      await refresh(); onChange();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'ui.monitorLab.failed');
    }
    finally { setBusy(false); }
  }
  if (data && !data.enabled) return null;
  const active = data?.runs.filter(r=>r.status==='RUNNING') || [];
  return <section className="monitor-lab" aria-labelledby="monitor-lab-title">
    <header><span className="monitor-lab-icon"><FlaskConical size={22}/></span><div><h2 id="monitor-lab-title">{tr('ui.monitorLab.title')}</h2><p>{tr('ui.monitorLab.subtitle')}</p></div><button type="button" className="btn btn-secondary" aria-expanded={expanded} aria-controls="monitor-lab-controls" onClick={()=>setExpanded(!expanded)}>{tr(expanded?'ui.monitorLab.collapse':'ui.monitorLab.configure')}<ChevronDown size={16}/></button></header>
    {readError&&<p role="alert" className="monitor-error">{tr(readError)}</p>}
    {actionError&&<p role="alert" className="monitor-error">{tr(actionError)}</p>}
    <div id="monitor-lab-controls" hidden={!expanded}>
      <div className="monitor-lab-setup"><label>{tr('ui.monitorLab.resource')}<select disabled={busy||!data} value={selected?.id||''} onChange={e=>setResourceId(e.target.value)}>{data?.resources.map(r=><option value={r.id} key={r.id}>{r.code} · {r.name}</option>)}</select></label><label>{tr('ui.monitorLab.scenario')}<select disabled={busy} value={effectiveScenario} onChange={e=>setScenario(e.target.value)}>{scenarios.map(s=><option key={s} value={s}>{tr('ui.monitorLab.'+s)}</option>)}</select></label><button type="button" className="btn btn-primary" disabled={busy||!selected||active.some(r=>r.resourceId===selected.id)||active.length>=6} onClick={()=>void mutate()}><Play size={16}/>{tr(busy?'ui.monitorLab.working':'ui.monitorLab.start')}</button></div>
      <p className="monitor-lab-limit">{tr('ui.monitorLab.limit')} {selected?.profile==='ROOM'&&tr('ui.monitorLab.roomThresholds')}</p>
      {data && !selected && <p className="monitor-empty">{tr('ui.monitorLab.noEligible')}</p>}
      <div className="monitor-source-guide"><Cpu size={19}/><div><strong>{tr('ui.monitorLab.realComputer')}</strong><p>{tr('ui.monitorLab.realComputerHelp')}</p></div></div>
    </div>
    {data && !data.runs.length&&<p className="monitor-empty">{tr('ui.monitorLab.noRuns')}</p>}
    <div className="monitor-run-grid">{data?.runs.slice(0,Math.max(3,active.length)).map(run=><article key={run.id} className="monitor-run" data-active={run.status==='RUNNING'}><div className="monitor-run-top"><Radio size={16} aria-hidden="true"/><span>{tr('ui.monitorLab.'+run.status)}</span><span className="monitor-simulation-badge">{tr('ui.telemetryDetail.simulated')}</span></div><h3>{run.resourceName}</h3><p>{tr('ui.monitorLab.'+run.scenario)} · {tr('ui.monitorLab.phase.'+run.phase)}</p><progress max={run.totalSteps} value={run.acceptedCount} aria-label={tr('ui.monitorLab.progress')}/><div className="monitor-run-bottom"><small>{run.acceptedCount}/{run.totalSteps} {tr('ui.monitorLab.samples')} · {formatVietnamDateTime(run.startedAt)}</small>{run.status==='RUNNING'&&<button className="btn btn-secondary" type="button" disabled={busy} onClick={()=>void mutate(run)}><Square size={13}/>{tr('ui.monitorLab.stop')}</button>}</div>{run.lastError&&<p className="monitor-error">{tr('ui.monitorLab.interruptedHelp')}</p>}</article>)}</div>
  </section>;
}
