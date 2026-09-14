import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Clock, ArrowRight, ShieldCheck, RefreshCw, Filter, Zap, UserCheck, XCircle, TrendingUp, Calendar } from "lucide-react";
import { apiRequest } from "../api.js";

export function ConflictResolutionQueue() {
  const [filter, setFilter] = useState("ALL");
  const [conflicts, setConflicts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [conflictsRes, pendingBookings] = await Promise.allSettled([
        apiRequest("/analytics/conflicts"),
        apiRequest("/bookings?status=pending")
      ]);

      const conflictData = conflictsRes.status === "fulfilled" ? conflictsRes.value : null;
      const pendingData = pendingBookings.status === "fulfilled" ? pendingBookings.value : [];

      if (conflictData?.data) {
        setStats(conflictData.data);
      }

      // Build conflict items from pending bookings that overlap
      const items = (Array.isArray(pendingData) ? pendingData : pendingData?.data || []).map((b, i) => ({
        id: `CONF-${b.id || i}`,
        resourceCode: b.resource?.code || b.resourceId || "N/A",
        resourceName: b.resource?.name || "Thiết bị",
        timeSlot: b.startAt ? `${new Date(b.startAt).toLocaleString("vi-VN")} — ${new Date(b.endAt).toLocaleString("vi-VN")}` : "N/A",
        conflictReason: b.status === "pending" ? "Yêu cầu đang chờ phê duyệt" : "Trùng khung giờ",
        status: b.status === "pending" ? "PENDING" : "AUTO_RESOLVED",
        statusLabel: b.status === "pending" ? "CẦN PHÊ DUYỆT" : "ĐÃ XỬ LÝ",
        statusTone: b.status === "pending" ? "amber" : "green",
        requestA: {
          id: `REQ-${b.id}`,
          userName: b.requestedBy?.fullName || b.requestedBy?.email || "N/A",
          userRole: b.requestedBy?.role || "",
          project: b.notes || "",
          urgency: "",
          priorityScore: null,
          hasCert: false
        },
        requestB: null,
        proposal: null
      }));

      setConflicts(items);
    } catch (err) {
      setError("Không thể tải dữ liệu xung đột: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(bookingId) {
    try {
      const realId = bookingId.replace("CONF-", "");
      await apiRequest(`/bookings/${realId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "approved" })
      });
      loadData();
    } catch (err) {
      setError("Không thể phê duyệt: " + (err.message || ""));
    }
  }

  async function handleReject(bookingId) {
    try {
      const realId = bookingId.replace("CONF-", "");
      await apiRequest(`/bookings/${realId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "rejected" })
      });
      loadData();
    } catch (err) {
      setError("Không thể từ chối: " + (err.message || ""));
    }
  }

  const filtered = filter === "ALL" ? conflicts : conflicts.filter(c => c.status === filter);

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER */}
      <div className="card" style={{ background: "var(--surface-card)", backdropFilter: "blur(16px)", padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="badge warning" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span className="led-pulse led-pulse-warn" />
                <span>CONFLICT RESOLUTION ENGINE</span>
              </span>
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: "6px 0 2px 0" }}>
              Hàng Đợi Xử Lý Xung Đột & Phân Xử Ưu Tiên
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
              Phát hiện, phân loại và giải quyết xung đột tài nguyên real-time theo chính sách ưu tiên đa mục tiêu.
            </p>
          </div>
          <button className="btn" onClick={loadData} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px" }}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      {/* STATS (HERO LEVEL 1 CARDS) */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <StatCard label="TỔNG YÊU CẦU" value={stats.totalRequests} tone="var(--cyan-core)" pulse="led-pulse-cyan" />
          <StatCard label="BỊ TỪ CHỐI" value={stats.rejectedBookings} tone="var(--rose-alert)" pulse="led-pulse-alert" />
          <StatCard label="TỶ LỆ XUNG ĐỘT" value={`${(stats.conflictRate * 100).toFixed(1)}%`} tone={stats.conflictRate > 0.1 ? "var(--rose-alert)" : "var(--emerald-safe)"} pulse={stats.conflictRate > 0.1 ? "led-pulse-alert" : "led-pulse-safe"} />
          <StatCard label="ĐANG CHỜ XỬ LÝ" value={conflicts.filter(c => c.status === "PENDING").length} tone="var(--amber-warn)" pulse="led-pulse-warn" />
        </div>
      )}

      {/* FILTER TABS */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { key: "ALL", label: "Tất cả", count: conflicts.length },
          { key: "PENDING", label: "Chờ duyệt", count: conflicts.filter(c => c.status === "PENDING").length },
          { key: "AUTO_RESOLVED", label: "Đã xử lý", count: conflicts.filter(c => c.status === "AUTO_RESOLVED").length }
        ].map(tab => (
          <button
            key={tab.key}
            className={`btn ${filter === tab.key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(tab.key)}
            style={{
              fontSize: "12px",
              padding: "6px 14px",
              fontFamily: "var(--font-mono)"
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: 12, background: "rgba(193, 80, 63, 0.1)", borderRadius: 6, color: "var(--red)", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {/* CONFLICT LIST */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
        {loading && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Đang tải dữ liệu xung đột...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <CheckCircle2 size={32} style={{ color: "var(--green)", opacity: 0.5 }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 8 }}>
              {filter === "ALL" ? "Không có xung đột nào trong hệ thống." : `Không có xung đột nào ở trạng thái "${filter}".`}
            </p>
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          {filtered.map((conf) => {
            const isPending = conf.status === "PENDING";
            const stripColor = isPending ? "var(--amber-warn)" : "var(--emerald-safe)";
            const pulseClass = isPending ? "led-pulse-warn" : "led-pulse-safe";

            return (
              <div
                key={conf.id}
                style={{
                  position: "relative",
                  borderLeft: `3px solid ${stripColor}`,
                  background: "rgba(14, 19, 31, 0.75)",
                  border: isPending ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "16px 18px",
                  transition: "all 150ms ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`led-pulse ${pulseClass}`} />
                    <span className="font-mono" style={{ fontSize: "13px", color: "var(--cyan-core)", fontWeight: 700 }}>
                      {conf.id}
                    </span>
                    <span className="font-mono" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {conf.resourceCode}
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>
                      {conf.resourceName}
                    </span>
                  </div>
                  <span className={`badge ${isPending ? "warning" : "success"}`}>
                    {conf.statusLabel}
                  </span>
                </div>

                <div className="font-mono" style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={13} style={{ color: "var(--text-muted)" }} />
                  <span>{conf.timeSlot}</span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: 10 }}>
                  {conf.conflictReason}
                </div>

                {conf.requestA && (
                  <div style={{ background: "rgba(21, 28, 44, 0.6)", borderRadius: 6, padding: "10px 14px", marginBottom: 10, border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                      <strong>{conf.requestA.userName}</strong>
                      {conf.requestA.userRole && (
                        <span className="badge info" style={{ marginLeft: 8, fontSize: "11px" }}>
                          {conf.requestA.userRole.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {conf.requestA.project && (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: 4 }}>{conf.requestA.project}</div>
                    )}
                    {conf.requestA.priorityScore !== null && (
                      <div className="font-mono" style={{ fontSize: "12px", color: "var(--cyan-core)", marginTop: 4 }}>
                        PRIORITY SCORE: {conf.requestA.priorityScore}
                      </div>
                    )}
                  </div>
                )}

                {isPending && (
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
                    <button
                      className="btn"
                      onClick={() => handleReject(conf.id)}
                      style={{ fontSize: "12px", color: "var(--rose-alert)" }}
                    >
                      Từ Chối
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleApprove(conf.id)}
                      style={{ fontSize: "12px" }}
                    >
                      Phê Duyệt
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, pulse }) {
  return (
    <div
      className="card"
      style={{
        borderLeft: `3px solid ${tone}`,
        background: "var(--surface-card)",
        backdropFilter: "blur(16px)",
        padding: "16px 18px",
        position: "relative"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em" }}>{label}</span>
        {pulse && <span className={`led-pulse ${pulse}`} />}
      </div>
      <strong className="font-mono" style={{ fontSize: "24px", color: tone, lineHeight: 1.1 }}>{value}</strong>
    </div>
  );
}
