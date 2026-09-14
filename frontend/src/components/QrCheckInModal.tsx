import React, { useState } from "react";
import { QrCode, CheckCircle2, AlertTriangle, Sparkles, Clock, ShieldCheck, DoorOpen } from "lucide-react";
import { BaseModal2026 } from "./BaseModal2026";
import { QrCodeSvg } from "./QrCodeSvg";

export interface QrCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: any;
  onCheckinSuccess?: () => void;
}

export const QrCheckInModal: React.FC<QrCheckInModalProps> = ({
  isOpen,
  onClose,
  booking,
  onCheckinSuccess
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  if (!isOpen) return null;

  const bookingCode = booking?.bookingCode || booking?.id || "214ae7c1";
  const resourceCode = booking?.resource?.code || "GPU-NODE-01";
  const resourceName = booking?.resource?.name || "NVIDIA DGX A100 SuperPOD (8x 80GB)";
  const timeSlot = booking?.startAt && booking?.endAt ? `${booking.startAt} — ${booking.endAt}` : "14:00 — 18:00 Hôm nay";
  const userName = booking?.requestedBy?.fullName || "NCS. Trần Tiến Dũng";

  const qrData = JSON.stringify({
    code: bookingCode,
    node: resourceCode,
    user: userName,
    validUntil: "2026-09-09T18:00:00Z"
  });

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    qrData
  )}`;

  function handleTriggerScan() {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setIsCheckedIn(true);
      if (onCheckinSuccess) onCheckinSuccess();
      setTimeout(() => {
        setIsCheckedIn(false);
        onClose();
      }, 2200);
    }, 1400);
  }

  return (
    <BaseModal2026
      isOpen={isOpen}
      onClose={onClose}
      title="Mã QR Xác Thực Vào Cửa & Check-in Lab"
      subtitle="Hệ thống quét mã quang học Optical Access Scanner tại cổng kiểm soát an ninh cửa phòng lab"
      icon={QrCode}
      iconColor="text-cyan-400"
      maxWidth="max-w-lg"
      footer={
        isCheckedIn ? (
          <div className="w-full flex items-center justify-center text-emerald-400 font-mono text-xs font-bold py-1">
            <span>✨ Khóa từ cửa đã mở! Vui lòng vào vị trí làm việc.</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-xs text-slate-400 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/25 bg-white/5 cursor-pointer transition-all"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={isScanning}
              onClick={handleTriggerScan}
              className="font-mono text-xs btn-cyan-gradient px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,229,255,0.4)]"
            >
              <Sparkles size={14} className={isScanning ? "animate-spin" : ""} />
              <span>{isScanning ? "ĐANG NHẬN DIỆN MÃ QUANG HỌC..." : "⚡ Quét Mã Check-in Trực Tiếp"}</span>
            </button>
          </>
        )
      }
    >
      {isCheckedIn ? (
        /* Success State */
        <div className="flex flex-col items-center justify-center py-6 text-center gap-3 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]">
            <CheckCircle2 size={36} className="text-emerald-300" />
          </div>

          <h3 className="text-lg font-bold font-heading text-white">Check-in Thành Công!</h3>
          <p className="text-xs text-slate-300 font-sans max-w-sm leading-relaxed">
            Hệ thống đã nhận diện mã đặt chỗ hợp lệ. Quyền truy cập cụm máy chủ <strong>{resourceCode}</strong> đã được cấp quyền SSH/JupyterHub tự động.
          </p>

          <div className="font-mono text-xs bg-emerald-950/80 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 mt-2">
            <DoorOpen size={14} />
            <span>TRẠNG THÁI: ĐANG HOẠT ĐỘNG (OCCUPIED)</span>
          </div>
        </div>
      ) : (
        /* Normal QR Code State */
        <div className="flex flex-col items-center gap-4">
          {/* Booking Code Monospace Badge */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-500/40 font-bold shadow-[0_0_12px_rgba(0,229,255,0.2)]">
              MÃ ĐẶT LỊCH: #{bookingCode}
            </span>
          </div>

          {/* QR Display with Optical Laser Scanner */}
          <div className="hud-reticle-container">
            <div className="hud-corner hud-corner-tl" />
            <div className="hud-corner hud-corner-tr" />
            <div className="hud-corner hud-corner-bl" />
            <div className="hud-corner hud-corner-br" />

            <div className="relative p-2.5 bg-black/80 border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
              {/* Repeating Optical Laser Scanning Line */}
              <div className="laser-scanning-line" />

              <div className="p-3 bg-white rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.25)] flex items-center justify-center">
                <QrCodeSvg
                  value={`LAB-CHECKIN-${bookingCode}-${resourceCode}`}
                  size={200}
                  centerLogo="lab"
                />
              </div>
            </div>
          </div>

          {/* Device & Time Info */}
          <div className="w-full p-3.5 bg-black/40 border border-white/10 rounded-xl flex flex-col gap-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Thiết bị phân bổ:</span>
              <strong className="text-cyan-300 font-bold">{resourceCode}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Khung giờ xác nhận:</span>
              <span className="text-white flex items-center gap-1">
                <Clock size={12} className="text-amber-400" />
                <span>{timeSlot}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Người đại diện:</span>
              <span className="text-slate-200">{userName}</span>
            </div>
          </div>

          {/* Amber Warning Box */}
          <div className="w-full p-3 bg-amber-950/50 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200 font-sans">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Lưu ý:</strong> Vui lòng đưa mã này trước camera/máy quét tại cửa phòng lab trước giờ hẹn <strong>20 phút</strong>. Sau 15 phút không check-in, tài nguyên sẽ bị tự động giải phóng (No-show Penalty).
            </p>
          </div>
        </div>
      )}
    </BaseModal2026>
  );
};
