import React from "react";
import { Activity, Cpu, Zap, ShieldCheck, Server, AlertTriangle, RefreshCw, Layers, CheckCircle2, ArrowRight, Thermometer } from "lucide-react";
import { useLiveTelemetry } from "../hooks/useLiveTelemetry.ts";
import { TelemetryBentoGrid } from "./TelemetryNodeCard.tsx";

function getStatusColor(value, thresholds) {
  if (value >= thresholds[1]) return "var(--status-critical)";
  if (value >= thresholds[0]) return "var(--status-warning)";
  return "var(--status-ok)";
}

export function MissionControlOverview({ dashboard, resources = [], onNavigate }) {
  const { nodes: liveNodes, isUpdating, lastUpdated, toggleNodeMaintenance } = useLiveTelemetry(2500);
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
      tone: "var(--cyan-core)",
      pulse: "led-pulse-cyan",
      icon: Server
    },
    {
      id: "pending",
      label: "BOOKING ĐANG CHỜ",
      value: pendingBookings,
      subtext: "Cần phê duyệt",
      tone: pendingBookings > 5 ? "var(--amber-warn)" : "var(--emerald-safe)",
      pulse: pendingBookings > 5 ? "led-pulse-warn" : "led-pulse-safe",
      icon: Activity
    },
    {
      id: "alerts",
      label: "CẢNH BÁO THIẾT BỊ",
      value: alertCount,
      subtext: alertCount > 0 ? "Cần kiểm tra" : "Hệ thống ổn định",
      tone: alertCount > 0 ? "var(--rose-alert)" : "var(--emerald-safe)",
      pulse: alertCount > 0 ? "led-pulse-alert" : "led-pulse-safe",
      icon: AlertTriangle
    },
    {
      id: "notifications",
      label: "THÔNG BÁO CHƯA ĐỌC",
      value: unreadNotifications,
      subtext: "Từ hệ thống",
      tone: "var(--violet-ai)",
      pulse: "led-pulse-ai",
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
      {/* TOP HERO METRICS (LEVEL 1 CARDS) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className="card"
              style={{
                position: "relative",
                padding: "18px 20px",
                borderLeft: `3px solid ${m.tone}`,
                background: "var(--surface-card)",
                backdropFilter: "blur(16px)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
                  {m.label}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`led-pulse ${m.pulse}`} />
                  <Icon size={16} style={{ color: m.tone }} />
                </div>
              </div>
              <div className="font-mono" style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>
                {hasData ? m.value : "—"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{hasData ? m.subtext : "Đang tải dữ liệu telemetry..."}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. STANDARDIZED BENTO GRID TELEMETRY CARDS (2026 EDITION) */}
      <TelemetryBentoGrid
        nodes={liveNodes}
        isUpdating={isUpdating}
        onToggleMaintenance={toggleNodeMaintenance}
        lastUpdated={lastUpdated}
      />

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
