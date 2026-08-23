import React, { useState } from "react";
import { Bell, ShieldAlert, CheckCircle2, Clock, Activity, ArrowRight, UserCheck, AlertTriangle } from "lucide-react";

export function NotificationCenter() {
  const [escalations, setEscalations] = useState([
    {
      id: "ESC-2026-08-01",
      title: "Tranh Chấp Slot Drone DJI Matrice 300 (Ưu Tiên Ngang Nhau)",
      parties: "NCS. Phạm Quốc Huy (Score 72) vs ThS. Đỗ Minh Khang (Score 70)",
      reason: "Khoảng cách điểm ưu tiên < 5 điểm, hệ thống tự động chuyển cấp cho Trưởng Lab.",
      timestamp: "10:14 Hôm nay",
      status: "OPEN",
      statusLabel: "CHỜ QUYẾT ĐỊNH",
      statusTone: "red"
    },
    {
      id: "ESC-2026-08-02",
      title: "Yêu Cầu Vượt Quá 100% Định Mức Giờ GPU Hàng Tháng",
      parties: "Sinh viên Đồ án Tốt nghiệp (Nhóm 12) — Đã dùng 172/180h",
      reason: "Đề xuất mở rộng thêm 20 giờ chạy mô hình cho đợt bảo vệ tuần tới.",
      timestamp: "09:30 Hôm nay",
      status: "RESOLVED",
      statusLabel: "ĐÃ DUYỆT NGOẠI LỆ",
      statusTone: "green"
    }
  ]);

  function handleResolve(id, action) {
    setEscalations((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "RESOLVED", statusLabel: action === "APPROVE" ? "ĐÃ PHÊ DUYỆT" : "ĐÃ TỪ CHỐI", statusTone: action === "APPROVE" ? "green" : "red" } : e))
    );
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER BANNER */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#ef4444", background: "rgba(239, 68, 68, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(239, 68, 68, 0.25)" }}>
                ESCALATION & INCIDENT WORKFLOW
              </span>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#10b981" }}>
                ● MTTR = 2.4 PHÚT
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Trung Tâm Cảnh Báo & Xử Lý Escalation (Notification & Escalation Center)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
              Tiếp nhận và giải quyết các trường hợp ngoại lệ vượt ngoài khả năng tự động hóa của hệ thống, theo dõi chỉ số Mean Time To Resolve (MTTR).
            </p>
          </div>
        </div>
      </div>

      {/* OPS PERFORMANCE KPIS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 8, padding: "16px 18px" }}>
          <span style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "var(--font-mono)", display: "block" }}>THỜI GIAN GIẢI QUYẾT TB (MTTR)</span>
          <strong style={{ fontSize: "1.6rem", color: "#10b981", fontFamily: "var(--font-mono)" }}>
            2.4 Phút
          </strong>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>Phản hồi nhanh hơn 85% so với thủ công</div>
        </div>

        <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 8, padding: "16px 18px" }}>
          <span style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "var(--font-mono)", display: "block" }}>TỰ ĐỘNG XỬ LÝ THÀNH CÔNG</span>
          <strong style={{ fontSize: "1.6rem", color: "#06b6d4", fontFamily: "var(--font-mono)" }}>
            82.4%
          </strong>
          <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>Chỉ 17.6% ca cần con người duyệt</div>
        </div>

        <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 8, padding: "16px 18px" }}>
          <span style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "var(--font-mono)", display: "block" }}>TỔNG SỐ CA ESCALATED THÁNG NÀY</span>
          <strong style={{ fontSize: "1.6rem", color: "#f59e0b", fontFamily: "var(--font-mono)" }}>
            3 Ca
          </strong>
          <div style={{ fontSize: "0.72rem", color: "#10b981", marginTop: 2 }}>2 ca đã giải quyết, 1 ca đang mở</div>
        </div>
      </div>

      {/* ESCALATIONS TICKETS */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "20px 22px" }}>
        <strong style={{ fontSize: "0.9rem", color: "#f8fafc", fontFamily: "var(--font-heading)", display: "block", marginBottom: 14 }}>
          DANH SÁCH VỤ VIỆC CẦN PHÊ DUYỆT TRỰC TIẾP
        </strong>

        <div style={{ display: "grid", gap: 14 }}>
          {escalations.map((esc) => {
            const isOpen = esc.status === "OPEN";

            return (
              <div
                key={esc.id}
                style={{
                  background: "#161b26",
                  border: isOpen ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: 6,
                  padding: "16px 18px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#06b6d4", fontWeight: 700 }}>
                      {esc.id}
                    </span>
                    <strong style={{ fontSize: "0.92rem", color: "#f8fafc" }}>{esc.title}</strong>
                  </div>

                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: isOpen ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                      color: isOpen ? "#ef4444" : "#10b981",
                      border: `1px solid ${isOpen ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`
                    }}
                  >
                    {esc.statusLabel}
                  </span>
                </div>

                <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginBottom: 4 }}>
                  Các bên liên quan: <strong style={{ color: "#f8fafc" }}>{esc.parties}</strong>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 12 }}>
                  Lý do chuyển cấp: {esc.reason} • <span style={{ fontFamily: "var(--font-mono)", color: "#64748b" }}>{esc.timestamp}</span>
                </div>

                {isOpen && (
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleResolve(esc.id, "REJECT")}
                      style={{ fontSize: "0.78rem", padding: "6px 14px", fontFamily: "var(--font-mono)", color: "#ef4444" }}
                    >
                      Từ Chối Yêu Cầu
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleResolve(esc.id, "APPROVE")}
                      style={{ fontSize: "0.78rem", padding: "6px 16px", fontFamily: "var(--font-mono)", background: "#10b981", color: "#0b0e14", fontWeight: 800 }}
                    >
                      Phê Duyệt Ngoại Lệ
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
