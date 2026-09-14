import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
  TrendingDown,
  ShieldAlert,
  Send,
  HelpCircle,
  QrCode,
  Calendar,
  Layers,
  ChevronRight
} from "lucide-react";

export interface SmartAdvisoryViewProps {
  onApplySlotChange?: (slotData: any) => void;
  onOpenCheckIn?: (booking?: any) => void;
  onOpenCopilot?: () => void;
}

export const SmartAdvisoryView: React.FC<SmartAdvisoryViewProps> = ({
  onApplySlotChange,
  onOpenCheckIn,
  onOpenCopilot
}) => {
  const [appliedCards, setAppliedCards] = useState<Record<string, boolean>>({});
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string; actionSlot?: any }>>([
    {
      role: "ai",
      text: "Xin chào! Tôi là Trợ lý AI Điều Phối Lịch 2026. Tôi vừa phát hiện một số cơ hội tối ưu lịch đặt của bạn để tiết kiệm 20% chi phí và tránh xung đột ca. Bạn muốn tôi hỗ trợ việc gì?"
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);

  const advisoryCards = [
    {
      id: "adv-cost",
      badge: "TỐI ƯU CHI PHÍ HẠN NGẠCH",
      badgeColor: "text-emerald-400 bg-emerald-950/60 border-emerald-500/40",
      title: "Chuyển ca sang 14:00 ngày mai sẽ giảm 20% chi phí và không bị gián đoạn",
      description:
        "Ca đặt hiện tại của bạn vào lúc 10:00 sáng mai đang nằm trong khung giờ cao điểm tiêu thụ điện. Nếu chuyển sang 14:00, chi phí sẽ giảm 20% và bạn có thể chạy trọn vẹn 3 giờ mà không bị các ca khẩn cấp chen ngang.",
      impact: "Tiết kiệm: 30.000 đ • Tránh xung đột: 100%",
      ctaText: "⚡ Áp Dụng Khung Giờ 14:00",
      slotData: { date: "2026-09-11", time: "14:00", duration: 3 }
    },
    {
      id: "adv-conflict",
      badge: "ĐIỀU PHỐI XUNG ĐỘT TỰ ĐỘNG",
      badgeColor: "text-amber-400 bg-amber-950/60 border-amber-500/40",
      title: "Phát hiện 2 yêu cầu cùng muốn đặt Phòng Lab A1 lúc 15:00 Thứ 6",
      description:
        "Thay vì từ chối yêu cầu của bạn, AI đã tự động phân tích và tìm thấy Phòng Lab A2 (cấu hình tương đương) hoàn toàn trống trong cùng khung giờ, hoặc slot lúc 16:30 tại Phòng Lab A1.",
      impact: "Không cần xếp hàng • Giữ nguyên kế hoạch",
      ctaText: "🎯 Nhận Đề Xuất Slot Tương Đương (16:30)",
      slotData: { date: "2026-09-11", time: "16:30", resource: "Phòng Lab A1" }
    },
    {
      id: "adv-reminder",
      badge: "BẢO VỆ ĐIỂM UY TÍN (REPUTATION)",
      badgeColor: "text-cyan-400 bg-cyan-950/60 border-cyan-500/40",
      title: "Ca đặt GPU NVIDIA H100 của bạn sẽ bắt đầu trong 30 phút",
      description:
        "Vui lòng quét mã QR check-in tại cửa phòng lab hoặc trên ứng dụng trước giờ bắt đầu để xác nhận nhận ca. Check-in đúng giờ sẽ được cộng +2 điểm uy tín cá nhân.",
      impact: "Điểm uy tín hiện tại: 96/100 (Hạng A+)",
      ctaText: "📱 Mở Mã Check-in QR Ngay",
      isCheckIn: true
    },
    {
      id: "adv-night",
      badge: "GÓI GIỜ XANH BAN ĐÊM (GREEN AI)",
      badgeColor: "text-violet-400 bg-violet-950/60 border-violet-500/40",
      title: "Huấn luyện mô hình AI ca đêm (22:00 — 06:00) tiết kiệm 45% hạn ngạch",
      description:
        "Biểu giá điện giờ thấp điểm EVN sau 22:00 cực kỳ tiết kiệm. AI có thể tự động xếp lịch ca đêm cho các tác vụ huấn luyện dài và tự động tắt máy khi hoàn thành.",
      impact: "Hạn ngạch tiết kiệm: 45% • Phát thải CO2: Giảm 60%",
      ctaText: "🌙 Lập Lịch Ca Đêm Tự Động",
      slotData: { date: "2026-09-10", time: "22:00", duration: 6 }
    }
  ];

  const quickPrompts = [
    "Tìm cho tôi khung giờ trống 2 tiếng chiều nay",
    "Phân tích xem tuần này tôi đặt lịch đã tối ưu chưa?",
    "Đề xuất slot rẻ nhất để chạy GPU 4 tiếng"
  ];

  function handleApply(card: any) {
    setAppliedCards((prev) => ({ ...prev, [card.id]: true }));
    if (card.isCheckIn) {
      if (onOpenCheckIn) onOpenCheckIn({ bookingCode: "214ae7c1", resource: { code: "GPU-H100-01" } });
    } else {
      if (onApplySlotChange) onApplySlotChange(card.slotData);
    }
  }

  function handleSendChat(customText?: string) {
    const textToSend = (customText || chatInput).trim();
    if (!textToSend) return;

    setChatMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setChatInput("");
    setIsThinking(true);

    setTimeout(() => {
      setIsThinking(false);
      let reply = "";
      if (textToSend.includes("chiều nay") || textToSend.includes("trống")) {
        reply =
          "Tôi đã quét toàn bộ lịch chiều nay: Bạn có 2 slot cực đẹp: (1) 14:00 — 16:00 tại Cụm GPU H100, hoặc (2) 16:30 — 18:30 tại Phòng Lab A1. Cả 2 slot đều có xác suất hoàn thành 98%. Bạn muốn tôi giữ chỗ slot nào?";
      } else if (textToSend.includes("tối ưu")) {
        reply =
          "Phân tích tuần này của bạn: Tỷ lệ lấp đầy đạt 92%, nhưng có 1 ca sáng Thứ 4 đặt vào giờ cao điểm tiêu tốn thêm 15% chi phí. Điểm hiệu quả tuần của bạn đạt 94/100!";
      } else {
        reply =
          "Đã ghi nhận yêu cầu của bạn! Hệ thống AI vừa tối ưu phân bổ ca và đề xuất slot đêm từ 22:00 hôm nay để tiết kiệm 45% phụ phí. Bấm vào nút Đặt Lịch để xác nhận nhé.";
      }
      setChatMessages((prev) => [...prev, { role: "ai", text: reply }]);
    }, 700);
  }

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* Top Banner */}
      <div className="card-glass-2026 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-violet-500/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-violet-400 bg-violet-950/60 px-2.5 py-0.5 rounded border border-violet-500/30 font-bold">
              AI SMART ADVISOR 2026
            </span>
            <span className="font-mono text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ĐIỀU PHỐI TỰ ĐỘNG ACTIVE</span>
            </span>
          </div>
          <h2 className="text-xl font-bold font-heading text-white tracking-tight">
            Trung Tâm Tư Vấn & Điều Phối Lịch Trình Thông Minh
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            AI chủ động giám sát hàng đợi, phát hiện xung đột trước khi xảy ra và đề xuất phương án đổi ca tối ưu nhất cho bạn.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCopilot}
          className="btn-violet-gradient px-4 py-2 text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.4)]"
        >
          <Bot size={15} />
          <span>Mở Trợ Lý AI Chat Copilot</span>
        </button>
      </div>

      {/* Main 2-Column: Left 4 Smart Advisory Cards, Right Interactive Chat Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (7 Cols): Smart Advisory Cards */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-xs text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <Sparkles size={14} className="text-violet-400" />
              <span>CÁC ĐỀ XUẤT TỐI ƯU DÀNH CHO BẠN ({advisoryCards.length})</span>
            </span>
            <span className="font-mono text-xs text-violet-400">Tự động cập nhật 5 phút/lần</span>
          </div>

          {advisoryCards.map((card) => {
            const isDone = appliedCards[card.id];

            return (
              <div key={card.id} className="advisory-card flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`font-mono text-[10.5px] font-bold px-2.5 py-0.5 rounded border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{card.impact}</span>
                </div>

                <div>
                  <h4 className="text-sm font-bold font-heading text-white leading-snug">
                    {card.title}
                  </h4>
                  <p className="text-xs text-slate-300 font-sans mt-1.5 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
                  <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    <span>Hiệu lực trong 2 giờ tới</span>
                  </div>

                  {isDone ? (
                    <span className="font-mono text-xs text-emerald-300 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/40 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>ĐÃ ÁP DỤNG THÀNH CÔNG</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApply(card)}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-mono text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all transform active:scale-95"
                    >
                      <span>{card.ctaText}</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CỘT PHẢI (5 Cols): AI Interactive Chat Box */}
        <div className="lg:col-span-5 card-glass-2026 p-5 flex flex-col justify-between min-h-[560px] border border-violet-500/30">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
                  <Bot size={16} />
                </div>
                <div>
                  <span className="font-heading text-xs font-bold text-white block">
                    AI COPILOT ĐẶT LỊCH
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span>SẴN SÀNG TƯ VẤN</span>
                  </span>
                </div>
              </div>
              <span className="font-mono text-[10px] text-slate-500">v3.4.0</span>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-col gap-1.5 mb-4">
              <span className="font-mono text-[10.5px] text-slate-400">Gợi ý câu hỏi nhanh:</span>
              <div className="flex flex-col gap-1.5">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSendChat(p)}
                    className="p-2 bg-white/[0.03] hover:bg-violet-950/40 border border-white/10 hover:border-violet-500/40 rounded-lg text-left text-xs text-slate-300 hover:text-white font-sans transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{p}</span>
                    <ChevronRight size={13} className="text-violet-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Message History */}
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-cyan-950/50 border border-cyan-500/40 text-cyan-200 ml-6 self-end"
                      : "bg-black/50 border border-white/10 text-slate-200 mr-4 self-start"
                  }`}
                >
                  <p className="font-sans">{msg.text}</p>
                </div>
              ))}
              {isThinking && (
                <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-400 font-mono flex items-center gap-2 self-start animate-pulse">
                  <Bot size={13} className="text-violet-400 animate-spin" />
                  <span>AI đang phân tích lịch trống và tính toán biểu giá...</span>
                </div>
              )}
            </div>
          </div>

          {/* Chat Input */}
          <div className="pt-3 border-t border-white/10 mt-4 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder="Hỏi AI về khung giờ, chi phí hoặc đổi ca..."
              className="flex-1 bg-black/60 border border-white/15 focus:border-violet-400 text-white rounded-xl px-3.5 py-2.5 text-xs font-sans outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => handleSendChat()}
              className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center cursor-pointer transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)]"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
