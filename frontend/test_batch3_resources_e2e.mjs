import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.BATCH3_FRONTEND_URL || "http://127.0.0.1:5175";
const password = "Batch3E2E!Pass";
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

async function openCatalog(page) {
  if (page.viewportSize()?.width <= 900) await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.locator(".sidebar-nav-item-2026", { hasText: "Danh Mục Tài Nguyên" }).click();
  await page.getByText("Kính hiển vi điện tử E2E", { exact: true }).waitFor();
}

async function verifyReadOnlyRole(email) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email);
  await openCatalog(page);
  assert.equal(await page.getByRole("button", { name: "Thêm tài nguyên" }).count(), 0);
  const search = page.getByLabel("Tìm kiếm");
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/resources?") && response.url().includes("search=B3-E2E-MICROSCOPE") && response.status() === 200),
    search.fill("B3-E2E-MICROSCOPE")
  ]);
  await page.getByText("Kính hiển vi điện tử E2E", { exact: true }).waitFor();
  assert.equal(await page.getByText("Máy CNC phòng lab khác", { exact: true }).count(), 0);
  await page.locator("article", { hasText: "B3-E2E-MICROSCOPE" }).getByRole("button", { name: "Xem chi tiết" }).click();
  const detailDialog = page.getByRole("dialog", { name: "Kính hiển vi điện tử E2E" });
  await detailDialog.waitFor();
  await detailDialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await context.close();
}

async function fillCreateForm(page, code, laboratoryLabel) {
  await page.getByRole("button", { name: "Thêm tài nguyên" }).click();
  await page.getByLabel("Mã tài nguyên *").fill(code);
  await page.getByLabel("Tên tài nguyên *").fill(`Tài nguyên ${code}`);
  await page.getByLabel("Phòng thí nghiệm *").selectOption({ label: laboratoryLabel });
  await page.locator("#resource-category").selectOption("EXPERIMENT_KIT");
  await page.getByLabel("Subtype kỹ thuật *").selectOption("KIT");
  await page.getByLabel("Vị trí *").fill("E2E Bench");
}

try {
  await verifyReadOnlyRole("b3.student@lab.test");
  await verifyReadOnlyRole("b3.lecturer@lab.test");

  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await login(staffPage, "b3.staff@lab.test");
  await staffPage.locator(".sidebar-nav-item-2026", { hasText: "Quản Lý Tài Nguyên" }).click();
  await staffPage.getByText("Kính hiển vi điện tử E2E", { exact: true }).waitFor();
  const foreignRow = staffPage.locator("tr", { hasText: "B3-E2E-CNC" });
  assert.equal(await foreignRow.getByRole("button", { name: /Sửa B3-E2E-CNC/ }).isDisabled(), true);
  const staffCode = `B3-E2E-STAFF-${Date.now()}`;
  await fillCreateForm(staffPage, staffCode, "B3-E2E-LAB-A - Batch 3 Assigned Lab");
  await Promise.all([
    staffPage.waitForResponse((response) => response.url().endsWith("/api/resources") && response.request().method() === "POST" && response.status() === 201),
    staffPage.getByRole("button", { name: "Tạo tài nguyên" }).click()
  ]);
  await staffPage.getByText(`Đã tạo tài nguyên ${staffCode}.`, { exact: true }).waitFor();
  await staffContext.close();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await login(adminPage, "b3.admin@lab.test");
  await adminPage.locator(".sidebar-nav-item-2026", { hasText: "Quản Lý Tài Nguyên" }).click();
  await adminPage.getByText("Camera chờ phân loại E2E", { exact: true }).waitFor();
  if (process.env.BATCH3_DESKTOP_SCREENSHOT) {
    await adminPage.screenshot({ path: process.env.BATCH3_DESKTOP_SCREENSHOT, fullPage: true });
  }
  const adminCode = `B3-E2E-ADMIN-${Date.now()}`;
  await fillCreateForm(adminPage, adminCode, "B3-E2E-LAB-B - Batch 3 Foreign Lab");
  await adminPage.getByRole("button", { name: "Tạo tài nguyên" }).click();
  await adminPage.getByText(`Đã tạo tài nguyên ${adminCode}.`, { exact: true }).waitFor();

  let row = adminPage.locator("tr", { hasText: adminCode });
  await row.getByRole("button", { name: new RegExp(`Sửa ${adminCode}`) }).click();
  await adminPage.locator("#resource-category").selectOption("MACHINE");
  await adminPage.getByLabel("Tên tài nguyên *").fill("Máy thử nghiệm đã chỉnh sửa");
  await adminPage.getByRole("button", { name: "Lưu thay đổi" }).click();
  await adminPage.getByText(`Đã lưu thay đổi cho ${adminCode}.`, { exact: true }).waitFor();

  row = adminPage.locator("tr", { hasText: adminCode });
  await row.getByRole("button", { name: new RegExp(`Đổi trạng thái ${adminCode}`) }).click();
  const statusDialog = adminPage.getByRole("dialog", { name: "Cập nhật trạng thái vận hành" });
  await statusDialog.getByLabel("Trạng thái mới").selectOption("BROKEN");
  await statusDialog.getByLabel(/Lý do/).fill("Hỏng trong kiểm thử E2E có xác minh");
  await statusDialog.getByRole("button", { name: "Lưu trạng thái" }).click();
  await adminPage.getByText(`Đã cập nhật trạng thái ${adminCode}.`, { exact: true }).waitFor();

  row = adminPage.locator("tr", { hasText: adminCode });
  await row.getByRole("button", { name: new RegExp(`Ngừng khai thác ${adminCode}`) }).click();
  const retireDialog = adminPage.getByRole("dialog", { name: "Ngừng khai thác tài nguyên" });
  await retireDialog.getByLabel(/Lý do/).fill("Kết thúc vòng đời kiểm thử E2E");
  await retireDialog.getByRole("button", { name: "Xác nhận ngừng khai thác" }).click();
  await adminPage.getByText(`Đã ngừng khai thác ${adminCode}; lịch sử được giữ nguyên.`, { exact: true }).waitFor();

  await adminPage.reload({ waitUntil: "networkidle" });
  await adminPage.locator(".sidebar-nav-item-2026", { hasText: "Quản Lý Tài Nguyên" }).click();
  row = adminPage.locator("tr", { hasText: adminCode });
  await row.getByText("Đã ngừng khai thác", { exact: true }).first().waitFor();

  await fillCreateForm(adminPage, adminCode, "B3-E2E-LAB-B - Batch 3 Foreign Lab");
  await adminPage.getByRole("button", { name: "Tạo tài nguyên" }).click();
  await adminPage.locator(".resource-editor [role=alert]").waitFor();
  assert.equal(await adminPage.getByLabel("Mã tài nguyên *").inputValue(), adminCode);
  await adminContext.close();

  if (process.env.BATCH3_MOBILE_SCREENSHOT) {
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobileContext.newPage();
    await login(mobilePage, "b3.student@lab.test");
    await openCatalog(mobilePage);
    await mobilePage.screenshot({ path: process.env.BATCH3_MOBILE_SCREENSHOT, fullPage: true });
    await mobileContext.close();
  }

  console.log("Batch 3 frontend resource E2E: PASS (STUDENT, LECTURER, LAB_STAFF, ADMIN)");
} finally {
  await browser.close();
}
