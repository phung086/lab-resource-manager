import React, { useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Search,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Sparkles
} from "lucide-react";

interface LabUser {
  id: string;
  fullName: string;
  email: string;
  department: string;
  role: "admin" | "lab_staff" | "lecturer" | "student";
  isActive: boolean;
  quotaUsed: number;
  quotaTotal: number;
  lastLogin: string;
}

const INITIAL_USERS: LabUser[] = [
  {
    id: "usr-admin-01",
    fullName: "GS.TS Nguyễn Văn A",
    email: "admin@ailab.edu.vn",
    department: "Ban Giám Đốc PTN Trí Tuệ Nhân Tạo",
    role: "admin",
    isActive: true,
    quotaUsed: 42.5,
    quotaTotal: 100.0,
    lastLogin: "09/09/2026 13:02"
  },
  {
    id: "usr-staff-01",
    fullName: "KSC. Đỗ Mạnh Hùng",
    email: "manhhung.staff@ailab.edu.vn",
    department: "Đội Trực Vận Hành Phần Cứng",
    role: "lab_staff",
    isActive: true,
    quotaUsed: 18.0,
    quotaTotal: 80.0,
    lastLogin: "09/09/2026 12:45"
  },
  {
    id: "usr-lec-01",
    fullName: "PGS.TS Vũ Đình Huy",
    email: "dinhhuy@ailab.edu.vn",
    department: "Bộ Môn Robotics & Tự Hành",
    role: "lecturer",
    isActive: true,
    quotaUsed: 65.0,
    quotaTotal: 100.0,
    lastLogin: "08/09/2026 17:30"
  },
  {
    id: "usr-stu-01",
    fullName: "NCS. Trần Tiến Dũng",
    email: "tiendung.phd@ailab.edu.vn",
    department: "Nghiên Cứu Sinh Tiến Sĩ K32",
    role: "student",
    isActive: true,
    quotaUsed: 52.0,
    quotaTotal: 60.0,
    lastLogin: "09/09/2026 11:15"
  },
  {
    id: "usr-stu-02",
    fullName: "SV. Nguyễn Mai Phương",
    email: "maiphuong.k65@ailab.edu.vn",
    department: "Sinh Viên ĐATN Khoa CNTT",
    role: "student",
    isActive: true,
    quotaUsed: 29.0,
    quotaTotal: 40.0,
    lastLogin: "09/09/2026 09:10"
  },
  {
    id: "usr-stu-03",
    fullName: "SV. Lê Quốc Tuấn",
    email: "quoctuan.k66@ailab.edu.vn",
    department: "Sinh Viên Nghiên Cứu",
    role: "student",
    isActive: false, // Locked account demo
    quotaUsed: 5.0,
    quotaTotal: 20.0,
    lastLogin: "01/09/2026 08:00"
  }
];

