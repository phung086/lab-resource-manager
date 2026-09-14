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

  // Inject session token and mock user with admin role
  await page.addInitScript(() => {
    localStorage.setItem("lrm_token", "admin-jwt-token-2026");
    localStorage.setItem("lrm_user", JSON.stringify({
      id: "admin-01",
      email: "admin@ailab.edu.vn",
      fullName: "GS.TS Nguyễn Văn A",
      role: "admin",
      department: "Khoa CNTT - PTN Trí Tuệ Nhân Tạo 2026",
      quotaUsed: 42.5,
      quotaTotal: 100.0
    }));
  });

  console.log("Navigating to http://localhost:5173/ ...");
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const imagesDir = path.resolve("..", "images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const switchTab = async (tabId) => {
    await page.evaluate((id) => {
      if (window.__setActiveTab) {
        window.__setActiveTab(id);
      }
    }, tabId);
    await page.waitForTimeout(800);
  };

  // 1. Màn 03: Hàng Đợi Phân Xử Xung Đột (Tab: conflict_queue)
  console.log("Capturing 03_conflict_resolution_queue.png...");
  await switchTab("conflict_queue");
  await page.screenshot({
    path: path.join(imagesDir, "03_conflict_resolution_queue.png"),
    fullPage: false
  });

  // 1b. Capture EmptyStateCard demo by filtering to RESOLVED (0 items)
  console.log("Capturing 03_empty_state_card_demo.png...");
  const resolvedBtn = await page.$("button:has-text('Đã Phân Xử')");
  if (resolvedBtn) {
    await resolvedBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(imagesDir, "03_empty_state_card_demo.png"),
      fullPage: false
    });
    // Click back to "Tất Cả"
    const allBtn = await page.$("button:has-text('Tất Cả')");
    if (allBtn) await allBtn.click();
    await page.waitForTimeout(400);
  }

  // 2. Màn 04: Bảng Phân Bổ Hạn Ngạch & Điểm Uy Tín (Tab: quota_fairness)
  console.log("Capturing 04_quota_fairness_dashboard.png...");
  await switchTab("quota_fairness");
  await page.screenshot({
    path: path.join(imagesDir, "04_quota_fairness_dashboard.png"),
    fullPage: false
  });

  // 3. Màn 05: Báo Cáo Phân Bổ Chi Phí & Quyết Toán EVN (Tab: chargeback)
  console.log("Capturing 05_cost_chargeback_report.png...");
  await switchTab("chargeback");
  await page.screenshot({
    path: path.join(imagesDir, "05_cost_chargeback_report.png"),
    fullPage: false
  });

  // 4. Màn 06: Cấu Hình Chính Sách & Ràng Buộc Lab (Tab: policy_config)
  console.log("Capturing 06_policy_rules_config.png...");
  await switchTab("policy_config");
  await page.screenshot({
    path: path.join(imagesDir, "06_policy_rules_config.png"),
    fullPage: false
  });

  // 5. Màn 07: Cảnh Báo & Escalation (Tab: escalations)
  console.log("Capturing 07_escalations_view.png...");
  await switchTab("escalations");
  await page.screenshot({
    path: path.join(imagesDir, "07_escalations_view.png"),
    fullPage: false
  });

  // 6. Màn 19: Nhật Ký Kiểm Toán (Tab: logs)
  console.log("Capturing 19_audit_logs_view.png...");
  await switchTab("logs");
  await page.screenshot({
    path: path.join(imagesDir, "19_audit_logs_view.png"),
    fullPage: false
  });

  // 7. Màn 20: Quản Lý Người Dùng RBAC (Tab: users)
  console.log("Capturing 20_user_role_management.png...");
  await switchTab("users");
  await page.screenshot({
    path: path.join(imagesDir, "20_user_role_management.png"),
    fullPage: false
  });

  // 8. Màn 26: Quản Lý Sự Cố & Gián Đoạn (Tab: incidents)
  console.log("Capturing 26_incident_management_view.png...");
  await switchTab("incidents");
  await page.screenshot({
    path: path.join(imagesDir, "26_incident_management_view.png"),
    fullPage: false
  });

  await browser.close();
  console.log("All Step 5 screens captured successfully!");
}

run().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
