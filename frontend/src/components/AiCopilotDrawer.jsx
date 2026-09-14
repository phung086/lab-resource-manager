import React, { useState } from "react";
import { Bot, Send, Sparkles, X, ChevronRight, Zap } from "lucide-react";
import { apiRequest } from "../api";

export function AiCopilotDrawer({ isOpen, onClose, onActionTrigger }) {
  const [messages, setMessages] = useState([
    {
      id: "m1",
      role: "assistant",
      text: "Xin chào! Mình là AI Copilot Trợ Lý Quản Lý Phòng Lab. Bạn muốn tìm lịch trống, đề xuất thiết bị, hay tra cứu thông số kỹ thuật hôm nay?",
      suggestions: [
        "Gợi ý thiết bị huấn luyện AI VRAM cao",
        "Tra cứu quy định nhiệt độ phòng DGX A100",
        "Danh sách các khóa thi cấp chứng chỉ an toàn"
      ]
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSend(queryText) {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { id: Date.now().toString(), role: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await apiRequest("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message: textToSend, locale: "vi" })
      });

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.answer || "Không thể phản hồi lúc này.",
        toolsUsed: data.toolsUsed || []
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (_err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", text: "Lỗi kết nối với máy chủ AI Copilot." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="copilot-drawer-overlay">
      <div className="copilot-drawer">
        <div className="copilot-header">
          <div className="copilot-title">
            <div className="ai-badge">
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600 }}>AI Lab Copilot 2026</h3>
                <span className="led-pulse led-pulse-ai" />
              </div>
              <span className="copilot-subtitle">DeepSeek & RAG Telemetry Orchestration</span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng Copilot">
            <X size={16} />
          </button>
        </div>

        <div className="copilot-messages">
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble-wrapper ${m.role}`}>
              {m.role === "assistant" && (
                <div className="assistant-avatar">
                  <Bot size={16} />
                </div>
              )}
              <div className="chat-bubble">
                <div className="bubble-text" style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>

                {m.toolsUsed && m.toolsUsed.length > 0 && (
                  <div className="tools-tag-list">
                    <Zap size={12} />
                    <span>Tools: {m.toolsUsed.join(", ")}</span>
                  </div>
                )}

                {m.suggestions && (
                  <div className="quick-suggestions">
                    {m.suggestions.map((s, idx) => (
                      <button key={idx} className="suggestion-pill" onClick={() => handleSend(s)}>
                        <span>{s}</span>
                        <ChevronRight size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-bubble-wrapper assistant">
              <div className="assistant-avatar">
                <Bot size={16} />
              </div>
              <div className="chat-bubble loading">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}
        </div>

        <div className="copilot-footer">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="copilot-input-box"
          >
            <input
              type="text"
              placeholder="Hỏi AI về lịch trống, thiết bị, quy định..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-icon" disabled={loading || !input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
