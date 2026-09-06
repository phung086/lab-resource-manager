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
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--amber)", background: "rgba(227, 162, 60, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(227, 162, 60, 0.25)" }}>
                CONFLICT RESOLUTION ENGINE
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Hàng Đợi Xử Lý Xung Đột & Phân Xử Ưu Tiên
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              Phát hiện, phân loại và giải quyết xung đột tài nguyên real-time theo chính sách ưu tiên đa mục tiêu.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={loadData} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem" }}>
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
      </div>

      {/* STATS */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <StatCard label="TỔNG YÊU CẦU" value={stats.totalRequests} tone="var(--blue)" />
          <StatCard label="BỊ TỪ CHỐI" value={stats.rejectedBookings} tone="var(--red)" />
          <StatCard label="TỶ LỆ XUNG ĐỘT" value={`${(stats.conflictRate * 100).toFixed(1)}%`} tone={stats.conflictRate > 0.1 ? "var(--red)" : "var(--green)"} />
          <StatCard label="ĐANG CHỜ XỬ LÝ" value={conflicts.filter(c => c.status === "PENDING").length} tone="var(--amber)" />
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
              fontSize: "0.78rem", padding: "6px 14px", fontFamily: "var(--font-mono)",
              background: filter === tab.key ? "var(--amber)" : "transparent",
              color: filter === tab.key ? "#14161A" : "var(--text-secondary)",
              fontWeight: filter === tab.key ? 700 : 400
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
            const stripColor = isPending ? "var(--status-warning)" : "var(--status-ok)";

            return (
              <div
                key={conf.id}
                style={{
                  borderLeft: `3px solid ${stripColor}`,
                  background: "var(--surface-strong)",
                  border: isPending ? "1px solid rgba(227, 162, 60, 0.3)" : "1px solid var(--line)",
                  borderRadius: "0 8px 8px 0",
                  padding: "16px 18px",
                  position: "relative"
                }}
              >
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 3, background: stripColor, borderRadius: "8px 0 0 8px" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--blue)", fontWeight: 600 }}>
                      {conf.id}
                    </span>
                    <span style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                      {conf.resourceCode}
                    </span>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>
                      {conf.resourceName}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 600, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 4,
                    background: isPending ? "rgba(227, 162, 60, 0.15)" : "rgba(95, 167, 119, 0.15)",
                    color: isPending ? "var(--amber)" : "var(--green)",
                    border: `1px solid ${isPending ? "rgba(227, 162, 60, 0.3)" : "rgba(95, 167, 119, 0.3)"}`
                  }}>
                    {conf.statusLabel}
                  </span>
                </div>

                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>
                  <Clock size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  {conf.timeSlot}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 8 }}>
                  {conf.conflictReason}
                </div>

                {conf.requestA && (
                  <div style={{ background: "var(--surface-muted)", borderRadius: 6, padding: "10px 12px", marginBottom: 8 }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>
                      <strong>{conf.requestA.userName}</strong>
                      {conf.requestA.userRole && <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: "0.72rem" }}>{conf.requestA.userRole}</span>}
                    </div>
                    {conf.requestA.project && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>{conf.requestA.project}</div>
                    )}
                    {conf.requestA.priorityScore !== null && (
                      <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--amber)", marginTop: 4 }}>
                        Priority Score: {conf.requestA.priorityScore}
                      </div>
                    )}
                  </div>
                )}

                {isPending && (
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                    <button className="btn btn-ghost" onClick={() => handleReject(conf.id)}
                      style={{ fontSize: "0.78rem", padding: "6px 14px", fontFamily: "var(--font-mono)", color: "var(--red)" }}>
                      Từ Chối
                    </button>
                    <button className="btn btn-primary" onClick={() => handleApprove(conf.id)}
                      style={{ fontSize: "0.78rem", padding: "6px 16px", fontFamily: "var(--font-mono)", background: "var(--green)", color: "#14161A", fontWeight: 700 }}>
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

function StatCard({ label, value, tone }) {
  return (
    <div style={{
      borderLeft: `3px solid ${tone}`,
      background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "0 8px 8px 0", padding: "16px 18px"
    }}>
      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", display: "block" }}>{label}</span>
      <strong style={{ fontSize: "1.6rem", color: tone, fontFamily: "var(--font-mono)" }}>{value}</strong>
    </div>
  );
}
