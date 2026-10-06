import React, { useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { translate as t } from "../i18n.js";
import { apiRequest } from "../api.js";
import { Notices } from "../components/features/workspace/HomeComponents";
import type { RoleHomeProps, TeachingGroup } from "../components/features/workspace/homeTypes";
import "../styles/lab-workspace.css";
import "../styles/workspace-home.css";

type Props = Omit<RoleHomeProps, "groups" | "groupsLoading" | "groupsError" | "onRetryGroups"> & { locale?: string; loading: boolean; error: string; onRetry: () => void };
const roleViews = {
  ADMIN: React.lazy(() => import("../components/features/workspace/AdminHome").then(module => ({ default: module.AdminHome }))),
  LAB_STAFF: React.lazy(() => import("../components/features/workspace/StaffHome").then(module => ({ default: module.StaffHome }))),
  LECTURER: React.lazy(() => import("../components/features/workspace/LecturerHome").then(module => ({ default: module.LecturerHome }))),
  STUDENT: React.lazy(() => import("../components/features/workspace/StudentHome").then(module => ({ default: module.StudentHome })))
};

export function WorkspaceHome(props: Props) {
  const { user, loading, error, onRetry } = props;
  const [groups, setGroups] = useState<TeachingGroup[]>([]), [groupsLoading, setGroupsLoading] = useState(true), [groupsError, setGroupsError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (user.role === "LAB_STAFF") { setGroupsLoading(false); return; }
    const controller = new AbortController();
    setGroupsLoading(true); setGroupsError("");
    apiRequest("/lab-workspace/groups", { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setGroups(data); }).catch(() => { if (!controller.signal.aborted) setGroupsError("ui.home.groups.error"); }).finally(() => { if (!controller.signal.aborted) setGroupsLoading(false); });
    return () => controller.abort();
  }, [user.id, user.role, revision]);
  const View = roleViews[user.role];
  if (!View) return null;
  return <section className={`lab-workspace lab-home workspace-home role-${user.role.toLowerCase()}`} aria-labelledby="workspace-title" data-role-home={user.role}>
    <header className="home-welcome"><div><h1 id="workspace-title">{t("ui.hello_23e5ef1f", { value0: user.fullName })}</h1></div><button className="home-refresh" aria-label={t("ui.home.refresh")} onClick={() => { onRetry(); setRevision(value => value + 1); }} disabled={loading}><RefreshCw size={16} aria-hidden="true" /><span>{t("ui.home.refresh")}</span></button></header>
    {loading ? <div className="home-loading" role="status"><span>{t("ui.updating_lab_bookings_and_work_2fb264e9")}</span><div className="home-skeleton-grid" aria-hidden="true">{[0, 1, 2].map(id => <div key={id} />)}</div></div> : error ? <div className="home-error" role="alert"><ShieldAlert size={22} aria-hidden="true" /><div><strong>{t("ui.some_data_could_not_be_b3c64fc0")}</strong><p>{t("ui.retry_to_view_current_figures_7a0ac5df")}</p></div><button className="secondary-button" onClick={onRetry}>{t("ui.retry_c58d068c")}</button></div> : <><React.Suspense fallback={<p className="home-section-status" role="status">{t("ui.loading_workspace_959fb711")}</p>}><View {...props} groups={groups} groupsLoading={groupsLoading} groupsError={groupsError} onRetryGroups={() => setRevision(value => value + 1)} /></React.Suspense><Notices rows={props.notifications} onNavigate={props.onNavigate} /><p className="home-time-note">{t("ui.times_shown_in_vietnam_time_9f55afd9")}</p></>}
  </section>;
}
