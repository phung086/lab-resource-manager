import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { formatVietnamDateTime } from '../../../utils/timezone';

type Result = {mode:'AI'|'NO_DATA'|'UNCONFIGURED';answer:string|null;evidence:{generatedAt:string;samples:Array<{id:string;origin:string;sampledAt:string}>;alerts:Array<{id:string}>}};
export function MonitoringExplanation({resourceId}:{resourceId:string}) {
  const {tr,locale}=useLocale(), controller=useRef<AbortController|null>(null);
  const [question,setQuestion]=useState(''),[result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{setResult(null);setError('');setBusy(false);return()=>{controller.current?.abort();controller.current=null;};},[resourceId,locale]);
  async function explain(){
    if(busy)return;const request=new AbortController();controller.current=request;setBusy(true);setError('');setResult(null);
    try{const response=await apiRequest('/telemetry/explain',{method:'POST',body:JSON.stringify({resourceId,locale,question:question.trim()||tr('ui.monitorLab.aiPrompt')}),signal:request.signal});if(!request.signal.aborted)setResult(response);}
    catch(cause){if(!request.signal.aborted)setError(cause instanceof Error?cause.message:'ui.monitorLab.failed');}
    finally{if(controller.current===request){controller.current=null;setBusy(false);}}
  }
  return <details className="monitor-ai"><summary><Sparkles size={17} aria-hidden="true"/>{tr('ui.monitorLab.aiTitle')}</summary><p>{tr('ui.monitorLab.aiHelp')}</p><label>{tr('ui.monitorLab.question')}<textarea maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={tr('ui.monitorLab.aiPrompt')} rows={3}/></label><button type="button" className="btn btn-secondary" disabled={busy || (question.trim().length > 0 && question.trim().length < 3)} onClick={()=>void explain()}>{tr(busy?'ui.monitorLab.analyzing':'ui.monitorLab.explain')}</button>{busy&&<button type="button" className="btn btn-ghost" onClick={()=>{controller.current?.abort();setBusy(false);}}>{tr('ui.monitorLab.cancel')}</button>}
    {error&&<p role="alert" className="monitor-error">{tr(error)}</p>}
    {result&&<div className="monitor-ai-answer" role="status">{result.mode==='AI'?<p>{result.answer}</p>:<p>{tr('ui.monitorLab.ai.'+result.mode)}</p>}<small>{tr('ui.monitorLab.evidence')} · {formatVietnamDateTime(result.evidence.generatedAt)} · {result.evidence.samples.length} {tr('ui.monitorLab.samples')}</small><details><summary>{tr('ui.monitorLab.sources')}</summary><ul>{result.evidence.samples.slice(0,3).map(s=><li key={s.id}>{s.origin==='SIMULATED'?tr('ui.telemetryDetail.simulated'):tr('ui.monitorDemo.external')} · {formatVietnamDateTime(s.sampledAt)}<small>{s.id}</small></li>)}</ul></details></div>}
  </details>;
}
