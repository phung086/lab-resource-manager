import { useLocale } from '../../../providers/LocaleProvider';
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, Bot } from "lucide-react";
import { apiRequest } from "../../../api.js";
import "./assistant.css";
import { formatVietnamDateTime } from "../../../utils/timezone";
type Slot = { resourceId: string; startAt: string; endAt: string };
type Answer = {
  answer: string;
  provider: string;
  modelStatus: string;
  toolsUsed: string[];
  actions: { label: string; payload: Slot }[];
  toolResults: { tool: string; result: Record<string, unknown> }[];
};
const hasStructuredLocalAnswer = (response: Answer) => response.provider === "local" && (response.actions?.length > 0 || response.toolResults?.some(t => Array.isArray(t.result.resources) && t.result.resources.length > 0 && ["search_resources", "recommend_resources_for_experiment"].includes(t.tool)));
export default function LaboratoryAssistant({
  onClose,
  onPrefill,
}: {
  onClose: () => void;
  onPrefill: (slot: Slot) => void;
}) {
  const { tr } = useLocale();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const panel = useRef<HTMLElement>(null),
    close = useRef<HTMLButtonElement>(null);
  const latestTurn = useRef<HTMLElement>(null);
  const [messages, setMessages] = useState<
      { question: string; response: Answer }[]
    >([]),
    [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]),
    [mode, setMode] = useState(tr("Đang kiểm tra kết nối…"));
  const [resources, setResources] = useState<
      { id: string; name: string; code: string }[]
    >([]),
    [resourceId, setResourceId] = useState(""),
    [duration, setDuration] = useState(60),
    [startAt, setStartAt] = useState(""),
    [endAt, setEndAt] = useState("");
  useEffect(() => {
    latestTurn.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [messages]);
  useEffect(() => {
    let alive = true;
    Promise.all([
      apiRequest("/assistant/suggestions"),
      apiRequest("/resources"),
    ])
      .then(([data, rows]) => {
        if (alive) {
          setSuggestions(data.suggestions);
          setMode(
            data.mode === "LOCAL_GROUNDED"
              ? tr("Tra cứu dữ liệu · Không dùng mô hình ngoài")
              : tr("Mô hình AI · Có tra cứu dữ liệu"),
          );
          setResources(Array.isArray(rows) ? rows : rows.resources || []);
        }
      })
      .catch(() => {
        if (alive) {
          setError(
            tr("Trợ lý chưa sẵn sàng. Hãy kiểm tra tính năng phía máy chủ."),
          );
          setMode(tr("Không thể kết nối"));
        }
      });
    return () => {
      alive = false;
    };
  }, [tr]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    close.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab") {
        const candidates = panel.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input,select,textarea,summary,[href]",
        );
        const nodes = Array.from(candidates || []).filter(
          (node) => node.getClientRects().length > 0,
        );
        if (!nodes.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  async function send(text: string) {
    if (busy || text.trim().length < 2) return;
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          ...(resourceId ? { resourceId } : {}),
          durationMinutes: duration,
          ...(startAt
            ? { startAt: new Date(`${startAt}:00+07:00`).toISOString() }
            : {}),
          ...(endAt
            ? { endAt: new Date(`${endAt}:00+07:00`).toISOString() }
            : {}),
        }),
      });
      setMessages((previous) => [
        ...previous.slice(-9),
        { question: text, response },
      ]);
      setQuestion("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return createPortal(
    <div
      className="lab-assistant-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="lab-assistant"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-assistant-title"
      >
        <header>
          <div>
            <h2 id="lab-assistant-title">
              <Bot size={20} /> {tr("Trợ lý Lab")}</h2>
            <p>{tr("Trợ lý tra cứu và tư vấn dữ liệu phòng thí nghiệm")}</p>
          </div>
          <button
            ref={close}
            className="secondary-button"
            onClick={onClose}
            aria-label={tr("Đóng trợ lý")}
          >
            <X size={20} />
          </button>
        </header>
        <div className="lab-assistant-content">
          <p className="assistant-boundary">
            {tr("Tra cứu theo quyền đăng nhập. Trợ lý không duyệt lịch, tạo booking hay xác nhận thanh toán. Hội thoại chỉ giữ trong phiên mở bảng này.")}</p>
          <details>
            <summary>{tr("Chọn tài nguyên và thời gian (tùy chọn)")}</summary>
            <div className="assistant-context">
              <label>
                {tr("Tài nguyên")}<select
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                >
                  <option value="">{tr("Tìm theo câu hỏi")}</option>
                  {resources.map((r) => (
                    <option value={r.id} key={r.id}>
                      {r.code} · {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {tr("Thời lượng (phút)")}<input
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </label>
              <label>
                {tr("Từ (giờ Việt Nam)")}<input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </label>
              <label>
                {tr("Đến (giờ Việt Nam)")}<input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </label>
            </div>
          </details>
          {!messages.length && (
            <div className="assistant-suggestions">
              <h3>{tr("Bắt đầu từ công việc của bạn")}</h3>
              {suggestions.map((s) => (
                <button
                  className="secondary-button"
                  key={s}
                  disabled={busy}
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div aria-live="polite" aria-relevant="additions">
            {messages.map((m, i) => (
              <article
                key={i}
                className="assistant-turn"
                ref={i === messages.length - 1 ? latestTurn : undefined}
              >
                <p className="assistant-question">{m.question}</p>
                <div className="assistant-answer">
                  <p>{hasStructuredLocalAnswer(m.response) ? m.response.actions?.length ? tr("Các khung giờ gợi ý bên dưới đã được kiểm tra từ lịch và chính sách LAB. Chưa giữ chỗ; hệ thống kiểm tra lại khi bạn gửi yêu cầu.") : tr("Đã tìm thấy tài nguyên phù hợp bên dưới. Trạng thái vận hành không bảo đảm tài nguyên còn trống tại thời điểm bạn muốn sử dụng.") : m.response.answer}</p>
                  <small>
                    {m.response.provider === "local"
                      ? tr("Trả lời từ công cụ dữ liệu")
                      : tr("Tổng hợp bằng mô hình AI")}
                    {m.response.modelStatus === "MODEL_UNAVAILABLE"
                      ? tr(" · Mô hình không khả dụng; đã dùng kết quả công cụ.")
                      : ""}
                  </small>
                  <p className="assistant-verified">{tr("Đã kiểm tra dữ liệu hệ thống ·")}{mode}</p>
                  {m.response.toolResults?.filter(t => t.tool === "search_resources" || t.tool === "recommend_resources_for_experiment").flatMap(t => Array.isArray(t.result.resources) ? t.result.resources : []).map((resource: any) => (
                    <article className="assistant-resource-result" key={resource.id}>
                      <strong>{resource.name}</strong><small>{resource.code} · {({ ROOM: tr("Phòng LAB"), EQUIPMENT: tr("Thiết bị"), MACHINE: tr("Máy móc"), EXPERIMENT_KIT: tr("Bộ thí nghiệm"), MATERIAL: tr("Vật tư") } as Record<string, string>)[resource.category] || tr("Chưa phân loại")}</small>
                      <dl><div><dt>{tr("Vị trí")}</dt><dd>{resource.location || tr("Chưa có thông tin")}</dd></div><div><dt>{tr("Vận hành")}</dt><dd>{({ AVAILABLE: tr("Sẵn sàng"), MAINTENANCE: tr("Bảo trì"), CALIBRATION: tr("Hiệu chuẩn"), OFFLINE: tr("Ngoại tuyến"), IN_USE: tr("Đang sử dụng"), BROKEN: tr("Hỏng"), RETIRED: tr("Ngừng sử dụng") } as Record<string, string>)[resource.operationalStatus] || tr("Chưa xác định")}</dd></div></dl>
                      <p>{tr("Cần kiểm tra khung giờ và điều kiện trước khi đặt lịch.")}</p>
                    </article>
                  ))}
                  <details><summary>{tr("Chi tiết nguồn tra cứu")}</summary>{hasStructuredLocalAnswer(m.response) && <p>{m.response.answer}</p>}<div className="assistant-tools">
                    {m.response.toolsUsed.map((t, j) => (
                      <span key={`${t}-${j}`}>{t}</span>
                    ))}
                  </div></details>
                  {m.response.toolResults?.some((t) =>
                    Array.isArray(t.result.sources),
                  ) && (
                    <details>
                      <summary>{tr("Nguồn tài liệu đã truy xuất")}</summary>
                      <pre>
                        {JSON.stringify(
                          m.response.toolResults
                            .filter((t) => t.tool === "search_knowledge_base")
                            .map((t) => t.result),
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  )}
                  {m.response.actions?.map((a) => (
                    <div className="assistant-slot-result" key={`${a.payload.resourceId}-${a.payload.startAt}`}><strong>{resources.find(r => r.id === a.payload.resourceId)?.name || tr("Tài nguyên được gợi ý")}</strong><p>{formatVietnamDateTime(a.payload.startAt)} → {formatVietnamDateTime(a.payload.endAt)}</p><small>{tr("Giờ Việt Nam · Kiểm tra lại khi gửi yêu cầu")}</small><button
                      className="secondary-button"
                      key={a.label}
                      onClick={() => {
                        onClose();
                        onPrefill(a.payload);
                      }}
                    >
                      {tr("Mở form đặt lịch")}</button></div>
                  ))}
                </div>
              </article>
            ))}
          </div>
          {busy && <p role="status">{tr("Đang tra cứu dữ liệu được phép…")}</p>}
          {error && (
            <p className="alert danger" role="alert">
              {error}
            </p>
          )}
        </div>
        <form
          className="assistant-compose"
          onSubmit={(e) => {
            e.preventDefault();
            void send(question);
          }}
        >
          <label className="sr-only" htmlFor="assistant-question">
            {tr("Câu hỏi cho trợ lý")}</label>
          <textarea
            id="assistant-question"
            maxLength={2000}
            minLength={2}
            required
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={tr("Nhập câu hỏi về tài nguyên hoặc lịch đặt…")}
          />
          <button
            className="primary-button"
            disabled={busy || question.trim().length < 2}
            aria-label={tr("Gửi câu hỏi")}
          >
            <Send size={18} />
          </button>
        </form>
      </section>
    </div>,
    document.body,
  );
}
