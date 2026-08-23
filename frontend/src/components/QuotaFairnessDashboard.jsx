import React, { useState } from "react";
import { Users, AlertTriangle, TrendingUp, Sliders, ShieldCheck, CheckCircle2, BarChart2, Plus, Edit, Award, History, Clock, ShieldAlert } from "lucide-react";

export function QuotaFairnessDashboard() {
  const [departments, setDepartments] = useState([
    {
      id: "DEP-AI",
      name: "Phòng Thí Nghiệm AI & Thị Giác Máy (Computer Vision Lab)",
      lead: "PGS.TS. Trần Văn Minh",
      allocatedHours: 200,
      usedHours: 184,
      members: 14,
      reputationScore: 94,
      trend: "+12% so với tháng trước",
      trendTone: "amber",
      activeJobs: 4,
      status: "WARNING",
      statusLabel: "GẦN HẾT ĐỊNH MỨC (92%)"
    },
    {
      id: "DEP-ROBOT",
      name: "Trung Tâm Nghiên Cứu Robotics & Thiết Bị Bay (Autonomous Robotics)",
      lead: "TS. Hoàng Quốc Bảo",
      allocatedHours: 150,
      usedHours: 98,
      members: 9,
      reputationScore: 88,
      trend: "-5% so với tháng trước",
      trendTone: "green",
      activeJobs: 2,
      status: "NORMAL",
      statusLabel: "ĐỊNH MỨC AN TOÀN (65%)"
    },
    {
      id: "DEP-BIO",
      name: "Nhóm Nghiên Cứu Tin Y Sinh Học (Bioinformatics Group)",
      lead: "TS. Lê Thị Mai",
      allocatedHours: 120,
      usedHours: 54,
      members: 6,
      reputationScore: 100,
      trend: "+2% so với tháng trước",
      trendTone: "green",
      activeJobs: 1,
      status: "NORMAL",
      statusLabel: "ĐỊNH MỨC DƯ THỪA (45%)"
    },
    {
      id: "DEP-UG",
      name: "Sinh Viên Làm Đồ Án Tốt Nghiệp (Graduation Projects)",
      lead: "ThS. Phạm Tuấn Kiệt",
      allocatedHours: 180,
      usedHours: 172,
      members: 28,
      reputationScore: 65,
      trend: "+35% (Mùa thi bảo vệ ĐATN)",
      trendTone: "red",
      activeJobs: 8,
      status: "CRITICAL",
      statusLabel: "VƯỢT ĐỊNH MỨC (95.5%)"
    }
  ]);

  // Representative user reputation simulation dataset
  const [usersReputation, setUsersReputation] = useState([
    {
      id: "usr-1",
      name: "NCS. Nguyễn Văn An",
      role: "phd_researcher",
      roleLabel: "Nghiên cứu sinh Tiến sĩ (PhD)",
      reputationScore: 94,
      lateCancelCount: 1,
      noShowCount: 0,
      quotaBreachCount: 0,
      cleanStreakDays: 21,
      multiplier: 0.993,
      events: [
        { type: "CLEAN_STREAK_RECOVERY", delta: +4, reason: "Duy trì 21 ngày tuân thủ quy chế phòng lab", date: "2026-08-20" },
        { type: "LATE_CANCEL", delta: -10, reason: "Hủy ca GPU H100 trước 45 phút do lỗi dữ liệu huấn luyện", date: "2026-07-28" }
      ]
    },
    {
      id: "usr-2",
      name: "ThS. Lê Hoàng Long",
      role: "master_student",
      roleLabel: "Học viên Cao học (Master)",
      reputationScore: 100,
      lateCancelCount: 0,
      noShowCount: 0,
      quotaBreachCount: 0,
      cleanStreakDays: 45,
      multiplier: 1.000,
      events: [
        { type: "CLEAN_STREAK_RECOVERY", delta: +0, reason: "Đạt mức trần tối đa 100 điểm uy tín", date: "2026-08-15" }
      ]
    },
    {
      id: "usr-3",
      name: "SV. Trần Thị Bình",
      role: "undergrad_student",
      roleLabel: "Sinh viên Đại học (Undergrad)",
      reputationScore: 65,
      lateCancelCount: 1,
      noShowCount: 1,
      quotaBreachCount: 0,
      cleanStreakDays: 5,
      multiplier: 0.958,
      events: [
        { type: "NO_SHOW", delta: -25, reason: "Không đến nhận thiết bị đo và không hủy trước", date: "2026-08-10" },
        { type: "LATE_CANCEL", delta: -10, reason: "Hủy ca đo UAV trước 15 phút", date: "2026-07-15" }
      ]
    },
    {
      id: "usr-4",
      name: "NCS. Phạm Quốc Huy",
      role: "phd_researcher",
      roleLabel: "Nghiên cứu sinh (Robotics)",
      reputationScore: 75,
      lateCancelCount: 1,
      noShowCount: 0,
      quotaBreachCount: 1,
      cleanStreakDays: 14,
      multiplier: 0.970,
      events: [
        { type: "CLEAN_STREAK_RECOVERY", delta: +4, reason: "Phục hồi +4 điểm sau 14 ngày tuân thủ sạch", date: "2026-08-22" },
        { type: "QUOTA_BREACH", delta: -15, reason: "Vượt hạn ngạch giờ 2 tháng liên tiếp", date: "2026-08-01" },
        { type: "LATE_CANCEL", delta: -10, reason: "Hủy ca đặt Drone do thời tiết xấu", date: "2026-07-20" }
      ]
    },
    {
      id: "usr-5",
      name: "SV. Đỗ Minh Khang",
      role: "undergrad_student",
      roleLabel: "Sinh viên Đại học (Undergrad)",
      reputationScore: 100,
      lateCancelCount: 0,
      noShowCount: 0,
      quotaBreachCount: 0,
      cleanStreakDays: 60,
      multiplier: 1.000,
      events: [
        { type: "CLEAN_STREAK_RECOVERY", delta: +0, reason: "Hồ sơ tuân thủ gương mẫu 100 điểm", date: "2026-08-01" }
      ]
    }
  ]);

  const [editingDept, setEditingDept] = useState(null);
  const [newQuota, setNewQuota] = useState(200);
  const [selectedUserHistory, setSelectedUserHistory] = useState(null);

  function handleSaveQuota() {
    if (!editingDept) return;
    setDepartments((prev) =>
      prev.map((d) => (d.id === editingDept.id ? { ...d, allocatedHours: newQuota } : d))
    );
    setEditingDept(null);
  }

  function getReputationBadge(score) {
    if (score >= 90) return { label: "XUẤT SẮC", bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" };
    if (score >= 70) return { label: "TIÊU CHUẨN", bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" };
    return { label: "CẢNH BÁO", bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" };
  }

  const totalAllocated = departments.reduce((acc, d) => acc + d.allocatedHours, 0);
  const totalUsed = departments.reduce((acc, d) => acc + d.usedHours, 0);
  const avgUtilization = Math.round((totalUsed / totalAllocated) * 100);

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER BANNER */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#06b6d4", background: "rgba(6, 182, 212, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(6, 182, 212, 0.25)" }}>
                RESOURCE QUOTA & BEHAVIORAL REPUTATION
              </span>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#10b981" }}>
                ● TÍNH CÔNG BẰNG JAIN'S INDEX: 0.842
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Quản Trị Hạn Ngạch & Điểm Uy Tín Hành Vi (Quota & Reputation Tracker)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
              Hệ thống ghi nhớ hành vi người dùng (hủy trễ, no-show, vượt định mức, chuỗi ngày tuân thủ sạch) để điều chỉnh hệ số nhân ưu tiên xếp hàng, thúc đẩy ý thức sử dụng tài nguyên phòng lab.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ background: "#0e121a", padding: "8px 14px", borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.06)", textAlign: "center" }}>
              <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>TỔNG ĐÃ DÙNG</span>
              <strong style={{ fontSize: "1.1rem", fontFamily: "var(--font-mono)", color: "#06b6d4" }}>
                {totalUsed} / {totalAllocated}h ({avgUtilization}%)
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* DEPARTMENT QUOTA CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: 16 }}>
        {departments.map((dept) => {
          const percent = Math.min(100, Math.round((dept.usedHours / dept.allocatedHours) * 100));
          const isWarning = percent >= 90;
          const isCritical = percent >= 95;
          const barColor = isCritical ? "#ef4444" : (isWarning ? "#f59e0b" : "#10b981");
          const repBadge = getReputationBadge(dept.reputationScore);

          return (
            <div
              key={dept.id}
              style={{
                background: "#111620",
                border: isCritical ? "1px solid rgba(239, 68, 68, 0.4)" : (isWarning ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)"),
                borderRadius: 8,
                padding: "18px 20px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#06b6d4", display: "block" }}>
                    {dept.id} • Trưởng nhóm: {dept.lead}
                  </span>
                  <strong style={{ fontSize: "0.95rem", color: "#f8fafc", fontFamily: "var(--font-heading)" }}>
                    {dept.name}
                  </strong>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: repBadge.bg,
                      color: repBadge.text,
                      border: `1px solid ${repBadge.border}`
                    }}
                  >
                    UY TÍN: {dept.reputationScore}/100
                  </span>
                  <button
                    className="icon-button"
                    title="Điều chỉnh định mức"
                    onClick={() => {
                      setEditingDept(dept);
                      setNewQuota(dept.allocatedHours);
                    }}
                    style={{ background: "#161b26", border: "1px solid rgba(255, 255, 255, 0.08)", color: "#94a3b8" }}
                  >
                    <Edit size={14} />
                  </button>
                </div>
              </div>

              {/* USAGE METRICS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, background: "#0e121a", padding: "10px 12px", borderRadius: 6, margin: "12px 0" }}>
                <div>
                  <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>GIỜ ĐÃ SỬ DỤNG</span>
                  <strong style={{ fontSize: "1.05rem", fontFamily: "var(--font-mono)", color: barColor }}>
                    {dept.usedHours} / {dept.allocatedHours}h
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>THÀNH VIÊN</span>
                  <strong style={{ fontSize: "1.05rem", fontFamily: "var(--font-mono)", color: "#f8fafc" }}>
                    {dept.members} Người
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>TÁC VỤ ĐANG CHẠY</span>
                  <strong style={{ fontSize: "1.05rem", fontFamily: "var(--font-mono)", color: "#06b6d4" }}>
                    {dept.activeJobs} Jobs
                  </strong>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#94a3b8", marginBottom: 4 }}>
                  <span>Tỷ Lệ Tiêu Thụ Định Mức Tháng</span>
                  <strong style={{ fontFamily: "var(--font-mono)", color: barColor }}>{percent}%</strong>
                </div>
                <div style={{ height: 6, background: "rgba(255, 255, 255, 0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${percent}%`, height: "100%", background: barColor }} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: "0.75rem" }}>
                <span style={{ color: "#64748b" }}>{dept.trend}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: barColor }}>
                  {dept.statusLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* USER BEHAVIOR REPUTATION TRACKER TABLE (PHASE 2 DEEP DIVE) */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 8, padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={18} style={{ color: "#06b6d4" }} />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc", fontFamily: "var(--font-heading)", margin: 0 }}>
              Bảng Theo Dõi Điểm Uy Tín & Kỷ Luật Người Dùng (Behavioral Reputation Score Tracker)
            </h3>
          </div>
          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#94a3b8" }}>
            Công thức: FinalPriority = BasePriority × (0.88 + 0.12 × R/100)
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#64748b", fontFamily: "var(--font-mono)" }}>
                <th style={{ padding: "8px 10px" }}>NGHIÊN CỨU VIÊN / SV</th>
                <th style={{ padding: "8px 10px" }}>VAI TRÒ</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }}>ĐIỂM UY TÍN (R)</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }}>HỦY TRỄ (&lt;2H)</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }}>NO-SHOW</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }}>VƯỢT QUOTA</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }}>CHUỖI SẠCH</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }}>HỆ SỐ NHÂN</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {usersReputation.map((u) => {
                const badge = getReputationBadge(u.reputationScore);
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <td style={{ padding: "10px", fontWeight: 600, color: "#f8fafc" }}>
                      {u.name}
                    </td>
                    <td style={{ padding: "10px", color: "#94a3b8" }}>
                      {u.roleLabel}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`
                        }}
                      >
                        {u.reputationScore} / 100 ({badge.label})
                      </span>
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", fontFamily: "var(--font-mono)", color: u.lateCancelCount > 0 ? "#f59e0b" : "#64748b" }}>
                      {u.lateCancelCount} lần (-{u.lateCancelCount * 10}đ)
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", fontFamily: "var(--font-mono)", color: u.noShowCount > 0 ? "#ef4444" : "#64748b" }}>
                      {u.noShowCount} lần (-{u.noShowCount * 25}đ)
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", fontFamily: "var(--font-mono)", color: u.quotaBreachCount > 0 ? "#ef4444" : "#64748b" }}>
                      {u.quotaBreachCount} lần (-{u.quotaBreachCount * 15}đ)
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", fontFamily: "var(--font-mono)", color: "#10b981" }}>
                      {u.cleanStreakDays} ngày (+{Math.floor(u.cleanStreakDays / 7) * 2}đ)
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", fontFamily: "var(--font-mono)", color: "#06b6d4", fontWeight: 700 }}>
                      ×{u.multiplier}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setSelectedUserHistory(u)}
                        style={{ fontSize: "0.72rem", padding: "4px 10px", fontFamily: "var(--font-mono)" }}
                      >
                        <History size={12} style={{ marginRight: 4 }} />
                        Lịch Sử
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER REPUTATION EVENT HISTORY MODAL */}
      {selectedUserHistory && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", display: "grid", placeContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#111620", border: "1px solid rgba(6, 182, 212, 0.4)", borderRadius: 8, padding: "22px 24px", width: 520, boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ fontSize: "1.1rem", color: "#f8fafc", fontFamily: "var(--font-heading)", margin: 0 }}>
                Nhật Ký Biến Động Điểm Uy Tín (Behavior Log)
              </h3>
              <button
                className="btn btn-ghost"
                onClick={() => setSelectedUserHistory(null)}
                style={{ fontSize: "0.8rem", padding: "2px 8px" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: 14 }}>
              Người dùng: <strong style={{ color: "#f8fafc" }}>{selectedUserHistory.name}</strong> • Điểm hiện tại: <strong style={{ color: "#10b981" }}>{selectedUserHistory.reputationScore}/100</strong>
            </p>

            <div style={{ display: "grid", gap: 10, maxHeight: 260, overflowY: "auto", marginBottom: 16 }}>
              {selectedUserHistory.events.map((ev, i) => (
                <div key={i} style={{ background: "#0e121a", padding: "10px 12px", borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: ev.delta < 0 ? "#ef4444" : "#10b981", fontWeight: 700 }}>
                      {ev.delta > 0 ? `+${ev.delta}` : ev.delta} Điểm • {ev.type}
                    </span>
                    <span style={{ color: "#64748b" }}>{ev.date}</span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>{ev.reason}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn-primary"
                onClick={() => setSelectedUserHistory(null)}
                style={{ fontSize: "0.78rem", padding: "6px 16px", fontFamily: "var(--font-mono)", background: "#06b6d4", color: "#0b0e14", fontWeight: 800 }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST QUOTA MODAL */}
      {editingDept && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", display: "grid", placeContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#111620", border: "1px solid rgba(6, 182, 212, 0.4)", borderRadius: 8, padding: "22px 24px", width: 440, boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)" }}>
            <h3 style={{ fontSize: "1.1rem", color: "#f8fafc", fontFamily: "var(--font-heading)", margin: "0 0 4px 0" }}>
              Điều Chỉnh Định Mức Giờ Tháng (Quota Policy)
            </h3>
            <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 16 }}>
              Nhóm: <strong style={{ color: "#06b6d4" }}>{editingDept.name}</strong>
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: 6 }}>
                Hạn ngạch giờ tính toán mới (Giờ/Tháng):
              </label>
              <input
                type="number"
                value={newQuota}
                onChange={(e) => setNewQuota(parseInt(e.target.value) || 0)}
                style={{ width: "100%", background: "#0e121a", border: "1px solid rgba(255, 255, 255, 0.12)", color: "#f8fafc", padding: "8px 12px", borderRadius: 6, fontSize: "0.9rem", fontFamily: "var(--font-mono)" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setEditingDept(null)}
                style={{ fontSize: "0.78rem", padding: "6px 14px", fontFamily: "var(--font-mono)" }}
              >
                Hủy Bỏ
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveQuota}
                style={{ fontSize: "0.78rem", padding: "6px 16px", fontFamily: "var(--font-mono)", background: "#10b981", color: "#0b0e14", fontWeight: 800 }}
              >
                Lưu Chính Sách
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
