import React, { useState } from "react";
import {
  Users,
  Award,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Zap,
  Sliders,
  Sparkles,
  BarChart3,
  Calendar
} from "lucide-react";

interface DepartmentQuota {
  id: string;
  name: string;
  code: string;
  usedHours: number;
  totalHours: number;
  activeMembers: number;
  jainsIndex: number;
}

interface MemberReputation {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarInitials: string;
  reputationScore: number;
  multiplier: number;
  cleanStreakDays: string;
  noShows: number;
  totalBookings: number;
}

const DEPARTMENT_DATA: DepartmentQuota[] = [
  {
    id: "dept_ai_cv",
    name: "Bộ Môn Trí Tuệ Nhân Tạo & Computer Vision",
    code: "DEPT-AI-CV",
    usedHours: 1840,
    totalHours: 2000,
    activeMembers: 28,
    jainsIndex: 0.96
  },
  {
    id: "dept_robotics",
    name: "Bộ Môn Robotics & Hệ Thống Tự Hành",
    code: "DEPT-ROBOTICS",
    usedHours: 650,
    totalHours: 1000,
    activeMembers: 16,
    jainsIndex: 0.94
  },
  {
    id: "dept_thesis",
    name: "Khối Đồ Án Tốt Nghiệp Kỹ Sư AI 2026",
    code: "THESIS-2026",
    usedHours: 1910,
    totalHours: 2000,
    activeMembers: 64,
    jainsIndex: 0.88
  },
  {
    id: "dept_embedded",
    name: "Bộ Môn Hệ Thống Nhúng & Edge AI",
    code: "DEPT-EMBEDDED",
    usedHours: 420,
    totalHours: 1000,
    activeMembers: 19,
    jainsIndex: 0.98
  }
];

const MEMBER_DATA: MemberReputation[] = [
  {
    id: "usr-01",
    name: "GS.TS Nguyễn Văn A",
    email: "nguyenvana@ailab.edu.vn",
    role: "Giảng viên / Chủ nhiệm đề tài",
    avatarInitials: "NA",
    reputationScore: 98,
    multiplier: 1.15,
    cleanStreakDays: "45+ ngày",
    noShows: 0,
    totalBookings: 84
  },
  {
    id: "usr-02",
    name: "NCS. Trần Tiến Dũng",
    email: "tiendung.phd@ailab.edu.vn",
    role: "Nghiên cứu sinh Tiến sĩ",
    avatarInitials: "TD",
    reputationScore: 95,
    multiplier: 1.12,
    cleanStreakDays: "30+ ngày",
    noShows: 0,
    totalBookings: 52
  },
  {
    id: "usr-03",
    name: "ThS. Lê Hoàng Yến",
    email: "hoangyen.msc@ailab.edu.vn",
    role: "Học viên Cao học",
    avatarInitials: "HY",
    reputationScore: 88,
    multiplier: 1.0,
    cleanStreakDays: "18 ngày",
    noShows: 1,
    totalBookings: 36
  },
  {
    id: "usr-04",
    name: "SV. Nguyễn Mai Phương",
    email: "maiphuong.k65@ailab.edu.vn",
    role: "Sinh viên làm ĐATN",
    avatarInitials: "MP",
    reputationScore: 92,
    multiplier: 1.05,
    cleanStreakDays: "30+ ngày",
    noShows: 0,
    totalBookings: 29
  },
  {
    id: "usr-05",
    name: "SV. Phạm Quốc Huy",
    email: "quochuy.k65@ailab.edu.vn",
    role: "Sinh viên nghiên cứu",
    avatarInitials: "QH",
    reputationScore: 78,
    multiplier: 0.95,
    cleanStreakDays: "7 ngày",
    noShows: 2,
    totalBookings: 14
  }
];

