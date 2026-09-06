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

  async function handleSend(e) {
    if (e) e.preventDefault();
    const query = input.trim();
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
        traces: response.toolCalls || response.traces || [],
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
    setInput(text);
    // Auto send
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} };
      // We need to call handleSend with the text, so set input first
    }, 0);
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
                onClick={() => setInput(s)}
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
                  color: "var(--text-muted)", marginBottom: 3
                }}>
                  {isUser ? "BẠN" : "AI COPILOT"} • {m.timestamp}
                </div>

                <div style={{
                  maxWidth: "85%",
                  background: isUser ? "var(--surface-strong)" : "var(--surface-strong)",
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
                        {m.traces.map((t, idx) => (
                          <div key={idx} style={{ color: "var(--text-secondary)" }}>
                            <span style={{
                              color: t.type === "READ" ? "var(--green)" : "var(--amber)",
                              fontWeight: 600
                            }}>
                              [{t.type || "CALL"}]
                            </span>{" "}
                            {t.tool || t.name} → <span style={{ color: "var(--text-primary)" }}>
                              {t.result || t.output || "OK"}
                            </span>
                          </div>
                        ))}
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
                          YÊU CẦU PHÊ DUYỆT
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
    </div>
  );
}
