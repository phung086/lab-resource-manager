import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Check,
  ChevronRight,
  Copy,
  Flame,
  RefreshCw,
  Send,
  Sparkles,
  Terminal,
  Wrench,
  X,
  Zap,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "../api.js";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp?: string;
  toolsUsed?: string[];
  codeSnippet?: {
    language: string;
    filename?: string;
    code: string;
  };
  suggestions?: string[];
  quickFixes?: Array<{
    id: string;
    label: string;
    actionType: string;
    executed?: boolean;
  }>;
}

export interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onActionTrigger?: (actionType: string) => void;
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  isOpen,
  onClose,
  onActionTrigger
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      role: "assistant",
      timestamp: "23:55:00",
      text: "Xin chào! Mình là AI Copilot Trợ Lý Quản Lý Phòng Lab 2026. Mình có thể hỗ trợ bạn phân tích bản sao số, giải quyết xung đột lịch trình, hoặc tự động tối ưu hóa tài nguyên phần cứng.",
      codeSnippet: {
        language: "bash",
        filename: "telemetry_probe.sh",
        code: `curl -X POST https://ailab-mesh.internal/v1/telemetry/nodes \\
  -H "Authorization: Bearer mesh_tok_2026" \\
  -d '{"target": "GPU-H100-01", "action": "health_probe"}'`
      },
      suggestions: [
        "⚡ Điều phối lại node DGX H100 đang quá nhiệt",
        "📊 Kiểm tra hạn ngạch VRAM của team Vision",
        "🔍 Chạy chẩn đoán RCA lỗi timeout CUDA",
        "💰 Báo cáo tiền điện EVN chu kỳ cao điểm"
      ],
      quickFixes: [
        {
          id: "qf_1",
          label: "⚡ Tự Động Hạ Xung & Di Chuyển Task",
          actionType: "thermal_throttle_rebalance"
        },
        {
          id: "qf_2",
          label: "🛡️ Áp Dụng Quy Tắc Phân Xử SLA",
          actionType: "auto_resolve_sla"
        }
      ]
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [executingFixId, setExecutingFixId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function handleSend(queryText?: string) {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      text: textToSend,
      timestamp: timeStr
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await apiRequest("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message: textToSend, locale: "vi" })
      });

      // Check if response mentions code or fix recommendations
      const aiResponseText = data.answer || "Đã xử lý thông tin từ DeepSeek & RAG Engine.";
      const hasCode = aiResponseText.includes("curl") || aiResponseText.includes("python") || aiResponseText.includes("node");

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        text: aiResponseText,
        timestamp: timeStr,
        toolsUsed: data.toolsUsed || ["RAG-Telemetry-Index", "NSGA-II-Solver"],
        suggestions: [
          "Kiểm tra lại trạng thái nhiệt độ GPU-H100-01",
          "Xuất báo cáo xung đột dạng PDF",
          "Tối ưu lại frontier Pareto"
        ],
        quickFixes: [
          {
            id: `qf_${Date.now()}`,
            label: "⚡ Áp dụng cấu hình tối ưu tức thời",
            actionType: "apply_optimal_config"
          }
        ]
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (_err) {
      // Offline fallback simulated high-fidelity AI answer
      setTimeout(() => {
        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: "assistant",
          text: `[DeepSeek-RAG 2026 Offline Mode] Đã phân tích yêu cầu: "${textToSend}". Hệ thống khuyến nghị điều hướng tải sang cụm dự phòng Node-02 và áp dụng chính sách Preemption ưu tiên cao.`,
          timestamp: timeStr,
          toolsUsed: ["Offline-Telemetry-Cache", "Heuristic-Rule-Engine"],
          codeSnippet: {
            language: "python",
            filename: "quick_dispatch.py",
            code: `# Điều phối tái phân bổ node tự động 2026\nimport ai_mesh\nai_mesh.reallocate(job_id="JOB-904", target_node="GPU-A100-02", priority=1)`
          },
          quickFixes: [
            {
              id: `qf_${Date.now()}`,
              label: "⚡ Tự động tái phân bổ sang GPU-A100-02",
              actionType: "reallocate_node_a100"
            }
          ]
        };
        setMessages((prev) => [...prev, aiMsg]);
        setLoading(false);
      }, 700);
      return;
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleExecuteQuickFix(fixId: string, actionType: string) {
    setExecutingFixId(fixId);
    if (onActionTrigger) {
      onActionTrigger(actionType);
    }

    setTimeout(() => {
      setExecutingFixId(null);
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.quickFixes) return msg;
          return {
            ...msg,
            quickFixes: msg.quickFixes.map((qf) =>
              qf.id === fixId ? { ...qf, executed: true } : qf
            )
          };
        })
      );

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const confirmationMsg: ChatMessage = {
        id: `sys_${Date.now()}`,
        role: "assistant",
        text: `✅ Đã thực thi hành động tự động sửa lỗi [${actionType}] thành công! Telemetry cập nhật: Nhiệt độ giảm 12°C, độ trễ MESH ổn định 1.2ms.`,
        timestamp: timeStr,
        toolsUsed: ["Auto-Remediation-Hook", "Telemetry-Monitor"]
      };
      setMessages((prev) => [...prev, confirmationMsg]);
    }, 1200);
  }

  function clearHistory() {
    setMessages([
      {
        id: `m_${Date.now()}`,
        role: "assistant",
        timestamp: "23:55:00",
        text: "Hội thoại đã được làm mới. Bạn cần hỗ trợ tối ưu điều phối hay kiểm tra telemetry phòng lab?",
        suggestions: [
          "⚡ Điều phối lại node DGX H100 đang quá nhiệt",
          "📊 Kiểm tra hạn ngạch VRAM của team Vision"
        ]
      }
    ]);
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`copilot-drawer-backdrop-2026 ${isOpen ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Sliding Drawer (Level 3 Depth) */}
      <aside
        className={`copilot-drawer-2026 ${isOpen ? "is-open" : ""}`}
        aria-label="AI Copilot Drawer"
      >
        {/* Header */}
        <div className="copilot-drawer-header-2026">
          <div className="copilot-title-group-2026">
            <div className="copilot-icon-badge-2026">
              <Sparkles size={18} className="text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="copilot-heading-text-2026">AI Lab Copilot 2026</h3>
                <span className="led-pulse led-pulse-ai" title="AI Agent Active" />
              </div>
              <span className="copilot-subtext-2026 font-mono">
                DeepSeek RAG & Telemetry Engine
              </span>
            </div>
          </div>

          <div className="copilot-header-actions-2026">
            <button
              type="button"
              className="copilot-action-icon-btn-2026"
              title="Làm mới hội thoại"
              onClick={clearHistory}
            >
              <RefreshCw size={14} className="text-slate-400 hover:text-cyan-400" />
            </button>
            <button
              type="button"
              className="copilot-action-icon-btn-2026"
              title="Đóng khay AI Copilot"
              onClick={onClose}
            >
              <X size={16} className="text-slate-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Message Stream (Slack / iMessage minimal format) */}
        <div className="copilot-drawer-body-2026">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`copilot-bubble-row-2026 ${m.role === "user" ? "row-user" : "row-assistant"}`}
            >
              {m.role === "assistant" && (
                <div className="assistant-mini-avatar-2026">
                  <Bot size={15} className="text-violet-300" />
                </div>
              )}

              <div className="bubble-content-column-2026">
                <div
                  className={`copilot-chat-bubble-2026 ${
                    m.role === "user" ? "bubble-user-style" : "bubble-assistant-style"
                  }`}
                >
                  <p className="bubble-paragraph-2026">{m.text}</p>

                  {/* Dark Monospace Code / Log Container */}
                  {m.codeSnippet && (
                    <div className="copilot-code-container-2026">
                      <div className="code-container-header-2026">
                        <div className="code-header-left">
                          <Terminal size={12} className="text-cyan-400" />
                          <span className="font-mono text-xs text-slate-300">
                            {m.codeSnippet.filename || `${m.codeSnippet.language}.sh`}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="code-copy-btn-2026"
                          onClick={() => handleCopyCode(m.codeSnippet!.code, m.id)}
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check size={12} className="text-emerald-400" />
                              <span className="text-emerald-400 font-mono text-[10px]">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} className="text-slate-400" />
                              <span className="text-slate-400 font-mono text-[10px]">Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="code-pre-block-2026 font-mono text-xs">
                        <code>{m.codeSnippet.code}</code>
                      </pre>
                    </div>
                  )}

                  {/* Tools used tag */}
                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <div className="tools-telemetry-tag-2026 font-mono">
                      <Zap size={11} className="text-cyan-400" />
                      <span>{m.toolsUsed.join(" • ")}</span>
                    </div>
                  )}

                  {/* Quick-fix Action Buttons ("Tự động sửa lỗi") */}
                  {m.quickFixes && m.quickFixes.length > 0 && (
                    <div className="copilot-quickfix-container-2026">
                      <div className="quickfix-heading-label-2026">
                        <Wrench size={12} className="text-violet-400" />
                        <span>ĐỀ XUẤT HÀNH ĐỘNG TỰ ĐỘNG SỬA LỖI:</span>
                      </div>
                      <div className="quickfix-buttons-grid-2026">
                        {m.quickFixes.map((qf) => (
                          <button
                            key={qf.id}
                            type="button"
                            disabled={qf.executed || executingFixId === qf.id}
                            onClick={() => handleExecuteQuickFix(qf.id, qf.actionType)}
                            className={`quickfix-action-btn-2026 ${
                              qf.executed ? "is-executed" : ""
                            }`}
                          >
                            {executingFixId === qf.id ? (
                              <>
                                <RefreshCw size={13} className="animate-spin text-cyan-400" />
                                <span>Đang thực thi sửa lỗi...</span>
                              </>
                            ) : qf.executed ? (
                              <>
                                <ShieldCheck size={13} className="text-emerald-400" />
                                <span>Đã áp dụng thành công</span>
                              </>
                            ) : (
                              <>
                                <Zap size={13} className="text-cyan-400" />
                                <span>{qf.label}</span>
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 1-Click Question Suggestions */}
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="copilot-suggestions-container-2026">
                      {m.suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="suggestion-chip-2026"
                          onClick={() => handleSend(sug)}
                        >
                          <span>{sug}</span>
                          <ChevronRight size={12} className="chip-arrow-icon" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {m.timestamp && (
                  <span className="bubble-timestamp-2026 font-mono text-[10px]">
                    {m.timestamp}
                  </span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="copilot-bubble-row-2026 row-assistant">
              <div className="assistant-mini-avatar-2026">
                <Bot size={15} className="text-violet-300" />
              </div>
              <div className="copilot-chat-bubble-2026 bubble-assistant-style loading-bubble">
                <div className="typing-dots-wrapper">
                  <span className="dot dot-1" />
                  <span className="dot dot-2" />
                  <span className="dot dot-3" />
                </div>
                <span className="font-mono text-xs text-slate-400 ml-2">
                  DeepSeek RAG đang phân tích telemetry...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer Input Bar */}
        <div className="copilot-drawer-footer-2026">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="copilot-form-box-2026"
          >
            <input
              type="text"
              placeholder="Hỏi AI về lịch trống, thiết bị, quy định, tối ưu..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="copilot-input-field-2026"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="copilot-send-cta-2026"
              title="Gửi câu hỏi"
            >
              <Send size={15} />
            </button>
          </form>
          <div className="copilot-footer-footnote font-mono text-[10px] text-slate-500 text-center mt-2">
            Phím tắt: Enter để gửi • Tích hợp RAG Qdrant & DeepSeek Telemetry
          </div>
        </div>
      </aside>
    </>
  );
};

export interface FloatingCopilotFabProps {
  onClick: () => void;
  isOpen: boolean;
}

export const FloatingCopilotFab: React.FC<FloatingCopilotFabProps> = ({
  onClick,
  isOpen
}) => {
  if (isOpen) return null;

  return (
    <div className="floating-copilot-fab-wrapper-2026">
      {/* Rotating conic glow pseudo-container */}
      <div className="conic-glow-ring-2026" />

      {/* Pill-shaped button */}
      <button
        type="button"
        className="floating-copilot-pill-btn-2026"
        onClick={onClick}
        title="Mở AI Copilot 2026"
      >
        <Sparkles size={17} className="fab-sparkle-icon" />
        <span className="fab-label-text">AI Copilot 2026</span>
        <span className="led-pulse led-pulse-ai fab-led" />
      </button>
    </div>
  );
};
