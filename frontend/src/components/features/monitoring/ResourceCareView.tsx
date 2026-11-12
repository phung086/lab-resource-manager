import { PageHeading } from '../../base/PageHeading';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Wrench, Activity, Search, ArrowRight, ShieldAlert, Box, Building2, Clock3 } from "lucide-react";
import { useLocale } from "../../../providers/LocaleProvider";
import { readResourceCare, sendResourceCare, type CareResource, type CareSnapshot } from "../../../services/resourceCare";
import { navigateApp, readRouteParams, workspacePathForTab } from "../../../workspaceRoutes.js";
import { formatVietnamDateTime } from "../../../utils/timezone";
import { LiveMonitoringView } from "./LiveMonitoringView";
import "../../../styles/resource-care.css";
import "../../../styles/resource-care-experience.css";

function CareForm({ resource, resources, onSaved, disabled = false }: { resource: CareResource; resources: CareResource[]; onSaved: () => Promise<void>; disabled?: boolean }) {
  const { tr } = useLocale();
  const [action, setAction] = useState(resource.profile ? "START" : "CONFIGURE");
  const [reason, setReason] = useState(""), [days, setDays] = useState(String(resource.profile?.intervalDays ?? "")), [hours, setHours] = useState(String(resource.profile?.intervalHours ?? ""));
  const [uses, setUses] = useState(String(resource.profile?.intervalUses ?? ""));
  const [roomId, setRoom] = useState(resource.profile?.roomId || ""), [load, setLoad] = useState("50"), [occupants, setOccupants] = useState("1");
  const [part, setPart] = useState(""), [condition, setCondition] = useState("OK"), [job, setJob] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  const choices = ["CONFIGURE", ...(resource.activeOperation ? ["LOAD", "STOP"] : ["START"]), "FAULT", "PART", "BEGIN_MAINTENANCE", "INSPECT"];
  useEffect(() => { if (resource.activeOperation && action === "START") setAction("LOAD"); else if (!resource.activeOperation && ["LOAD", "STOP"].includes(action)) setAction("START"); }, [resource.activeOperation, action]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || disabled) return; setBusy(true); setError(""); setSaved(false);
    const command: Record<string, unknown> = { action, reason };
    if (action === "CONFIGURE") Object.assign(command, { roomId: roomId || null, intervalDays: days ? Number(days) : null, intervalHours: hours ? Number(hours) : null, intervalUses: uses ? Number(uses) : null, warningPercent: resource.profile?.warningPercent ?? 80 });
    if (["START", "LOAD"].includes(action)) Object.assign(command, resource.category === "ROOM" ? { occupants: Number(occupants) } : { loadPercent: Number(load) });
    if (action === "PART") Object.assign(command, { name: part, condition });
    if (["INSPECT", "BEGIN_MAINTENANCE"].includes(action)) Object.assign(command, { maintenanceId: job });
    try { await sendResourceCare(resource.id, command); setSaved(true); setReason(""); await onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "ui.care.failed"); }
    finally { setBusy(false); }
  }
  return <form className="care-form" onSubmit={submit}><fieldset disabled={busy || disabled}>
    <h3>{tr("ui.care.control")}</h3>
    <label>{tr("ui.care.action")}<select value={choices.includes(action) ? action : "STOP"} onChange={e => { setAction(e.target.value); setSaved(false); }} disabled={busy}>{choices.map(value => <option key={value} value={value}>{tr(`ui.care.${value}`)}</option>)}</select></label>
    {action === "CONFIGURE" && <><div className="care-form-pair"><label>{tr("ui.care.intervalDays")}<input type="number" min="1" max="3650" value={days} onChange={e => setDays(e.target.value)} /></label><label>{tr("ui.care.intervalHours")}<input type="number" min="1" max="100000" step="0.1" value={hours} onChange={e => setHours(e.target.value)} /></label><label>{tr("ui.rental.cycleUses")}<input type="number" min="1" max="100000" value={uses} onChange={e => setUses(e.target.value)} /></label></div>{resource.category !== "ROOM" && <label>{tr("ui.care.room")}<select value={roomId} onChange={e => setRoom(e.target.value)}><option value="">{tr("ui.care.noRoom")}</option>{resources.filter(r => r.category === "ROOM" && r.laboratory?.id === resource.laboratory?.id).map(r => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}</select></label>}</>}
    {["START", "LOAD"].includes(action) && <>{resource.category === "ROOM" ? <label>{tr("ui.care.occupants")}<input type="number" min="1" max={resource.capacity} required value={occupants} onChange={e => setOccupants(e.target.value)} /></label> : <label>{tr("ui.care.load")}<input type="number" min="0" max="100" step="1" required value={load} onChange={e => setLoad(e.target.value)} /></label>}</>}
    {action === "FAULT" && <p className="monitor-warning">{tr("ui.care.faultHint")}</p>}
    {action === "PART" && <><label>{tr("ui.care.partName")}<input required minLength={2} maxLength={100} list="care-parts" value={part} onChange={e => setPart(e.target.value)} /><datalist id="care-parts">{resource.parts.map(p => <option key={p.id} value={p.name} />)}</datalist></label><label>{tr("ui.care.condition")}<select value={condition} onChange={e => setCondition(e.target.value)}>{["OK", "WORN", "BROKEN"].map(v => <option key={v} value={v}>{tr(`ui.care.${v}`)}</option>)}</select></label></>}
    {action === "INSPECT" && <><label>{tr("ui.care.completedJob")}<select required value={job} onChange={e => setJob(e.target.value)}><option value="">{tr("ui.care.select")}</option>{resource.maintenance.filter(j => j.status === "completed" && j.id !== resource.profile?.lastMaintenanceId).map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></label></>}
    {action === "BEGIN_MAINTENANCE" && <label>{tr("ui.care.openJob")}<select required value={job} onChange={e => setJob(e.target.value)}><option value="">{tr("ui.care.select")}</option>{resource.maintenance.filter(j => ["scheduled", "in_progress"].includes(j.status)).map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></label>}
    <label>{tr("ui.care.reason")}<textarea required minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
    {error && <p role="alert" className="monitor-error">{tr(error)}</p>}{saved && <p role="status">{tr("ui.care.saved")}</p>}
    <button className="btn btn-primary" type="submit" disabled={busy || disabled}>{tr(busy ? "ui.care.saving" : "ui.care.confirm")}</button>
  </fieldset></form>;
}


export function ResourceCareView() {
  const { tr, locale } = useLocale(), request = useRef<AbortController | null>(null);
  const [data, setData] = useState<CareSnapshot | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const [selectedId, setSelected] = useState(() => readRouteParams().get("resource") || "");
  const [search, setSearch] = useState(""), [group, setGroup] = useState("ALL"), [telemetry, setTelemetry] = useState(()=>readRouteParams().get('view')==='sensors');
  const detailRef = useRef<HTMLElement>(null);
  const refresh = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller; setLoading(true);
    try { const next = await readResourceCare(controller.signal); if (!controller.signal.aborted) { setData(next); setError(""); } }
    catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "ui.care.failed"); }
    finally { if (request.current === controller) { request.current = null; setLoading(false); } }
  }, []);
  useEffect(() => { if (telemetry) return; void refresh(); const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 5000); return () => { clearInterval(timer); request.current?.abort(); request.current = null; }; }, [refresh, telemetry]);
  useEffect(() => {
    const sync = () => { const params = readRouteParams(); setSelected(params.get('resource') || ''); setTelemetry(params.get('view') === 'sensors'); };
    window.addEventListener("popstate", sync); window.addEventListener("lrm:route-change", sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("lrm:route-change", sync); };
  }, []);
  function changeView(sensors: boolean) {
    const params = readRouteParams();
    if (sensors) params.set('view', 'sensors');
    else params.delete('view');
    setTelemetry(sensors);
    navigateApp(workspacePathForTab('monitoring', params), { notify: false });
  }
  const rows = (data?.items || []).filter(r => (group === "ALL" || (group === "ROOM" ? r.category === "ROOM" : group === "DUE" ? r.care.due : group === "BROKEN" ? r.operationalStatus === "BROKEN" : r.category !== "ROOM")) && (r.code + " " + r.name + " " + (r.laboratory?.name || "")).toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale)));
  const selected = data?.items.find(r => r.id === selectedId);
  const n = (value: number | null) => value == null ? "—" : value.toLocaleString(locale, { maximumFractionDigits: 2 });
  const link = (tab: string, params: Record<string, string> = {}) => workspacePathForTab(tab, { ...Object.fromEntries(readRouteParams()), ...params });
  function choose(id: string) {
    setSelected(id); const params = readRouteParams(); params.set("resource",id);
    navigateApp(link("monitoring",Object.fromEntries(params)),{notify:false});
    requestAnimationFrame(() => {
      detailRef.current?.focus({preventScroll:true});
      if (window.innerWidth < 1000) detailRef.current?.scrollIntoView({block:"start"});
    });
  }
  const cycleLabel = (resource: CareResource) => tr(!resource.care.configured ? "ui.care.notConfigured" : resource.care.due ? "ui.care.due" : resource.care.nearDue ? "ui.rental.nearDue" : "ui.care.withinInterval");
  return <section className="monitor-workspace care-workspace care-studio" data-has-selection={Boolean(selected)} aria-labelledby={telemetry ? "live-monitor-title" : "care-title"}>
    {!telemetry && <PageHeading className="monitor-heading"><div><h1 id="care-title">{tr("ui.care.title")}</h1><p>{tr("ui.careStudio.intro")}</p>{data && <small>{tr("ui.monitor.updatedAt")} {formatVietnamDateTime(data.generatedAt)}</small>}</div><button className="btn btn-secondary" disabled={loading} onClick={() => void refresh()}><RefreshCw size={16} aria-hidden="true"/>{tr("ui.refresh_46140fa8")}</button></PageHeading>}
    {error && <p role="alert" className="monitor-error">{tr(error)} {tr("ui.care.stale")}</p>}
    <div className="care-tabs" role="group" aria-label={tr("ui.care.views")}><button type="button" aria-pressed={!telemetry} className={!telemetry ? "is-active" : ""} onClick={() => changeView(false)}><Box size={17} aria-hidden="true"/>{tr("ui.care.assets")}</button><button type="button" aria-pressed={telemetry} className={telemetry ? "is-active" : ""} onClick={() => changeView(true)}><Activity size={17} aria-hidden="true"/>{tr("ui.care.sensors")}</button></div>
    {telemetry ? <LiveMonitoringView/> : <>
      <div className="care-summary" aria-label={tr("ui.careStudio.snapshotSummary")}><span><strong>{data?.items.length ?? "—"}</strong>{tr("ui.care.assets")}</span><span><strong>{data?.items.filter(r => r.activeOperation).length ?? "—"}</strong>{tr("ui.care.running")}</span><span><strong>{data?.items.filter(r => r.care.due).length ?? "—"}</strong>{tr("ui.care.due")}</span><span><strong>{data?.items.filter(r => r.operationalStatus === "BROKEN").length ?? "—"}</strong>{tr("ui.care.BROKEN")}</span></div>
      <div className="monitor-filters"><label>{tr("ui.care.search")}<span className="care-search-field"><Search size={17} aria-hidden="true"/><input type="search" value={search} onChange={e => setSearch(e.target.value)}/></span></label><label>{tr("ui.care.filter")}<select value={group} onChange={e => setGroup(e.target.value)}>{["ALL","ROOM","MACHINE","DUE","BROKEN"].map(v => <option key={v} value={v}>{tr("ui.care."+v)}</option>)}</select></label></div>
      {!data ? <div className="care-initial-state"><Activity size={30} aria-hidden="true"/><p role={error ? "alert" : "status"}>{tr(loading ? "ui.care.loading" : "ui.care.failed")}</p></div> : <div className="care-layout">
        <section className="care-list" aria-label={tr("ui.care.assets")}><header><h2>{tr("ui.care.assets")}</h2><span>{rows.length}</span></header><ul>{rows.map(r => <li key={r.id}><button type="button" className="care-resource-row" aria-pressed={r.id === selectedId} onClick={() => choose(r.id)}>
          <span className="care-resource-kind"><span aria-hidden="true">{r.category === "ROOM" ? <Building2 size={17}/> : <Box size={17}/>}</span>{r.code}<span className={"care-resource-state"+(r.operationalStatus === "BROKEN" ? " is-broken" : "")}>{tr("ui.care."+r.operationalStatus)}</span></span>
          <strong>{r.name}</strong><small>{r.laboratory?.name || "—"}</small>
          <span className={"care-cycle-caption"+(r.care.due ? " is-due" : "")}>{cycleLabel(r)}{r.care.configured && <b>{n(r.care.progressPercent)}%</b>}</span>
          {r.care.configured && <progress max="100" value={Math.min(100,r.care.progressPercent)} aria-label={tr("ui.rental.cycleProgress")}/>}
        </button></li>)}</ul>{!rows.length && <p className="monitor-empty">{tr("ui.care.empty")}</p>}</section>
        {selected ? <article className="care-dossier" ref={detailRef} tabIndex={-1} aria-label={selected.name}>
          <header><span className="care-dossier-icon" aria-hidden="true">{selected.category === "ROOM" ? <Building2 size={25}/> : <Box size={25}/>}</span><div><h2>{selected.name}</h2><p>{selected.code} · {selected.laboratory?.name || "—"}</p></div><span className="care-resource-state">{tr("ui.care."+selected.operationalStatus)}</span></header>
          <div className="care-evidence-note"><Clock3 size={16} aria-hidden="true"/>{tr("ui.careStudio.recordedSource")}</div>
          {selected.inspectionRequired && <p className="monitor-warning">{tr("api.RESOURCE_INSPECTION_REQUIRED")}</p>}
          <section className={"care-cycle"+(selected.care.due ? " is-due" : selected.care.nearDue ? " is-near" : "")} aria-label={tr("ui.rental.cycleProgress")}>
            <header><strong>{cycleLabel(selected)}</strong>{selected.care.configured && <span>{n(selected.care.progressPercent)}%</span>}</header>
            {selected.care.configured ? <><progress max="100" value={Math.min(100,selected.care.progressPercent)} aria-label={tr("ui.rental.cycleProgress")}/><div>{selected.profile?.intervalHours && <span>{n(selected.sinceService.hours)} / {n(selected.profile.intervalHours)} {tr("ui.rental.hours")}</span>}{selected.profile?.intervalUses && <span>{selected.sinceService.uses} / {selected.profile.intervalUses} {tr("ui.rental.uses")}</span>}{selected.care.dueAt && <time dateTime={selected.care.dueAt}>{tr("ui.rental.nextService")} {formatVietnamDateTime(selected.care.dueAt)}</time>}</div></> : <p>{tr("ui.careStudio.configureHint")}</p>}
          </section>
          <dl className="care-metrics"><div><dt>{tr("ui.rental.recordedUse")}</dt><dd>{n(selected.custodyHours)} <small>{tr("ui.rental.hours")}</small></dd></div><div><dt>{tr(selected.category === "ROOM" ? "ui.care.occupants" : "ui.rental.currentLoad")}</dt><dd>{selected.activeOperation ? selected.category === "ROOM" ? n(selected.activeOperation.occupants)+"/"+n(selected.capacity) : n(selected.activeOperation.loadPercent)+"%" : "—"}</dd></div></dl>
          <section className="care-related-work"><header><h3>{tr("ui.careStudio.relatedWork")}</h3><span>{selected.incidents.length + selected.maintenance.length}</span></header>
            {selected.incidents.length > 0 && <div className="care-related-incidents"><h4><ShieldAlert size={16} aria-hidden="true"/>{tr("ui.care.incidents")}</h4>{selected.incidents.map(i => <a key={i.id} href={link("incidents",{incident:i.id})}><span>{i.title}</span><ArrowRight size={16} aria-hidden="true"/></a>)}</div>}
            {selected.maintenance.length > 0 && <div className="care-related-jobs"><h4><Wrench size={16} aria-hidden="true"/>{tr("ui.care.maintenance")}</h4>{selected.maintenance.map(j => <a key={j.id} href={link("maintenance",{resource:selected.id,job:j.id})}><span>{j.title}<small>{formatVietnamDateTime(j.endAt)}</small></span><ArrowRight size={16} aria-hidden="true"/></a>)}</div>}
            {!selected.incidents.length && !selected.maintenance.length && <p>{tr("ui.careStudio.noRelatedWork")}</p>}
            <nav className="care-links" aria-label={tr("ui.careStudio.relatedActions")}><a href={link("bookings",selected.checkedOutBooking ? {booking:selected.checkedOutBooking.id} : {})}>{tr(selected.checkedOutBooking ? "ui.care.currentBooking" : "ui.care.handover")}<ArrowRight size={15} aria-hidden="true"/></a><a href={link("maintenance",{resource:selected.id})}>{tr("ui.rental.scheduleService")}<ArrowRight size={15} aria-hidden="true"/></a></nav>
          </section>
          <details className="care-parts-panel"><summary>{tr("ui.care.parts")} <span>{selected.parts.length}</span></summary>{selected.parts.length ? <ul className="care-parts">{selected.parts.map(p => <li key={p.id}><strong>{p.name}</strong><span>{tr("ui.care."+p.condition)}</span><small>{p.notes}</small></li>)}</ul> : <p>{tr("ui.rental.noParts")}</p>}</details>
          <details className="care-controls" key={selected.id}><summary>{tr("ui.care.control")}</summary><CareForm resource={selected} resources={data.items} onSaved={refresh} disabled={Boolean(error)}/></details>
          <details><summary>{tr("ui.care.history")}</summary>{selected.history.length ? <ol className="care-history">{selected.history.map(s => <li key={s.id}><strong>{formatVietnamDateTime(s.startedAt)}</strong><span>{n(s.loadPercent)}% · {s.endedAt ? formatVietnamDateTime(s.endedAt) : tr("ui.care.running")}</span><a href={link("bookings",{booking:s.bookingId})}>{tr("ui.care.currentBooking")}</a></li>)}</ol> : <p>{tr("ui.care.noHistory")}</p>}</details>
        </article> : <div className="care-pick"><Activity size={32} aria-hidden="true"/><h2>{tr("ui.rental.selectResource")}</h2><p>{tr("ui.careStudio.selectHint")}</p></div>}
      </div>}
    </>}
  </section>;
}
