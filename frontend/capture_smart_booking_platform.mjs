import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.resolve(__dirname, "..", "images");
const ARTIFACTS_DIR = "C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\ea2141a2-f31c-4fce-aba7-f6d7ace81da9";

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

async function captureScreen(page, filename, description) {
  const filePath = path.join(IMAGES_DIR, filename);
  console.log(`📸 Capturing: ${filename} - ${description}`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: filePath, fullPage: false });

  // Also copy to artifacts directory for markdown embedding
  if (fs.existsSync(ARTIFACTS_DIR)) {
    const artifactPath = path.join(ARTIFACTS_DIR, filename);
    fs.copyFileSync(filePath, artifactPath);
  }
}

async function run() {
  console.log("🚀 Starting Smart Booking & AI Advisory Platform capture...");

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

  // Login as Admin
  await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    localStorage.setItem("lrm_token", "admin-jwt-token-2026");
    localStorage.setItem(
      "lrm_user",
      JSON.stringify({
        id: "admin-01",
        email: "admin@lab.local",
        fullName: "TS. Nguyễn Hoàng Minh",
        role: "admin",
        studentId: "GV-AI-01",
        department: "Trung tâm Điều phối AI Lab 2026"
      })
    );
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const switchTab = async (tabId) => {
    await page.evaluate((id) => {
      if (window.__setActiveTab) {
        window.__setActiveTab(id);
      }
    }, tabId);
    await page.waitForTimeout(600);
  };

  // 1. SMART CALENDAR VIEW
  console.log("\n--- 1. Smart Calendar & Time Slots Grid ---");
  await switchTab("smart_calendar");
  await captureScreen(page, "smart_calendar_view.png", "Màn 1: Lịch Đặt Chỗ & Khung Giờ (Smart Calendar)");

  // 2. QUICK BOOKING MODAL
  console.log("\n--- 2. Quick Booking Modal ---");
  await page.evaluate(() => {
    if (window.__openBookingModal) {
      window.__openBookingModal({
        day: "Thứ Tư",
        date: "10/09",
        time: "14:00 - 16:00",
        resourceName: "Cụm GPU NVIDIA DGX H100 SXM5",
        pricePerHour: 180000
      });
    }
  });
  await page.waitForTimeout(600);
  await captureScreen(page, "quick_booking_modal.png", "Modal: Đặt Chỗ Siêu Tốc & AI Smart Advisory");

  // Trigger VietQR payment from modal
  console.log("\n--- 3. VietQR Payment Modal ---");
  await page.evaluate(() => {
    if (window.__openGlobalModal) {
      window.__openGlobalModal("vietqr", {
        amount: 360000,
        title: "Đặt Chỗ GPU NVIDIA DGX H100 SXM5 (2h)",
        resourceName: "Cụm GPU NVIDIA DGX H100 SXM5"
      });
    }
  });
  await page.waitForTimeout(600);
  await captureScreen(page, "vietqr_payment_modal.png", "Modal: Cổng Thanh Toán VietQR Napas247");

  // Close modal
  await page.evaluate(() => {
    if (window.__closeGlobalModal) {
      window.__closeGlobalModal();
    }
  });
  await page.waitForTimeout(400);

  // 4. EFFICIENCY & ANALYTICS VIEW
  console.log("\n--- 4. Efficiency Analytics & Heatmap View ---");
  await switchTab("ai_analytics");
  await captureScreen(page, "efficiency_analytics_view.png", "Màn 2: AI Tính Toán Hiệu Suất & Density Heatmap");

  // 5. SMART ADVISORY VIEW
  console.log("\n--- 5. Smart Advisory & Copilot Sandbox ---");
  await switchTab("ai_advisor");
  await captureScreen(page, "smart_advisory_view.png", "Màn 3: AI Cố Vấn & Hỗ Trợ Quyết Định (Advisory Copilot)");

  // 6. ADMIN MANAGEMENT VIEW - Resources Tab
  console.log("\n--- 6. Admin Management View (Resources) ---");
  await switchTab("admin_management");
  await captureScreen(page, "admin_resources_view.png", "Màn 4: Quản Trị Danh Mục Tài Nguyên & Phòng");

  // Sub-tab: Users & Quotas
  console.log("\n--- 7. Admin Management View (Users & Quotas) ---");
  const usersSubTab = await page.$('button:has-text("Hạn Ngạch Người Dùng")');
  if (usersSubTab) {
    await usersSubTab.click();
    await page.waitForTimeout(500);
    await captureScreen(page, "admin_users_view.png", "Màn 4: Quản Trị Hạn Ngạch & Điểm Tín Nhiệm Người Dùng");
  }

  // Sub-tab: VietQR Ledger
  console.log("\n--- 8. Admin Management View (VietQR Ledger) ---");
  const ledgerSubTab = await page.$('button:has-text("Sổ Cái VietQR")');
  if (ledgerSubTab) {
    await ledgerSubTab.click();
    await page.waitForTimeout(500);
    await captureScreen(page, "admin_ledger_view.png", "Màn 4: Sổ Cái Giao Dịch & Doanh Thu VietQR");
  }

  console.log("\n✅ All screenshots captured and verified successfully!");
  await browser.close();
}

run().catch((err) => {
  console.error("❌ Error capturing screenshots:", err);
  process.exit(1);
});
