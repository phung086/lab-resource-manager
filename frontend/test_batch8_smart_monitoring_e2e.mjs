import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.BATCH8_FRONTEND_URL || "http://127.0.0.1:5177";
const apiUrl = process.env.BATCH8_API_URL || "http://127.0.0.1:8000";
const password = "Batch8E2E!Pass";
const screenshotDir = path.resolve("./screenshots_batch8");
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function login(page, email) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/auth/login") && response.status() === 200),
    page.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click()
  ]);
}

async function openMonitoring(page) {
  if (page.viewportSize()?.width <= 900) await page.getByRole("button", { name: "Menu", exact: true }).click();
  const nav = page.locator(".sidebar-nav-item-2026", { hasText: /Giám Sát Telemetry/i }).first();
  await nav.waitFor({ timeout: 8000 });
  await nav.click();
  await page.locator("main").getByRole("heading", { name: "Bảng điều khiển vận hành" }).waitFor();
}

try {
  console.log("=== BATCH 8 ASSIGNED STAFF SMART MONITORING ===");
  const staffContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const staffPage = await staffContext.newPage();
  await login(staffPage, "b8.staff@lab.test");
  await openMonitoring(staffPage);
  const main = staffPage.locator("main");
  const text = await main.innerText();
  for (const expected of [
    "Thiết bị giám sát thông minh A",
    "B8-E2E-SOURCE-A",
    "ONLINE · FRESH",
    "95.0 °C",
    "RESOURCE_OVERRIDE",
    "TEMPERATURE_CRITICAL",
    "Incident:",
    "B8-E2E-CAMERA-A",
    "NOT_CONFIGURED",
    "NON-CERTIFIED · NOT A FIRE ALARM"
  ]) assert.ok(text.includes(expected), `Monitoring dashboard must include ${expected}`);
  assert.equal(text.includes("Thiết bị giám sát phòng B"), false);
  assert.equal(text.includes("REAL-TIME STREAM"), false);
  assert.equal(text.includes("secret-stream"), false);

  const history = main.getByText("Lịch sử mẫu đã chấp nhận").first();
  await history.click();
  assert.ok((await main.innerText()).includes("28.0°C"));

  const alertRow = main.locator(".dashboard-booking-row", { hasText: "TEMPERATURE_CRITICAL" }).first();
  await Promise.all([
    staffPage.waitForResponse((response) => response.url().includes("/api/telemetry/alerts/") && response.url().endsWith("/acknowledge") && response.status() === 200),
    alertRow.getByRole("button", { name: "Xác nhận" }).click()
  ]);
  await staffPage.waitForResponse((response) => response.url().endsWith("/api/dashboard") && response.status() === 200);
  await staffPage.getByText("ACKNOWLEDGED", { exact: true }).first().waitFor();
  await staffPage.screenshot({ path: path.join(screenshotDir, "staff_smart_monitoring_desktop.png"), fullPage: true });
  await staffContext.close();

  console.log("=== BATCH 8 FOREIGN STAFF SCOPE ===");
  const foreignContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const foreignPage = await foreignContext.newPage();
  await login(foreignPage, "b8.foreign.staff@lab.test");
  await openMonitoring(foreignPage);
  const foreignText = await foreignPage.locator("main").innerText();
  assert.ok(foreignText.includes("Thiết bị giám sát phòng B"));
  assert.equal(foreignText.includes("Thiết bị giám sát thông minh A"), false);
  assert.equal(foreignText.includes("B8-E2E-CAMERA-A"), false);
  await foreignContext.close();

  console.log("=== BATCH 8 ORDINARY USER HAS NO MONITORING UI ===");
  const studentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const studentPage = await studentContext.newPage();
  await login(studentPage, "b8.student@lab.test");
  assert.equal(await studentPage.locator(".sidebar-nav-item-2026", { hasText: /Giám Sát Telemetry/i }).count(), 0);
  const ordinaryDashboard = await studentPage.evaluate(async (backendUrl) => {
    const response = await fetch(`${backendUrl}/api/dashboard`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("lrm_token")}` }
    });
    return { status: response.status, body: await response.json() };
  }, apiUrl);
  assert.equal(ordinaryDashboard.status, 403);
  assert.equal(ordinaryDashboard.body.error.code, "FORBIDDEN");
  await studentContext.close();

  console.log("=== BATCH 8 MOBILE MONITORING ===");
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await login(mobilePage, "b8.staff@lab.test");
  await openMonitoring(mobilePage);
  assert.equal(await mobilePage.locator(".telemetry-status-card").first().isVisible(), true);
  await mobilePage.screenshot({ path: path.join(screenshotDir, "staff_smart_monitoring_mobile.png"), fullPage: true });
  await mobileContext.close();

  console.log("ALL BATCH 8 FULL-STACK E2E ASSERTIONS PASSED");
} finally {
  await browser.close();
}
