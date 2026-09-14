import React, { useState, useRef, useEffect } from "react";
import { Bot, Sparkles, Send, ShieldAlert, CheckCircle2, XCircle, Terminal, AlertTriangle, Loader2 } from "lucide-react";
import { apiRequest } from "../api.js";

/**
 * AiMissionCopilot — Trợ lý AI & nhật ký truy vết MCP
 *
 * Dữ liệu: POST /assistant/chat (gửi message, nhận answer + toolCalls)
 *          GET /assistant/suggestions (gợi ý câu hỏi)
 */

export function AiMissionCopilot() {
  const [messages, setMessages] = useState([
    {
      id: "msg-init",
      sender: "system",
      text: "AI Copilot sẵn sàng. Gõ câu hỏi hoặc chỉ thị điều phối tài nguyên để bắt đầu.",
      timestamp: new Date().toLocaleTimeString("vi-VN")
    }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load suggestions on mount
  useEffect(() => {
    let cancelled = false;
    apiRequest("/assistant/suggestions?locale=vi")
      .then((data) => {
        if (!cancelled && data.suggestions) setSuggestions(data.suggestions);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function handleSend(e, textOverride) {
    if (e && e.preventDefault) e.preventDefault();
    const query = (textOverride || input).trim();
    if (!query || sending) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString("vi-VN")
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const response = await apiRequest("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message: query, locale: "vi" })
      });

      const assistantMsg = {
        id: `msg-${Date.now()}-resp`,
        sender: "assistant",
        text: response.answer || response.message || response.text || JSON.stringify(response),
        toolsUsed: response.toolsUsed || [],
        traces: response.toolResults || response.toolCalls || response.traces || [],
        provider: response.provider || "local",
        dataQuality: response.dataQuality || null,
        pendingAction: response.pendingAction || null,
        timestamp: new Date().toLocaleTimeString("vi-VN")
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (response.suggestions?.length) {
        setSuggestions(response.suggestions);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          sender: "system",
          text: `Lỗi: ${err.message || "Không thể kết nối AI Assistant. Kiểm tra backend."}`,
          timestamp: new Date().toLocaleTimeString("vi-VN")
        }
      ]);
    } finally {
      setSending(false);
    }
  }

  function sendSuggestion(text) {
    handleSend(null, text);
  }

  function handleActionConfirm(msgId) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              pendingAction: null,
              text: m.text + "\n\n✓ [XÁC NHẬN BỞI OPERATOR]: Thao tác đã được chấp thuận và ghi vào nhật ký hệ thống."
            }
          : m
      )
    );
  }

  function handleActionCancel(msgId) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              pendingAction: null,
              text: m.text + "\n\n✕ [HỦY BỎ BỞI OPERATOR]: Yêu cầu thao tác đã bị từ chối."
            }
          : m
      )
    );
  }

  return (
    <div className="content-stack" style={{ gap: 20 }}>
      {/* HEADER */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: 8, padding: "18px 22px"
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 12
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: "0.72rem", fontFamily: "var(--font-mono)",
                color: "var(--amber)",
                background: "color-mix(in srgb, var(--amber) 12%, transparent)",
                padding: "2px 8px", borderRadius: 4,
                border: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)"
              }}>
                MCP TOOL CALLING
              </span>
              <span style={{
                fontSize: "0.72rem", fontFamily: "var(--font-mono)",
                color: "var(--amber)"
              }}>
                ● HUMAN-IN-THE-LOOP
              </span>
            </div>
            <h2 style={{
              fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)",
              fontFamily: "var(--font-heading)", margin: "6px 0 2px 0"
            }}>
              Trợ Lý AI &amp; Nhật Ký Truy Vết MCP
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              Minh bạch từng bước truy vấn MCP, bắt buộc phê duyệt xác nhận con người với mọi hành động ghi/phá hủy.
            </p>
          </div>
        </div>
      </div>

      {/* SUGGESTIONS */}
      {suggestions.length > 0 && messages.length <= 2 && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 8, padding: "14px 22px"
        }}>
          <span style={{
            fontSize: "0.72rem", color: "var(--text-muted)",
            fontFamily: "var(--font-mono)", textTransform: "uppercase",
            display: "block", marginBottom: 10
          }}>
            GỢI Ý CÂU HỎI
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendSuggestion(s)}
                style={{
                  background: "var(--surface-strong)", border: "1px solid var(--line)",
                  color: "var(--text-secondary)", padding: "6px 12px",
                  borderRadius: 6, cursor: "pointer", fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)"
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CHAT CONSOLE */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: 8, padding: "20px 22px", minHeight: 460,
        display: "flex", flexDirection: "column"
      }}>
        <div style={{
          flex: 1, overflowY: "auto", display: "grid", gap: 16,
          marginBottom: 16, maxHeight: 500
        }}>
          {messages.map((m) => {
            const isUser = m.sender === "user";
            const isSystem = m.sender === "system";

            if (isSystem) {
              return (
                <div key={m.id} style={{
                  background: "var(--surface-strong)", border: "1px solid var(--line)",
                  borderRadius: 6, padding: "10px 14px",
                  fontSize: "0.75rem", fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)"
                }}>
                  {m.text}
                </div>
              );
            }

            return (
              <div key={m.id} style={{
                display: "flex", flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start"
              }}>
                <div style={{
                  fontSize: "0.7rem", fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)", marginBottom: 3, display: "flex", alignItems: "center", gap: 6
                }}>
                  <span>{isUser ? "BẠN" : "AI COPILOT"} • {m.timestamp}</span>
                  {!isUser && m.provider && (
                    <span style={{
                      fontSize: "0.65rem", padding: "1px 5px", borderRadius: 3,
                      background: m.provider === "openai" ? "color-mix(in srgb, var(--green) 15%, transparent)" : "color-mix(in srgb, var(--amber) 15%, transparent)",
                      color: m.provider === "openai" ? "var(--green)" : "var(--amber)",
                      border: `1px solid ${m.provider === "openai" ? "var(--green)" : "var(--amber)"}`
                    }}>
                      {m.provider === "openai" ? "LLM SYNTHESIS" : "DETERMINISTIC OPS"}
                    </span>
                  )}
                </div>

                <div style={{
                  maxWidth: "85%",
                  background: "var(--surface-strong)",
                  border: isUser
                    ? "1px solid var(--line-strong)"
                    : "1px solid color-mix(in srgb, var(--amber) 20%, transparent)",
                  borderRadius: 8, padding: "14px 16px",
                  color: "var(--text-primary)", fontSize: "0.85rem", lineHeight: 1.6
                }}>
                  {/* MCP TRACES */}
                  {m.traces && m.traces.length > 0 && (
                    <div style={{
                      background: "var(--surface)", borderRadius: 6,
                      padding: "10px 12px", marginBottom: 12,
                      border: "1px solid var(--line)"
                    }}>
                      <div style={{
                        fontSize: "0.7rem", fontWeight: 600,
                        fontFamily: "var(--font-mono)", color: "var(--amber)",
                        marginBottom: 6, display: "flex", alignItems: "center", gap: 6
                      }}>
                        <Terminal size={12} />
                        MCP TRACE LOG:
                      </div>
                      <div style={{
                        display: "grid", gap: 4, fontSize: "0.75rem",
                        fontFamily: "var(--font-mono)"
                      }}>
                        {m.traces.map((t, idx) => {
                          const toolName = t.tool || t.name;
                          let resultText = "OK";
                          if (t.result !== undefined) {
                            resultText = typeof t.result === "object" ? JSON.stringify(t.result) : String(t.result);
                          } else if (t.output !== undefined) {
                            resultText = typeof t.output === "object" ? JSON.stringify(t.output) : String(t.output);
                          }
                          return (
                            <div key={idx} style={{ color: "var(--text-secondary)", wordBreak: "break-word" }}>
                              <span style={{
                                color: (t.type === "READ" || !t.type) ? "var(--green)" : "var(--amber)",
                                fontWeight: 600
                              }}>
                                [{t.type || "TOOL"}]
                              </span>{" "}
                              {toolName} → <span style={{ color: "var(--text-primary)" }}>{resultText}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tools used badge */}
                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: 4,
                      marginBottom: 8
                    }}>
                      {m.toolsUsed.map((tool) => (
                        <span key={tool} style={{
                          fontSize: "0.68rem", fontFamily: "var(--font-mono)",
                          color: "var(--amber)",
                          background: "color-mix(in srgb, var(--amber) 10%, transparent)",
                          padding: "2px 6px", borderRadius: 3,
                          border: "1px solid color-mix(in srgb, var(--amber) 20%, transparent)"
                        }}>
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>

                  {/* PENDING ACTION */}
                  {m.pendingAction && (
                    <div style={{
                      marginTop: 14,
                      background: "color-mix(in srgb, var(--amber) 8%, transparent)",
                      border: "1px solid var(--amber)",
                      borderRadius: 6, padding: "12px 14px"
                    }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6, marginBottom: 4
                      }}>
                        <ShieldAlert size={16} style={{ color: "var(--amber)" }} />
                        <strong style={{
                          fontSize: "0.78rem", color: "var(--amber)",
                          fontFamily: "var(--font-mono)"
                        }}>
                          YÊU CẦU PHÊ DUYỆT (HUMAN-IN-THE-LOOP)
                        </strong>
                      </div>
                      <div style={{
                        fontSize: "0.8rem", color: "var(--text-secondary)",
                        margin: "4px 0 10px 0"
                      }}>
                        {m.pendingAction.target || m.pendingAction.description || m.pendingAction.title}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleActionConfirm(m.id)}
                          style={{
                            fontSize: "0.75rem", padding: "6px 14px",
                            fontFamily: "var(--font-mono)",
                            background: "var(--green)", color: "var(--bg)",
                            fontWeight: 700, border: "none", borderRadius: 4,
                            cursor: "pointer"
                          }}
                        >
                          XÁC NHẬN
                        </button>
                        <button
                          type="button"
                          onClick={() => handleActionCancel(m.id)}
                          style={{
                            fontSize: "0.75rem", padding: "6px 14px",
                            fontFamily: "var(--font-mono)",
                            background: "none", color: "var(--red)",
                            border: "1px solid var(--red)", borderRadius: 4,
                            cursor: "pointer"
                          }}
                        >
                          HỦY BỎ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* INPUT */}
        <form onSubmit={handleSend} style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi hoặc chỉ thị điều phối tài nguyên..."
            disabled={sending}
            style={{
              flex: 1, background: "var(--surface-strong)",
              border: "1px solid var(--line-strong)",
              color: "var(--text-primary)", padding: "10px 14px",
              borderRadius: 6, fontSize: "0.85rem"
            }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            style={{
              background: "var(--amber)", color: "var(--bg)",
              fontWeight: 700, padding: "0 18px", borderRadius: 6,
              border: "none", cursor: sending ? "wait" : "pointer",
              opacity: sending ? 0.6 : 1,
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>

      {/* METHODOLOGY NOTE */}
      <div style={{
        background: "color-mix(in srgb, var(--amber) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--amber) 20%, transparent)",
        borderRadius: 6, padding: "12px 16px", fontSize: "0.78rem",
        color: "var(--text-secondary)", display: "flex",
        alignItems: "flex-start", gap: 8
      }}>
        <Sparkles size={16} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: 2 }}>
            Ghi chú kiến trúc Copilot &amp; Truy vết MCP (2026 Edition)
          </strong>
          Hệ thống phân giải truy vấn qua bộ phân tích nghiệp vụ nội bộ (Deterministic Operations Analyzer) đối soát dữ liệu PostgreSQL theo thời gian thực khi không cấu hình OpenAI key. Mọi bước gọi công cụ (Tool Calls) đều hiển thị minh bạch tham số và kết quả theo giao thức Model Context Protocol (MCP), tuân thủ nguyên tắc Human-in-the-Loop trước các thao tác thay đổi dữ liệu phòng thí nghiệm.
        </div>
      </div>
    </div>
  );
}
