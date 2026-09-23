import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, ShieldCheck, UserCheck, UserX } from "lucide-react";

import { apiRequest } from "../api.js";
import { BaseModal2026 } from "./BaseModal2026.js";

const ROLES = ["ADMIN", "LAB_STAFF", "LECTURER", "STUDENT"] as const;
const roleLabels: Record<(typeof ROLES)[number], string> = {
  ADMIN: "Quản trị viên",
  LAB_STAFF: "Cán bộ phòng lab",
  LECTURER: "Giảng viên",
  STUDENT: "Sinh viên"
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
  const [users, setUsers] = useState<User[]>([]);
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

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [nextUsers, nextLabs] = await Promise.all([
        apiRequest("/users"),
        apiRequest("/users/laboratories")
      ]);
      setUsers(nextUsers);
      setLaboratories(nextLabs);
      const staff = nextUsers.filter((user: User) => user.role === "LAB_STAFF");
      const staffAssignments = await Promise.all(
        staff.map(async (user: User) => [user.id, await apiRequest(`/users/${user.id}/lab-assignments`)] as const)
      );
      setAssignments(Object.fromEntries(staffAssignments));
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể tải dữ liệu người dùng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateRole(user: User, role: Role) {
    setError("");
    try {
      await apiRequest(`/users/${user.id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      await load();
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể cập nhật vai trò.");
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
      setError(requestError?.message || "Không thể cập nhật trạng thái tài khoản.");
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
      setError(requestError?.message || "Không thể gán phòng thí nghiệm.");
    }
  }

  async function removeAssignment(userId: string, laboratoryId: string) {
    setError("");
    try {
      await apiRequest(`/users/${userId}/lab-assignments/${laboratoryId}`, { method: "DELETE" });
      await load();
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể gỡ phân công.");
    }
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!createForm.fullName.trim() || !createForm.email.trim() || createForm.password.length < 12) {
      setError("Họ tên, email và mật khẩu tối thiểu 12 ký tự là bắt buộc.");
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
      setError(requestError?.message || "Không thể tạo người dùng.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="view-section">
      <div className="section-heading">
        <div>
          <h2>Quản trị người dùng</h2>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" type="button" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Tạo người dùng
          </button>
          <button className="icon-button" type="button" onClick={load} title="Tải lại" aria-label="Tải lại danh sách người dùng" disabled={loading}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && <div className="alert danger" role="alert">{error}</div>}
      {loading && <p className="empty-state">Đang tải dữ liệu thật...</p>}
      <BaseModal2026 isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tạo người dùng" dismissible={!creating}>
            <form className="booking-operation-form" onSubmit={createUser} noValidate>
              <label>
                Họ và tên
                <input value={createForm.fullName} onChange={(event) => setCreateForm({ ...createForm, fullName: event.target.value })} maxLength={255} />
              </label>
              <label>
                Email
                <input type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} />
              </label>
              <label>
                Mật khẩu ban đầu
                <input type="password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} minLength={12} maxLength={128} autoComplete="new-password" />
              </label>
              <label>
                Vai trò
                <select value={createForm.role} onChange={(event) => setCreateForm({ ...createForm, role: event.target.value as Role })}>
                  {ROLES.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                </select>
              </label>
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setShowCreate(false)}>Hủy</button>
                <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? "Đang tạo..." : "Tạo người dùng"}</button>
              </div>
            </form>
      </BaseModal2026>

      {!loading && (
        <div className="table-wrap user-management-table">
          <table>
            <thead><tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th>Phân công phòng lab</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.fullName}</strong><br /><small>{user.email}</small></td>
                  <td>
                    <select value={user.role} onChange={(event) => updateRole(user, event.target.value as Role)}>
                      {ROLES.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-secondary" type="button" onClick={() => updateActive(user)}>
                      {user.isActive ? <UserCheck size={14} /> : <UserX size={14} />}
                      {user.isActive ? "Đang hoạt động" : "Đã vô hiệu"}
                    </button>
                  </td>
                  <td>
                    {user.role !== "LAB_STAFF" ? <span>Không áp dụng</span> : (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          {(assignments[user.id] || []).map((assignment) => (
                            <button
                              key={assignment.laboratoryId}
                              type="button"
                              className="btn btn-secondary"
                              title="Gỡ phân công"
                              onClick={() => removeAssignment(user.id, assignment.laboratoryId)}
                            >
                              <ShieldCheck size={13} /> {assignment.laboratory.code}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={selectedLabs[user.id] || ""}
                            onChange={(event) => setSelectedLabs((current) => ({ ...current, [user.id]: event.target.value }))}
                          >
                            <option value="">Chọn phòng lab</option>
                            {laboratories.map((lab) => <option key={lab.id} value={lab.id}>{lab.code} - {lab.name}</option>)}
                          </select>
                          <button className="btn btn-primary" type="button" onClick={() => addAssignment(user)}>Gán</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
