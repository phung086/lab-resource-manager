import { HelpDisclosure } from "../../base/HelpDisclosure";
import { useEffect, useState } from 'react';
import { useLocale } from '../../../providers/LocaleProvider';
import { apiRequest } from '../../../api.js';

type Bucket = {startAt:string;endAt:string;requests:number;usageMinutes:number;collectedVnd:number|null};
type Report = {source:string;period:string;timezone:string;scope:string;paymentState:string;startAt:string;endAt:string;buckets:Bucket[]};
export function WorkspaceTrends({identity,refreshKey}:{identity:string;refreshKey:number}) {
 const {tr,locale}=useLocale();
 const [period,setPeriod]=useState('week');
 const [metric,setMetric]=useState<'usageMinutes'|'requests'|'collectedVnd'>('usageMinutes');
 const [retry,setRetry]=useState(0);
 const key=identity+':'+period+':'+refreshKey+':'+retry;
 const [result,setResult]=useState<{key:string;data?:Report;error?:boolean}>();
 useEffect(()=>{const c=new AbortController();apiRequest('/dashboard/trends?period='+period,{signal:c.signal}).then(data=>{if(!c.signal.aborted)setResult({key,data});}).catch(()=>{if(!c.signal.aborted)setResult({key,error:true});});return()=>c.abort();},[key,period]);
 const current=result?.key===key?result:undefined, report=current?.data;
 const numeric=new Intl.NumberFormat(locale==='vi'?'vi-VN':'en-GB',{maximumFractionDigits:metric==='usageMinutes'?4:0});
 const date=(value:string)=>new Intl.DateTimeFormat(locale==='vi'?'vi-VN':'en-GB',{timeZone:'Asia/Ho_Chi_Minh',...(period==='day'?{hour:'2-digit' as const,minute:'2-digit' as const}:{day:'2-digit' as const,month:'2-digit' as const})}).format(new Date(value));
 const value=(b:Bucket)=>metric==='usageMinutes'?b.usageMinutes/60:Number(b[metric]??0);
 const available=metric!=='collectedVnd'||report?.paymentState==='available';
 const max=Math.max(1,...(report?.buckets.map(value)??[]));
 const total=report?.buckets.reduce((n,b)=>n+value(b),0)??0;
 return <section className="home-trends" aria-labelledby="home-trends-title" aria-busy={!current}>
 <header><div><h2 id="home-trends-title">{tr('workbench.trends')}</h2><p>{tr('workbench.scope.'+(report?.scope||'loading'))}</p></div><div className="home-trends-period" role="group" aria-label={tr('workbench.period')}>{['day','week','month'].map(p=><button key={p} aria-pressed={period===p} onClick={()=>setPeriod(p)}>{tr('workbench.'+p)}</button>)}</div></header>
 {!current?<p role="status">{tr('workbench.loading')}</p>:current.error?<div role="alert"><p>{tr('workbench.error')}</p><button className="secondary-button" onClick={()=>setRetry(n=>n+1)}>{tr('ui.retry_c58d068c')}</button></div>:report&&<>
 <div className="home-trends-metrics" role="group" aria-label={tr('workbench.metric')}>{(['usageMinutes','requests','collectedVnd'] as const).filter(m=>m!=='collectedVnd'||report.paymentState!=='restricted').map(m=><button key={m} aria-pressed={metric===m} onClick={()=>setMetric(m)}>{tr('workbench.'+m)}</button>)}</div>
 {!available?<p className="home-trends-unavailable">{tr('workbench.paymentsDisabled')}</p>:<><div className="home-trends-total"><strong>{numeric.format(total)}</strong><span>{tr('workbench.unit.'+metric)}</span></div><div className="home-trends-chart" aria-hidden="true">{report.buckets.map(b=><div className="home-trends-column" key={b.startAt} title={date(b.startAt)+': '+numeric.format(value(b))}><span style={{height:(value(b)/max*100)+'%'}}/></div>)}</div><div className="home-trends-axis"><span>{date(report.startAt)}</span><span>{date(report.endAt)}</span></div>{total===0&&<p>{tr('workbench.noActivity')}</p>}<details className="home-trends-data"><summary>{tr('workbench.table')}</summary><div className="home-trends-table-wrap"><table><caption>{tr('workbench.'+metric)} · {report.timezone}</caption><thead><tr><th>{tr('workbench.period')}</th><th>{tr('workbench.unit.'+metric)}</th></tr></thead><tbody>{report.buckets.map(b=><tr key={b.startAt}><td><time dateTime={b.startAt}>{date(b.startAt)}</time> – <time dateTime={b.endAt}>{date(b.endAt)}</time></td><td>{numeric.format(value(b))}</td></tr>)}</tbody></table></div></details></>}
 <HelpDisclosure>{tr('workbench.basis.'+metric)}</HelpDisclosure>
 </>}
 </section>;
}
