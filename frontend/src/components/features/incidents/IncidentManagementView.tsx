import { translate } from "../../../i18n.js";
import { useLocale } from '../../../providers/LocaleProvider';
import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, ShieldAlert } from "lucide-react";
import { BaseModal2026 } from "../../BaseModal2026.js";
import { formatVietnamDateTime } from "../../../utils/timezone.js";

import type { IncidentRecord, IncidentSeverity } from "../../../types/incident";
import {
  investigateIncident,
  reportIncident,
  resolveIncident,
  triageIncident
} from "../../../services/incidents";

interface ResourceOption {
  id: string;
  code: string;
  name: string;
  operationalStatus?: string;
}

interface Props {
  user: { id?: string; role: string } | null;
  resources: ResourceOption[];
  incidents: IncidentRecord[];
  onChanged?: () => Promise<void> | void;
}

const severityLabels: Record<IncidentSeverity, string> = {
  low: "ui.low_4e45ab86",
  medium: "ui.medium_928d4573",
  high: "Cao",
  critical: "ui.critical_9559e09a"
};

const statusLabels: Record<string, string> = {
  reported: "ui.reported_977c15d8",
  triaged: "ui.triaged_4652a509",
  assigned: "ui.assigned_5dd582ca",
  investigating: "ui.investigating_8723e350",
  resolved: "ui.resolved_6023373b",
  verified: "ui.verified_662e363d",
  closed: "ui.closed_6b919498"
};
const resourceStatusLabels: Record<string, string> = {
  AVAILABLE: "ui.available_d654065d", IN_USE: "ui.in_use_a07a3647", MAINTENANCE: "ui.under_maintenance_746ec905",
  CALIBRATION: "ui.under_calibration_779c1ea8", BROKEN: "ui.broken_fd69bba6", RETIRED: "ui.offline_b4f199c3", OFFLINE: "ui.offline_96a8bb03"
};

