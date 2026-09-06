import React from "react";
import { Activity, Cpu, Zap, ShieldCheck, Server, AlertTriangle, RefreshCw, Layers, CheckCircle2, ArrowRight, Thermometer } from "lucide-react";

function getStatusColor(value, thresholds) {
  if (value >= thresholds[1]) return "var(--status-critical)";
  if (value >= thresholds[0]) return "var(--status-warning)";
  return "var(--status-ok)";
}

export function MissionControlOverview({ dashboard, resources = [], onNavigate }) {
  const stats = dashboard?.stats || {};
  const telemetry = dashboard?.telemetry || [];
  const alerts = dashboard?.alerts || [];
  const upcomingBookings = dashboard?.upcomingBookings || [];

  const totalResources = resources.length || Object.values(stats.resourcesByType || {}).reduce((s, v) => s + v, 0);
  const pendingBookings = stats.pendingBookings || 0;
  const unreadNotifications = stats.unreadNotifications || 0;
  const alertCount = stats.alerts || alerts.length;

  const metrics = [
    {
      id: "resources",
      label: "TỔNG TÀI NGUYÊN",
      value: totalResources,
      subtext: `${Object.keys(stats.resourcesByType || {}).length} loại thiết bị`,
      tone: "var(--amber)",
      icon: Server
    },
    {
      id: "pending",
      label: "BOOKING ĐANG CHỜ",
      value: pendingBookings,
      subtext: "Cần phê duyệt",
      tone: pendingBookings > 5 ? "var(--amber)" : "var(--green)",
      icon: Activity
    },
    {
      id: "alerts",
      label: "CẢNH BÁO THIẾT BỊ",
      value: alertCount,
      subtext: alertCount > 0 ? "Cần kiểm tra" : "Hệ thống ổn định",
      tone: alertCount > 0 ? "var(--red)" : "var(--green)",
      icon: AlertTriangle
    },
    {
      id: "notifications",
      label: "THÔNG BÁO CHƯA ĐỌC",
      value: unreadNotifications,
      subtext: "Từ hệ thống",
      tone: "var(--purple)",
      icon: Zap
    }
  ];

  // Use real telemetry data from dashboard API, or resources as fallback
  const devices = telemetry.length > 0
    ? telemetry.map(t => ({
      id: t.resource?.code || t.resource?.id,
      name: t.resource?.name || "N/A",
      type: t.resource?.type || "",
      temperature: t.latestTelemetry?.temperature ?? t.resource?.latestTelemetry?.temperature ?? null,
      healthIndex: t.resource?.operational?.readinessScore ?? null,
      powerWatts: t.latestTelemetry?.powerWatts ?? null,
      status: t.resource?.status || t.resource?.operationalStatus || "unknown",
      statusLabel: t.resource?.operational?.attention ? "CẦN CHÚ Ý" : "HOẠT ĐỘNG",
      statusTone: t.resource?.operational?.attention ? "warning" : "ok"
    }))
    : resources.slice(0, 8).map(r => ({
      id: r.code || r.id,
      name: r.name || "N/A",
      type: r.type || "",
      temperature: null,
      healthIndex: null,
      powerWatts: null,
      status: r.operationalStatus || r.status || "unknown",
      statusLabel: r.operationalStatus === "available" ? "SẴN SÀNG" : (r.operationalStatus || "").toUpperCase(),
      statusTone: r.operationalStatus === "available" ? "ok" : "warning"
    }));

  const hasData = dashboard !== null;

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* TOP METRICS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              style={{
                borderLeft: `3px solid ${m.tone}`,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "0 8px 8px 0",
                padding: "16px 18px",
                position: "relative"
              }}
            >
              <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 3, background: m.tone, borderRadius: "8px 0 0 8px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
                  {m.label}
                </span>
                <Icon size={16} style={{ color: m.tone }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", lineHeight: 1.1 }}>
                {hasData ? m.value : "—"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                {hasData ? m.subtext : "Đang tải..."}
              </div>
            </div>
          );
        })}
      </div>

      {/* DEVICE TELEMETRY MATRIX */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Server size={18} style={{ color: "var(--amber)" }} />
            <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}>
              MA TRẬN GIÁM SÁT THIẾT BỊ
            </strong>
          </div>
          {telemetry.length > 0 && (
            <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--green)", background: "rgba(95, 167, 119, 0.1)", padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(95, 167, 119, 0.2)" }}>
              ● DỮ LIỆU TRỰC TIẾP
            </span>
          )}
        </div>

        {devices.length === 0 && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <Server size={32} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 8 }}>
              {hasData ? "Chưa có thiết bị nào trong hệ thống." : "Đang tải dữ liệu thiết bị..."}
            </p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: 14 }}>
          {devices.map((dev) => {
            const temp = dev.temperature;
            const health = dev.healthIndex;
            const isCritical = (temp !== null && temp >= 85) || (health !== null && health < 40);
            const isWarning = temp !== null && temp >= 70 && temp < 85;

            const stripColor = isCritical ? "var(--status-critical)" : (isWarning ? "var(--status-warning)" : "var(--status-ok)");

            return (
              <div
                key={dev.id}
                style={{
                  borderLeft: `3px solid ${stripColor}`,
                  background: "var(--surface-strong)",
                  border: isCritical ? "1px solid var(--red)" : "1px solid var(--line)",
                  borderRadius: "0 8px 8px 0",
                  padding: "16px 18px"
                }}
              >
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 3, background: stripColor, borderRadius: "8px 0 0 8px" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        {dev.id}
                      </strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{dev.name}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {dev.type}
                    </div>
                  </div>

                  <span style={{
                    fontSize: "0.7rem", fontWeight: 600, fontFamily: "var(--font-mono)",
                    padding: "3px 8px", borderRadius: 4,
                    background: dev.statusTone === "ok" ? "rgba(95, 167, 119, 0.12)" : "rgba(227, 162, 60, 0.12)",
                    color: dev.statusTone === "ok" ? "var(--green)" : "var(--amber)",
                    border: `1px solid ${dev.statusTone === "ok" ? "rgba(95, 167, 119, 0.3)" : "rgba(227, 162, 60, 0.3)"}`
                  }}>
                    {dev.statusLabel}
                  </span>
                </div>

                {/* SENSOR READINGS */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, margin: "14px 0", background: "var(--surface-muted)", padding: "10px 12px", borderRadius: 6 }}>
                  <div>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block" }}>NHIỆT ĐỘ</span>
                    <strong style={{ fontSize: "1.05rem", fontFamily: "var(--font-mono)", color: temp !== null ? getStatusColor(temp, [70, 85]) : "var(--text-muted)" }}>
                      {temp !== null ? `${temp}°C` : "—"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block" }}>HEALTH</span>
                    <strong style={{ fontSize: "1.05rem", fontFamily: "var(--font-mono)", color: health !== null ? getStatusColor(100 - health, [25, 60]) : "var(--text-muted)" }}>
                      {health !== null ? `${health}/100` : "—"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block" }}>CÔNG SUẤT</span>
                    <strong style={{ fontSize: "1.05rem", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                      {dev.powerWatts !== null ? `${dev.powerWatts}W` : "—"}
                    </strong>
                  </div>
                </div>

                {/* HEALTH BAR */}
                {health !== null && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 3 }}>
                      <span>Health Index</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{health}%</span>
                    </div>
                    <div style={{ height: 4, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        width: `${health}%`, height: "100%",
                        background: getStatusColor(100 - health, [25, 60]),
                        transition: "width 0.5s ease"
                      }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* UPCOMING BOOKINGS */}
      {upcomingBookings.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "20px 22px" }}>
          <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)", display: "block", marginBottom: 14 }}>
            LỊCH ĐẶT SẮP TỚI ({upcomingBookings.length})
          </strong>
          <div style={{ display: "grid", gap: 8 }}>
            {upcomingBookings.slice(0, 6).map((bk, i) => (
              <div key={bk.id || i} style={{
                borderLeft: "3px solid var(--status-info)",
                background: "var(--surface-strong)", borderRadius: "0 6px 6px 0", padding: "10px 14px",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                    {bk.resourceName || bk.resource?.name || "N/A"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {bk.startAt ? new Date(bk.startAt).toLocaleString("vi-VN") : ""} — {bk.requestedBy?.fullName || ""}
                  </div>
                </div>
                <span style={{
                  fontSize: "0.68rem", fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 4,
                  background: bk.status === "approved" ? "rgba(95, 167, 119, 0.1)" : "rgba(227, 162, 60, 0.1)",
                  color: bk.status === "approved" ? "var(--green)" : "var(--amber)"
                }}>
                  {(bk.status || "").toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
