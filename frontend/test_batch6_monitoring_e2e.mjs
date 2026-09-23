import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.BATCH6_FRONTEND_URL || "http://127.0.0.1:5177";
const password = "Batch6E2E!Pass";
const screenshotDir = path.resolve("./screenshots_batch6");
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

async function openNav(page, pattern) {
  if (page.viewportSize()?.width <= 900) await page.getByRole("button", { name: "Menu", exact: true }).click();
  const nav = page.locator(".sidebar-nav-item-2026", { hasText: pattern }).first();
  await nav.waitFor({ timeout: 8000 });
  await nav.click();
}

try {
  console.log("=== BATCH 6 STUDENT NOTIFICATIONS ===");
  const studentContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const studentPage = await studentContext.newPage();
  await login(studentPage, "b6.student@lab.test");

  await openNav(studentPage, /Thông Báo/i);
  await studentPage.locator("main").getByRole("heading", { name: "Trung tâm thông báo" }).waitFor();
  await studentPage.getByText("Batch 6 lịch sắp bắt đầu").first().waitFor({ timeout: 5000 });
  assert.equal(await studentPage.getByText("Batch 6 lịch sắp bắt đầu").count(), 1);
  assert.equal(await studentPage.getByText("Batch 6 nhắc trả trong tương lai").count(), 0);

  const visibleNotification = studentPage.locator(".notification-card", { hasText: "Batch 6 lịch sắp bắt đầu" });
  await Promise.all([
    studentPage.waitForResponse((response) =>
      response.url().includes("/api/notifications/") && response.url().endsWith("/read") && response.status() === 200
    ),
    visibleNotification.getByRole("button", { name: "Đã đọc" }).click()
  ]);
  await studentPage.screenshot({ path: path.join(screenshotDir, "student_notifications_desktop.png"), fullPage: true });

  console.log("=== BATCH 6 STUDENT INCIDENT REPORT ===");
  await openNav(studentPage, /Sự Cố Tài Nguyên/i);
  await studentPage.locator("main").getByRole("heading", { name: "Sự cố tài nguyên" }).waitFor();
  assert.equal(await studentPage.getByText("Batch 6 sự cố phòng B").count(), 1);
  await studentPage.getByRole("button", { name: "Báo cáo sự cố" }).click();
  let dialog = studentPage.getByRole("dialog");
  await dialog.getByLabel("Tài nguyên").selectOption("b6000000-0000-4000-8000-000000000025");
  await dialog.getByLabel("Mức độ").selectOption("medium");
  await dialog.getByLabel("Nhóm sự cố").fill("usage");
  await dialog.getByLabel("Tiêu đề").fill("Batch 6 báo cáo từ sinh viên");
  await dialog.getByLabel("Mô tả thực tế").fill("Sinh viên ghi nhận tiếng rung bất thường trước khi bắt đầu sử dụng thiết bị.");
  await Promise.all([
    studentPage.waitForResponse((response) => response.url().endsWith("/api/incidents") && response.status() === 201),
    dialog.getByRole("button", { name: "Gửi báo cáo" }).click()
  ]);
  await studentPage.getByText("Batch 6 báo cáo từ sinh viên").waitFor();
  await studentPage.screenshot({ path: path.join(screenshotDir, "student_incident_report.png"), fullPage: true });
  await studentContext.close();

  console.log("=== BATCH 6 ASSIGNED STAFF INCIDENT SCOPE & RESOLUTION ===");
  const staffContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const staffPage = await staffContext.newPage();
  await login(staffPage, "b6.staff@lab.test");
  await openNav(staffPage, /Sự Cố Tài Nguyên/i);
  await staffPage.locator("main").getByRole("heading", { name: "Sự cố tài nguyên" }).waitFor();
  await staffPage.getByText("Batch 6 báo cáo từ sinh viên").waitFor();
  assert.equal(await staffPage.getByText("Batch 6 quạt làm mát bất thường").count(), 1);
  assert.equal(await staffPage.getByText("Batch 6 sự cố phòng B").count(), 0);
  assert.equal(await staffPage.getByText("Batch 6 báo cáo từ sinh viên").count(), 1);

  const incidentCard = staffPage.locator(".operational-card", { hasText: "Batch 6 quạt làm mát bất thường" });
  await Promise.all([
    staffPage.waitForResponse((response) => response.url().includes("/triage") && response.status() === 200),
    incidentCard.getByRole("button", { name: "Phân loại" }).click()
  ]);
  const refreshedCard = staffPage.locator(".operational-card", { hasText: "Batch 6 quạt làm mát bất thường" });
  if (await refreshedCard.getByRole("button", { name: "Bắt đầu điều tra" }).count()) {
    await Promise.all([
      staffPage.waitForResponse((response) => response.url().includes("/investigate") && response.status() === 200),
      refreshedCard.getByRole("button", { name: "Bắt đầu điều tra" }).click()
    ]);
  }

  const cardBeforeResolve = staffPage.locator(".operational-card", { hasText: "Batch 6 quạt làm mát bất thường" });
  await cardBeforeResolve.getByRole("button", { name: "Xác nhận đã xử lý" }).click();
  dialog = staffPage.getByRole("dialog");
  await dialog.getByRole("button", { name: "Lưu kết quả xử lý" }).click();
  await staffPage.getByRole("alert").getByText(/Cần nhập kết quả xử lý thực tế/).waitFor();
  // Validation must stop the request until real resolution evidence exists.
  await dialog.getByLabel("Kết quả xử lý thực tế").fill("Đã kiểm tra cụm làm mát, siết lại quạt và xác nhận thông số vận hành ổn định.");
  await Promise.all([
    staffPage.waitForResponse((response) => response.url().includes("/resolve") && response.status() === 200),
    dialog.getByRole("button", { name: "Lưu kết quả xử lý" }).click()
  ]);
  await staffPage.screenshot({ path: path.join(screenshotDir, "staff_incident_resolution.png"), fullPage: true });

  console.log("=== BATCH 6 REAL DASHBOARD & TELEMETRY STATES ===");
  await openNav(staffPage, /Bảng Điều Khiển Vận Hành/i);
  await staffPage.locator("main").getByRole("heading", { name: "Bảng điều khiển vận hành" }).waitFor();
  const dashboardText = await staffPage.locator("main").innerText();
  for (const state of ["HEALTHY", "WARNING", "STALE", "UNAVAILABLE", "NO_DATA"]) {
    assert.ok(dashboardText.includes(state), `Dashboard must show ${state}`);
  }
  assert.ok(dashboardText.includes("Thiết bị chưa có telemetry"));
  assert.ok(dashboardText.includes("Không có mẫu telemetry được chấp nhận"));
  assert.equal(dashboardText.includes("REAL-TIME STREAM"), false);
  assert.equal(dashboardText.includes("MTBF: 99.98%"), false);
  assert.equal(dashboardText.includes("NVIDIA DGX A100 SuperPOD"), false);
  await staffPage.screenshot({ path: path.join(screenshotDir, "staff_dashboard_desktop.png"), fullPage: true });
  await staffContext.close();

  console.log("=== BATCH 6 FOREIGN STAFF SCOPE ===");
  const foreignContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const foreignPage = await foreignContext.newPage();
  await login(foreignPage, "b6.foreign.staff@lab.test");
  await openNav(foreignPage, /Sự Cố Tài Nguyên/i);
  await foreignPage.locator("main").getByRole("heading", { name: "Sự cố tài nguyên" }).waitFor();
  assert.equal(await foreignPage.getByText("Batch 6 sự cố phòng B").count(), 1);
  assert.equal(await foreignPage.getByText("Batch 6 quạt làm mát bất thường").count(), 0);
  await openNav(foreignPage, /Bảng Điều Khiển Vận Hành/i);
  await foreignPage.locator("main").getByRole("heading", { name: "Bảng điều khiển vận hành" }).waitFor();
  const foreignDashboard = await foreignPage.locator("main").innerText();
  assert.ok(foreignDashboard.includes("Thiết bị phòng B"));
  assert.equal(foreignDashboard.includes("Máy đo môi trường A"), false);
  await foreignContext.close();

  console.log("=== BATCH 6 ADMIN GLOBAL DASHBOARD ===");
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const adminPage = await adminContext.newPage();
  await login(adminPage, "b6.admin@lab.test");
  await openNav(adminPage, /Bảng Điều Khiển Vận Hành/i);
  await adminPage.locator("main").getByRole("heading", { name: "Bảng điều khiển vận hành" }).waitFor();
  const adminDashboard = await adminPage.locator("main").innerText();
  assert.ok(adminDashboard.includes("Máy đo môi trường A"));
  assert.ok(adminDashboard.includes("Thiết bị phòng B"));
  await adminContext.close();

  console.log("=== BATCH 6 MOBILE ===");
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await login(mobilePage, "b6.staff@lab.test");
  await openNav(mobilePage, /Bảng Điều Khiển Vận Hành/i);
  await mobilePage.locator("main").getByRole("heading", { name: "Bảng điều khiển vận hành" }).waitFor();
  assert.equal(await mobilePage.locator(".telemetry-status-card").first().isVisible(), true);
  await mobilePage.screenshot({ path: path.join(screenshotDir, "staff_dashboard_mobile.png"), fullPage: true });
  await mobileContext.close();

  console.log("ALL BATCH 6 FULL-STACK E2E ASSERTIONS PASSED");
} finally {
  await browser.close();
}
