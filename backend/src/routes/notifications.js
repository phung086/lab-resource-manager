import express from "express";

const router = express.Router();

// Smart in-memory notifications for AI Booking & Advisory
let userNotifications = [
  {
    id: "notif-1",
    title: "Nhắc nhở Check-in QR Ca đặt GPU H100",
    message: "Ca đặt chỗ của bạn sẽ bắt đầu trong 30 phút. Quét mã QR tại cửa phòng lab để cộng +2 điểm tín nhiệm.",
    type: "info",
    readAt: null,
    createdAt: new Date().toISOString()
  },
  {
    id: "notif-2",
    title: "Khuyến nghị Tối ưu Giờ Xanh (Green AI)",
    message: "Hệ thống đang mở khung giờ xanh 22:00 - 06:00 tiết kiệm 45% hạn ngạch tính toán.",
    type: "success",
    readAt: null,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "notif-3",
    title: "Xác nhận Thanh toán VietQR Napas 24/7",
    message: "Giao dịch mã TXN-2026-0910-001 đã khớp lệnh tự động thành công.",
    type: "success",
    readAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
];

router.get("/", (req, res) => {
  res.json(userNotifications);
});

router.post("/read-all", (_req, res) => {
  userNotifications = userNotifications.map((n) => ({ ...n, readAt: new Date().toISOString() }));
  res.json({ updated: userNotifications.length });
});

router.post("/:id/read", (req, res) => {
  const item = userNotifications.find((n) => n.id === req.params.id);
  if (item) {
    item.readAt = new Date().toISOString();
  }
  res.json(item || { id: req.params.id, readAt: new Date().toISOString() });
});

export default router;
