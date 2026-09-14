import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

async function run() {
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome"
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  // Inject session token and mock user
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

  // 1. Capture Layout Shell (Sidebar 4 zones + Header + active state + badges)
  await page.screenshot({
    path: path.join(imagesDir, "layout_shell_2026.png"),
    fullPage: false
  });
  console.log("Captured layout_shell_2026.png");

  // 2. Open User Dropdown Menu in Header
  const userBtn = page.locator(".user-avatar-btn-2026");
  if (await userBtn.count() > 0) {
    await userBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(imagesDir, "header_user_dropdown_2026.png"),
      fullPage: false
    });
    console.log("Captured header_user_dropdown_2026.png");
    // Close dropdown
    await userBtn.click();
    await page.waitForTimeout(200);
  }

  // 3. Open Floating AI Copilot FAB & Drawer
  const fabBtn = page.locator(".floating-copilot-pill-btn-2026");
  if (await fabBtn.count() > 0) {
    await fabBtn.click();
    await page.waitForTimeout(600); // wait for 300ms transition + content render
    await page.screenshot({
      path: path.join(imagesDir, "copilot_drawer_2026.png"),
      fullPage: false
    });
    console.log("Captured copilot_drawer_2026.png");
  }

  await browser.close();
  console.log("All verifications captured successfully!");
}

run().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
