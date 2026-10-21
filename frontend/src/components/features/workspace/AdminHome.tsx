import { PriorityTiles, QuickLink, SectionTitle, EmptyState } from "./HomeComponents";
import React from "react";
import { AlertTriangle, Building2, CalendarClock, ChevronRight, ClipboardList, Cog, Layers, ShieldCheck, UserCog, Users } from "lucide-react";
import { translate as t } from "../../../i18n.js";
import { formatVietnamDateTime } from "../../../utils/timezone";
import type { RoleHomeProps } from "./homeTypes";

type Props = RoleHomeProps;

// Server-authoritative counts only. Anything paginated/derived here is labelled
// as such, never as "toàn hệ thống" totals — see role-experience-plan-20261016.
function useAdminSnapshot(props: Props) {
  const summary = props.bookingSummary;
  const incidents = props.incidentSummary;
  const byStatus = summary?.byStatus ?? {};
  const pendingPayment = summary?.pendingPayment ?? 0;
  const pendingApproval = Math.max(0, (byStatus.PENDING_APPROVAL ?? 0) - pendingPayment);
  const overdue = summary?.overdue ?? 0;
  const openIncidents = incidents?.open ?? 0;
  const totalResources = props.dashboard?.summary.totalResources ?? null;
  const criticalIncidents = props.dashboard?.summary.criticalIncidentCount ?? null;
  const asOf = summary?.asOf ?? null;
  return { pendingApproval, pendingPayment, overdue, openIncidents, totalResources, criticalIncidents, asOf };
}

function buildRoleCounts(props: Props) {
  const roles = ["CUSTOMER", "LAB_STAFF", "ADMIN"] as const;
  return roles.map((role) => {
    const rows = props.users.filter((row) => row.role === role);
    const active = rows.filter((row) => row.isActive).length;
    return { role, total: rows.length, active, locked: rows.length - active };
  });
}

