import React, { useState } from "react";
import { useLocale } from "../../../providers/LocaleProvider";
import type { TelemetryResourceView, TelemetrySampleView } from "../../../types/telemetry";
import { formatVietnamDateTime } from "../../../utils/timezone";
const fields = ["temperatureC","humidityPercent","cpuPercent","gpuPercent","gpuMemoryPercent","ramPercent","diskPercent"] as const;
type Metric = typeof fields[number];

export function TelemetryHistoryChart({record}:{record:TelemetryResourceView}) {
  const {tr}=useLocale(),[selected,setSelected]=useState<Metric>("temperatureC");
  const history=[...(record.history||[])].reverse();
  const choices=fields.filter(key=>history.some(sample=>sample[key]!=null));
  const metric=choices.includes(selected)?selected:choices[0];
  if(!metric)return null;
  const reading=(sample:TelemetrySampleView)=>sample.online&&sample[metric]!=null?Number(sample[metric]):null;
  const values=history.map(reading).filter((value):value is number=>value!=null);
  if(!values.length)return null;
  const percent=metric!=="temperatureC",threshold=percent?record.thresholds.values.utilizationWarningPercent:record.thresholds.values.temperatureWarningC;
  const min=percent?0:Math.floor(Math.min(...values)-3),max=percent?100:Math.ceil(Math.max(...values,threshold||0)+3);
  const first=new Date(history[0].sampledAt).getTime(),last=new Date(history.at(-1)!.sampledAt).getTime();
  const x=(sample:TelemetrySampleView)=>40+(new Date(sample.sampledAt).getTime()-first)/Math.max(1,last-first)*500;
  const y=(value:number)=>160-(value-min)/Math.max(1,max-min)*140;
  let path="",inSegment=false,previousTime:number|null=null;
  for(const sample of history){const time=new Date(sample.sampledAt).getTime();if(previousTime!=null&&time-previousTime>10000)inSegment=false;previousTime=time;const value=reading(sample);if(value==null){inSegment=false;continue;}path+=`${inSegment?"L":"M"}${x(sample).toFixed(1)},${y(value).toFixed(1)} `;inSegment=true;}
  return <figure className="monitor-history-chart"><figcaption><strong>{tr("ui.telemetryDetail.chart")}</strong>{record.latestTelemetry?.origin==="SIMULATED"&&<span className="monitor-simulation-badge">{tr("ui.telemetryDetail.simulated")}</span>}</figcaption>
    <label>{tr("ui.telemetryDetail.metric")}<select value={metric} onChange={e=>setSelected(e.target.value as Metric)}>{choices.map(key=><option key={key} value={key}>{tr("ui.telemetryDetail.metric."+key)}</option>)}</select></label>
    <svg viewBox="0 0 560 190" role="img" aria-label={tr("ui.telemetryDetail.metric."+metric)}><title>{tr("ui.telemetryDetail.chart")}</title><line x1="40" y1="160" x2="540" y2="160" className="chart-axis"/><text x="2" y="25">{max}{percent?"%":"°C"}</text><text x="2" y="160">{min}</text>{threshold!=null&&metric!=="humidityPercent"&&<><line x1="40" x2="540" y1={y(threshold)} y2={y(threshold)} className="chart-threshold"/><text x="40" y={y(threshold)-5}>{tr("ui.telemetryDetail.threshold")} {threshold}</text></>}<path d={path} className="chart-reading"/>{history.map(sample=>reading(sample)!=null?<circle key={sample.id} cx={x(sample)} cy={y(reading(sample)!)} r="2" className="chart-dot"><title>{formatVietnamDateTime(sample.sampledAt)}: {reading(sample)}</title></circle>:null)}</svg>
    <div className="chart-time"><time>{formatVietnamDateTime(history[0].sampledAt)}</time><time>{formatVietnamDateTime(history.at(-1)!.sampledAt)}</time></div><p>{tr("ui.telemetryDetail.chartBasis")}</p>
  </figure>;
}
