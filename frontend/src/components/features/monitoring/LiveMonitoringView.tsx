import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiRequest } from "../../../api.js";
import { useLocale } from "../../../providers/LocaleProvider";
import { TELEMETRY_FEATURES_ENABLED } from "../../../config/featureFlags";
import { acknowledgeMonitoringAlert } from "../../../services/monitoring";
import type { CameraMetadataView, MonitoringAlertView, TelemetryResourceView } from "../../../types/telemetry";
import { formatVietnamDateTime } from "../../../utils/timezone";
import { workspacePathForTab } from "../../../workspaceRoutes.js";
import { TelemetryStatusGrid } from "./TelemetryStatusGrid";
import { monitoringText } from "./monitoringText";
import "../../../styles/telemetry-history.css";

export function LiveMonitoringView() {
  const {tr}=useLocale(),controller=useRef<AbortController|null>(null),active=useRef(false);
  const [snapshot,setSnapshot]=useState<{telemetry:TelemetryResourceView[];cameras:CameraMetadataView[];alerts:MonitoringAlertView[];updatedAt:string}|null>(null);
  const [error,setError]=useState(""),[loading,setLoading]=useState(false),[ackId,setAckId]=useState("");
  const refresh=useCallback(async()=>{
    if(!TELEMETRY_FEATURES_ENABLED||controller.current)return;
    const request=new AbortController();controller.current=request;setLoading(true);
    try{
      const [telemetry,open,acknowledged,cameras]=await Promise.all([
        apiRequest("/telemetry?take=60",{signal:request.signal}),apiRequest("/telemetry/alerts?status=OPEN&take=200",{signal:request.signal}),
        apiRequest("/telemetry/alerts?status=ACKNOWLEDGED&take=200",{signal:request.signal}),apiRequest("/telemetry/cameras",{signal:request.signal})
      ]);
      if(!request.signal.aborted&&active.current){setSnapshot({telemetry,cameras,alerts:[...open,...acknowledged],updatedAt:new Date().toISOString()});setError("");}
    }catch(cause){if(!request.signal.aborted&&active.current)setError(cause instanceof Error?cause.message:"ui.telemetryDetail.loadFailed");}
    finally{if(controller.current===request){controller.current=null;if(active.current)setLoading(false);}}
  },[]);
  useEffect(()=>{
    active.current=true;void refresh();
    const timer=window.setInterval(()=>{if(!document.hidden)void refresh();},5000);
    const visible=()=>{if(!document.hidden)void refresh();};document.addEventListener("visibilitychange",visible);
    return()=>{active.current=false;clearInterval(timer);document.removeEventListener("visibilitychange",visible);controller.current?.abort();controller.current=null;};
  },[refresh]);
  async function acknowledge(id:string){if(ackId||error)return;setAckId(id);try{await acknowledgeMonitoringAlert(id);await refresh();}catch(cause){setError(cause instanceof Error?cause.message:"ui.telemetryDetail.actionFailed");}finally{setAckId("");}}
  if(!TELEMETRY_FEATURES_ENABLED)return <p>{tr("ui.monitor.featureDisabled")}</p>;
  return <section className="monitor-workspace" aria-labelledby="live-monitor-title">
    <header className="monitor-heading"><div><h1 id="live-monitor-title">{tr("ui.telemetry_monitoring_5752a8cc")}</h1><p>{tr("ui.telemetryDetail.polling")}</p>{snapshot&&<small>{tr("ui.monitor.updatedAt")} {formatVietnamDateTime(snapshot.updatedAt)}</small>}</div><button type="button" className="btn btn-secondary" disabled={loading} onClick={()=>void refresh()}><RefreshCw size={16}/>{tr(loading?"ui.updating_01c0991e":"ui.refresh_46140fa8")}</button></header>
    {error&&<p className="monitor-error" role="alert">{tr("ui.telemetryDetail.loadFailed")} {tr(error)} {snapshot&&tr("ui.telemetryDetail.previousSnapshot")}</p>}
    {!snapshot?<p role="status">{tr(loading?"ui.loading_operational_data_2a8d4625":"ui.telemetryDetail.loadFailed")}</p>:<>
      <section className="monitor-alerts" aria-labelledby="active-monitor-alerts"><header><h2 id="active-monitor-alerts">{tr("ui.recorded_monitoring_alerts_56b20cd9")}</h2><span>{snapshot.alerts.length}</span></header>
        <p className="monitor-source-note">{tr("ui.telemetryDetail.alertPolicy")}</p>{snapshot.alerts.length?<ul>{snapshot.alerts.map(alert=><li key={alert.id} className={alert.severity==="CRITICAL"?"is-critical":""}><div><strong>{tr("ui.monitor."+alert.severity)}</strong>{alert.origin==="SIMULATED"&&<span className="monitor-simulation-badge">{tr("ui.telemetryDetail.simulated")}</span>}<p>{alert.resourceCode} · {monitoringText(alert.ruleCode,alert.message,tr)}</p><small>{formatVietnamDateTime(alert.lastObservedAt)} · {tr("ui.monitor."+alert.status)}</small>{alert.incident&&<a href={workspacePathForTab("incidents",{incident:alert.incident.id})}>{tr("ui.incident_32dcf81b")} {alert.incident.id}</a>}</div>{alert.status==="OPEN"&&<button type="button" className="btn btn-secondary" disabled={!!ackId||!!error} onClick={()=>void acknowledge(alert.id)}>{tr(ackId===alert.id?"ui.acknowledging_58cf7ba6":"ui.monitor.acknowledge")}</button>}</li>)}</ul>:<p className="monitor-empty">{tr("ui.no_active_monitoring_alerts_d544ae55")}</p>}
      </section><TelemetryStatusGrid telemetry={snapshot.telemetry}/>
      <section className="monitor-camera-metadata"><h2>{tr("ui.cameras_safety_alerts_9768aa1d")}</h2><p className="monitor-source-note">{tr("ui.non_certified_not_a_fire_83ece6d0")} {tr("ui.does_not_replace_physical_fire_857990d1")}</p>{snapshot.cameras.length?<ul>{snapshot.cameras.map(camera=><li key={camera.id}><strong>{camera.code} · {camera.name}</strong><span>{tr("ui.monitor."+camera.state)} · {tr(camera.enabled?"ui.configuration_enabled_bc2db5a3":"ui.disabled_by_default_313eed81")}</span></li>)}</ul>:<p>{tr("ui.not_configured_no_camera_configured_0fa994f5")}</p>}</section>
    </>}
  </section>;
}
