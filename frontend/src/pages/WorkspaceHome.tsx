import { HelpDisclosure } from "../components/base/HelpDisclosure";
import React, { useState } from "react";
import { RefreshCw, ShieldAlert, ArrowRight } from "lucide-react";
import { translate as t } from "../i18n.js";
import { Notices } from "../components/features/workspace/HomeComponents";
import type { RoleHomeProps } from "../components/features/workspace/homeTypes";
import { WorkspaceTrends } from "../components/features/workspace/WorkspaceTrends";
import labPhoto from "../assets/lab-overview-photo.jpg";
import "../styles/lab-workspace.css";
import "../styles/workspace-home.css";
import "../styles/home-structure.css";
import "../styles/overview-workflow.css";

type Props = RoleHomeProps & { locale?: string; loading: boolean; error: string; onRetry: () => void; analytics?: React.ReactNode };

const roleViews = {
  ADMIN: React.lazy(() => import("../components/features/workspace/AdminHome").then(module => ({ default: module.AdminHome }))),
  LAB_STAFF: React.lazy(() => import("../components/features/workspace/StaffHome").then(module => ({ default: module.StaffHome }))),
  CUSTOMER: React.lazy(() => import("../components/features/workspace/CustomerHome").then(module => ({ default: module.CustomerHome })))
};

export function WorkspaceHome(props: Props) {
  const { user, loading, error, onRetry, analytics } = props;
  const [revision, setRevision] = useState(0);
  const View = roleViews[user.role];
  if (!View) return null;
  // Build notice strip from authoritative summaries only
  const notices: { label: string; count: number; urgent?: boolean; tab: string; params?: Record<string,string> }[] = [];
  if (props.bookingSummary) {
    const bs = props.bookingSummary;
    if (bs.overdue) notices.push({ label: "ui.home.notices.overdue", count: bs.overdue, urgent: true, tab: "bookings", params: {filter:"CHECKED_OUT"} });
    if (bs.byStatus.PENDING_APPROVAL) notices.push({ label: "ui.home.notices.pendingApproval", count: bs.byStatus.PENDING_APPROVAL, tab: "bookings", params: {filter:"PENDING_APPROVAL"} });
  }
  if (props.incidentSummary) {
    if (props.incidentSummary.open) notices.push({ label: "ui.home.notices.openIncidents", count: props.incidentSummary.open, urgent: true, tab: "incidents", params: {filter:"OPEN"} });
  }
  return <section className={`lab-workspace lab-home workspace-home role-${user.role.toLowerCase()}`} aria-labelledby="workspace-title" data-role-home={user.role}>
    <div className="home-masthead"><img src={labPhoto} alt="" aria-hidden="true" className="home-masthead-bg" loading="lazy" /><div className="home-masthead-content"><header className="home-welcome"><div><h1 id="workspace-title">{t(`ui.home.${user.role === "LAB_STAFF" ? "staff" : user.role.toLowerCase()}.title`)}</h1><p>{t("ui.hello_23e5ef1f", { value0: user.fullName || user.email })}</p></div><button className="home-refresh" aria-label={t("ui.home.refresh")} onClick={() => { onRetry(); setRevision(value => value + 1); }} disabled={loading}><RefreshCw size={16} aria-hidden="true" /><span>{t("ui.home.refresh")}</span></button></header>{!loading && !error && notices.length ? <div className="home-notice-strip" role="region" aria-label={t("ui.home.notices")}>{notices.map(n => <button className={`home-notice-chip${n.urgent ? " is-urgent" : ""}`} key={n.label} onClick={() => props.onNavigate(n.tab,n.params)}><strong>{n.count}</strong><span>{t(n.label)}</span><ArrowRight size={16} aria-hidden="true" /></button>)}</div> : null}</div></div>
    {loading ? <div className="home-loading" role="status"><span>{t("ui.updating_lab_bookings_and_work_2fb264e9")}</span><div className="home-skeleton-grid" aria-hidden="true">{[0, 1, 2].map(id => <div key={id} />)}</div></div> : error ? <div className="home-error" role="alert"><ShieldAlert size={22} aria-hidden="true" /><div><strong>{t("ui.some_data_could_not_be_b3c64fc0")}</strong><p>{t("ui.retry_to_view_current_figures_7a0ac5df")}</p></div><button className="secondary-button" onClick={onRetry}>{t("ui.retry_c58d068c")}</button></div> : <><React.Suspense fallback={<p className="home-section-status" role="status">{t("ui.loading_workspace_959fb711")}</p>}><View {...props} /></React.Suspense>{["ADMIN","LAB_STAFF"].includes(user.role) && <WorkspaceTrends identity={user.id+":"+user.role} refreshKey={revision} />}{analytics && <div className="home-analytics-node" aria-label={t("ui.home.analytics")}>{analytics}</div>}<HelpDisclosure>{t("ui.home.dataScope")}</HelpDisclosure><Notices rows={props.notifications} onNavigate={props.onNavigate} /></>}
  </section>;
}
