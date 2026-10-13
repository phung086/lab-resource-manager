import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Wrench, Activity } from "lucide-react";
import { useLocale } from "../../../providers/LocaleProvider";
import { readResourceCare, sendResourceCare, type CareResource, type CareSnapshot } from "../../../services/resourceCare";
import { workspacePathForTab } from "../../../workspaceRoutes.js";
import { formatVietnamDateTime } from "../../../utils/timezone";
import { LiveMonitoringView } from "./LiveMonitoringView";
import "../../../styles/resource-care.css";

function CareForm({ resource, resources, onSaved }: { resource: CareResource; resources: CareResource[]; onSaved: () => Promise<void> }) {
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
    event.preventDefault(); if (busy) return; setBusy(true); setError(""); setSaved(false);
    const command: Record<string, unknown> = { action, reason };
    if (action === "CONFIGURE") Object.assign(command, { roomId: roomId || null, intervalDays: days ? Number(days) : null, intervalHours: hours ? Number(hours) : null, intervalUses: uses ? Number(uses) : null, warningPercent: resource.profile?.warningPercent ?? 80 });
    if (["START", "LOAD"].includes(action)) Object.assign(command, resource.category === "ROOM" ? { occupants: Number(occupants) } : { loadPercent: Number(load) });
    if (action === "PART") Object.assign(command, { name: part, condition });
    if (["INSPECT", "BEGIN_MAINTENANCE"].includes(action)) Object.assign(command, { maintenanceId: job });
    try { await sendResourceCare(resource.id, command); setSaved(true); setReason(""); await onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "ui.care.failed"); }
    finally { setBusy(false); }
  }
  return <form className="care-form" onSubmit={submit}>
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
    <button className="btn btn-primary" type="submit" disabled={busy}>{tr(busy ? "ui.care.saving" : "ui.care.confirm")}</button>
  </form>;
}

