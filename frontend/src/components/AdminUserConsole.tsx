/* AccessUserManagement owns the heading, directory and account actions.
   Optional role statistics stay in a disclosure below the working area. */

import React, { useMemo } from "react";
import { ChevronRight, FilterX, ShieldCheck, Users } from "lucide-react";
import { translate as t } from "../i18n.js";
import { readRouteParams } from "../workspaceRoutes.js";
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
      <AccessUserManagement actorRole={props.actorRole} actorId={props.actorId} />

      {isAdmin ? (
        <details className="admin-console-cluster admin-directory-overview" aria-labelledby="admin-users-directory">
          <summary>{t("ui.admin.console.overview")}<span>{summary.total}</span></summary>
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
                  {t("ui.admin.console.filterListHint")}
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
        </details>
      ) : null}


    </div>
  );
};
