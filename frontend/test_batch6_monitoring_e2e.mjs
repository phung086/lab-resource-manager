import { openWorkspace, selectWorkspaceTab } from "./test-utils/openWorkspace.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.BATCH6_FRONTEND_URL || "http://127.0.0.1:5177";
const password = "Batch6E2E!Pass";
const catalogs = Object.fromEntries(["vi", "en"].map(locale => [locale,
  JSON.parse(fs.readFileSync(new URL(`./src/locales/catalog/${locale}.json`, import.meta.url), "utf8")).messages
]));
const screenshotDir = path.resolve("./screenshots_batch6");
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args: ["--no-sandbox"], headless: true });

async function login(page, email) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/auth/login") && response.status() === 200),
    page.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click()
  ]);
  await openWorkspace(page);
}

async function openNav(page, id) {
  await selectWorkspaceTab(page, id);
}

try {
  console.log("=== BATCH 6 STUDENT NOTIFICATIONS ===");
  const studentContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const studentPage = await studentContext.newPage();
  await login(studentPage, "b6.student@lab.test");

  await openNav(studentPage, "escalations");
  await studentPage.locator("main").getByRole("heading", { name: "Trung tâm thông báo" }).waitFor();
  const notificationCards = studentPage.locator("main .notification-card");
  await notificationCards.getByRole("heading", { name: catalogs.vi["notification.booking.upcoming.title"], exact: true }).waitFor();
  assert.equal(await notificationCards.count(), 1, "Only the due notification is visible");
  const visibleNotification = notificationCards.first();
  for (const locale of ["vi", "en"]) {
    await studentPage.locator(".header-2026").getByRole("button", { name: locale.toUpperCase(), exact: true }).click();
    await studentPage.locator(`html[lang=${locale}]`).waitFor();
    await visibleNotification.getByRole("heading", { name: catalogs[locale]["notification.booking.upcoming.title"], exact: true }).waitFor();
    assert.equal(await notificationCards.getByText(catalogs[locale]["notification.booking.return_reminder.title"], { exact: true }).count(), 0, "Future notification stays hidden after a language switch");
    assert.ok((await visibleNotification.innerText()).includes("Batch 6 dashboard booking"), "Original booking title is preserved");
    assert.ok((await visibleNotification.innerText()).includes("B6-E2E-HEALTHY"), "Resource identity is preserved");
  }
  const [readResponse] = await Promise.all([
    studentPage.waitForResponse((response) =>
      response.url().includes("/api/notifications/") && response.url().endsWith("/read") && response.status() === 200
    ),
    visibleNotification.getByRole("button", { name: catalogs.en["ui.mark_read_2e5a0c72"], exact: true }).click()
  ]);
  const readResult = await readResponse.json();
  assert.equal(readResult.id, "b6000000-0000-4000-8000-000000000041");
  assert.ok(Number.isFinite(Date.parse(readResult.readAt)), "Read state is persisted by the real API");
  await visibleNotification.getByRole("button", { name: catalogs.en["ui.mark_read_2e5a0c72"], exact: true }).waitFor({ state: "hidden" });
  await studentPage.locator(".header-2026").getByRole("button", { name: "VI", exact: true }).click();
  await studentPage.locator("html[lang=vi]").waitFor();
  await visibleNotification.getByRole("heading", { name: catalogs.vi["notification.booking.upcoming.title"], exact: true }).waitFor();
  await studentPage.screenshot({ path: path.join(screenshotDir, "student_notifications_desktop.png"), fullPage: true });

  console.log("=== BATCH 6 STUDENT INCIDENT REPORT ===");
  await openNav(studentPage, "incidents");
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
  await openNav(staffPage, "incidents");
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

  console.log("=== BATCH 6 TELEMETRY STATES ===");
  await openNav(staffPage, "monitoring");
  await staffPage.locator("main").getByRole("heading", { name: "Giám sát telemetry" }).waitFor();
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
  await openNav(foreignPage, "incidents");
  await foreignPage.locator("main").getByRole("heading", { name: "Sự cố tài nguyên" }).waitFor();
  assert.equal(await foreignPage.getByText("Batch 6 sự cố phòng B").count(), 1);
  assert.equal(await foreignPage.getByText("Batch 6 quạt làm mát bất thường").count(), 0);
  await openNav(foreignPage, "monitoring");
  await foreignPage.locator("main").getByRole("heading", { name: "Giám sát telemetry" }).waitFor();
  const foreignDashboard = await foreignPage.locator("main").innerText();
  assert.ok(foreignDashboard.includes("Thiết bị phòng B"));
  assert.equal(foreignDashboard.includes("Máy đo môi trường A"), false);
  await foreignContext.close();

  console.log("=== BATCH 6 ADMIN GLOBAL DASHBOARD ===");
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const adminPage = await adminContext.newPage();
  await login(adminPage, "b6.admin@lab.test");
  await openNav(adminPage, "monitoring");
  await adminPage.locator("main").getByRole("heading", { name: "Giám sát telemetry" }).waitFor();
  const adminDashboard = await adminPage.locator("main").innerText();
  assert.ok(adminDashboard.includes("Máy đo môi trường A"));
  assert.ok(adminDashboard.includes("Thiết bị phòng B"));
  await adminContext.close();

  console.log("=== BATCH 6 MOBILE ===");
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await login(mobilePage, "b6.staff@lab.test");
  await openNav(mobilePage, "monitoring");
  await mobilePage.locator("main").getByRole("heading", { name: "Giám sát telemetry" }).waitFor();
  assert.equal(await mobilePage.locator(".telemetry-status-card").first().isVisible(), true);
  await mobilePage.screenshot({ path: path.join(screenshotDir, "staff_dashboard_mobile.png"), fullPage: true });
  await mobileContext.close();

  console.log("ALL BATCH 6 FULL-STACK E2E ASSERTIONS PASSED");
} finally {
  await browser.close();
}