export function ResourceCareView() {
  const { tr, locale } = useLocale(), request = useRef<AbortController | null>(null);
  const [data, setData] = useState<CareSnapshot | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const [selectedId, setSelected] = useState(() => new URLSearchParams(window.location.search).get("resource") || "");
  const [search, setSearch] = useState(""), [group, setGroup] = useState("ALL"), [telemetry, setTelemetry] = useState(false);
  const refresh = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller; setLoading(true);
    try { const next = await readResourceCare(controller.signal); if (!controller.signal.aborted) { setData(next); setError(""); } }
    catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "ui.care.failed"); }
    finally { if (request.current === controller) { request.current = null; setLoading(false); } }
  }, []);
  useEffect(() => { void refresh(); const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 5000); return () => { clearInterval(timer); request.current?.abort(); request.current = null; }; }, [refresh]);
  const rows = (data?.items || []).filter(r => (group === "ALL" || (group === "ROOM" ? r.category === "ROOM" : group === "DUE" ? r.care.due : group === "BROKEN" ? r.operationalStatus === "BROKEN" : r.category !== "ROOM")) && `${r.code} ${r.name} ${r.laboratory?.name || ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const selected = rows.find(r => r.id === selectedId);
  const n = (value: number | null) => value == null ? "—" : value.toLocaleString(locale, { maximumFractionDigits: 2 });
  const link = (tab: string, params: Record<string, string> = {}) => workspacePathForTab(tab, params);
  return <section className="monitor-workspace care-workspace" aria-labelledby="care-title">
    <header className="monitor-heading"><div><h1 id="care-title">{tr("ui.care.title")}</h1>{data && <small>{tr("ui.monitor.updatedAt")} {formatVietnamDateTime(data.generatedAt)}</small>}</div><button className="btn btn-secondary" disabled={loading} onClick={() => void refresh()}><RefreshCw size={16}/>{tr("ui.refresh_46140fa8")}</button></header>
    {error && <p role="alert" className="monitor-error">{tr(error)} {tr("ui.care.stale")}</p>}
    <div className="care-tabs" role="group" aria-label={tr("ui.care.views")}><button className={!telemetry ? "is-active" : ""} onClick={() => setTelemetry(false)}>{tr("ui.care.assets")}</button><button className={telemetry ? "is-active" : ""} onClick={() => setTelemetry(true)}>{tr("ui.care.sensors")}</button></div>
    {telemetry ? <LiveMonitoringView/> : <>
    <div className="care-summary"><span><strong>{data?.items.length ?? "—"}</strong>{tr("ui.care.assets")}</span><span><strong>{data?.items.filter(r => r.activeOperation).length ?? "—"}</strong>{tr("ui.care.running")}</span><span><strong>{data?.items.filter(r => r.care.due).length ?? "—"}</strong>{tr("ui.care.due")}</span><span><strong>{data?.items.filter(r => r.operationalStatus === "BROKEN").length ?? "—"}</strong>{tr("ui.care.BROKEN")}</span></div>
    <div className="monitor-filters"><label>{tr("ui.care.search")}<input type="search" value={search} onChange={e => setSearch(e.target.value)}/></label><label>{tr("ui.care.filter")}<select value={group} onChange={e => setGroup(e.target.value)}>{["ALL", "ROOM", "MACHINE", "DUE", "BROKEN"].map(v => <option key={v} value={v}>{tr(`ui.care.${v}`)}</option>)}</select></label></div>
    {!data ? <p role="status">{tr(loading ? "ui.care.loading" : "ui.care.failed")}</p> : <div className="care-layout"><div className="care-list"><table><caption className="sr-only">{tr("ui.care.assets")}</caption><thead><tr><th>{tr("ui.care.resource")}</th><th>{tr("ui.care.condition")}</th><th>{tr("ui.rental.cycleProgress")}</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className={r.id === selected?.id ? "is-selected" : ""}><td><button onPointerEnter={() => { if (!document.querySelector(".care-controls[open]")) setSelected(r.id); }} onFocus={() => setSelected(r.id)} onClick={() => setSelected(r.id)}><span><strong>{r.name}</strong><small>{r.code} · {r.laboratory?.name}</small></span></button></td><td><span className={r.care.due || r.operationalStatus === "BROKEN" ? "care-attention" : ""}>{tr(`ui.care.${r.operationalStatus}`)}</span><small>{tr(!r.profile ? "ui.care.notConfigured" : r.care.due ? "ui.care.due" : "ui.care.withinInterval")}</small></td><td><progress max="100" value={Math.min(100, r.care.progressPercent)} aria-label={tr("ui.rental.cycleProgress")} /><small>{r.profile?.intervalUses ? `${r.sinceService.uses}/${r.profile.intervalUses} ${tr("ui.rental.uses")}` : `${n(r.sinceService.hours)} ${tr("ui.rental.hours")}`}</small></td></tr>)}</tbody></table>{!rows.length && <p className="monitor-empty">{tr("ui.care.empty")}</p>}</div>
    {selected && <article className="care-dossier" aria-label={selected.name}><header><Activity size={20}/><div><h2>{selected.name}</h2><p>{selected.code} · {tr(`ui.care.${selected.operationalStatus}`)}</p></div></header>


      {selected.inspectionRequired && <p className="monitor-warning">{tr("api.RESOURCE_INSPECTION_REQUIRED")}</p>}
      <section className={'care-cycle ' + (selected.care.due ? 'is-due' : selected.care.nearDue ? 'is-near' : '')}>
        <header><strong>{tr(selected.care.due ? 'ui.care.due' : selected.care.nearDue ? 'ui.rental.nearDue' : 'ui.care.withinInterval')}</strong><span>{Math.round(selected.care.progressPercent)}%</span></header>
        <progress max="100" value={Math.min(100,selected.care.progressPercent)} aria-label={tr('ui.rental.cycleProgress')}/>
        <div>{selected.profile?.intervalHours && <span>{n(selected.sinceService.hours)} / {n(selected.profile.intervalHours)} {tr('ui.rental.hours')}</span>}{selected.profile?.intervalUses && <span>{selected.sinceService.uses} / {selected.profile.intervalUses} {tr('ui.rental.uses')}</span>}{selected.care.dueAt && <time>{tr('ui.rental.nextService')} {formatVietnamDateTime(selected.care.dueAt)}</time>}</div>
      </section>
      <dl className="care-metrics"><div><dt>{tr('ui.rental.recordedUse')}</dt><dd>{n(selected.custodyHours)} {tr('ui.rental.hours')}</dd></div><div><dt>{tr('ui.rental.currentLoad')}</dt><dd>{selected.activeOperation ? n(selected.activeOperation.loadPercent)+'%' : '—'}</dd></div></dl>
      <nav className="care-links"><a href={link("bookings", selected.checkedOutBooking ? { booking: selected.checkedOutBooking.id } : {})}>{tr(selected.checkedOutBooking ? "ui.care.currentBooking" : "ui.care.handover")}</a><a href={link("maintenance", { resource: selected.id })}><Wrench size={15}/>{tr("ui.care.maintenance")}</a><a href={link("incidents")}>{tr("ui.care.incidents")}</a></nav>
      <details><summary>{tr("ui.care.parts")}</summary>{selected.parts.length ? <ul className="care-parts">{selected.parts.map(p => <li key={p.id}><strong>{p.name}</strong><span>{tr(`ui.care.${p.condition}`)}</span><small>{p.notes}</small></li>)}</ul> : <p>{tr("ui.rental.noParts")}</p>}</details>
      {selected.incidents.length > 0 && <section><h3>{tr("ui.care.incidents")}</h3>{selected.incidents.map(i => <p key={i.id}><a href={link("incidents", { incident: i.id })}>{i.title}</a></p>)}</section>}
      {!error && <details className="care-controls" key={selected.id}><summary>{tr("ui.care.control")}</summary><CareForm resource={selected} resources={data.items} onSaved={refresh}/></details>}
      <details><summary>{tr("ui.care.history")}</summary>{selected.history.length ? <ol className="care-history">{selected.history.map(s => <li key={s.id}><strong>{formatVietnamDateTime(s.startedAt)}</strong><span>{n(s.loadPercent)}% · {s.endedAt ? formatVietnamDateTime(s.endedAt) : tr("ui.care.running")}</span><a href={link("bookings", { booking: s.bookingId })}>{tr("ui.care.currentBooking")}</a></li>)}</ol> : <p>{tr("ui.care.noHistory")}</p>}</details>
    </article>}{!selected && <div className="care-pick"><Activity size={28}/><p>{tr("ui.rental.selectResource")}</p></div>}</div>}</>}
  </section>;
}
