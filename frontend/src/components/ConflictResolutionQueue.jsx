import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ArrowRight, ShieldCheck, RefreshCw, Filter, Zap, UserCheck, XCircle, TrendingUp, Calendar } from "lucide-react";

export function ConflictResolutionQueue() {
  const [filter, setFilter] = useState("ALL"); // ALL | PENDING | FORECASTED | AUTO_RESOLVED | ESCALATED
  const [conflicts, setConflicts] = useState([
    {
      id: "CONF-2026-001",
      resourceCode: "GPU-H100-01",
      resourceName: "NVIDIA H100 SXM5 Node #1",
      timeSlot: "14:00 - 16:00 (Hôm nay)",
      conflictReason: "Trùng khung giờ trên cùng thiết bị vật lý",
      status: "PENDING",
      statusLabel: "CẦN PHÊ DUYỆT",
      statusTone: "amber",
      requestA: {
        id: "REQ-841",
        userName: "NCS. Nguyễn Văn An",
        userRole: "Nghiên cứu sinh Tiến sĩ (PhD)",
        project: "Mô hình Thị giác 3D (CVPR Deadline)",
        urgency: "Khẩn Cấp (Paper Deadline)",
        priorityScore: 92,
        hasCert: true
      },
      requestB: {
        id: "REQ-849",
        userName: "SV. Trần Thị Bình",
        userRole: "Sinh viên Đại học (Undergrad)",
        project: "Đồ án Môn học Xử lý Ảnh",
        urgency: "Đồ án Môn học",
        priorityScore: 48,
        hasCert: true
      },
      proposal: {
        action: "Cấp phát GPU-H100-01 cho NCS. Nguyễn Văn An (Ưu tiên Deadline CVPR: 92 điểm). Di chuyển tác vụ SV. Trần Thị Bình sang máy chủ NVIDIA L40S-01 cùng khung giờ 14:00 (đáp ứng 100% tài nguyên).",
        waitDeltaHours: 0,
        energySavedVnd: 12500,
        isLossless: true
      }
    },
    {
      id: "FORECAST-2026-004",
      resourceCode: "GPU-H100-01",
      resourceName: "NVIDIA H100 SXM5 Cluster",
      timeSlot: "14:00 - 16:00 (Thứ Tư Tuần Tới)",
      conflictReason: "Xác suất tắc nghẽn lịch sử P = 85.0% (Vượt ngưỡng cảnh báo 75%)",
      status: "FORECASTED",
      statusLabel: "DỰ BÁO XUNG ĐỘT (TẦN SUẤT LỊCH SỬ)",
      statusTone: "blue",
      congestionPercent: 85.0,
      rollingWeeks: 8,
      suggestedSlot: "10:00 - 12:00 (Cùng ngày Thứ Tư)",
      suggestedSlotLoadPercent: 20.0,
      requestA: {
        id: "PRED-102",
        userName: "ThS. Lê Hoàng Long",
        userRole: "Học viên Cao học (Master)",
        project: "Huấn luyện LLM Y Tế",
        urgency: "Bảo vệ Luận văn",
        priorityScore: 79,
        hasCert: true
      },
      requestB: null,
      proposal: {
        action: "Khung giờ 14:00 Thứ Tư tuần tới có xác suất quá tải 85.0% dựa trên tần suất 8 tuần gần nhất. Gợi ý dịch chuyển ca sang 10:00 - 12:00 cùng ngày (mức tải dự kiến chỉ 20.0%).",
        waitDeltaHours: 0,
        energySavedVnd: 15400,
        isLossless: true
      }
    },
    {
      id: "CONF-2026-002",
      resourceCode: "GPU-H100-02",
      resourceName: "NVIDIA H100 SXM5 Node #2",
      timeSlot: "09:00 - 12:00 (Hôm nay)",
      conflictReason: "Nhiệt độ node vượt 85°C kích hoạt tái điều phối bảo vệ",
      status: "AUTO_RESOLVED",
      statusLabel: "ĐÃ CHUYỂN TẢI AN TOÀN",
      statusTone: "green",
      requestA: {
        id: "REQ-830",
        userName: "ThS. Lê Hoàng Long",
        userRole: "Học viên Cao học (Master)",
        project: "Huấn luyện LLM Y Tế",
        urgency: "Bảo vệ Luận văn",
        priorityScore: 78,
        hasCert: true
      },
      requestB: null,
      proposal: {
        action: "Đã chuyển tác vụ từ GPU-H100-02 sang GPU-L40S-01 lúc 09:02 để bảo vệ phần cứng do quá nhiệt. Thời gian phục hồi 3.5s.",
        waitDeltaHours: 0,
        energySavedVnd: 8400,
        isLossless: true
      }
    },
    {
      id: "CONF-2026-003",
      resourceCode: "DRONE-MATRICE-300",
      resourceName: "DJI Matrice 300 RTK Lab Node",
      timeSlot: "15:30 - 17:30 (Hôm nay)",
      conflictReason: "Hai yêu cầu có mức độ ưu tiên ngang nhau (70 vs 72 điểm)",
      status: "ESCALATED",
      statusLabel: "CHUYỂN TRƯỞNG LAB DUYỆT",
      statusTone: "red",
      requestA: {
        id: "REQ-855",
        userName: "NCS. Phạm Quốc Huy",
        userRole: "Nghiên cứu sinh (Robotics)",
        project: "Thử nghiệm Bay Quét Lidar",
        urgency: "Dự án NAFOSTED",
        priorityScore: 72,
        hasCert: true
      },
      requestB: {
        id: "REQ-856",
        userName: "ThS. Đỗ Minh Khang",
        userRole: "Học viên Cao học (Robotics)",
        project: "SLAM Tự Hành Ngoài Trời",
        urgency: "Dự án NAFOSTED",
        priorityScore: 70,
        hasCert: true
      },
      proposal: {
        action: "Độ chênh lệch ưu tiên < 5 điểm. Đề xuất Trưởng phòng Lab chọn trực tiếp người bay trước hoặc phân bổ slot ngày mai 08:00 cho bên còn lại.",
        waitDeltaHours: 2.0,
        energySavedVnd: 0,
        isLossless: false
      }
    }
  ]);

  function handleAcceptSuggestion(confId) {
    setConflicts((prev) =>
      prev.map((c) =>
        c.id === confId
          ? {
              ...c,
              status: "AUTO_RESOLVED",
              statusLabel: c.status === "FORECASTED" ? "ĐÃ PHÊ DUYỆT DỊCH CHUYỂN" : "ĐÃ PHÊ DUYỆT PHÂN BỔ",
              statusTone: "green"
            }
          : c
      )
    );
  }

  const filteredConflicts = conflicts.filter((c) => {
    if (filter === "PENDING") return c.status === "PENDING";
    if (filter === "FORECASTED") return c.status === "FORECASTED";
    if (filter === "AUTO_RESOLVED") return c.status === "AUTO_RESOLVED";
    if (filter === "ESCALATED") return c.status === "ESCALATED";
    return true;
  });

  const pendingCount = conflicts.filter((c) => c.status === "PENDING").length;
  const forecastCount = conflicts.filter((c) => c.status === "FORECASTED").length;
  const escalatedCount = conflicts.filter((c) => c.status === "ESCALATED").length;

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* OPERATIONS HEADER BANNER */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#06b6d4", background: "rgba(6, 182, 212, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(6, 182, 212, 0.25)" }}>
                REALTIME CONFLICT ORCHESTRATION HUB
              </span>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#10b981" }}>
                ● SSE LIVE DISPATCH STREAM
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Hàng Đợi Xử Lý & Dự Báo Xung Đột Tài Nguyên (Conflict Resolution & Trend Forecasting Queue)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
              Trung tâm chỉ huy vận hành hàng ngày của Quản lý Lab: Phát hiện trùng lịch thời gian thực, phân tích xu hướng đặt lịch 8 tuần gần nhất để dự báo quá tải chủ động, và hỗ trợ phê duyệt 1-chạm (Human-in-the-Loop).
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ background: "#0e121a", padding: "8px 14px", borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.06)", textAlign: "center" }}>
              <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>ĐANG CHỜ DUYỆT</span>
              <strong style={{ fontSize: "1.1rem", fontFamily: "var(--font-mono)", color: pendingCount > 0 ? "#f59e0b" : "#10b981" }}>
                {pendingCount} Ca
              </strong>
            </div>
            <div style={{ background: "#0e121a", padding: "8px 14px", borderRadius: 6, border: "1px solid rgba(2, 132, 199, 0.2)", textAlign: "center" }}>
              <span style={{ fontSize: "0.68rem", color: "#38bdf8", display: "block" }}>DỰ BÁO QUÁ TẢI</span>
              <strong style={{ fontSize: "1.1rem", fontFamily: "var(--font-mono)", color: "#38bdf8" }}>
                {forecastCount} Ca
              </strong>
            </div>
            <div style={{ background: "#0e121a", padding: "8px 14px", borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.06)", textAlign: "center" }}>
              <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>CẦN CAN THIỆP</span>
              <strong style={{ fontSize: "1.1rem", fontFamily: "var(--font-mono)", color: escalatedCount > 0 ? "#ef4444" : "#10b981" }}>
                {escalatedCount} Ca
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { id: "ALL", label: `Tất Cả (${conflicts.length})` },
          { id: "PENDING", label: `Chờ Phê Duyệt (${pendingCount})` },
          { id: "FORECASTED", label: `Dự Báo Xu Hướng Lịch Sử (${forecastCount})` },
          { id: "ESCALATED", label: `Cần Can Thiệp (${escalatedCount})` },
          { id: "AUTO_RESOLVED", label: "Đã Xử Lý Xong" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: "0.78rem",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              background: filter === tab.id ? (tab.id === "FORECASTED" ? "#0284c7" : "#06b6d4") : "#111620",
              color: filter === tab.id ? (tab.id === "FORECASTED" ? "#ffffff" : "#0b0e14") : "#94a3b8",
              fontWeight: filter === tab.id ? 800 : 500,
              border: tab.id === "FORECASTED" ? "1px solid rgba(2, 132, 199, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONFLICT LIST */}
      <div style={{ display: "grid", gap: 16 }}>
        {filteredConflicts.map((c) => {
          const isPending = c.status === "PENDING";
          const isEscalated = c.status === "ESCALATED";
          const isForecasted = c.status === "FORECASTED";

          return (
            <div
              key={c.id}
              style={{
                background: isForecasted ? "rgba(14, 25, 44, 0.95)" : "#111620",
                border: isForecasted
                  ? "1px solid rgba(2, 132, 199, 0.5)"
                  : isPending
                  ? "1px solid rgba(245, 158, 11, 0.4)"
                  : isEscalated
                  ? "1px solid rgba(239, 68, 68, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 8,
                padding: "18px 20px",
                boxShadow: isForecasted ? "0 4px 20px rgba(2, 132, 199, 0.15)" : "none"
              }}
            >
              {/* CARD TOPBAR */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <strong style={{ fontSize: "0.95rem", color: isForecasted ? "#38bdf8" : "#f8fafc", fontFamily: "var(--font-mono)" }}>
                    {c.id}
                  </strong>
                  <span style={{ fontSize: "0.82rem", color: isForecasted ? "#38bdf8" : "#06b6d4", background: isForecasted ? "rgba(2, 132, 199, 0.15)" : "rgba(6, 182, 212, 0.1)", padding: "2px 8px", borderRadius: 4 }}>
                    {c.resourceCode} — {c.resourceName}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                    Khung giờ: <strong style={{ color: "#f8fafc" }}>{c.timeSlot}</strong>
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    padding: "3px 10px",
                    borderRadius: 4,
                    background:
                      c.statusTone === "blue"
                        ? "rgba(2, 132, 199, 0.2)"
                        : c.statusTone === "green"
                        ? "rgba(16, 185, 129, 0.15)"
                        : c.statusTone === "amber"
                        ? "rgba(245, 158, 11, 0.15)"
                        : "rgba(239, 68, 68, 0.15)",
                    color:
                      c.statusTone === "blue"
                        ? "#38bdf8"
                        : c.statusTone === "green"
                        ? "#10b981"
                        : c.statusTone === "amber"
                        ? "#f59e0b"
                        : "#ef4444",
                    border: `1px solid ${
                      c.statusTone === "blue"
                        ? "rgba(2, 132, 199, 0.4)"
                        : c.statusTone === "green"
                        ? "rgba(16, 185, 129, 0.3)"
                        : c.statusTone === "amber"
                        ? "rgba(245, 158, 11, 0.3)"
                        : "rgba(239, 68, 68, 0.3)"
                    }`
                  }}
                >
                  {c.statusLabel}
                </span>
              </div>

              {/* REASON ROW */}
              <div style={{ fontSize: "0.82rem", color: "#cbd5e1", marginBottom: 12 }}>
                Lý do phát hiện: <strong style={{ color: isForecasted ? "#38bdf8" : "#f8fafc" }}>{c.conflictReason}</strong>
              </div>

              {/* COMPETING REQUESTS OR SINGLE REQUEST */}
              {c.requestB ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  {/* REQUEST A */}
                  <div style={{ background: "#161b26", padding: "12px 14px", borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: "0.68rem", color: "#06b6d4", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                        BÊN YÊU CẦU 1: {c.requestA.id}
                      </span>
                      <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#10b981", fontWeight: 700 }}>
                        Score: {c.requestA.priorityScore} pts
                      </span>
                    </div>
                    <strong style={{ fontSize: "0.88rem", color: "#f8fafc" }}>{c.requestA.userName}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{c.requestA.userRole}</div>
                    <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: 4 }}>
                      Dự án: <strong style={{ color: "#f8fafc" }}>{c.requestA.project}</strong> ({c.requestA.urgency})
                    </div>
                  </div>

                  {/* REQUEST B */}
                  <div style={{ background: "#161b26", padding: "12px 14px", borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: "0.68rem", color: "#f59e0b", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                        BÊN YÊU CẦU 2: {c.requestB.id}
                      </span>
                      <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#94a3b8", fontWeight: 700 }}>
                        Score: {c.requestB.priorityScore} pts
                      </span>
                    </div>
                    <strong style={{ fontSize: "0.88rem", color: "#f8fafc" }}>{c.requestB.userName}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{c.requestB.userRole}</div>
                    <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: 4 }}>
                      Dự án: <strong style={{ color: "#f8fafc" }}>{c.requestB.project}</strong> ({c.requestB.urgency})
                    </div>
                  </div>
                </div>
              ) : (
                c.requestA && (
                  <div style={{ background: isForecasted ? "#0c1527" : "#161b26", padding: "10px 14px", borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.06)", marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "0.68rem", color: isForecasted ? "#38bdf8" : "#06b6d4", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                          NGƯỜI DÙNG: {c.requestA.userName} ({c.requestA.userRole})
                        </span>
                        <div style={{ fontSize: "0.78rem", color: "#cbd5e1", marginTop: 2 }}>
                          Đề tài: <strong style={{ color: "#f8fafc" }}>{c.requestA.project}</strong> • Điểm ưu tiên: <strong style={{ color: "#10b981" }}>{c.requestA.priorityScore} pts</strong>
                        </div>
                      </div>
                      {isForecasted && (
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>XÁC SUẤT QUÁ TẢI (8 TUẦN)</span>
                          <strong style={{ fontSize: "1.1rem", fontFamily: "var(--font-mono)", color: "#38bdf8" }}>
                            {c.congestionPercent}%
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* ACTION PROPOSAL BOX */}
              <div
                style={{
                  background: isForecasted ? "rgba(2, 132, 199, 0.08)" : "rgba(6, 182, 212, 0.06)",
                  border: isForecasted ? "1px solid rgba(2, 132, 199, 0.3)" : "1px solid rgba(6, 182, 212, 0.2)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12
                }}
              >
                <div style={{ flex: 1, minWidth: 280 }}>
                  <span style={{ fontSize: "0.72rem", color: isForecasted ? "#38bdf8" : "#06b6d4", fontWeight: 700, fontFamily: "var(--font-mono)", display: "block", marginBottom: 2 }}>
                    {isForecasted ? "KHUYẾN NGHỊ DỊCH CHUYỂN CHỦ ĐỘNG (PROACTIVE SHIFT RECOMMENDATION)" : "PHƯƠNG ÁN ĐIỀU PHỐI ĐỀ XUẤT"}
                  </span>
                  <p style={{ fontSize: "0.82rem", color: "#f8fafc", margin: 0, lineHeight: 1.4 }}>
                    {c.proposal.action}
                  </p>
                </div>

                {/* APPROVE ACTION BUTTON (HUMAN-IN-THE-LOOP) */}
                {(c.status === "PENDING" || c.status === "FORECASTED") && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAcceptSuggestion(c.id)}
                    style={{
                      fontSize: "0.78rem",
                      padding: "8px 16px",
                      fontFamily: "var(--font-mono)",
                      background: isForecasted ? "#0284c7" : "#06b6d4",
                      color: "#ffffff",
                      fontWeight: 800,
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer"
                    }}
                  >
                    {isForecasted ? "Phê Duyệt Dịch Chuyển Lịch (1-Chạm)" : "Phê Duyệt Phương Án"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