export const UserRoleManagement: React.FC = () => {
  const [users, setUsers] = useState<LabUser[]>(INITIAL_USERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [toastMessage, setToastMessage] = useState("");

  // Form state
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDepartment, setNewDepartment] = useState("Khoa CNTT - PTN AI");
  const [newRole, setNewRole] = useState<"admin" | "lab_staff" | "lecturer" | "student">("student");
  const [newPassword, setNewPassword] = useState("LabAI@2026");

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim()) return;

    const newUser: LabUser = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      fullName: newFullName.trim(),
      email: newEmail.trim(),
      department: newDepartment,
      role: newRole,
      isActive: true,
      quotaUsed: 0,
      quotaTotal: newRole === "admin" ? 100 : newRole === "lecturer" ? 80 : 40,
      lastLogin: "Chưa đăng nhập"
    };

    setUsers([newUser, ...users]);
    setNewFullName("");
    setNewEmail("");
    setToastMessage(`✅ Đã tạo tài khoản thành công cho: ${newUser.fullName} (${newUser.email})`);
    setTimeout(() => setToastMessage(""), 4000);
  }

  function handleToggleLock(userId: string) {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextActive = !u.isActive;
          setToastMessage(nextActive ? `🔓 Đã mở khóa tài khoản ${u.fullName}` : `🔒 Đã khóa quyền truy cập của ${u.fullName}`);
          setTimeout(() => setToastMessage(""), 3500);
          return { ...u, isActive: nextActive };
        }
        return u;
      })
    );
  }

  const roleBadgeConfig = {
    admin: { label: "Quản Trị Viên (Admin)", class: "bg-violet-950/80 text-violet-300 border-violet-500/40" },
    lab_staff: { label: "Cán Bộ Lab (Staff)", class: "bg-cyan-950/80 text-cyan-300 border-cyan-500/40" },
    lecturer: { label: "Giảng Viên (Lecturer)", class: "bg-blue-950/80 text-blue-300 border-blue-500/40" },
    student: { label: "Sinh Viên / NCS (Student)", class: "bg-slate-800 text-slate-300 border-slate-600" }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold text-violet-400 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-500/30">
              ROLE-BASED ACCESS CONTROL (RBAC) 2026
            </span>
            <span className="led-pulse led-pulse-safe" />
            <span className="font-mono text-[11px] text-slate-400">POLICY MATRIX: 4 TIERS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight">
            Quản Lý Người Dùng & Phân Quyền RBAC
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cấp quyền truy cập cụm máy chủ GPU, hạn ngạch tính toán và bảo vệ an ninh hạ tầng thí nghiệm
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <span>Tổng số thành viên:</span>
          <strong className="text-white text-sm">{users.length} tài khoản</strong>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Main Two-Column Layout */}
      <div className="user-management-grid">
        {/* CỘT TRÁI (360px): Form Thêm Người Dùng */}
        <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <UserPlus size={16} className="text-cyan-400" />
            <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider">
              THÊM NGƯỜI DÙNG MỚI (ADD USER)
            </span>
          </div>

          <form onSubmit={handleCreateUser} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] text-slate-400">Họ và tên đầy đủ *</label>
              <input
                type="text"
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="VD: TS. Nguyễn Hữu Dũng"
                className="bg-black/60 border border-white/15 text-xs text-white rounded px-3 py-2 font-sans"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] text-slate-400">Email trường / đơn vị *</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="huudung@ailab.edu.vn"
                className="bg-black/60 border border-white/15 text-xs text-white rounded px-3 py-2 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] text-slate-400">Phòng ban / Bộ môn / Lớp</label>
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                className="bg-black/60 border border-white/15 text-xs text-white rounded px-3 py-2 font-sans"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] text-slate-400">Vai trò phân quyền RBAC *</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="bg-black/60 border border-white/15 text-xs text-white rounded px-3 py-2 font-mono"
              >
                <option value="student">Sinh viên / NCS (Student - 40h)</option>
                <option value="lecturer">Giảng viên (Lecturer - 80h)</option>
                <option value="lab_staff">Cán bộ Lab (Staff - 80h)</option>
                <option value="admin">Quản trị viên (Admin - 100h)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] text-slate-400">Mật khẩu khởi tạo ban đầu</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-black/60 border border-white/15 text-xs text-white rounded px-3 py-2 font-mono text-cyan-300"
              />
              <span className="text-[10px] text-slate-500 font-mono">Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên</span>
            </div>

            <button
              type="submit"
              className="mt-2 font-mono text-xs font-bold text-obsidian bg-cyan-400 hover:bg-cyan-300 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(0,229,255,0.4)]"
            >
              <UserPlus size={14} />
              <span>TẠO TÀI KHOẢN MỚI</span>
            </button>
          </form>
        </div>

        {/* CỘT PHẢI: Bảng Danh Sách Phân Quyền */}
        <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-violet-400" />
              <span className="font-mono text-xs text-violet-300 font-bold uppercase tracking-wider">
                DANH SÁCH TÀI KHOẢN & MA TRẬN PHÂN QUYỀN
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên / email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-black/60 border border-white/15 text-white font-mono text-xs rounded-lg pl-7 pr-3 py-1.5 w-44"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-black/60 border border-white/15 text-white font-mono text-xs rounded-lg px-2.5 py-1.5"
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="admin">Quản trị viên</option>
                <option value="lab_staff">Cán bộ Lab</option>
                <option value="lecturer">Giảng viên</option>
                <option value="student">Sinh viên / NCS</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 font-mono text-[11px] text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Họ Tên & Email</th>
                  <th className="py-2.5 px-3">Vai Trò RBAC</th>
                  <th className="py-2.5 px-3">Hạn Ngạch GPU</th>
                  <th className="py-2.5 px-3">Đăng Nhập Cuối</th>
                  <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => {
                  const roleCfg = roleBadgeConfig[user.role] || roleBadgeConfig.student;

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <strong className="text-white block">{user.fullName}</strong>
                        <span className="font-mono text-[11px] text-slate-400">{user.email}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-mono text-[10.5px] font-bold px-2 py-0.5 rounded border inline-block ${roleCfg.class}`}>
                          {roleCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs">
                        <span className="text-white">{user.quotaUsed}</span> / <span className="text-slate-400">{user.quotaTotal}h</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{user.lastLogin}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono text-[10.5px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            user.isActive
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-950/80 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {user.isActive ? "HOẠT ĐỘNG" : "ĐÃ KHÓA"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleLock(user.id)}
                          className={`font-mono text-[11px] px-2.5 py-1 rounded border cursor-pointer transition-all inline-flex items-center gap-1 ${
                            user.isActive
                              ? "text-rose-300 border-rose-500/30 bg-rose-950/40 hover:bg-rose-900/60"
                              : "text-emerald-300 border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/60"
                          }`}
                          title={user.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                        >
                          {user.isActive ? <Lock size={12} /> : <Unlock size={12} />}
                          <span>{user.isActive ? "Khóa" : "Mở"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
