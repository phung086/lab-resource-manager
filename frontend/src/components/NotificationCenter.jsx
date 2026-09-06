import React, { useState, useEffect } from "react";
import { Bell, ShieldAlert, CheckCircle2, Clock, AlertTriangle, ArrowRight, UserCheck, Info } from "lucide-react";
import { apiRequest } from "../api.js";

const EMPTY_STATE_ICON_STYLE = { color: "var(--text-muted)", opacity: 0.5 };

export function NotificationCenter({ notifications = [], onChanged }) {
  const [escalations, setEscalations] = useState([]);
  const [loadingEsc, setLoadingEsc] = useState(true);
  const [escError, setEscError] = useState("");

  useEffect(() => {
    loadEscalations();
  }, []);

  async function loadEscalations() {
    setLoadingEsc(true);
    setEscError("");
    try {
      const data = await apiRequest("/incidents?status=open");
      const items = Array.isArray(data?.data || data) ? (data.data || data) : [];
      setEscalations(items.filter(inc => inc.severity === "critical" || inc.status === "open"));
    } catch (err) {
      setEscError("Không thể tải danh sách escalation.");
      setEscalations([]);
    } finally {
      setLoadingEsc(false);
    }
  }

  async function handleResolve(id, action) {
    try {
      await apiRequest(`/incidents/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: action === "APPROVE" ? "resolved" : "closed",
          resolutionNote: action === "APPROVE" ? "Đã phê duyệt ngoại lệ" : "Đã từ chối yêu cầu"
        })
      });
      loadEscalations();
      if (onChanged) onChanged();
    } catch {
      setEscalations((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: action === "APPROVE" ? "resolved" : "closed" } : e))
      );
    }
  }

  const openEscalations = escalations.filter(e => e.status === "open");
  const resolvedEscalations = escalations.filter(e => e.status !== "open");
  const unreadNotifs = notifications.filter(n => !n.isRead);

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--red)", background: "rgba(193, 80, 63, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(193, 80, 63, 0.25)" }}>
                ESCALATION & INCIDENT WORKFLOW
              </span>
              {openEscalations.length > 0 && (
                <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--amber)" }}>
                  ● {openEscalations.length} CA ĐANG MỞ
                </span>
              )}
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Trung Tâm Cảnh Báo & Xử Lý Escalation
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              Tiếp nhận và giải quyết các trường hợp ngoại lệ, theo dõi thông báo hệ thống real-time.
            </p>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <StatCard label="TỔNG THÔNG BÁO" value={notifications.length} sub={`${unreadNotifs.length} chưa đọc`} tone="var(--blue)" />
        <StatCard label="SỰ CỐ ĐANG MỞ" value={openEscalations.length} sub="Cần xử lý" tone="var(--amber)" />
        <StatCard label="ĐÃ GIẢI QUYẾT" value={resolvedEscalations.length} sub="Tháng này" tone="var(--green)" />
      </div>

      {/* NOTIFICATIONS FROM API */}
      {notifications.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
          <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", display: "block", marginBottom: 14 }}>
            THÔNG BÁO HỆ THỐNG ({notifications.length})
          </strong>
          <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
            {notifications.slice(0, 20).map((notif, i) => (
              <div
                key={notif.id || i}
                style={{
                  borderLeft: `3px solid ${notif.isRead ? "var(--line-strong)" : "var(--amber)"}`,
                  background: notif.isRead ? "var(--surface-muted)" : "var(--surface-strong)",
                  borderRadius: "0 6px 6px 0",
                  padding: "10px 14px",
                  display: "flex", alignItems: "center", gap: 10
                }}
              >
                <Bell size={14} style={{ flexShrink: 0, color: notif.isRead ? "var(--text-muted)" : "var(--amber)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{notif.message || notif.title || "Thông báo"}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                    {notif.createdAt ? new Date(notif.createdAt).toLocaleString("vi-VN") : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ESCALATION TICKETS */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
        <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", display: "block", marginBottom: 14 }}>
          DANH SÁCH SỰ CỐ / ESCALATION
        </strong>

        {loadingEsc && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Đang tải danh sách sự cố...
          </div>
        )}

        {escError && (
          <div style={{ padding: 16, textAlign: "center", color: "var(--red)", fontSize: "0.85rem", background: "rgba(193, 80, 63, 0.08)", borderRadius: 6 }}>
            {escError}
          </div>
        )}

        {!loadingEsc && !escError && escalations.length === 0 && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <CheckCircle2 size={32} style={EMPTY_STATE_ICON_STYLE} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 8 }}>
              Không có sự cố nào cần xử lý. Hệ thống đang hoạt động bình thường.
            </p>
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          {escalations.map((esc) => {
            const isOpen = esc.status === "open";
            return (
              <div
                key={esc.id}
                style={{
                  borderLeft: `3px solid ${isOpen ? "var(--status-critical)" : "var(--status-ok)"}`,
                  background: "var(--surface-strong)",
                  border: isOpen ? "1px solid rgba(193, 80, 63, 0.3)" : "1px solid var(--line)",
                  borderRadius: "0 6px 6px 0",
                  padding: "16px 18px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--blue)", fontWeight: 600 }}>
                      #{esc.id}
                    </span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--text-primary)" }}>
                      {esc.title || esc.description || "Sự cố"}
                    </strong>
                  </div>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 600, fontFamily: "var(--font-mono)",
                    padding: "2px 8px", borderRadius: 4,
                    background: isOpen ? "rgba(193, 80, 63, 0.15)" : "rgba(95, 167, 119, 0.15)",
                    color: isOpen ? "var(--red)" : "var(--green)",
                    border: `1px solid ${isOpen ? "rgba(193, 80, 63, 0.3)" : "rgba(95, 167, 119, 0.3)"}`
                  }}>
                    {isOpen ? "CẦN XỬ LÝ" : "ĐÃ GIẢI QUYẾT"}
                  </span>
                </div>

                {esc.description && (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>
                    {esc.description}
                  </div>
                )}

                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
                  Mức độ: <strong style={{ color: esc.severity === "critical" ? "var(--red)" : "var(--amber)" }}>{esc.severity || "N/A"}</strong>
                  {esc.createdAt && <> • <span style={{ fontFamily: "var(--font-mono)" }}>{new Date(esc.createdAt).toLocaleString("vi-VN")}</span></>}
                </div>

                {isOpen && (
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleResolve(esc.id, "REJECT")}
                      style={{ fontSize: "0.78rem", padding: "6px 14px", fontFamily: "var(--font-mono)", color: "var(--red)" }}
                    >
                      Từ Chối
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleResolve(esc.id, "APPROVE")}
                      style={{ fontSize: "0.78rem", padding: "6px 16px", fontFamily: "var(--font-mono)", background: "var(--green)", color: "#14161A", fontWeight: 700 }}
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

function StatCard({ label, value, sub, tone }) {
  return (
    <div style={{
      borderLeft: `3px solid ${tone}`,
      background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "0 8px 8px 0", padding: "16px 18px"
    }}>
      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", display: "block" }}>{label}</span>
      <strong style={{ fontSize: "1.6rem", color: tone, fontFamily: "var(--font-mono)" }}>{value}</strong>
      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}
