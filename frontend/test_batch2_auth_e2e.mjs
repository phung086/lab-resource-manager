import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.BATCH2_FRONTEND_URL || "http://127.0.0.1:5174";
const password = "Batch2E2E!Pass";

const browser = await chromium.launch({ headless: true });

async function loginAndVerify({ email, fullName, visible, hidden }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const failures = [];
  page.on("response", (response) => {
    if (response.url().includes("/api/") && response.status() >= 500) failures.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(`${baseUrl}/#users`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/auth/login") && response.status() === 200),
    page.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click()
  ]);
  await page.getByText(fullName, { exact: true }).first().waitFor();

  for (const label of visible) await assert.doesNotReject(() => page.locator(".sidebar-nav-item-2026", { hasText: label }).waitFor());
  for (const label of hidden) assert.equal(await page.locator(".sidebar-nav-item-2026", { hasText: label }).count(), 0);

  if (email === "e2e.admin@lab.test") {
    await page.locator(".sidebar-nav-item-2026", { hasText: "Quản Trị Người Dùng" }).click();
    await page.getByText("Batch 2 Staff", { exact: true }).waitFor();
    const staffRow = page.locator("tr", { hasText: "Batch 2 Staff" });
    assert.equal(await staffRow.locator("select").first().inputValue(), "LAB_STAFF");
  }

  const meResponse = page.waitForResponse((response) => response.url().endsWith("/api/auth/me"));
  await page.reload({ waitUntil: "networkidle" });
  assert.equal((await meResponse).status(), 200);
  await page.getByText(fullName, { exact: true }).first().waitFor();

  await page.locator(".user-avatar-btn-2026").click();
  await page.getByRole("button", { name: /Đăng Xuất Khỏi Lab/i }).click();
  await page.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("lrm_token")), null);
  assert.deepEqual(failures, []);
  await context.close();
}

try {
  const unauthenticated = await browser.newPage();
  await unauthenticated.goto(`${baseUrl}/#users`, { waitUntil: "networkidle" });
  await unauthenticated.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).waitFor();
  await unauthenticated.close();

  await loginAndVerify({
    email: "e2e.student@lab.test",
    fullName: "Batch 2 Student",
    visible: ["Lịch Đặt Khung Giờ", "Lịch Đặt Của Tôi", "Danh Mục Tài Nguyên"],
    hidden: ["Bảng Điều Khiển Vận Hành", "Quản Trị Người Dùng"]
  });
  await loginAndVerify({
    email: "e2e.staff@lab.test",
    fullName: "Batch 2 Staff",
    visible: ["Bảng Điều Khiển Vận Hành", "Lịch Bảo Trì"],
    hidden: ["Quản Trị Người Dùng"]
  });
  await loginAndVerify({
    email: "e2e.admin@lab.test",
    fullName: "Batch 2 Admin",
    visible: ["Bảng Điều Khiển Vận Hành", "Quản Trị Người Dùng"],
    hidden: []
  });
  await loginAndVerify({
    email: "e2e.lecturer@lab.test",
    fullName: "Batch 2 Lecturer",
    visible: ["Lịch Đặt Của Tôi"],
    hidden: ["Bảng Điều Khiển Vận Hành", "Quản Trị Người Dùng"]
  });
  console.log("Batch 2 frontend auth E2E: PASS (unauthenticated, STUDENT, LAB_STAFF, ADMIN, LECTURER)");
} finally {
  await browser.close();
}