export function AdminHome(props: Props) {
  const snap = useAdminSnapshot(props);
  const roleCounts = buildRoleCounts(props);
  const totalAccounts = roleCounts.reduce((sum, row) => sum + row.total, 0);
  const totalActive = roleCounts.reduce((sum, row) => sum + row.active, 0);
  const totalLocked = totalAccounts - totalActive;

  // Exception tile row — every count is server-authoritative (see scopeSummary).
  const exceptionItems = [
    {
      count: snap.pendingApproval,
      label: "ui.home.admin.pending",
      hint: "ui.home.admin.pendingHint",
      icon: CalendarClock,
      onClick: () => props.onNavigate("bookings", { filter: "PENDING_APPROVAL" })
    },
    {
      count: snap.overdue,
      label: "ui.home.admin.overdue",
      hint: "ui.home.admin.overdueHint",
      icon: AlertTriangle,
      urgent: true,
      onClick: () => props.onNavigate("bookings", { filter: "CHECKED_OUT" })
    },
    {
      count: snap.openIncidents,
      label: "ui.home.admin.incidents",
      hint: "ui.home.admin.incidentsHint",
      icon: ClipboardList,
      urgent: true,
      onClick: () => props.onNavigate("incidents", { filter: "OPEN" })
    }
  ];

  return (
    <div className="home-control-room workspace-container">
      {/* Cluster 1: Exception overview — server-authoritative counts only */}
      <section className="home-control-cluster" aria-labelledby="admin-excep-title">
        <SectionTitle titleKey="ui.home.admin.excepTitle" />
        <PriorityTiles items={exceptionItems} scopeKey="ui.home.admin.scopeSummary" />
      </section>

      {/* Cluster 2: People register — full /users list (server-side filtered for ADMIN) */}
      <section className="home-control-cluster" aria-labelledby="admin-people-title">
        <header className="home-cluster-header">
          <h2 id="admin-people-title">{t("ui.home.admin.peopleTitle")}</h2>
        </header>
        <div className="home-command-grid">
          <div className="home-command-primary">
            <div className="home-command-panel">
              <dl className="home-register-summary home-register-summary-3">
                <div><dt>{t("ui.home.admin.totalAccounts")}</dt><dd>{totalAccounts}</dd></div>
                <div><dt>{t("ui.home.admin.activeAccounts")}</dt><dd>{totalActive}</dd></div>
                <div><dt>{t("ui.home.admin.lockedAccounts")}</dt><dd>{totalLocked}</dd></div>
              </dl>
              <div className="home-people-register">
                {roleCounts.map((row) => (
                  <button key={row.role} onClick={() => props.onNavigate("users", { role: row.role })}>
                    <span>
                      <strong>{row.total}</strong>
                      <small>{t(`ui.home.admin.role${row.role === "LAB_STAFF" ? "Staff" : row.role === "ADMIN" ? "Admin" : "Customer"}`)}</small>
                    </span>
                    <span><small>{t("ui.home.admin.activeAccounts")} {row.active}</small></span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <p className="home-data-scope">{t("ui.home.admin.scopeUsers")}</p>
            </div>
          </div>
          <aside className="home-command-aside">
            <div className="home-command-panel">
              <QuickLink
                icon={UserCog}
                titleKey="ui.home.admin.manageUsers"
                detail="ui.home.admin.manageUsers"
                onClick={() => props.onNavigate("users")}
              />
              <QuickLink
                icon={Layers}
                titleKey="ui.home.admin.staff"
                detail="ui.home.admin.staff"
                onClick={() => props.onNavigate("users", { role: "LAB_STAFF" })}
              />
            </div>
          </aside>
        </div>
      </section>

      {/* Cluster 3: Operational health — dashboard.summary (server-side aggregate) */}
      <section className="home-control-cluster" aria-labelledby="admin-health-title">
        <header className="home-cluster-header">
          <h2 id="admin-health-title">{t("ui.home.admin.healthTitle")}</h2>
        </header>
        <div className="home-command-grid">
          <div className="home-command-primary">
            <div className="home-command-panel">
              <dl className="home-register-summary home-register-summary-2">
                <div>
                  <dt>{t("ui.home.admin.totalResources")}</dt>
                  <dd>{snap.totalResources ?? "—"}</dd>
                </div>
                <div>
                  <dt>{t("ui.home.admin.criticalIncidents")}</dt>
                  <dd className={snap.criticalIncidents && snap.criticalIncidents > 0 ? "is-urgent" : ""}>
                    {snap.criticalIncidents ?? "—"}
                  </dd>
                </div>
              </dl>
              {snap.criticalIncidents === 0 ? (
                <EmptyState
                  titleKey="ui.home.admin.noCritical"
                  detail="ui.home.admin.noCriticalHint"
                  icon={ShieldCheck}
                />
              ) : null}
              <p className="home-data-scope">
                {t("ui.home.admin.scopeHealth")}
                {snap.asOf ? ` · ${t("ui.home.admin.dataAsOf", { value0: formatVietnamDateTime(snap.asOf) })}` : ""}
              </p>
            </div>
          </div>
          <aside className="home-command-aside">
            <div className="home-command-panel">
              <QuickLink
                icon={Building2}
                titleKey="ui.home.admin.dashboard"
                detail="ui.home.admin.dashboard"
                onClick={() => props.onNavigate("dashboard")}
              />
              <QuickLink
                icon={Cog}
                titleKey="ui.telemetry_monitoring_5752a8cc"
                detail="ui.telemetry_monitoring_5752a8cc"
                onClick={() => props.onNavigate("monitoring")}
              />
            </div>
          </aside>
        </div>
      </section>

      {/* Cluster 4: Resource administration — classification, maintenance, incidents */}
      <section className="home-control-cluster" aria-labelledby="admin-resource-title">
        <header className="home-cluster-header">
          <h2 id="admin-resource-title">{t("ui.home.admin.resourceTitle")}</h2>
        </header>
        <div className="home-command-grid">
          <div className="home-command-primary">
            <div className="home-command-panel">
              <div className="home-queue-register">
                <button onClick={() => props.onNavigate("admin_management", { filter: "UNCLASSIFIED" })}>
                  <span>
                    <strong>{t("ui.home.admin.classification")}</strong>
                    <small>{t("ui.home.admin.classificationHint")}</small>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
                <button onClick={() => props.onNavigate("maintenance")}>
                  <span>
                    <strong>{t("ui.home.admin.maintenance")}</strong>
                    <small>{t("ui.home.admin.maintenanceHint")}</small>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
                <button onClick={() => props.onNavigate("incidents", { filter: "OPEN" })}>
                  <span>
                    <strong>{t("ui.home.admin.incidentTitle")}</strong>
                    <small>{t("ui.home.admin.viewIncidents")}</small>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="home-control-links">
                <QuickLink
                  icon={Users}
                  titleKey="ui.home.admin.manageResources"
                  detail="ui.home.admin.viewResources"
                  onClick={() => props.onNavigate("admin_management")}
                />
              </div>
            </div>
          </div>
          <aside className="home-command-aside">
            <div className="home-command-panel">
              <SectionTitle titleKey="ui.home.admin.incidentTitle" />
              {props.incidents.length ? (
                <ul className="home-incident-register">
                  {props.incidents.slice(0, 4).map((row) => (
                    <li key={row.id}>
                      <button onClick={() => props.onNavigate("incidents", { incident: row.id })}>
                        <ClipboardList size={18} aria-hidden="true" />
                        <span>
                          <strong>{row.title}</strong>
                          <small>{row.resource?.name ?? row.status}</small>
                        </span>
                        <ChevronRight size={18} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  titleKey="ui.home.admin.noIncidents"
                  detail="ui.home.admin.noIncidentsHint"
                  icon={ShieldCheck}
                />
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
