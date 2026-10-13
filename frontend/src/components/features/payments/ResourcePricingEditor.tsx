import React, { useEffect, useState } from 'react';
import { useLocale } from '../../../providers/LocaleProvider';
import { apiRequest } from '../../../api.js';
import { ResourceTariffTable } from '../../ResourceTariffTable';
import '../../../styles/resource-catalogue.css';

type Resource = { id: string; name: string; code: string; maxBookingMinutes: number | null; rental: { hourlyRateVnd: number } | null };
export function ResourcePricingEditor() {
 const { tr } = useLocale();
 const [resources,setResources]=useState<Resource[]>([]),[selected,setSelected]=useState(''),[rate,setRate]=useState(''),[minutes,setMinutes]=useState('');
 const [error,setError]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{const controller=new AbortController();apiRequest('/resources',{signal:controller.signal}).then(rows=>{if(!controller.signal.aborted)setResources(rows);}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});return()=>controller.abort();},[revision]);
 function choose(id:string) { const resource=resources.find(r=>r.id===id); if(!resource)return;setSelected(id);setRate(String(resource.rental?.hourlyRateVnd ?? ''));setMinutes(String(resource.maxBookingMinutes ?? ''));setSaved(false);setError(''); }
 async function save(event:React.FormEvent<HTMLFormElement>) {
  event.preventDefault();if(busy||!selected)return;setBusy(true);setError('');setSaved(false);
  try { await apiRequest(`/booking-pricing/${selected}/tariff`,{method:'PUT',body:JSON.stringify({hourlyRateVnd:Number(rate),maxBookingMinutes:Number(minutes)})});setSaved(true);setRevision(value=>value+1); }
  catch(cause){setError(cause instanceof Error?cause.message:'api.API_REQUEST_FAILED');}finally{setBusy(false);}
 }
 return <details className="panel payment-pricing"><summary>{tr('ui.rental.pricing')}</summary>
 {error&&<p role="alert" className="alert danger">{tr(error)}</p>}{saved&&<p role="status">{tr('ui.care.saved')}</p>}
 <label>{tr('ui.care.resource')}<select value={selected} disabled={busy} onChange={event=>choose(event.target.value)}><option value="">{tr('ui.select_a_resource_8849f4e1')}</option>{resources.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
 {selected&&<form onSubmit={save} className="booking-form"><fieldset disabled={busy}><div className="form-grid"><label>{tr('ui.rental.hourlyPrice')}<input type="number" min="0" max="100000000" step="1" required value={rate} onChange={event=>setRate(event.target.value)}/></label><label>{tr('ui.maximum_duration_aa77487c')} ({tr('ui.rental.minutes')})<input type="number" min="15" max="525600" step="1" required value={minutes} onChange={event=>setMinutes(event.target.value)}/></label></div><button type="submit" className="btn btn-primary">{tr(busy?'ui.users.saving':'ui.save_rates_6acc633e')}</button></fieldset></form>}
 <ResourceTariffTable resources={resources} onSelect={resource=>choose(resource.id)}/>
 </details>;
}
