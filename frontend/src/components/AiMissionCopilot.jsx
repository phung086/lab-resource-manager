import React, { useState } from "react";
import { Bot, Sparkles, Send, ShieldAlert, CheckCircle2, XCircle, Terminal, AlertTriangle } from "lucide-react";

export function AiMissionCopilot() {
  const [messages, setMessages] = useState([
    {
      id: "msg-1",
      sender: "system",
      text: "AI Copilot sẵn sàng với quyền hạn READ/WRITE phân tách theo chuẩn MCP (Model Context Protocol).",
      timestamp: "01:14:00"
    },
    {
      id: "msg-2",
      sender: "user",
      text: "Kiểm tra tình trạng quá nhiệt của cụm GPU H100 và đề xuất phương án xử lý.",
      timestamp: "01:14:02"
    },
    {
      id: "msg-3",
      sender: "assistant",
      traces: [
        { type: "READ", tool: "queryResourceTelemetry", payload: { resourceId: "GPU-H100-01" }, result: "Temp: 86.8°C, Power: 610W" },
        { type: "READ", tool: "computeResourceReadinessScore", payload: { resourceId: "GPU-H100-01" }, result: "Readiness: 34 (AHP CR=0.012)" },
        { type: "OPTIMIZER", tool: "runOptimizationAlgorithm", payload: { algorithm: "NSGA2", penalty: "Degradation" }, result: "Optimal Knee-Point: GPU-L40S-01" }
      ],
      text: "Cụm máy chủ NVIDIA H100 SXM5 (#1) đang quá nhiệt nghiêm trọng ở 86.8°C làm Readiness Score giảm xuống 34/100. Đề xuất: Tự động cách ly node và di chuyển tác vụ Job #482 sang máy chủ NVIDIA L40S (#1) đang rảnh với nhiệt độ an toàn 52.4°C.",
      pendingAction: {
        id: "ACT-8492",
        actionType: "WRITE / DESTRUCTIVE",
        title: "CÁCH LY THIẾT BỊ & TÁI PHÂN BỔ TÁC VỤ (QUARANTINE & DISPATCH)",
        target: "Chuyển Job #482 sang GPU-L40S-01 và khóa tạm thời GPU-H100-01 để làm mát.",
        status: "AWAITING_HUMAN_CONFIRMATION"
      },
      timestamp: "01:14:05"
    }
  ]);

  const [input, setInput] = useState("");
  const [actionConfirmed, setActionConfirmed] = useState(false);

  function handleSend(e) {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, sender: "user", text: input, timestamp: new Date().toLocaleTimeString("vi-VN") }
    ]);
    setInput("");
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER BANNER */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#06b6d4", background: "rgba(6, 182, 212, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(6, 182, 212, 0.25)" }}>
                MCP TRANSPARENT TOOL CALLING
              </span>
              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#f59e0b" }}>
                ● HUMAN-IN-THE-LOOP ACTIVE
              </span>
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-heading)", margin: "6px 0 2px 0" }}>
              Trợ Lý AI & Nhật Ký Truy Vết Hệ Thống (Mission AI Copilot)
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
              Minh bạch 100% từng bước truy vấn MCP (Model Context Protocol) và bắt buộc phê duyệt xác nhận của con người đối với mọi hành động ghi/phá hủy.
            </p>
          </div>
        </div>
      </div>

      {/* CHAT & TRACE CONSOLE */}
      <div style={{ background: "#111620", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: 8, padding: "20px 22px", minHeight: 460, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 16, marginBottom: 16 }}>
          {messages.map((m) => {
            const isUser = m.sender === "user";
            const isSystem = m.sender === "system";

            if (isSystem) {
              return (
                <div key={m.id} style={{ background: "#0e121a", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: 6, padding: "10px 14px", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#64748b" }}>
                  {m.text}
                </div>
              );
            }

            return (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#64748b", marginBottom: 3 }}>
                  {isUser ? "RESEARCHER (YOU)" : "AI MISSION ORCHESTRATOR"} • {m.timestamp}
                </div>

                <div
                  style={{
                    maxWidth: "85%",
                    background: isUser ? "#1e293b" : "#161b26",
                    border: isUser ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(6, 182, 212, 0.25)",
                    borderRadius: 8,
                    padding: "14px 16px",
                    color: "#f8fafc",
                    fontSize: "0.85rem",
                    lineHeight: 1.5
                  }}
                >
                  {/* MCP SYSTEM TRACES */}
                  {m.traces && (
                    <div style={{ background: "#0e121a", borderRadius: 6, padding: "10px 12px", marginBottom: 12, border: "1px solid rgba(255, 255, 255, 0.04)" }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#06b6d4", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                        <Terminal size={12} />
                        MCP SYSTEM TRACE EXECUTION LOG:
                      </div>
                      <div style={{ display: "grid", gap: 4, fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                        {m.traces.map((t, idx) => (
                          <div key={idx} style={{ color: "#94a3b8" }}>
                            <span style={{ color: t.type === "READ" ? "#3b82f6" : "#06b6d4", fontWeight: 700 }}>[{t.type}]</span> {t.tool} → <span style={{ color: "#f8fafc" }}>{t.result}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.text}

                  {/* HUMAN IN THE LOOP CONFIRMATION BOX */}
                  {m.pendingAction && (
                    <div style={{ marginTop: 14, background: "#0b0e14", border: "1px solid #f59e0b", borderRadius: 6, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <ShieldAlert size={16} style={{ color: "#f59e0b" }} />
                        <strong style={{ fontSize: "0.78rem", color: "#f59e0b", fontFamily: "var(--font-mono)" }}>
                          YÊU CẦU PHÊ DUYỆT CỦA CON NGƯỜI (HUMAN CONFIRMATION REQUIRED)
                        </strong>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#cbd5e1", margin: "4px 0 10px 0" }}>
                        {m.pendingAction.target}
                      </div>

                      {actionConfirmed ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#10b981" }}>
                          <CheckCircle2 size={14} />
                          ĐÃ XÁC NHẬN THỰC THI GIAO DỊCH — Tác vụ đã được chuyển an toàn sang GPU-L40S-01.
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-primary"
                            onClick={() => setActionConfirmed(true)}
                            style={{ fontSize: "0.75rem", padding: "6px 14px", fontFamily: "var(--font-mono)", background: "#10b981", color: "#0b0e14", fontWeight: 700 }}
                          >
                            XÁC NHẬN THỰC THI (CONFIRM)
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => {}}
                            style={{ fontSize: "0.75rem", padding: "6px 14px", fontFamily: "var(--font-mono)", color: "#ef4444" }}
                          >
                            HỦY BỎ (ABORT)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* INPUT PROMPT */}
        <form onSubmit={handleSend} style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi hoặc chỉ thị điều phối tài nguyên cho AI Copilot..."
            style={{ background: "#0e121a", border: "1px solid rgba(255, 255, 255, 0.12)", color: "#f8fafc", padding: "10px 14px", borderRadius: 6, fontSize: "0.85rem" }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ background: "#06b6d4", color: "#0b0e14", fontWeight: 700, padding: "0 18px", borderRadius: 6 }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
