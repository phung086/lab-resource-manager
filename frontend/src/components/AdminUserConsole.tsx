/* Admin user console — admin shell that composes the directory work.
   We do not fork AccessUserManagement: it already enforces RBAC (admin can
   manage everyone, staff sees CUSTOMER only) and exposes create/edit/active
   transitions through /users, /users/:id, /users/:id/active, /users/:id/role.
   The console composes around the core with:
     - a single header (eyebrow + title + scope line + provenance note)
     - a directory cluster whose role-count buttons navigate the same tab
       with the role filter set as a URL param (AccessUserManagement reads
       `role` from readRouteParams()), with a Clear filter escape hatch
     - the underlying AccessUserManagement component (form + table + edit
       modal + loyalty policy for admin) renders the actual list/detail/form
   Backend contract is `User.isActive` (boolean) — never "locked". */

import React, { useMemo } from "react";
import { ChevronRight, FilterX, ShieldCheck, Users } from "lucide-react";
import { translate as t } from "../i18n.js";
import { readRouteParams, workspacePathForTab } from "../workspaceRoutes.js";
import { AccessUserManagement } from "./AccessUserManagement.tsx";

interface AdminUserConsoleProps {
  actorRole: "ADMIN" | "LAB_STAFF";
  actorId: string;
  users: { id: string; role: string; isActive: boolean }[];
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}

interface RoleCount { role: "ADMIN" | "LAB_STAFF" | "CUSTOMER"; count: number; label: string }

function roleLabel(role: string): string {
  if (role === "ADMIN") return t("ui.admin.console.roleAdmin");
  if (role === "LAB_STAFF") return t("ui.admin.console.roleStaff");
  return t("ui.admin.console.roleCustomer");
}

function summarize(users: AdminUserConsoleProps["users"]): {
  total: number;
  active: number;
  inactive: number;
  byRole: RoleCount[];
} {
  const total = users.length;
  const active = users.filter((u) => u.isActive).length;
  const inactive = total - active;
  const roles: Array<"ADMIN" | "LAB_STAFF" | "CUSTOMER"> = ["ADMIN", "LAB_STAFF", "CUSTOMER"];
  const byRole: RoleCount[] = roles.map((role) => ({
    role,
    count: users.filter((u) => u.role === role).length,
    label: roleLabel(role),
  }));
  return { total, active, inactive, byRole };
}

export const AdminUserConsole: React.FC<AdminUserConsoleProps> = (props) => {
  const isAdmin = props.actorRole === "ADMIN";
  const summary = useMemo(() => summarize(props.users), [props.users]);
  const activeRole = (readRouteParams().get("role") || "").toUpperCase();
  const roleFilterActive = activeRole === "ADMIN" || activeRole === "LAB_STAFF" || activeRole === "CUSTOMER";

  function openRole(role: "ADMIN" | "LAB_STAFF" | "CUSTOMER") {
    props.onNavigate?.("users", { role });
  }

  function clearRoleFilter() {
    props.onNavigate?.("users", {});
  }

  return (
    <div className="admin-console admin-users-console" data-scope="admin">
      <header className="admin-console-head">
        <p className="admin-console-eyebrow">
          {t(isAdmin ? "ui.admin.console.registerEyebrow" : "ui.admin.console.staffEyebrowDir")}
        </p>
        <h2 className="admin-console-title">
          {t(isAdmin ? "ui.admin.console.systemUsers" : "ui.admin.console.staffTitleDir")}
        </h2>
        <p className="admin-console-sub">{t("ui.admin.console.scope")}</p>
      </header>

      {isAdmin ? (
        <section className="admin-console-cluster" aria-labelledby="admin-users-directory">
          <header className="admin-console-cluster-head">
            <p className="admin-console-eyebrow">{t("ui.admin.console.directory")}</p>
            <h3 id="admin-users-directory">{t("ui.admin.console.directoryHint")}</h3>
          </header>
          <dl className="admin-console-stats admin-console-stats-3">
            <div>
              <dt>{t("ui.home.admin.totalAccounts")}</dt>
              <dd>{summary.total}</dd>
            </div>
            <div>
              <dt>{t("ui.home.admin.activeAccounts")}</dt>
              <dd>{summary.active}</dd>
            </div>
            <div>
              <dt>{t("ui.admin.console.inactiveAccounts")}</dt>
              <dd className={summary.inactive > 0 ? "is-urgent" : ""}>{summary.inactive}</dd>
            </div>
          </dl>
          {summary.total === 0 ? (
            <div className="admin-console-empty">
              <span className="admin-console-empty-icon"><Users size={26} aria-hidden="true" /></span>
              <h4>{t("ui.admin.console.noAccounts")}</h4>
              <p>{t("ui.admin.console.noAccountsHint")}</p>
            </div>
          ) : (
            <>
              <ul className="admin-console-role-list">
                {summary.byRole.map((row) => (
                  <li key={row.role}>
                    <button
                      type="button"
                      aria-pressed={activeRole === row.role}
                      onClick={() => openRole(row.role)}
                    >
                      <span className="admin-console-tile-icon"><Users size={20} aria-hidden="true" /></span>
                      <span className="admin-console-tile-copy">
                        <strong>{row.count}</strong>
                        <span>{row.label}</span>
                      </span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </li>
                ))}
                {summary.inactive === 0 ? (
                  <li className="admin-console-role-note">
                    <span className="admin-console-tile-icon"><ShieldCheck size={20} aria-hidden="true" /></span>
                    <span className="admin-console-tile-copy">
                      <strong>{t("ui.admin.console.allActive")}</strong>
                      <small>{t("ui.admin.console.allActiveHint")}</small>
                    </span>
                  </li>
                ) : (
                  <li className="admin-console-role-note">
                    <span className="admin-console-tile-icon"><FilterX size={20} aria-hidden="true" /></span>
                    <span className="admin-console-tile-copy">
                      <strong>{t("ui.admin.console.inactiveHint")}</strong>
                      <small>{t("ui.admin.console.inactiveAccounts")}</small>
                    </span>
                  </li>
                )}
              </ul>
              <div className="admin-console-filter-bar">
                <span className="admin-console-filter-bar-label">
                  {roleFilterActive
                    ? t("ui.admin.console.filterListHint")
                    : t("ui.admin.console.filterListHint")}
                </span>
                {roleFilterActive && (
                  <button type="button" className="admin-console-filter-clear" onClick={clearRoleFilter}>
                    <FilterX size={16} aria-hidden="true" />
                    <span>{t("ui.admin.console.filterList")} · {roleLabel(activeRole)}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      ) : null}

      <AccessUserManagement actorRole={props.actorRole} actorId={props.actorId} />

      <p className="admin-console-route-key" aria-hidden="true" data-tab="users">
        {workspacePathForTab("users", roleFilterActive ? { role: activeRole } : {})}
      </p>
    </div>
  );
};
