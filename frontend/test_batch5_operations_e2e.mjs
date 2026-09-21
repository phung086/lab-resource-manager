import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.BATCH5_FRONTEND_URL || "http://127.0.0.1:5177";
const password = "Batch5E2E!Pass";
const screenshotDir = path.resolve("./screenshots_batch5");
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

async function openOperations(page) {
  const nav = page.locator(".sidebar-nav-item-2026", { hasText: /Vận Hành Booking|Lịch Đặt Của Tôi/i }).first();
  await nav.waitFor({ timeout: 5000 });
  await nav.click();
  await page.getByText(/REQUIRED CORE · OPERATIONAL WORKFLOW/i).waitFor({ timeout: 5000 });
}

async function cardFor(page, title) {
  const card = page.locator(".operation-card", { hasText: title });
  await card.waitFor({ timeout: 5000 });
  return card;
}

try {
  console.log("=== BATCH 5 STAFF OPERATIONAL WORKFLOW ===");
  const staffContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const staffPage = await staffContext.newPage();
  await login(staffPage, "b5.staff@lab.test");
  await openOperations(staffPage);

  let card = await cardFor(staffPage, "Batch 5 lifecycle booking");
  assert.equal(await staffPage.getByText("Batch 5 foreign lab booking").count(), 0);

  await card.getByRole("button", { name: "Duyệt" }).click();
  let dialog = staffPage.getByRole("dialog");
  await dialog.waitFor();
  await Promise.all([
    staffPage.waitForResponse((r) => r.url().includes("/approve") && r.status() === 200),
    dialog.getByRole("button", { name: "Duyệt booking" }).click()
  ]);

  await staffPage.getByRole("button", { name: /Chờ bàn giao/ }).click();
  card = await cardFor(staffPage, "Batch 5 lifecycle booking");
  await card.getByRole("button", { name: "Bàn giao" }).click();
  dialog = staffPage.getByRole("dialog");
  await dialog.waitFor();
  await dialog.locator("#booking-condition-evidence").fill("Ngoại quan nguyên vẹn; phụ kiện đã kiểm đếm đầy đủ");
  await Promise.all([
    staffPage.waitForResponse((r) => r.url().includes("/check-out") && r.status() === 200),
    dialog.getByRole("button", { name: "Xác nhận bàn giao" }).click()
  ]);

  await staffPage.getByRole("button", { name: /Đang sử dụng/ }).click();
  card = await cardFor(staffPage, "Batch 5 lifecycle booking");
  assert.ok((await card.innerText()).includes("Ngoại quan nguyên vẹn"));
  await card.getByRole("button", { name: "Nhận hoàn trả" }).click();
  dialog = staffPage.getByRole("dialog");
  await dialog.locator("#booking-condition-evidence").fill("Hoàn trả đầy đủ, không phát hiện hư hỏng mới");
  await Promise.all([
    staffPage.waitForResponse((r) => r.url().includes("/return") && r.status() === 200),
    dialog.getByRole("button", { name: "Xác nhận hoàn trả" }).click()
  ]);

  await staffPage.getByRole("button", { name: /Chờ hoàn tất/ }).click();
  card = await cardFor(staffPage, "Batch 5 lifecycle booking");
  assert.ok((await card.innerText()).includes("Hoàn trả đầy đủ"));
  await card.getByRole("button", { name: "Hoàn tất" }).click();
  dialog = staffPage.getByRole("dialog");
  await Promise.all([
    staffPage.waitForResponse((r) => r.url().includes("/complete") && r.status() === 200),
    dialog.getByRole("button", { name: "Hoàn tất workflow" }).click()
  ]);

  await staffPage.getByRole("button", { name: /Lịch sử/ }).first().click();
  card = await cardFor(staffPage, "Batch 5 lifecycle booking");
  await card.getByRole("button", { name: "Lịch sử" }).click();
  dialog = staffPage.getByRole("dialog");
  await dialog.getByText("Tạo yêu cầu", { exact: true }).waitFor({ timeout: 5000 });
  const historyText = await dialog.innerText();
  for (const label of ["Tạo yêu cầu", "Duyệt booking", "Bàn giao tài nguyên", "Tiếp nhận hoàn trả", "Hoàn tất workflow"]) {
    assert.ok(historyText.includes(label), `Timeline must include ${label}`);
  }
  await dialog.getByRole("button", { name: "Close" }).click();

  await staffPage.getByRole("button", { name: /Chờ duyệt/ }).click();
  const rejectCard = await cardFor(staffPage, "Batch 5 rejection booking");
  await rejectCard.getByRole("button", { name: "Từ chối" }).click();
  dialog = staffPage.getByRole("dialog");
  await dialog.getByRole("button", { name: "Xác nhận từ chối" }).click();
  assert.equal(await dialog.getByRole("alert").isVisible(), true);
  await dialog.getByLabel(/Lý do từ chối/).fill("Thiết bị được dành cho lịch hiệu chuẩn ưu tiên");
  await Promise.all([
    staffPage.waitForResponse((r) => r.url().includes("/reject") && r.status() === 200),
    dialog.getByRole("button", { name: "Xác nhận từ chối" }).click()
  ]);

  await staffPage.screenshot({ path: path.join(screenshotDir, "staff_operations_desktop.png"), fullPage: true });
  await staffContext.close();

  console.log("=== BATCH 5 STUDENT OWNER VISIBILITY ===");
  const studentContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const studentPage = await studentContext.newPage();
  await login(studentPage, "b5.student@lab.test");
  await openOperations(studentPage);
  const studentCard = await cardFor(studentPage, "Batch 5 lifecycle booking");
  assert.ok((await studentCard.innerText()).includes("Hoàn tất"));
  assert.equal(await studentCard.getByRole("button", { name: "Duyệt" }).count(), 0);
  assert.equal(await studentCard.getByRole("button", { name: "Bàn giao" }).count(), 0);
  await studentCard.getByRole("button", { name: "Lịch sử" }).click();
  await studentPage.getByRole("dialog").getByText("Tình trạng trước:").waitFor();
  await studentPage.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await studentContext.close();

  console.log("=== BATCH 5 LECTURER REJECTION VISIBILITY ===");
  const lecturerContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const lecturerPage = await lecturerContext.newPage();
  await login(lecturerPage, "b5.lecturer@lab.test");
  await openOperations(lecturerPage);
  const lecturerCard = await cardFor(lecturerPage, "Batch 5 rejection booking");
  assert.ok((await lecturerCard.innerText()).includes("Từ chối"));
  assert.equal(await lecturerCard.getByRole("button", { name: "Duyệt" }).count(), 0);
  await lecturerContext.close();

  console.log("=== BATCH 5 FOREIGN STAFF SCOPE ===");
  const foreignStaffContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const foreignStaffPage = await foreignStaffContext.newPage();
  await login(foreignStaffPage, "b5.foreign.staff@lab.test");
  await openOperations(foreignStaffPage);
  const foreignCard = await cardFor(foreignStaffPage, "Batch 5 foreign lab booking");
  assert.ok(await foreignCard.isVisible());
  assert.equal(await foreignStaffPage.getByText("Batch 5 lifecycle booking").count(), 0);
  await foreignStaffContext.close();

  console.log("=== BATCH 5 ADMIN GLOBAL VISIBILITY ===");
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const adminPage = await adminContext.newPage();
  await login(adminPage, "b5.admin@lab.test");
  await openOperations(adminPage);
  await adminPage.getByRole("button", { name: "Tất cả" }).click();
  assert.ok(await adminPage.getByText("Batch 5 foreign lab booking").first().isVisible());
  await adminPage.screenshot({ path: path.join(screenshotDir, "admin_operations_desktop.png"), fullPage: true });
  await adminContext.close();

  console.log("=== BATCH 5 MOBILE RESPONSIVE ===");
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await login(mobilePage, "b5.student@lab.test");
  await openOperations(mobilePage);
  await mobilePage.screenshot({ path: path.join(screenshotDir, "student_operations_mobile.png"), fullPage: true });
  assert.equal(await mobilePage.locator(".operation-card").first().isVisible(), true);
  await mobileContext.close();

  console.log("ALL BATCH 5 OPERATIONS E2E ASSERTIONS PASSED");
} finally {
  await browser.close();
}
