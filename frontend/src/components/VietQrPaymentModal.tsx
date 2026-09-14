import React, { useState, useEffect } from "react";
import { QrCode, Copy, CheckCircle2, ShieldCheck, Clock, Zap, AlertCircle } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026";
import { QrCodeSvg } from "./QrCodeSvg";

export interface VietQrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount?: number;
  bookingTitle?: string;
  resourceName?: string;
  onPaidSuccess?: () => void;
}

export const VietQrPaymentModal: React.FC<VietQrPaymentModalProps> = ({
  isOpen,
  onClose,
  amount = 150000,
  bookingTitle = "Fine-tuning Llama-3 (Paper CVPR)",
  resourceName = "NVIDIA DGX A100 SuperPOD (8x 80GB)",
  onPaidSuccess
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(900); // 15:00 minutes

  useEffect(() => {
    if (!isOpen) {
      setCountdownSeconds(900);
      setIsSuccess(false);
      setIsSimulating(false);
      return;
    }

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const bankName = "MBBank (Ngân hàng TMCP Quân Đội)";
  const accountNumber = "99882026888";
  const accountHolder = "LAB RESOURCE MANAGEMENT CENTER";
  const transferMemo = `LABPAY ${bookingTitle.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18).toUpperCase()}`;

  const formattedAmount = `${amount.toLocaleString("vi-VN")} đ`;

  // Standard VietQR Image Generator
  const qrUrl = `https://img.vietqr.io/image/MB-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    transferMemo
  )}&accountName=${encodeURIComponent(accountHolder)}`;

  const minutes = Math.floor(countdownSeconds / 60);
  const seconds = countdownSeconds % 60;
  const formattedCountdown = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const progressPercent = ((900 - countdownSeconds) / 900) * 100;

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  function handleSimulateConfirm() {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setIsSuccess(true);
      if (onPaidSuccess) onPaidSuccess();
      setTimeout(() => {
        onClose();
      }, 2000);
    }, 1200);
  }

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={onClose}
      title="Cổng Thanh Toán VietQR Tự Động (NAPAS 247)"
      subtitle="Quét mã QR bằng ứng dụng ngân hàng hoặc ví điện tử để tự động mở khóa hạn ngạch tài nguyên"
      icon={QrCode}
      iconColor="text-cyan-400"
      maxWidth="max-w-3xl"
      footer={
        isSuccess ? (
          <div className="w-full flex items-center justify-between text-emerald-300 font-mono text-xs">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Giao dịch đã được đối soát thành công! Đang chuyển hướng...</span>
            </span>
            <span className="text-slate-500">Mã GD: #TXN-2026-0909</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-xs text-slate-400 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/25 bg-white/5 cursor-pointer transition-all"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              disabled={isSimulating}
              onClick={handleSimulateConfirm}
              className="font-mono text-xs btn-cyan-gradient px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,229,255,0.4)]"
            >
              <Zap size={14} className={isSimulating ? "animate-spin" : "fill-current"} />
              <span>{isSimulating ? "ĐANG ĐỐI SOÁT NAPAS..." : "⚡ Giả Lập Xác Nhận Thanh Toán Thành Công"}</span>
            </button>
          </>
        )
      }
    >
      {/* Toast alert if copied */}
      {copiedKey && (
        <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/40 rounded-lg text-cyan-300 font-mono text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={14} className="text-cyan-400" />
          <span>Đã sao chép vào bộ nhớ tạm: <strong>{copiedKey}</strong></span>
        </div>
      )}

      {/* Main 2-Column Balanced Layout */}
      <div className="vietqr-layout-grid">
        {/* CỘT TRÁI: Khung Mã QR với HUD Reticle Corners */}
        <div className="flex flex-col items-center justify-center p-4 bg-black/40 border border-white/10 rounded-xl relative">
          <div className="hud-reticle-container my-1">
            <div className="hud-corner hud-corner-tl" />
            <div className="hud-corner hud-corner-tr" />
            <div className="hud-corner hud-corner-bl" />
            <div className="hud-corner hud-corner-br" />

            <div className="p-3 bg-white rounded-xl shadow-[0_0_25px_rgba(0,229,255,0.25)] flex flex-col items-center">
              {/* VietQR & Napas Header Badge */}
              <div className="w-full flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200" style={{ width: "190px" }}>
                <span className="font-heading font-black text-xs text-[#0052CC] tracking-tight">
                  VIET<span className="text-[#00C49F]">QR</span>
                </span>
                <span className="font-heading font-bold text-[10px] text-[#002D72]">
                  napas<span className="text-amber-500 font-black">247</span>
                </span>
              </div>

              <QrCodeSvg
                value={`00020101021238540010A000000727012400069704220111998828268885204601153037045406${amount}5802VN62250821${transferMemo}`}
                size={190}
                centerLogo="vietqr"
              />

              <div className="w-full text-center pt-1 mt-1 border-t border-slate-100" style={{ width: "190px" }}>
                <span className="font-mono font-bold text-[9px] text-slate-600 block">MBBank • 99882826888</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Tự động khớp lệnh qua Napas 24/7</span>
          </div>

          {/* Countdown timer & progress bar */}
          <div className="w-full mt-3.5 pt-3 border-t border-white/10 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock size={12} className="text-amber-400" />
                <span>Thời gian giữ chỗ:</span>
              </span>
              <strong className="text-amber-300 font-bold">{formattedCountdown}</strong>
            </div>

            {/* Countdown progress track */}
            <div className="progress-track" style={{ height: "6px" }}>
              <div
                className="progress-fill progress-amber"
                style={{ width: `${100 - progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Thông Tin Chi Tiết Giao Dịch */}
        <div className="flex flex-col gap-3.5">
          {/* Target Resource Block */}
          <div className="p-3.5 bg-black/30 border border-white/10 rounded-xl flex flex-col gap-1">
            <span className="font-mono text-[11px] text-slate-400 uppercase">THIẾT BỊ SỬ DỤNG</span>
            <h4 className="text-sm font-bold text-white tracking-wide">{resourceName}</h4>
            <span className="text-xs text-slate-400 font-mono">Đề tài: {bookingTitle}</span>
          </div>

          {/* Amount Card with Copy button */}
          <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/30 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-mono text-[11px] text-cyan-400 uppercase font-bold block mb-0.5">
                SỐ TIỀN THANH TOÁN
              </span>
              <strong className="font-mono text-2xl font-bold text-white tracking-tight">
                {formattedAmount}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(amount.toString(), formattedAmount)}
              className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 hover:text-white flex items-center gap-1.5 font-mono text-xs cursor-pointer transition-all"
              title="Sao chép số tiền"
            >
              <Copy size={13} />
              <span>Sao chép</span>
            </button>
          </div>

          {/* Transfer Details Matrix */}
          <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl flex flex-col gap-2 text-xs font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-slate-400">Ngân hàng thụ hưởng:</span>
              <strong className="text-white text-right">{bankName}</strong>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-slate-400">Chủ tài khoản:</span>
              <strong className="text-cyan-300 text-right">{accountHolder}</strong>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-slate-400">Số tài khoản:</span>
              <div className="flex items-center gap-2">
                <strong className="text-white">{accountNumber}</strong>
                <button
                  type="button"
                  onClick={() => handleCopy(accountNumber, "Số tài khoản")}
                  className="text-cyan-400 hover:text-cyan-200 cursor-pointer"
                  title="Sao chép STK"
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-400">Nội dung chuyển khoản:</span>
              <div className="flex items-center gap-2">
                <strong className="text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                  {transferMemo}
                </strong>
                <button
                  type="button"
                  onClick={() => handleCopy(transferMemo, "Nội dung chuyển khoản")}
                  className="text-amber-400 hover:text-amber-200 cursor-pointer"
                  title="Sao chép nội dung"
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-lg flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>Hạn ngạch sẽ kích hoạt ngay sau 3 - 5 giây nhận diện biên lai điện tử.</span>
          </div>
        </div>
      </div>
    </BaseModal2026>
  );
};
