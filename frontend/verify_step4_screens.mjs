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

  // 1. Màn 08: Orchestration Wizard (Tab: allocations)
  console.log("Capturing 08_orchestration_wizard.png...");
  await switchTab("allocations");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(imagesDir, "08_orchestration_wizard.png"),
    fullPage: false
  });

  // 2. Màn 11: What-If Simulation Studio (Tab: what_if)
  console.log("Capturing 11_what_if_simulation_studio.png...");
  await switchTab("what_if");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(imagesDir, "11_what_if_simulation_studio.png"),
    fullPage: false
  });

  // 3. Màn 15: Pareto Frontier Explorer (Tab: pareto)
  console.log("Capturing 15_pareto_frontier_explorer.png...");
  await switchTab("pareto");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(imagesDir, "15_pareto_frontier_explorer.png"),
    fullPage: false
  });

  // 4. Màn 21: Genetic Algorithm Visualizer (Tab: ga_solver)
  console.log("Capturing 21_genetic_algorithm_visualizer.png...");
  await switchTab("ga_solver");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(imagesDir, "21_genetic_algorithm_visualizer.png"),
    fullPage: false
  });

  // 5. Màn 23: Optimization Hub - Priority & Preemption (Tab: optimization -> Subtab: priority)
  console.log("Capturing 23_optimization_priority_preemption.png...");
  await switchTab("optimization");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(imagesDir, "23_optimization_priority_preemption.png"),
    fullPage: false
  });

  // 6. Màn 24: Optimization Hub - Green AI Estimator (Subtab: estimator)
  console.log("Capturing 24_optimization_green_ai_estimator.png...");
  const greenTabBtn = page.locator("button:has-text('Green AI Estimator')");
  if (await greenTabBtn.count() > 0) {
    await greenTabBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({
    path: path.join(imagesDir, "24_optimization_green_ai_estimator.png"),
    fullPage: false
  });

  // 7. Màn 25: Optimization Hub - Predictive Maintenance (Subtab: predictive)
  console.log("Capturing 25_optimization_predictive_maintenance.png...");
  const predictiveTabBtn = page.locator("button:has-text('Dự Đoán Hỏng Hóc Thiết Bị')");
  if (await predictiveTabBtn.count() > 0) {
    await predictiveTabBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({
    path: path.join(imagesDir, "25_optimization_predictive_maintenance.png"),
    fullPage: false
  });

  await browser.close();
  console.log("All Step 4 screens captured successfully!");
}

run().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