export const QuotaFairnessDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [rebalanced, setRebalanced] = useState(false);

  function getQuotaColor(percent: number) {
    if (percent > 90) return { bar: "progress-rose", text: "text-rose-400", badge: "bg-rose-950/80 text-rose-300 border-rose-500/40" };
    if (percent >= 70) return { bar: "progress-amber", text: "text-amber-400", badge: "bg-amber-950/80 text-amber-300 border-amber-500/40" };
    return { bar: "progress-emerald", text: "text-emerald-400", badge: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40" };
  }

  const filteredMembers = MEMBER_DATA.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              FAIR-SHARE COMPUTING POLICY 2026
            </span>
            <span className="led-pulse led-pulse-safe" />
            <span className="font-mono text-[11px] text-slate-400">JAIN'S INDEX TOÀN TRƯỜNG: 0.942</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight">
            Bảng Phân Bổ Hạn Ngạch & Sổ Cái Điểm Uy Tín
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cơ chế cân bằng hạn ngạch GPU-hours theo bộ môn và điểm thưởng uy tín no-show cá nhân
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRebalanced(true);
            setTimeout(() => setRebalanced(false), 3000);
          }}
          className="font-mono text-xs font-bold text-obsidian bg-cyan-400 hover:bg-cyan-300 px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(0,229,255,0.4)]"
        >
          <Sparkles size={14} />
          <span>{rebalanced ? "ĐÃ TÁI CÂN BẰNG TỰ ĐỘNG!" : "⚡ TÁI CÂN BẰNG HẠN NGẠCH"}</span>
        </button>
      </div>

      {/* 2. Main Two-Column Balanced Layout */}
      <div className="quota-layout-grid">
        {/* CỘT TRÁI: Định Mức Theo Bộ Môn */}
        <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-cyan-400" />
              <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider">
                ĐỊNH MỨC HẠN NGẠCH THEO BỘ MÔN (DEPARTMENT QUOTA)
              </span>
            </div>
            <span className="font-mono text-xs text-slate-400">PUE 1.12 EVN</span>
          </div>

          <div className="flex flex-col gap-4">
            {DEPARTMENT_DATA.map((dept) => {
              const percent = +((dept.usedHours / dept.totalHours) * 100).toFixed(1);
              const colorInfo = getQuotaColor(percent);

              return (
                <div key={dept.id} className="p-4 bg-black/40 border border-white/10 rounded-xl flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[10.5px] text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30 font-bold">
                          {dept.code}
                        </span>
                        <h4 className="text-xs font-bold text-white tracking-wide">{dept.name}</h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {dept.activeMembers} thành viên • Jain's Fairness: <strong>{dept.jainsIndex}</strong>
                      </span>
                    </div>

                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${colorInfo.badge}`}>
                      {percent}%
                    </span>
                  </div>

                  {/* Multi-tier Progress Bar */}
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${colorInfo.bar}`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                    <span>Đã dùng: <strong className="text-white">{dept.usedHours} GPU-h</strong></span>
                    <span>Tổng mức: <strong className="text-slate-300">{dept.totalHours} GPU-h</strong></span>
                    <span>Còn lại: <strong className={colorInfo.text}>{dept.totalHours - dept.usedHours} GPU-h</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-lg text-xs font-mono text-cyan-200 flex items-center justify-between">
            <span>Chính sách tự động hoán đổi:</span>
            <strong>Giờ Xanh +15% hạn ngạch</strong>
          </div>
        </div>

        {/* CỘT PHẢI: Sổ Cái Điểm Uy Tín Cá Nhân (Reputation Ledger) */}
        <div className="card p-5 bg-surface-card backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-amber-400" />
              <span className="font-mono text-xs text-amber-300 font-bold uppercase tracking-wider">
                SỔ CÁI ĐIỂM UY TÍN CÁ NHÂN (REPUTATION LEDGER)
              </span>
            </div>

            {/* Mini Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên / email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/60 border border-white/15 text-white font-mono text-xs rounded-lg pl-7 pr-3 py-1 w-44"
              />
            </div>
          </div>

          {/* Member Reputation List */}
          <div className="flex flex-col gap-3">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="p-3.5 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between gap-3 hover:border-white/25 transition-all"
              >
                <div className="flex items-center gap-3">
                  {/* Character Avatar */}
                  <div className="avatar-circle">
                    {member.avatarInitials}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white tracking-wide">{member.name}</h4>
                      {/* Jade Green Streak Badge */}
                      <span className="streak-badge-jade">
                        <CheckCircle2 size={11} className="text-emerald-400" />
                        <span>Streak: {member.cleanStreakDays}</span>
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 block mt-0.5">
                      {member.email} • <span className="text-slate-500">{member.role}</span>
                    </span>
                  </div>
                </div>

                {/* Score & Multiplier */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="font-mono text-sm font-bold text-amber-300">{member.reputationScore}</span>
                    <span className="text-[10px] text-slate-500 font-mono">/ 100</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-400/30 block mt-1">
                    {member.multiplier}x Multiplier
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>Tiêu chuẩn no-show:</span>
            <span className="text-emerald-300">Không vắng mặt &gt; 30 ngày hưởng hệ số 1.15x</span>
          </div>
        </div>
      </div>
    </div>
  );
};
