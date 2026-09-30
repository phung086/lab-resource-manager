import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, ShieldCheck, UserCheck, UserX } from "lucide-react";

import { apiRequest } from "../api.js";
import { BaseModal2026 } from "./BaseModal2026.js";

const ROLES = ["ADMIN", "LAB_STAFF", "LECTURER", "STUDENT"] as const;
const roleLabels: Record<(typeof ROLES)[number], string> = {
  ADMIN: "ui.administrator_d00831ec",
  LAB_STAFF: "ui.lab_staff_1b410267",
  LECTURER: "ui.lecturer_948c8824",
  STUDENT: "ui.student_1b487b2d"
};

type Role = typeof ROLES[number];
type User = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  department?: string | null;
  _count?: { bookings: number };
};
type Laboratory = { id: string; code: string; name: string; isActive: boolean };
type Assignment = { laboratoryId: string; laboratory: Laboratory };

export function AccessUserManagement() {
  const { tr } = useLocale();
  const loadAbort = useRef<AbortController | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(() => {
    const value = new URLSearchParams(window.location.hash.split("?")[1] || "").get("role");
    return ROLES.includes(value as Role) ? value : "";
  });
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({});
  const [selectedLabs, setSelectedLabs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "STUDENT" as Role
  });

  const load = useCallback(async () => {
    loadAbort.current?.abort();
    const controller = new AbortController();
    loadAbort.current = controller;
    const read = (path: string) => apiRequest(path, { signal: controller.signal });
    setLoading(true);
    setError("");
    try {
      const [nextUsers, nextLabs] = await Promise.all([
        read("/users"),
        read("/users/laboratories")
      ]);
      if (controller.signal.aborted) return;
      setUsers(nextUsers);
      setLaboratories(nextLabs);
      const staff = nextUsers.filter((user: User) => user.role === "LAB_STAFF");
      const staffAssignments: [string, Assignment[]][] = [];
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(4, staff.length) }, async () => {
        while (next < staff.length && !controller.signal.aborted) {
          const member = staff[next++];
          staffAssignments.push([member.id, await read(`/users/${member.id}/lab-assignments`)]);
        }
      }));
      if (!controller.signal.aborted) setAssignments(Object.fromEntries(staffAssignments));
    } catch (requestError: any) {
      if (!controller.signal.aborted) setError(requestError?.message || "ui.could_not_load_users_76f5be64");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); return () => loadAbort.current?.abort(); }, [load]);

  async function updateRole(user: User, role: Role) {
    setError("");
    try {
      await apiRequest(`/users/${user.id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      await load();
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_update_role_4e55c254");
    }
  }

  async function updateActive(user: User) {
    setError("");
    try {
      await apiRequest(`/users/${user.id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.isActive })
      });
      await load();
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_update_account_status_0612c128");
    }
  }

  async function addAssignment(user: User) {
    const laboratoryId = selectedLabs[user.id];
    if (!laboratoryId) return;
    setError("");
    try {
      await apiRequest(`/users/${user.id}/lab-assignments`, {
        method: "POST",
        body: JSON.stringify({ laboratoryId })
      });
      await load();
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_assign_laboratory_42b8a3ff");
    }
  }

  async function removeAssignment(userId: string, laboratoryId: string) {
    setError("");
    try {
      await apiRequest(`/users/${userId}/lab-assignments/${laboratoryId}`, { method: "DELETE" });
      await load();
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_remove_assignment_c0bec68f");
    }
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!createForm.fullName.trim() || !createForm.email.trim() || createForm.password.length < 12) {
      setError("ui.full_name_email_and_a_0c7bafbf");
      return;
    }
    setCreating(true);
    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({
          fullName: createForm.fullName.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          role: createForm.role
        })
      });
      setCreateForm({ fullName: "", email: "", password: "", role: "STUDENT" });
      setShowCreate(false);
      await load();
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_create_user_21164c3d");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="view-section">
      <div className="section-heading">
        <div>
          <h2>{tr("ui.user_administration_2a750b85")}</h2>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" type="button" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> {tr("ui.create_user_70f60575")}</button>
          <button className="icon-button" type="button" onClick={load} title={tr("ui.refresh_46140fa8")} aria-label={tr("ui.refresh_user_list_7abc765c")} disabled={loading}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && <div className="alert danger" role="alert">{translate(error)}</div>}
      {loading && <p className="empty-state">{tr("ui.loading_data_84c68bd5")}</p>}
      <div className="user-directory-filters">
        <label><span id="directory-search-label">{tr("ui.home.directory.search")}</span><input aria-labelledby="directory-search-label" type="search" value={search} onChange={event => setSearch(event.target.value)} maxLength={120} placeholder={tr("ui.home.directory.placeholder")} /></label>
        <label><span id="directory-role-label">{tr("ui.home.directory.role")}</span><select aria-labelledby="directory-role-label" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="">{tr("ui.home.directory.all")}</option>{ROLES.map(role => <option key={role} value={role}>{tr(roleLabels[role])}</option>)}</select></label>
      </div>
      <BaseModal2026 isOpen={showCreate} onClose={() => setShowCreate(false)} title={tr("ui.create_user_70f60575")} dismissible={!creating}>
            <form className="booking-operation-form" onSubmit={createUser} noValidate>
              <label>
                {tr("ui.full_name_03de764f")}<input value={createForm.fullName} onChange={(event) => setCreateForm({ ...createForm, fullName: event.target.value })} maxLength={255} />
              </label>
              <label>
                 {translate("ui.email_969ccbd3")} <input type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} />
              </label>
              <label>
                {tr("ui.initial_password_59759f04")}<input type="password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} minLength={12} maxLength={128} autoComplete="new-password" />
              </label>
              <label>
                {tr("ui.role_35195dea")}<select value={createForm.role} onChange={(event) => setCreateForm({ ...createForm, role: event.target.value as Role })}>
                  {ROLES.map((role) => <option key={role} value={role}>{tr(roleLabels[role])}</option>)}
                </select>
              </label>
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setShowCreate(false)}>{tr("ui.cancel_74fcd352")}</button>
                <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? tr("ui.creating_45c27eb9") : tr("ui.create_user_70f60575")}</button>
              </div>
            </form>
      </BaseModal2026>

      {!loading && (
        <div className="table-wrap user-management-table">
          <table>
            <caption className="sr-only">{tr("ui.users_roles_and_laboratory_assignments_0f27b670")}</caption>
            <thead><tr><th>{tr("ui.users_9e9519eb")}</th><th>{tr("ui.role_35195dea")}</th><th>{tr("ui.status_cb31de81")}</th><th>{tr("ui.laboratory_assignments_79925c7e")}</th></tr></thead>
            <tbody>
              {users.filter(user => (!roleFilter || user.role === roleFilter) && `${user.fullName} ${user.email}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.fullName}</strong><br /><small>{user.email}</small></td>
                  <td>
                    <select aria-label={translate("ui.role_for_f776e3da", { value0: user.fullName, value1: user.email })} value={user.role} onChange={(event) => updateRole(user, event.target.value as Role)}>
                      {ROLES.map((role) => <option key={role} value={role}>{tr(roleLabels[role])}</option>)}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-secondary" type="button" aria-label={`${user.isActive ? tr("ui.active_deactivate_82833f2d") : tr("ui.inactive_activate_18425b7c")} ${user.fullName} (${user.email})`} onClick={() => updateActive(user)}>
                      {user.isActive ? <UserCheck size={14} /> : <UserX size={14} />}
                      {user.isActive ? tr("ui.active_767d67bb") : tr("ui.inactive_50157a4c")}
                    </button>
                  </td>
                  <td>
                    {user.role !== "LAB_STAFF" ? <span>{tr("ui.not_applicable_ae31a6d7")}</span> : (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          {(assignments[user.id] || []).map((assignment) => (
                            <button
                              key={assignment.laboratoryId}
                              type="button"
                              className="btn btn-secondary"
                              title={tr("ui.remove_assignment_b4f12f61")}
                              aria-label={translate("ui.remove_assignment_for_f268ec8b", { value0: assignment.laboratory.code, value1: user.fullName, value2: user.email })}
                              onClick={() => removeAssignment(user.id, assignment.laboratoryId)}
                            >
                              <ShieldCheck size={13} /> {assignment.laboratory.code}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <select
                            aria-label={translate("ui.laboratory_to_assign_to_17240d1e", { value0: user.fullName, value1: user.email })}
                            value={selectedLabs[user.id] || ""}
                            onChange={(event) => setSelectedLabs((current) => ({ ...current, [user.id]: event.target.value }))}
                          >
                            <option value="">{tr("ui.choose_laboratory_09dc49a7")}</option>
                            {laboratories.map((lab) => <option key={lab.id} value={lab.id}>{lab.code} - {lab.name}</option>)}
                          </select>
                          <button className="btn btn-primary" type="button" aria-label={translate("ui.assign_a_laboratory_to_6d0937d2", { value0: user.fullName, value1: user.email })} onClick={() => addAssignment(user)}>{tr("ui.assign_cf04fe53")}</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.some(user => (!roleFilter || user.role === roleFilter) && `${user.fullName} ${user.email}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) && <p className="empty-state">{tr("ui.home.directory.empty")}</p>}
        </div>
      )}
    </section>
  );
}
