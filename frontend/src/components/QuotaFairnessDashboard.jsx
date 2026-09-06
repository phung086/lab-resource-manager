import React, { useState, useEffect } from "react";
import { Users, AlertTriangle, TrendingUp, Sliders, ShieldCheck, CheckCircle2, BarChart2, Award, History, Clock, RefreshCw } from "lucide-react";
import { apiRequest } from "../api.js";

function calculateUserReputation(user, noShowStats) {
  let score = 100;
  let multiplier = 1.0;
  const noShows = noShowStats.find(n => n.userId === user.id)?.count || 0;
  
  if (noShows > 0) {
    score -= noShows * 10;
    multiplier = Math.max(0.5, 1 - (noShows * 0.15));
  }

  return {
    score: Math.max(0, score),
    multiplier: multiplier.toFixed(2),
    noShows,
    cleanStreak: noShows === 0 ? "30+ ngày" : "0 ngày"
  };
}

export function QuotaFairnessDashboard() {
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [usersRes, noShowRes, overviewRes] = await Promise.allSettled([
        apiRequest("/users"),
        apiRequest("/analytics/no-shows"),
        apiRequest("/analytics/overview")
      ]);

      const usersData = usersRes.status === "fulfilled" ? usersRes.value : [];
      const noShows = noShowRes.status === "fulfilled" ? (noShowRes.value?.data?.topNoShowUsers || []) : [];
      const overview = overviewRes.status === "fulfilled" ? overviewRes.value?.data : null;
      
      setAnalytics(overview);

      const mappedUsers = Array.isArray(usersData) ? usersData.map(u => {
        const rep = calculateUserReputation(u, noShows);
        return {
          id: u.id,
          name: u.fullName || u.email,
          role: u.role,
          roleLabel: u.role === "admin" ? "Quản trị viên" : (u.role === "lab_staff" ? "Nhân viên Lab" : (u.role === "lecturer" ? "Giảng viên" : "Sinh viên")),
          reputationScore: rep.score,
          noShowCount: rep.noShows,
          cleanStreakDays: rep.cleanStreak,
          multiplier: rep.multiplier,
          totalBookings: u._count?.bookings || 0
        };
      }).sort((a, b) => b.totalBookings - a.totalBookings) : [];

      setUsers(mappedUsers);
    } catch (err) {
      setError("Không thể tải dữ liệu: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Realistic simulated departments for demo since backend lacks department entity
  const departments = [
    {
      id: "DEP-AI", name: "AI & Thị Giác Máy (Computer Vision)",
      lead: "PGS.TS. Trần Văn Minh", allocatedHours: 200, usedHours: 184, members: 14,
      reputationScore: 94, trend: "+12%", trendTone: "var(--amber)", activeJobs: 4,
      statusLabel: "GẦN HẾT ĐỊNH MỨC (92%)", statusTone: "var(--amber)"
    },
    {
      id: "DEP-ROBOT", name: "Robotics & Thiết Bị Bay (Autonomous)",
      lead: "TS. Hoàng Quốc Bảo", allocatedHours: 150, usedHours: 98, members: 9,
      reputationScore: 88, trend: "-5%", trendTone: "var(--green)", activeJobs: 2,
      statusLabel: "ĐỊNH MỨC AN TOÀN (65%)", statusTone: "var(--green)"
    },
    {
      id: "DEP-UG", name: "Đồ Án Tốt Nghiệp (Graduation Projects)",
      lead: "ThS. Phạm Tuấn Kiệt", allocatedHours: 180, usedHours: 172, members: 28,
      reputationScore: 65, trend: "+35%", trendTone: "var(--red)", activeJobs: 8,
      statusLabel: "VƯỢT ĐỊNH MỨC (95.5%)", statusTone: "var(--red)"
    }
  ];

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--violet)", background: "rgba(167, 139, 250, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(167, 139, 250, 0.25)" }}>
                RESOURCE QUOTA ALLOCATION
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Hệ Thống Phân Bổ Định Mức & Điểm Uy Tín
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              Quản lý hạn mức tài nguyên theo nhóm, trừng phạt vi phạm (no-show) và tối ưu hóa sự công bằng (Fairness).
            </p>
          </div>
          <button className="btn btn-ghost" onClick={loadData} style={{ fontSize: "0.78rem" }}>
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Làm mới
          </button>
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Đang tải dữ liệu...</div>}
      
      {error && (
        <div style={{ padding: 12, background: "rgba(193, 80, 63, 0.1)", borderRadius: 6, color: "var(--red)", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <StatCard label="TỔNG SỐ LƯỢT ĐẶT" value={analytics?.bookings?.total || 0} tone="var(--blue)" icon={BarChart2} />
            <StatCard label="TỶ LỆ NO-SHOW (BỎ LỊCH)" value={`${((analytics?.bookings?.noShowRate || 0) * 100).toFixed(1)}%`} tone="var(--amber)" icon={AlertTriangle} />
            <StatCard label="LƯỢT ĐẶT HOÀN THÀNH" value={analytics?.bookings?.completed || 0} tone="var(--green)" icon={CheckCircle2} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* DEPARTMENT QUOTAS */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sliders size={18} style={{ color: "var(--cyan)" }} />
                  <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    ĐỊNH MỨC THEO ĐƠN VỊ CẤP BỘ MÔN
                  </strong>
                </div>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {departments.map((dep) => {
                  const pct = Math.round((dep.usedHours / dep.allocatedHours) * 100);
                  return (
                    <div key={dep.id} style={{ background: "var(--surface-strong)", border: "1px solid var(--line)", borderRadius: 8, padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", display: "block" }}>{dep.name}</strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{dep.lead} • {dep.members} thành viên</span>
                        </div>
                        <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", padding: "3px 8px", borderRadius: 4, background: `rgba(${dep.statusTone === 'var(--amber)' ? '227,162,60' : dep.statusTone === 'var(--green)' ? '95,167,119' : '193,80,63'}, 0.15)`, color: dep.statusTone, border: `1px solid ${dep.statusTone}` }}>
                          {dep.statusLabel}
                        </span>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 4 }}>
                          <span>Sử dụng thực tế: {dep.usedHours}h / {dep.allocatedHours}h</span>
                          <span style={{ fontFamily: "var(--font-mono)", color: pct > 90 ? "var(--red)" : "var(--green)" }}>{pct}%</span>
                        </div>
                        <div style={{ height: 6, background: "var(--surface-muted)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: pct > 90 ? "var(--red)" : (pct > 75 ? "var(--amber)" : "var(--green)") }} />
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <span>Uy tín nhóm: <strong style={{ color: dep.reputationScore > 80 ? "var(--green)" : "var(--amber)" }}>{dep.reputationScore}/100</strong></span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: dep.trendTone }}>
                          <TrendingUp size={12} /> {dep.trend}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* USER REPUTATION */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ShieldCheck size={18} style={{ color: "var(--violet)" }} />
                  <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    ĐIỂM UY TÍN CÁ NHÂN (REPUTATION LEDGER)
                  </strong>
                </div>
              </div>

              {users.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: 20 }}>Chưa có dữ liệu người dùng.</div>
              ) : (
                <div style={{ display: "grid", gap: 10, maxHeight: 500, overflowY: "auto" }}>
                  {users.slice(0, 10).map((user) => (
                    <div key={user.id} style={{ background: "var(--surface-strong)", border: "1px solid var(--line)", borderRadius: 6, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div>
                          <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", display: "block" }}>{user.name}</strong>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{user.roleLabel}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "0.9rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: user.reputationScore > 80 ? "var(--green)" : (user.reputationScore > 50 ? "var(--amber)" : "var(--red)") }}>
                            {user.reputationScore}
                          </div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            x{user.multiplier} Ưu tiên
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <History size={12} /> {user.totalBookings} lượt đặt
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: user.noShowCount > 0 ? "var(--red)" : "inherit" }}>
                          <AlertTriangle size={12} /> {user.noShowCount} vi phạm
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} /> Streak: {user.cleanStreakDays}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, tone, icon: Icon }) {
  return (
    <div style={{
      borderLeft: `3px solid ${tone}`,
      background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "0 8px 8px 0", padding: "16px 18px", position: "relative"
    }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 3, background: tone, borderRadius: "8px 0 0 8px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", display: "block" }}>{label}</span>
        {Icon && <Icon size={16} style={{ color: tone }} />}
      </div>
      <strong style={{ fontSize: "1.6rem", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{value}</strong>
    </div>
  );
}
