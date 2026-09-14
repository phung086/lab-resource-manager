import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.resolve(__dirname, "..", "images");

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

async function captureScreen(page, filename, description) {
  const filePath = path.join(IMAGES_DIR, filename);
  console.log(`📸 Capturing: ${filename} - ${description}`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: filePath, fullPage: false });
}

async function run() {
  console.log("🚀 Starting comprehensive screen capture...");
  console.log(`📁 Target directory: ${IMAGES_DIR}`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1.25
  });

  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[Browser Error]:`, msg.text());
    }
  });

  // 1. AUTH SCREENS
  console.log("\n--- 1. Authentication Screens ---");
  await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(1000);

  // Clear any existing localStorage session to see login screen
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  await captureScreen(page, "01_auth_login.png", "Màn hình Đăng nhập (Login View)");

  // Toggle to Register form
  const registerToggle = await page.$('button:has-text("Đăng ký tài khoản mới")');
  if (registerToggle) {
    await registerToggle.click();
    await page.waitForTimeout(400);
    await captureScreen(page, "02_auth_register.png", "Màn hình Đăng ký tài khoản (Register View)");
  }

  // 2. LOGIN AS ADMIN
  console.log("\n--- 2. Admin Authentication & Core Tabs ---");
  await page.evaluate(() => {
    localStorage.setItem("lrm_token", "admin-jwt-token-2026");
    localStorage.setItem("lrm_user", JSON.stringify({
      id: "admin-01",
      email: "admin@lab.local",
      fullName: "Nguyễn Hoàng Minh",
      role: "admin",
      studentId: "GV-AI-01",
      department: "Trung tâm Điều phối AI Lab 2026"
    }));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  // Helper to switch tab
  const switchTab = async (tabId) => {
    await page.evaluate((id) => {
      if (window.__setActiveTab) {
        window.__setActiveTab(id);
      }
    }, tabId);
    await page.waitForTimeout(800);
  };

  // Section 1: Quản trị vận hành & Xử lý xung đột
  console.log("\n--- Section 1: Quản trị vận hành & Xử lý xung đột ---");
  await switchTab("conflict_queue");
  await captureScreen(page, "03_conflict_resolution_queue.png", "Xử lý Xung đột Real-Time (Conflict Queue)");

  await switchTab("quota_fairness");
  await captureScreen(page, "04_quota_fairness_dashboard.png", "Hạn ngạch & Công bằng Nhóm Fair-Share (Quota Fairness)");

  await switchTab("chargeback");
  await captureScreen(page, "05_cost_chargeback_report.png", "Quyết toán & Tiền điện EVN (Chargeback Report)");

  await switchTab("policy_config");
  await captureScreen(page, "06_policy_rules_config.png", "Chính sách & Ràng buộc Lab (Policy Config)");

  await switchTab("escalations");
  await captureScreen(page, "07_escalations_notifications.png", "Cảnh báo & Escalation (Notification Center)");

  await switchTab("allocations");
  await captureScreen(page, "08_orchestration_wizard_step1.png", "Điều phối Yêu cầu Mới - Bước 1 (Orchestration Wizard Form)");

  // Section 2: Giám sát thời gian thực & Bản sao số
  console.log("\n--- Section 2: Giám sát thời gian thực & Bản sao số ---");
  await switchTab("dashboard");
  await captureScreen(page, "09_mission_control_overview.png", "Mission Control Thiết Bị Toàn Lab (Dashboard Overview)");

  await switchTab("digital_twin");
  await captureScreen(page, "10_digital_twin_canvas.png", "Bản sao số Digital Twin & Bản đồ Nhiệt (Digital Twin Canvas)");

  await switchTab("what_if");
  await captureScreen(page, "11_what_if_simulation_studio.png", "Studio Mô phỏng What-If (What-If Studio)");

  await switchTab("resources");
  await captureScreen(page, "12_resources_inventory_floorplan.png", "Quản lý Thiết bị & Sơ đồ Mặt bằng Lab (Resources & Floorplan)");

  await switchTab("bookings");
  await captureScreen(page, "13_bookings_schedule_view.png", "Quản lý Đặt chỗ & Ca Sử dụng (Bookings View)");

  await switchTab("maintenance");
  await captureScreen(page, "14_maintenance_schedules.png", "Kế hoạch Bảo trì Thiết bị (Maintenance View)");

  // Section 3: Công cụ kỹ thuật & Truy vết
  console.log("\n--- Section 3: Công cụ kỹ thuật & Truy vết ---");
  await switchTab("pareto");
  await captureScreen(page, "15_pareto_frontier_explorer.png", "Khảo sát Đa mục tiêu Pareto Frontier (Pareto Explorer)");

  await switchTab("timeline");
  await captureScreen(page, "16_decision_timeline_replay.png", "Replay Tái Tối ưu hóa & Lịch sử Quyết định (Timeline Replay)");

  await switchTab("concurrency");
  await captureScreen(page, "17_concurrency_stress_monitor.png", "Giám sát Tranh chấp Khóa GiST Concurrency (Stress Monitor)");

  await switchTab("assistant");
  await captureScreen(page, "18_ai_mission_copilot.png", "AI Copilot Kỹ thuật & MCP Trace (Mission Copilot)");

  await switchTab("logs");
  await captureScreen(page, "19_system_audit_logs.png", "Nhật ký Hoạt động & Audit Trail (Logs View)");

  await switchTab("users");
  await captureScreen(page, "20_users_role_management.png", "Quản lý Người dùng & Phân quyền RBAC (Users View)");

  // Extended Lab Modules
  console.log("\n--- Extended Modules ---");
  await switchTab("ga_solver");
  await captureScreen(page, "21_genetic_algorithm_visualizer.png", "Trực quan hóa Thuật toán Di truyền (Genetic Algorithm Visualizer)");

  await switchTab("ai_rca");
  await captureScreen(page, "22_ai_diagnostic_rca_studio.png", "AI Root Cause Analysis Diagnostic Studio (AI RCA Studio)");

  await switchTab("optimization");
  await captureScreen(page, "23_optimization_hub_priority.png", "Trung tâm Tối ưu hóa - Điều phối Ưu tiên (Optimization Priority)");

  // Sub-tabs in optimization
  try {
    const greenTab = await page.$('button:has-text("Khung Giờ Xanh")') || await page.$('button:has-text("Khung giờ xanh")');
    if (greenTab) {
      await greenTab.click();
      await page.waitForTimeout(500);
      await captureScreen(page, "24_optimization_hub_green.png", "Trung tâm Tối ưu hóa - Khung giờ Xanh EVN (Optimization Green AI)");
    }

    const maintTab = await page.$('button:has-text("Bảo Trì Thông Minh")') || await page.$('button:has-text("Bảo trì thông minh")');
    if (maintTab) {
      await maintTab.click();
      await page.waitForTimeout(500);
      await captureScreen(page, "25_optimization_hub_maintenance.png", "Trung tâm Tối ưu hóa - Bảo trì Dự đoán (Optimization Maintenance)");
    }
  } catch (err) {
    console.log("Subtab optimization skip:", err.message);
  }

  await switchTab("incidents");
  await captureScreen(page, "26_incident_management_view.png", "Quản lý Báo cáo Sự cố Phòng Lab (Incidents View)");

  await switchTab("training");
  await captureScreen(page, "27_safety_training_courses.png", "Đào tạo An toàn & Chứng chỉ Thiết bị (Training View)");

  await switchTab("monitoring");
  await captureScreen(page, "28_telemetry_sensor_monitoring.png", "Giám sát Cảm biến & Telemetry (Monitoring View)");

  // 3. DRAWERS & MODALS
  console.log("\n--- Drawers & Modals ---");

  // AI Copilot Drawer
  try {
    await page.evaluate(() => {
      if (window.__setCopilotOpen) window.__setCopilotOpen(true);
    });
    await page.waitForTimeout(700);
    await captureScreen(page, "29_ai_copilot_drawer_opened.png", "AI Copilot Drawer 2026 Mở từ cạnh phải");
    await page.evaluate(() => {
      if (window.__setCopilotOpen) window.__setCopilotOpen(false);
    });
    await page.waitForTimeout(400);
  } catch (e) {
    console.log("Copilot drawer capture issue:", e.message);
  }

  // Resource Details Modal
  try {
    await switchTab("resources");
    const detailBtn = await page.$('button:has-text("Chi tiết")') || await page.$('.resource-card') || await page.$('button[title*="Chi tiết"]');
    if (detailBtn) {
      await detailBtn.click();
      await page.waitForTimeout(600);
      await captureScreen(page, "30_modal_resource_details.png", "Modal Chi tiết Thiết bị (Resource Details Modal)");
      const closeBtn = await page.$('.details-modal button') || await page.$('.modal-backdrop');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(300);
    }
  } catch (e) {
    console.log("Resource details modal skip:", e.message);
  }

  // QR Checkin Modal
  try {
    await switchTab("bookings");
    const qrBtn = await page.$('button:has-text("QR Check-in")') || await page.$('button:has-text("Check-in")');
    if (qrBtn) {
      await qrBtn.click();
      await page.waitForTimeout(600);
      await captureScreen(page, "31_modal_qr_checkin.png", "Modal Quét mã QR Check-in Phòng Lab (QR Check-in Modal)");
      const closeBtn = await page.$('.modal button:has-text("Đóng")') || await page.$('.modal-backdrop');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(300);
    }
  } catch (e) {
    console.log("QR checkin modal skip:", e.message);
  }

  // VietQR Payment Modal
  try {
    await switchTab("bookings");
    const payBtn = await page.$('button:has-text("VietQR")') || await page.$('button:has-text("Thanh toán")');
    if (payBtn) {
      await payBtn.click();
      await page.waitForTimeout(600);
      await captureScreen(page, "32_modal_vietqr_payment.png", "Modal Thanh toán Dynamic VietQR (VietQR Modal)");
      const closeBtn = await page.$('.modal button:has-text("Đóng")') || await page.$('.modal-backdrop');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(300);
    }
  } catch (e) {
    console.log("VietQR modal skip:", e.message);
  }

  // Safety Quiz Modal
  try {
    await switchTab("training");
    const quizBtn = await page.$('button:has-text("Làm Bài Thi Trắc Nghiệm")') || await page.$('button:has-text("Thi trắc nghiệm")');
    if (quizBtn) {
      await quizBtn.click();
      await page.waitForTimeout(600);
      await captureScreen(page, "33_modal_safety_quiz.png", "Modal Bài thi Trắc nghiệm An toàn Phòng Lab (Safety Quiz Modal)");
      const closeBtn = await page.$('.modal button:has-text("Hủy")') || await page.$('.modal button:has-text("Đóng")') || await page.$('.modal-backdrop');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(300);
    }
  } catch (e) {
    console.log("Safety quiz modal skip:", e.message);
  }

  // 4. STUDENT PERSPECTIVE
  console.log("\n--- 4. Student Role Perspective ---");
  await page.evaluate(() => {
    localStorage.setItem("lrm_token", "student-jwt-token-2026");
    localStorage.setItem("lrm_user", JSON.stringify({
      id: "student-01",
      email: "student@lab.local",
      fullName: "Lê Trần Gia Bảo",
      role: "student",
      studentId: "SV-AI-2026-088",
      department: "Khoa Khoa học Dữ liệu & AI"
    }));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  await switchTab("dashboard");
  await captureScreen(page, "34_student_dashboard.png", "Giao diện Sinh viên - Mission Control Dashboard");

  await switchTab("bookings");
  await captureScreen(page, "35_student_bookings.png", "Giao diện Sinh viên - Đặt chỗ & Ca sử dụng cá nhân");

  await switchTab("training");
  await captureScreen(page, "36_student_training.png", "Giao diện Sinh viên - Khóa học & Chứng chỉ An toàn cá nhân");

  console.log("\n✨ All screenshots captured successfully!");
  await browser.close();
}

run().catch((err) => {
  console.error("Fatal error during capture:", err);
  process.exit(1);
});
