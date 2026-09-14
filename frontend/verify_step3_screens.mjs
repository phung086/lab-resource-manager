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

  const switchTab = async (tabId) => {
    await page.evaluate((id) => {
      if (window.__setActiveTab) {
        window.__setActiveTab(id);
      }
    }, tabId);
    await page.waitForTimeout(800);
  };

  // 1. Mission Control Overview with Bento Grid (Tab: dashboard)
  console.log("Capturing Mission Control Bento Grid (dashboard)...");
  await switchTab("dashboard");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(imagesDir, "09_mission_control_overview.png"),
    fullPage: false
  });

  // 2. Digital Twin Canvas & Blueprint Heatmap (Tab: digital_twin)
  console.log("Capturing Digital Twin Heatmap & Blueprint (digital_twin)...");
  await switchTab("digital_twin");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(imagesDir, "10_digital_twin_canvas.png"),
    fullPage: false
  });

  // 3. Decision Timeline Replay Scrubber (Tab: timeline)
  console.log("Capturing Decision Timeline Replay (timeline)...");
  await switchTab("timeline");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(imagesDir, "12_decision_timeline_replay.png"),
    fullPage: false
  });

  // 4. Concurrency Stress Monitor GiST Benchmark (Tab: concurrency)
  console.log("Capturing Concurrency Stress Monitor (concurrency)...");
  await switchTab("concurrency");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(imagesDir, "16_concurrency_stress_monitor.png"),
    fullPage: false
  });

  await browser.close();
  console.log("All Step 3 screens captured successfully!");
}

run().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
