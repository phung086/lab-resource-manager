import React, { useState } from "react";
import { CheckCircle2, Copy, QrCode, X } from "lucide-react";

export function VietQrModal({ isOpen, onClose, amount, bookingTitle, resourceName, onPaidSuccess }) {
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);

  if (!isOpen) return null;

  const bankAccount = "123456789";
  const bankName = "MBBank (NHTM CP Quân Đội)";
  const accountHolder = "LAB RESOURCE MANAGEMENT CENTER";
  const memo = `LABPAY ${bookingTitle || "EQUIPMENT"}`.slice(0, 25).toUpperCase();
  const qrUrl = `https://img.vietqr.io/image/MB-${bankAccount}-compact2.png?amount=${amount || 150000}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountHolder)}`;

  function handleCopyMemo() {
    navigator.clipboard.writeText(memo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSimulatePayment() {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      if (onPaidSuccess) onPaidSuccess();
      onClose();
    }, 1500);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card vietqr-modal">
        <div className="modal-header">
          <div className="modal-title-group">
            <QrCode className="text-primary" size={22} />
            <h3>Thanh Toán Qua Mã VietQR</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body vietqr-body">
          <div className="qr-preview-container">
            <img src={qrUrl} alt="VietQR Code" className="vietqr-image" />
            <div className="qr-scan-hint">Quét mã bằng app ngân hàng bất kỳ (MB, Vietcombank, Techcombank, MoMo...)</div>
          </div>

          <div className="payment-details-panel">
            <div className="detail-row">
              <span>Thiết bị đặt:</span>
              <strong>{resourceName || "Máy chủ GPU High Performance"}</strong>
            </div>
            <div className="detail-row">
              <span>Số tiền thanh toán:</span>
              <strong className="amount-text">{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 150000)}</strong>
            </div>
            <div className="detail-row">
              <span>Ngân hàng thụ hưởng:</span>
              <span>{bankName}</span>
            </div>
            <div className="detail-row">
              <span>Chủ tài khoản:</span>
              <span>{accountHolder}</span>
            </div>
            <div className="detail-row memo-row">
              <span>Nội dung chuyển khoản:</span>
              <div className="memo-box">
                <code>{memo}</code>
                <button type="button" className="btn btn-sm btn-ghost" onClick={handleCopyMemo}>
                  {copied ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button type="button" className="btn btn-primary" onClick={handleSimulatePayment} disabled={simulating}>
            {simulating ? "Đang xác thực giao dịch..." : "Giả lập Thanh toán Thành công"}
          </button>
        </div>
      </div>
    </div>
  );
}
