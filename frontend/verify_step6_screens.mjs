import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

async function run() {
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome"
  });

  const context = await browser.newContext({
    viewport: { width: 1560, height: 980 }
  });

  const page = await context.newPage();
  const imagesDir = path.resolve("..", "images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // =========================================================================
  // 1. MÀN 01: CỔNG ĐĂNG NHẬP (AuthLoginView)
  // =========================================================================
  console.log("Navigating to login page without token...");
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.removeItem("lrm_token");
    localStorage.removeItem("lrm_user");
    if (window.__setUser) window.__setUser(null);
    if (window.__setAuthMode) window.__setAuthMode("login");
  });
  await page.waitForTimeout(600);

  console.log("Capturing 01_auth_login.png...");
  await page.screenshot({
    path: path.join(imagesDir, "01_auth_login.png"),
    fullPage: false
  });

  // =========================================================================
  // 2. MÀN 02: CỔNG ĐĂNG KÝ (AuthRegisterView)
  // =========================================================================
  console.log("Switching to register page...");
  await page.evaluate(() => {
    if (window.__setAuthMode) window.__setAuthMode("register");
  });
  await page.waitForTimeout(500);

  console.log("Capturing 02_auth_register.png...");
  await page.screenshot({
    path: path.join(imagesDir, "02_auth_register.png"),
    fullPage: false
  });

  // =========================================================================
  // LOG IN AS ADMIN FOR MODAL CAPTURES
  // =========================================================================
  console.log("Logging in as Admin for modal captures...");
  await page.evaluate(() => {
    const mockUser = {
      id: "admin-01",
      email: "admin@ailab.edu.vn",
      fullName: "GS.TS Nguyễn Văn A",
      role: "admin",
      department: "Khoa CNTT - PTN Trí Tuệ Nhân Tạo 2026",
      quotaUsed: 42.5,
      quotaTotal: 100.0
    };
    localStorage.setItem("lrm_token", "admin-jwt-token-2026");
    localStorage.setItem("lrm_user", JSON.stringify(mockUser));
    if (window.__setUser) window.__setUser(mockUser);
    if (window.__setActiveTab) window.__setActiveTab("bookings");
  });
  await page.waitForTimeout(1000);

  // Helper to open and close global modal
  const openModal = async (type, payload) => {
    await page.evaluate(({ t, p }) => {
      if (window.__openGlobalModal) {
        window.__openGlobalModal(t, p);
      }
    }, { t: type, p: payload });
    await page.waitForTimeout(500);
  };

  const closeModal = async () => {
    await page.evaluate(() => {
      if (window.__closeGlobalModal) {
        window.__closeGlobalModal();
      }
    });
    await page.waitForTimeout(400);
  };

  // =========================================================================
  // 3. MÀN 30: MODAL CHI TIẾT THIẾT BỊ BENTO GRID (ResourceDetailsModal)
  // =========================================================================
  console.log("Capturing 30_modal_resource_details.png...");
  await openModal("resource_details", {
    code: "GPU-NODE-01",
    name: "NVIDIA DGX A100 SuperPOD (8x 80GB)",
    location: "Rack R-01 • Phòng Máy Chủ AI Cao Cấp",
    status: "available"
  });
  await page.screenshot({
    path: path.join(imagesDir, "30_modal_resource_details.png"),
    fullPage: false
  });
  await closeModal();

  // =========================================================================
  // 4. MÀN 30b: MODAL CẬP NHẬT BẢO TRÌ (ResourceStatusModal)
  // =========================================================================
  console.log("Capturing 30b_modal_resource_status.png...");
  await openModal("resource_status", {
    code: "GPU-H100-02",
    name: "NVIDIA DGX H100 SXM5 80GB HBM3",
    status: "BẢO TRÌ (MAINTENANCE)"
  });
  await page.screenshot({
    path: path.join(imagesDir, "30b_modal_resource_status.png"),
    fullPage: false
  });
  await closeModal();

  // =========================================================================
  // 5. MÀN 31: MODAL QR CHECK-IN QUANG HỌC (QrCheckInModal)
  // =========================================================================
  console.log("Capturing 31_modal_qr_checkin.png...");
  await openModal("qr_checkin", {
    bookingCode: "214ae7c1",
    resource: {
      code: "GPU-NODE-01",
      name: "NVIDIA DGX A100 SuperPOD (8x 80GB)"
    },
    startAt: "14:00",
    endAt: "18:00 Hôm nay",
    requestedBy: { fullName: "NCS. Trần Tiến Dũng" }
  });
  await page.screenshot({
    path: path.join(imagesDir, "31_modal_qr_checkin.png"),
    fullPage: false
  });
  await closeModal();

  // =========================================================================
  // 6. MÀN 32: MODAL THANH TOÁN VIETQR NAPAS (VietQrPaymentModal)
  // =========================================================================
  console.log("Capturing 32_modal_vietqr_payment.png...");
  await openModal("vietqr", {
    amount: 150000,
    title: "LABPAY HUAN LUYEN MO HINH LLAMA-3",
    resourceName: "NVIDIA DGX A100 SuperPOD (8x 80GB)"
  });
  await page.screenshot({
    path: path.join(imagesDir, "32_modal_vietqr_payment.png"),
    fullPage: false
  });
  await closeModal();

  // =========================================================================
  // 7. MÀN 32b: MODAL BÀN GIAO THIẾT BỊ (BookingActionModal)
  // =========================================================================
  console.log("Capturing 32b_modal_booking_action.png...");
  await openModal("booking_action", {
    actionTitle: "Nghiệm Thu & Xác Nhận Bàn Giao Thiết Bị",
    resourceCode: "UAV-MATRICE-300",
    resourceName: "DJI Matrice 300 RTK Quadcopter (Docked)"
  });
  await page.screenshot({
    path: path.join(imagesDir, "32b_modal_booking_action.png"),
    fullPage: false
  });
  await closeModal();

  // =========================================================================
  // 8. MÀN 33: BÀI THI AN TOÀN LAB STEPPER (SafetyQuizModal)
  // =========================================================================
  console.log("Capturing 33_modal_safety_quiz.png...");
  await openModal("safety_quiz", {
    title: "Khóa Huấn Luyện An Toàn Cụm Máy Chủ GPU & Thiết Bị Bay 2026"
  });
  await page.screenshot({
    path: path.join(imagesDir, "33_modal_safety_quiz.png"),
    fullPage: false
  });
  await closeModal();

  // =========================================================================
  // 9. MÀN 35: SINH VIÊN ĐẶT CHỖ & LỊCH TRÌNH
  // =========================================================================
  console.log("Capturing 35_student_bookings.png...");
  await page.evaluate(() => {
    if (window.__setActiveTab) window.__setActiveTab("bookings");
  });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(imagesDir, "35_student_bookings.png"),
    fullPage: false
  });

  // =========================================================================
  // 10. MÀN 36: KHÓA ĐÀO TẠO & CHỨNG CHỈ (TrainingView)
  // =========================================================================
  console.log("Capturing 36_student_training.png...");
  await page.evaluate(() => {
    if (window.__setActiveTab) window.__setActiveTab("training");
  });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(imagesDir, "36_student_training.png"),
    fullPage: false
  });

  await browser.close();
  console.log("All Step 6 screens and modals captured successfully!");
}

run().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