export const IncidentManagementView: React.FC<Props> = ({ user, resources, incidents, onChanged }) => {
  const { tr } = useLocale();
  const isStaff = ["ADMIN", "LAB_STAFF"].includes(user?.role || "");
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");
  const [showReport, setShowReport] = useState(false);
  const [resolving, setResolving] = useState<IncidentRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [resolution, setResolution] = useState("");
  const [form, setForm] = useState({
    resourceId: resources[0]?.id || "",
    severity: "medium" as IncidentSeverity,
    category: "hardware",
    title: "",
    description: ""
  });

  const filtered = useMemo(() => incidents.filter((incident) => {
    const open = ["reported", "triaged", "assigned", "investigating"].includes(incident.status);
    if (filter === "OPEN") return open;
    if (filter === "RESOLVED") return !open;
    return true;
  }), [incidents, filter]);

  const openCount = incidents.filter((incident) =>
    ["reported", "triaged", "assigned", "investigating"].includes(incident.status)
  ).length;

  async function refresh() {
    await onChanged?.();
  }

  async function submitReport(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.resourceId || !form.title.trim() || !form.description.trim()) {
      setError("ui.choose_a_resource_and_enter_4442d487");
      return;
    }
    try {
      setBusyId("create");
      await reportIncident({
        resourceId: form.resourceId,
        severity: form.severity,
        category: form.category.trim() || null,
        title: form.title.trim(),
        description: form.description.trim()
      });
      setShowReport(false);
      setForm((current) => ({ ...current, title: "", description: "" }));
      await refresh();
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_submit_incident_report_cb6bca65");
    } finally {
      setBusyId(null);
    }
  }

  async function runAction(incident: IncidentRecord, action: "triage" | "investigate") {
    setError("");
    try {
      setBusyId(incident.id);
      if (action === "triage") await triageIncident(incident.id);
      else await investigateIncident(incident.id);
      await refresh();
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_update_incident_26d8044a");
    } finally {
      setBusyId(null);
    }
  }

  async function submitResolution(event: React.FormEvent) {
    event.preventDefault();
    if (!resolving) return;
    setError("");
    if (!resolution.trim()) {
      setError("ui.record_the_actual_outcome_before_489bffce");
      return;
    }
    try {
      setBusyId(resolving.id);
      await resolveIncident(resolving.id, resolution.trim());
      setResolving(null);
      setResolution("");
      await refresh();
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_complete_incident_resolution_d17cb3c0");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="content-stack" aria-labelledby="incident-heading">
      <div className="page-section-header">
        <div>
          <p className="eyebrow">{tr("ui.laboratory_operations_9ae8194c")}</p>
          <h1 id="incident-heading">{tr("ui.resource_incidents_0cba217b")}</h1>
          <p className="section-description">
            {tr("ui.report_observed_problems_lab_staff_c71e9e68")}</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => {
          setError("");
          setForm((current) => ({ ...current, resourceId: current.resourceId || resources[0]?.id || "" }));
          setShowReport(true);
        }}>
          <Plus size={16} /> {tr("ui.report_an_incident_0527866e")}</button>
      </div>

      {error && <div role="alert" className="alert danger">{translate(error)}</div>}

      <div className="operational-summary-grid">
        <Summary label={tr("ui.total_incidents_4c1b245c")} value={incidents.length} />
        <Summary label={tr("ui.processing_e84898db")} value={openCount} />
        <Summary label={tr("ui.resolved_1c5b11f2")} value={incidents.length - openCount} />
      </div>

      <div className="booking-queue-toolbar" role="group" aria-label={tr("ui.filter_incidents_695f1591")}>
        {(["ALL", "OPEN", "RESOLVED"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "btn btn-primary" : "btn btn-secondary"}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value === "ALL" ? tr("ui.all_49c73a31") : value === "OPEN" ? tr("ui.processing_e84898db") : tr("ui.resolved_1c5b11f2")}
          </button>
        ))}
      </div>

      <div className="content-stack">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={28} />
            <p>{tr("ui.no_incidents_match_the_current_e09d6f91")}</p>
          </div>
        ) : filtered.map((incident) => {
          const open = ["reported", "triaged", "assigned", "investigating"].includes(incident.status);
          return (
            <article className="card operational-card" key={incident.id}>
              <div className="operational-card-header">
                <div>
                  <div className="operational-card-meta">
                    <span className={`status-badge status-${incident.severity}`}>
                      {tr(severityLabels[incident.severity])}
                    </span>
                    <span>{tr(statusLabels[incident.status]) || incident.status}</span>
                  </div>
                  <h2>{incident.title}</h2>
                  <p>{incident.resource?.code} · {incident.resource?.name}</p>
                </div>
                <time dateTime={incident.detectedAt}>
                  {formatVietnamDateTime(incident.detectedAt)}
                </time>
              </div>

              <p>{incident.description}</p>

              <dl className="operational-evidence-grid">
                <div><dt>{tr("ui.reported_by_635a2e8b")}</dt><dd>{incident.reportedBy?.fullName || "—"}</dd></div>
                <div><dt>{tr("ui.assigned_to_02be53a1")}</dt><dd>{incident.assignedTo?.fullName || tr("ui.unassigned_1f379993")}</dd></div>
                <div><dt>{tr("ui.resource_status_1e524f19")}</dt><dd>{tr(resourceStatusLabels[incident.resource?.operationalStatus || ""]) || "—"}</dd></div>
                <div><dt>{tr("ui.resolution_4677c393")}</dt><dd>{incident.resolution || tr("ui.none_recorded_bc2b97d6")}</dd></div>
              </dl>

              {isStaff && open && (
                <div className="operational-card-actions">
                  {incident.status === "reported" && (
                    <button disabled={busyId === incident.id} className="btn btn-secondary" type="button" onClick={() => runAction(incident, "triage")}>
                      {tr("ui.classification_a077263e")}</button>
                  )}
                  {["triaged", "assigned"].includes(incident.status) && (
                    <button disabled={busyId === incident.id} className="btn btn-secondary" type="button" onClick={() => runAction(incident, "investigate")}>
                      {tr("ui.start_investigation_f9b7e9ae")}</button>
                  )}
                  <button className="btn btn-primary" type="button" onClick={() => {
                    setError("");
                    setResolution("");
                    setResolving(incident);
                  }}>
                    {tr("ui.confirm_resolution_df20cec5")}</button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <BaseModal2026 isOpen={showReport} onClose={() => setShowReport(false)} title={tr("ui.report_an_incident_0527866e")} icon={ShieldAlert} dismissible={busyId !== "create"}>
            <form className="booking-operation-form" onSubmit={submitReport} noValidate>
              <label>
                {tr("ui.resource_9a35ef53")}<select value={form.resourceId} onChange={(event) => setForm({ ...form, resourceId: event.target.value })}>
                  <option value="">{tr("ui.select_a_resource_8849f4e1")}</option>
                  {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.code} — {resource.name}</option>)}
                </select>
              </label>
              <label>
                {tr("ui.severity_9709dbac")}<select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as IncidentSeverity })}>
                  {Object.entries(severityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                {tr("ui.incident_category_293fddf9")}<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} maxLength={100} />
              </label>
              <label>
                {tr("ui.title_df5a0009")}<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={255} />
              </label>
              <label>
                {tr("ui.observed_problem_bc874db6")}<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={5} maxLength={4000} />
              </label>
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setShowReport(false)}>{tr("ui.cancel_74fcd352")}</button>
                <button className="btn btn-primary" type="submit" disabled={busyId === "create"}>{busyId === "create" ? tr("ui.submitting_abf01d43") : tr("ui.submit_report_2c993a8a")}</button>
              </div>
            </form>
      </BaseModal2026>

      <BaseModal2026 isOpen={Boolean(resolving)} onClose={() => setResolving(null)} title={tr("ui.confirm_incident_resolution_def9ce3f")} icon={AlertTriangle} dismissible={busyId !== resolving?.id}>
          {resolving && (
            <form className="booking-operation-form" onSubmit={submitResolution} noValidate>
              <p>{resolving.title}</p>
              <label>
                {tr("ui.actual_resolution_outcome_11cccb6a")}<textarea value={resolution} onChange={(event) => setResolution(event.target.value)} rows={5} maxLength={4000} />
              </label>
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setResolving(null)}>{tr("ui.cancel_74fcd352")}</button>
                <button className="btn btn-primary" type="submit" disabled={busyId === resolving.id}>{busyId === resolving.id ? tr("ui.saving_2b5c2a46") : tr("ui.save_resolution_f867848a")}</button>
              </div>
            </form>
          )}
      </BaseModal2026>
    </section>
  );
};

const Summary = ({ label, value }: { label: string; value: number }) => (
  <div className="card operational-summary-card">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);
