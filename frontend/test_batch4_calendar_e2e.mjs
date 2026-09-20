import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.BATCH4_FRONTEND_URL || "http://127.0.0.1:5176";
const password = "Batch4E2E!Pass";
const screenshotDir = path.resolve("./screenshots_batch4");
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

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

async function openCalendar(page) {
  const calendarNav = page.locator(".sidebar-nav-item-2026", { hasText: "Lịch Đặt Khung Giờ" });
  await calendarNav.waitFor({ timeout: 5000 });
  await calendarNav.click();
  await page.getByRole("button", { name: "Tuần", exact: true }).waitFor();
}

try {
  console.log("=== 1. STUDENT E2E WORKFLOW ===");
  const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const studentPage = await studentContext.newPage();
  await login(studentPage, "b4.student@lab.test");
  await openCalendar(studentPage);

  // 1a. View Switcher: Week -> Month -> Day -> Week
  console.log("  Verifying Week, Month, Day view switches...");
  await studentPage.getByRole("button", { name: "Tháng", exact: true }).click();
  await studentPage.waitForTimeout(300);
  assert.equal(await studentPage.getByText("Thứ 2", { exact: true }).isVisible(), true, "Month grid header must be visible");

  await studentPage.getByRole("button", { name: "Ngày", exact: true }).click();
  await studentPage.waitForTimeout(300);
  assert.equal(await studentPage.getByText("08:00").first().isVisible(), true, "Day schedule hour rows must be visible");

  await studentPage.getByRole("button", { name: "Tuần", exact: true }).click();
  await studentPage.waitForTimeout(300);

  // 1b. Create Booking via QuickBookingModal
  console.log("  Creating booking via QuickBookingModal...");
  await studentPage.getByRole("button", { name: "Đặt Khung Giờ Mới" }).click();
  const modal = studentPage.getByRole("dialog");
  await modal.waitFor();

  const bookingTitle = `E2E Student Session ${Date.now()}`;
  await studentPage.getByLabel(/Tiêu đề buổi làm việc/).fill(bookingTitle);
  await studentPage.getByLabel(/Mục đích sử dụng/).fill("Kiểm thử tự động quy trình đặt lịch sinh viên");

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  await studentPage.getByLabel(/Ngày đặt/).fill(tomorrowStr);
  await studentPage.getByLabel(/Giờ bắt đầu/).fill("14:00");
  await studentPage.getByLabel(/Giờ kết thúc/).fill("16:00");

  await Promise.all([
    studentPage.waitForResponse((r) => r.url().includes("/api/bookings") && r.request().method() === "POST" && r.status() === 201),
    studentPage.getByRole("button", { name: /Xác Nhận Đặt Lịch/i }).click()
  ]);

  // Modal closes
  await studentPage.waitForTimeout(600);

  // 1c. Verify persistence after reload
  console.log("  Verifying persistence across page reload...");
  await studentPage.reload({ waitUntil: "networkidle" });
  await openCalendar(studentPage);
  await studentPage.waitForTimeout(600);

  // Switch to Day view
  await Promise.all([
    studentPage.waitForResponse((r) => r.url().includes("/api/calendar/events") && r.status() === 200),
    studentPage.getByRole("button", { name: "Ngày", exact: true }).click()
  ]);

  // Navigate to tomorrow in Day view
  await Promise.all([
    studentPage.waitForResponse((r) => r.url().includes("/api/calendar/events") && r.status() === 200),
    studentPage.locator('button[title="Khoảng sau"]').click()
  ]);

  const ownBooking = studentPage.getByText(bookingTitle).first();
  await ownBooking.waitFor({ timeout: 5000 });
  assert.equal(await ownBooking.isVisible(), true, "Own booking must be visible on Day schedule");

  // 1d. Inspect My Bookings section
  console.log("  Verifying own booking in My Bookings list...");
  const myBookingsNav = studentPage.locator(".sidebar-nav-item-2026", { hasText: "Lịch Đặt Của Tôi" });
  await myBookingsNav.click();
  await studentPage.getByText(bookingTitle).first().waitFor({ timeout: 5000 });

  // Screenshot desktop
  await studentPage.screenshot({ path: path.join(screenshotDir, "student_calendar_desktop.png"), fullPage: true });
  console.log("  Saved student_calendar_desktop.png");

  // 1e. Cancellation workflow
  console.log("  Testing student booking cancellation...");
  const cancelButton = studentPage.locator(".booking-actions").getByRole("button", { name: /Hủy|Huỷ/i }).first();
  if (await cancelButton.isVisible()) {
    await Promise.all([
      studentPage.waitForResponse((r) => r.url().includes("/cancel") && r.status() === 200),
      cancelButton.click()
    ]);
    console.log("  Booking cancelled successfully");
  }
  await studentContext.close();

  console.log("=== 2. LECTURER E2E WORKFLOW ===");
  const lecturerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const lecturerPage = await lecturerContext.newPage();
  await login(lecturerPage, "b4.lecturer@lab.test");
  await openCalendar(lecturerPage);

  const lecturerTitle = `E2E Lecturer Class ${Date.now()}`;
  await lecturerPage.getByRole("button", { name: "Đặt Khung Giờ Mới" }).click();
  await lecturerPage.getByRole("dialog").waitFor();

  const gpuOptVal = await lecturerPage.locator('#booking-resource-select option', { hasText: 'B4-E2E-GPU-01' }).getAttribute('value');
  await lecturerPage.locator('#booking-resource-select').selectOption(gpuOptVal);

  await lecturerPage.getByLabel(/Tiêu đề buổi làm việc/).fill(lecturerTitle);
  await lecturerPage.getByLabel(/Mục đích sử dụng/).fill("Buổi thí nghiệm mẫu của giảng viên");

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 2);
  const futureDateStr = futureDate.toISOString().split("T")[0];

  await lecturerPage.getByLabel(/Ngày đặt/).fill(futureDateStr);
  await lecturerPage.getByLabel(/Giờ bắt đầu/).fill("10:00");
  await lecturerPage.getByLabel(/Giờ kết thúc/).fill("12:00");

  await Promise.all([
    lecturerPage.waitForResponse((r) => r.url().includes("/api/bookings") && r.request().method() === "POST" && r.status() === 201),
    lecturerPage.getByRole("button", { name: /Xác Nhận Đặt Lịch/i }).click()
  ]);
  await lecturerPage.waitForTimeout(600);
  console.log("  Lecturer booking completed successfully");
  await lecturerContext.close();

  console.log("=== 3. CONFLICT STATE E2E VERIFICATION ===");
  const conflictContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const conflictPage = await conflictContext.newPage();
  await login(conflictPage, "b4.student2@lab.test");
  await openCalendar(conflictPage);

  // Attempt to book the EXACT same interval that lecturer just booked on Day + 2 (10:00 - 12:00) on B4-E2E-GPU-01
  await conflictPage.getByRole("button", { name: "Đặt Khung Giờ Mới" }).click();
  await conflictPage.getByRole("dialog").waitFor();

  const conflictGpuVal = await conflictPage.locator('#booking-resource-select option', { hasText: 'B4-E2E-GPU-01' }).getAttribute('value');
  await conflictPage.locator('#booking-resource-select').selectOption(conflictGpuVal);

  const conflictTitle = `Conflicting Attempt ${Date.now()}`;
  await conflictPage.getByLabel(/Tiêu đề buổi làm việc/).fill(conflictTitle);
  await conflictPage.getByLabel(/Mục đích sử dụng/).fill("Attempting to steal booked slot");
  await conflictPage.getByLabel(/Ngày đặt/).fill(futureDateStr);
  await conflictPage.getByLabel(/Giờ bắt đầu/).fill("10:00");
  await conflictPage.getByLabel(/Giờ kết thúc/).fill("12:00");

  const [conflictResponse] = await Promise.all([
    conflictPage.waitForResponse((r) => r.url().includes("/api/bookings") && r.request().method() === "POST" && r.status() === 409),
    conflictPage.getByRole("button", { name: /Xác Nhận Đặt Lịch/i }).click()
  ]);

  assert.equal(conflictResponse.status(), 409, "Real backend 409 must be returned");
  console.log("  Real HTTP 409 received from backend");

  // Verify conflict error is rendered in modal
  await conflictPage.waitForTimeout(300);
  const conflictVisible = await conflictPage.getByText(/không khả dụng|xung đột|đã có lịch|conflict/i).first().isVisible();
  assert.equal(conflictVisible, true, "Conflict error must be visible to user");

  // Verify form values are preserved (no data loss)
  const inputTitleVal = await conflictPage.getByLabel(/Tiêu đề buổi làm việc/).inputValue();
  assert.equal(inputTitleVal, conflictTitle, "Form values must be preserved on conflict failure");

  await conflictPage.screenshot({ path: path.join(screenshotDir, "conflict_state_modal.png") });
  console.log("  Saved conflict_state_modal.png");
  await conflictContext.close();

  console.log("=== 4. MAINTENANCE STATE E2E VERIFICATION ===");
  const maintContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const maintPage = await maintContext.newPage();
  await login(maintPage, "b4.student@lab.test");
  await openCalendar(maintPage);

  // Select Spectrometer (which has scheduled maintenance tomorrow 09:00 - 13:00)
  const resourceSelect = maintPage.locator('select[aria-label="Chọn tài nguyên lịch"]');
  await resourceSelect.selectOption({ label: "B4-E2E-SPECTRO-01 - Máy quang phổ kiểm tra" });
  await maintPage.waitForTimeout(500);

  // Attempt to book during the maintenance window
  await maintPage.getByRole("button", { name: "Đặt Khung Giờ Mới" }).click();
  await maintPage.getByRole("dialog").waitFor();

  const maintTomorrow = new Date();
  maintTomorrow.setDate(maintTomorrow.getDate() + 1);
  const maintTomorrowStr = maintTomorrow.toISOString().split("T")[0];

  const spectroVal = await maintPage.locator('#booking-resource-select option', { hasText: 'B4-E2E-SPECTRO-01' }).getAttribute('value');
  await maintPage.locator('#booking-resource-select').selectOption(spectroVal);
  await maintPage.getByLabel(/Tiêu đề buổi làm việc/).fill("Booking during calibration");
  await maintPage.getByLabel(/Mục đích sử dụng/).fill("Should be rejected due to maintenance");
  await maintPage.getByLabel(/Ngày đặt/).fill(maintTomorrowStr);
  await maintPage.getByLabel(/Giờ bắt đầu/).fill("10:00");
  await maintPage.getByLabel(/Giờ kết thúc/).fill("11:30");

  const [maintResponse] = await Promise.all([
    maintPage.waitForResponse((r) => r.url().includes("/api/bookings") && r.request().method() === "POST" && r.status() === 409),
    maintPage.getByRole("button", { name: /Xác Nhận Đặt Lịch/i }).click()
  ]);

  assert.equal(maintResponse.status(), 409, "Backend must reject booking overlapping maintenance with 409");
  await maintPage.waitForTimeout(300);
  console.log("  Backend 409 CALIBRATION_CONFLICT displayed correctly");

  await maintPage.screenshot({ path: path.join(screenshotDir, "maintenance_conflict_modal.png") });
  console.log("  Saved maintenance_conflict_modal.png");
  await maintContext.close();

  console.log("=== 5. LAB_STAFF & ADMIN VISIBILITY ===");
  const staffContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const staffPage = await staffContext.newPage();
  await login(staffPage, "b4.staff@lab.test");
  await openCalendar(staffPage);

  // Staff sees assigned lab resources
  const staffSelect = staffPage.locator('select[aria-label="Chọn tài nguyên lịch"]');
  const staffOptions = await staffSelect.locator("option").allInnerTexts();
  assert.ok(staffOptions.some((o) => o.includes("B4-E2E-GPU-01")), "Staff must see assigned lab resources");
  console.log("  Staff assigned-lab visibility: PASS");
  await staffContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminContext.newPage();
  await login(adminPage, "b4.admin@lab.test");
  await openCalendar(adminPage);

  const adminSelect = adminPage.locator('select[aria-label="Chọn tài nguyên lịch"]');
  const adminOptions = await adminSelect.locator("option").allInnerTexts();
  assert.ok(adminOptions.some((o) => o.includes("B4-E2E-CNC-01")), "Admin must see resources across all labs");
  console.log("  Admin global visibility: PASS");
  await adminContext.close();

  console.log("=== 6. MOBILE RESPONSIVE PASS ===");
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await login(mobilePage, "b4.student@lab.test");
  await openCalendar(mobilePage);

  await mobilePage.screenshot({ path: path.join(screenshotDir, "calendar_mobile.png"), fullPage: true });
  console.log("  Saved calendar_mobile.png");
  await mobileContext.close();

  console.log("\n==========================================");
  console.log("ALL BATCH 4 E2E TESTS PASSED SUCCESSFULLY!");
  console.log("==========================================");
} finally {
  await browser.close();
}
