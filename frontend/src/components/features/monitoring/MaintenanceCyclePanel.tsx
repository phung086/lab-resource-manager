import React, { useEffect, useState } from "react";
import { useLocale } from "../../../providers/LocaleProvider";
import { readResourceCare, type CareResource } from "../../../services/resourceCare";
import { workspacePathForTab } from "../../../workspaceRoutes.js";
import "../../../styles/resource-care.css";
export function MaintenanceCyclePanel() {
  const { tr,locale } = useLocale();
  const [resources,setResources] = useState<CareResource[]|null>(null),[error,setError] = useState("");
  useEffect(()=>{
    let controller:AbortController|null=null,alive=true;
    const load=async()=>{if(controller||document.hidden)return;controller=new AbortController();try{const data=await readResourceCare(controller.signal);if(alive){setResources(data.items);setError("");}}catch(cause){if(alive&&!controller.signal.aborted)setError(cause instanceof Error?cause.message:"ui.care.failed");}finally{controller=null;}};
    void load();const timer=setInterval(()=>void load(),30000);return()=>{alive=false;clearInterval(timer);controller?.abort();};
  },[]);
  const alerts=resources?.filter(r=>r.care.nearDue||r.care.due)||[];
  const rows=[...(resources||[])].sort((a,b)=>b.care.progressPercent-a.care.progressPercent);
  const renderRows=(items:CareResource[])=>items.map(r=><a key={r.id} className={'maintenance-cycle-row '+(r.care.due?'is-due':r.care.nearDue?'is-near':'')} href={workspacePathForTab('monitoring',{resource:r.id})}><strong>{r.name}</strong><progress max="100" value={Math.min(100,r.care.progressPercent)} aria-label={tr('ui.rental.cycleProgress')}/><span>{r.sinceService.hours.toLocaleString(locale,{maximumFractionDigits:1})}/{r.profile?.intervalHours??'—'} {tr('ui.rental.hours')} · {r.sinceService.uses}/{r.profile?.intervalUses??'—'} {tr('ui.rental.uses')}</span></a>);
  return <section className="maintenance-cycles" aria-label={tr('ui.rental.cycleProgress')}>
    {error&&<p role="alert">{tr(error)}</p>}
    <header><h2>{tr('ui.rental.cycleProgress')}</h2><span><strong>{resources?.filter(r=>r.care.nearDue).length??'—'}</strong> {tr('ui.rental.nearDue')}</span><span><strong>{resources?.filter(r=>r.care.due).length??'—'}</strong> {tr('ui.care.due')}</span></header>
    {!!alerts.length&&<div className="maintenance-cycle-grid">{renderRows(alerts.slice(0,6))}</div>}
    <details><summary>{tr('ui.rental.allCycles')} ({resources?.length??'—'})</summary>{resources?<div className="maintenance-cycle-grid">{renderRows(rows)}</div>:<p role="status">{tr('ui.loading_148ded83')}</p>}</details>
  </section>;
}
