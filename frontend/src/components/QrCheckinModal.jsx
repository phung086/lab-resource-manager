import React, { useState } from "react";
import { CheckCircle2, Clock, QrCode, ShieldCheck, X } from "lucide-react";

export function QrCheckinModal({ isOpen, onClose, booking, onCheckinSuccess }) {
  const [scanning, setScanning] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  if (!isOpen || !booking) return null;

  const qrData = JSON.stringify({
    bookingCode: booking.bookingCode || booking.id,
    resourceCode: booking.resource?.code,
    user: booking.requestedBy?.fullName,
    startAt: booking.startAt,
    endAt: booking.endAt
  });

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`;

  function handleSimulateScan() {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setCheckedIn(true);
      if (onCheckinSuccess) onCheckinSuccess(booking.id);
      setTimeout(() => {
        setCheckedIn(false);
        onClose();
      }, 1800);
    }, 1200);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card checkin-qr-modal">
        <div className="modal-header">
          <div className="modal-title-group">
            <QrCode className="text-primary" size={20} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3>Mã QR Check-in Phòng Thí Nghiệm</h3>
                <span className="led-pulse led-pulse-cyan" />
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>OPTICAL ACCESS SCANNER • 2026</span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body qr-checkin-body">
          {checkedIn ? (
            <div className="checkin-success-state">
              <CheckCircle2 size={64} className="text-success animated-bounce" />
              <h3>Check-in Thành Công!</h3>
              <p>Hệ thống đã ghi nhận sự có mặt của bạn tại phòng lab.</p>
              <div className="badge success">Đang trong thời gian sử dụng</div>
            </div>
          ) : (
            <>
              <div className="qr-box-wrapper">
                <img src={qrImageUrl} alt="Check-in QR Code" className="checkin-qr-image" />
                <div className="scan-line"></div>
              </div>
              <div className="checkin-info-panel">
                <div className="booking-code-badge">
                  <span>MÃ ĐẶT LỊCH:</span> <strong>{booking.bookingCode || booking.id.slice(0, 8)}</strong>
                </div>
                <h4>{booking.title}</h4>
                <p className="resource-name">Thiết bị: <strong>{booking.resource?.name} ({booking.resource?.code})</strong></p>
                <div className="time-range">
                  <Clock size={16} />
                  <span>{new Date(booking.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - {new Date(booking.endAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="grace-warning">
                  <ShieldCheck size={14} />
                  <span>Vui lòng đưa mã này trước camera/máy quét tại cửa phòng lab trước giờ hẹn 20 phút.</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Đóng</button>
          {!checkedIn && (
            <button type="button" className="btn btn-primary" onClick={handleSimulateScan} disabled={scanning}>
              {scanning ? "Đang quét mã..." : "Quét Mã Check-in Trực Tiếp"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
