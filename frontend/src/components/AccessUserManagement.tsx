import React, { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, UserCheck, UserX } from "lucide-react";

import { apiRequest } from "../api.js";

const ROLES = ["ADMIN", "LAB_STAFF", "LECTURER", "STUDENT"] as const;

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

  return (
    <section className="view-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">RBAC & LAB SCOPE</span>
          <h2>Quản trị người dùng</h2>
        </div>
        <button className="icon-button" type="button" onClick={load} title="Tải lại" disabled={loading}>
          <RefreshCw size={16} />
        </button>
      </div>

      {error && <div className="alert danger">{error}</div>}
      {loading && <p className="empty-state">Đang tải dữ liệu thật...</p>}
      {!loading && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th>Phân công phòng lab</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.fullName}</strong><br /><small>{user.email}</small></td>
                  <td>
                    <select value={user.role} onChange={(event) => updateRole(user, event.target.value as Role)}>
                      {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
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
