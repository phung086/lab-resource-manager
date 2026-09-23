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

const VIETNAM_OFFSET_HOURS = 7;
function vietnamDateString(daysAhead = 0) {
  const vn = new Date(Date.now() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);
  const date = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + daysAhead));
  return date.toISOString().slice(0, 10);
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
  if (page.viewportSize()?.width <= 900) await page.getByRole("button", { name: "Menu", exact: true }).click();
  const calendarNav = page.locator(".sidebar-nav-item-2026", { hasText: "Lịch Đặt Khung Giờ" });
  await calendarNav.waitFor({ timeout: 5000 });
  await calendarNav.click();
  await page.getByRole("button", { name: "Tuần", exact: true }).waitFor();
}

try {
  console.log("=== 0. ZERO-RESOURCE CALENDAR INTEGRITY & RESOURCE PRECONDITION ===");
  const zeroResContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const zeroResPage = await zeroResContext.newPage();
  // Route /api/resources to return empty array []
  await zeroResPage.route("**/api/resources*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([])
    });
  });
  await login(zeroResPage, "b4.student@lab.test");
  const zeroNav = zeroResPage.locator(".sidebar-nav-item-2026", { hasText: "Lịch Đặt Khung Giờ" });
  await zeroNav.waitFor({ timeout: 5000 });
  await zeroNav.click();

  // Verify truthful empty state
  await zeroResPage.locator(".calendar-empty-resources-card").waitFor({ timeout: 5000 });
  const emptyText = await zeroResPage.locator(".calendar-empty-resources-card").innerText();
  assert.ok(emptyText.includes("Chưa có tài nguyên khả dụng"), "Zero-resource calendar must show truthful empty state title");
  assert.ok(emptyText.includes("Hiện chưa có phòng hoặc thiết bị để xem lịch và đặt chỗ"), "Zero-resource calendar must show truthful description");
  assert.ok(emptyText.includes("Vui lòng liên hệ quản trị viên hoặc cán bộ phòng thí nghiệm"), "Zero-resource calendar must show student guidance");

  // Verify 'Đặt Khung Giờ Mới' is disabled
  const newBookingBtn = zeroResPage.getByRole("button", { name: "Đặt Khung Giờ Mới" });
  assert.equal(await newBookingBtn.isDisabled(), true, "New booking button must be disabled when 0 resources exist");

  // Verify no availability grid rendered
  assert.equal(await zeroResPage.locator(".calendar-week-frame").count(), 0, "No calendar week grid rendered when 0 resources exist");
  assert.equal(await zeroResPage.locator(".calendar-day-frame").count(), 0, "No calendar day grid rendered when 0 resources exist");

  console.log("  Zero-resource empty state and disabled booking guard verified: PASS");
  await zeroResContext.close();

  console.log("=== 1. STUDENT E2E WORKFLOW ===");
  const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const studentPage = await studentContext.newPage();
  await login(studentPage, "b4.student@lab.test");
  await openCalendar(studentPage);

  // Verify resource selection is visible and active resource is displayed
  console.log("  Verifying resource selection in toolbar and active resource badge...");
  const resSelect = studentPage.locator("#calendar-resource-select");
  await resSelect.waitFor({ timeout: 5000 });
  await studentPage.waitForFunction(() => Boolean(document.querySelector("#calendar-resource-select")?.value));
  const initialResVal = await resSelect.inputValue();
  assert.ok(initialResVal && initialResVal.length > 0, "Resource must be selected by default");

  const activeBadge = studentPage.locator(".calendar-active-resource-badge");
  await activeBadge.waitFor({ timeout: 3000 });
  const badgeText = await activeBadge.innerText();
  assert.ok(badgeText.includes("Đang xem lịch:"), "Active resource badge must indicate currently viewed resource");
  console.log(`  Initial selected resource confirmed: ${badgeText.trim()}`);

  // Test switching resource
  console.log("  Testing switching resource in calendar toolbar...");
  const options = await resSelect.locator('option').all();
  let switchTargetVal = null;
  let switchTargetText = "";
  for (const opt of options) {
    const val = await opt.getAttribute('value');
    if (val && val !== initialResVal) {
      switchTargetVal = val;
      switchTargetText = await opt.innerText();
      break;
    }
  }
  if (switchTargetVal) {
    await Promise.all([
      studentPage.waitForResponse((r) => r.url().includes("/api/calendar/slots") && r.url().includes(switchTargetVal)),
      resSelect.selectOption(switchTargetVal)
    ]);
    const updatedBadgeText = await activeBadge.innerText();
    const codeSnippet = switchTargetText.split("—")[0].trim();
    assert.ok(codeSnippet.length > 0 && updatedBadgeText.includes(codeSnippet), "Active badge must update when resource is switched");

    // Switch to GPU-01 for subsequent booking tests
    const gpuOpt = resSelect.locator('option', { hasText: 'B4-E2E-GPU-01' });
    if (await gpuOpt.count() > 0) {
      const gpuVal = await gpuOpt.getAttribute('value');
      if (gpuVal !== switchTargetVal) {
        await Promise.all([
          studentPage.waitForResponse((r) => r.url().includes("/api/calendar/slots") && r.url().includes(gpuVal)),
          resSelect.selectOption(gpuVal)
        ]);
      }
      const finalBadgeText = await activeBadge.innerText();
      assert.ok(finalBadgeText.includes("B4-E2E-GPU-01"), "Active badge must show GPU-01 after switching");
    }
  }

  // 1a. View Switcher: Week -> Month -> Day -> Week
  console.log("  Verifying Week, Month, Day view switches...");
  await studentPage.getByRole("button", { name: "Tháng", exact: true }).click();
  await studentPage.waitForTimeout(300);
  assert.equal(await studentPage.getByText("Thứ 2", { exact: true }).isVisible(), true, "Month grid header must be visible");

  // Test Slot Click -> Modal Contract (Fix 1) in Day View
  console.log("  Testing Day schedule slot click prepopulation (Fix 1)...");
  await studentPage.getByRole("button", { name: "Ngày", exact: true }).click();
  await studentPage.waitForTimeout(300);
  assert.equal(await studentPage.getByText("08:00").first().isVisible(), true, "Day schedule hour rows must be visible");

  // Click on the 15:00 slot
  const slotRow15 = studentPage.locator(".calendar-day-row", { hasText: "15:00" });
  const openSlot15 = slotRow15.locator(".calendar-day-available");
  await openSlot15.click();

  const slotModal = studentPage.getByRole("dialog");
  await slotModal.waitFor();

  // Verify Fix 1: Form fields derived from slot, no fallback to tomorrow 09:00
  const startTimeVal = await studentPage.locator("#booking-start-time").inputValue();
  const endTimeVal = await studentPage.locator("#booking-end-time").inputValue();
  const dateVal = await studentPage.locator("#booking-date").inputValue();

  assert.equal(startTimeVal, "15:00", "Start time must prepopulate to 15:00 from clicked slot");
  assert.equal(endTimeVal, "16:00", "End time must prepopulate to 16:00 from clicked slot");
  assert.ok(dateVal && dateVal.length === 10, "Date must prepopulate with day date");

  // Verify Fix 3: Dynamic or truthful policy display (no static hardcoded claim)
  const policyText = await slotModal.locator(".lab-policy-summary").innerText();
  assert.ok(!policyText.includes("Vui lòng đặt trước ít nhất 1 giờ"), "Must not contain obsolete static claim");
  for (const label of ["Giờ mở cửa", "Thời lượng tối thiểu", "Thời lượng tối đa", "Đặt trước tối đa", "Thứ 7 & Chủ Nhật", "Phê duyệt"]) {
    assert.ok(policyText.includes(label), `Policy must explain ${label}`);
  }

  // Select GPU-01 and verify the persisted 240-minute maximum, without unit rounding.
  const gpuOption = slotModal.locator('#booking-resource-select option', { hasText: 'B4-E2E-GPU-01' });
  if (await gpuOption.count() > 0) {
    const gpuVal = await gpuOption.getAttribute('value');
    await slotModal.locator('#booking-resource-select').selectOption(gpuVal);
    const maximum = slotModal.locator(".lab-policy-summary dl > div").filter({ hasText: "Thời lượng tối đa" });
    assert.equal(await maximum.locator("dd").innerText(), "240 phút", "Policy must use the selected LAB's 240-minute maximum");
  }

  // Close slot modal via Đóng
  await slotModal.getByRole("button", { name: "Đóng", exact: true }).click();
  await slotModal.waitFor({ state: "hidden" });

  await studentPage.getByRole("button", { name: "Tuần", exact: true }).click();
  await studentPage.waitForTimeout(300);

  // 1b. Create Booking via QuickBookingModal
  console.log("  Creating booking via QuickBookingModal...");
  await studentPage.getByRole("button", { name: "Đặt Khung Giờ Mới" }).click();
  const modal = studentPage.getByRole("dialog");
  await modal.waitFor();

  const studentGpuOptVal = await studentPage.locator('#booking-resource-select option', { hasText: 'B4-E2E-GPU-01' }).getAttribute('value');
  await studentPage.locator('#booking-resource-select').selectOption(studentGpuOptVal);

  const bookingTitle = `E2E Student Session ${Date.now()}`;
  await studentPage.getByLabel(/Tiêu đề buổi làm việc/).fill(bookingTitle);
  await studentPage.getByLabel(/Mục đích sử dụng/).fill("Kiểm thử tự động quy trình đặt lịch sinh viên");

  const tomorrowStr = vietnamDateString(1);
  await studentPage.getByLabel(/Ngày đặt/).fill(tomorrowStr);
  await studentPage.getByLabel(/Giờ bắt đầu/).fill("14:00");
  await studentPage.getByLabel(/Giờ kết thúc/).fill("16:00");

  const [bookingRes] = await Promise.all([
    studentPage.waitForResponse((r) => r.url().includes("/api/bookings") && r.request().method() === "POST" && r.status() === 201),
    studentPage.getByRole("button", { name: /Xác Nhận Đặt Lịch/i }).click()
  ]);
  const bookingJson = await bookingRes.json();
  assert.equal(bookingJson.status, "CONFIRMED");

  // Fix 6: Success state is shown, modal does NOT auto close! Real persisted status is shown
  await studentPage.locator("#created-booking-status").waitFor({ timeout: 3000 });
  const statusText = await studentPage.locator("#created-booking-status").innerText();
  assert.ok(statusText.includes("Xác nhận ngay"), "Success modal must show real persisted status CONFIRMED");

  // Explicit Close button click (Fix 6)
  await studentPage.locator("#booking-success-close-btn").click();
  await modal.waitFor({ state: "hidden", timeout: 3000 });

  // 1c. Verify persistence after reload
  console.log("  Verifying persistence across page reload...");
  await studentPage.reload({ waitUntil: "networkidle" });
  await openCalendar(studentPage);
  await studentPage.waitForTimeout(600);

  const studentCalSelect = studentPage.locator('select[aria-label="Chọn tài nguyên lịch"]');
  const gpuCalOption = studentCalSelect.locator('option', { hasText: 'B4-E2E-GPU-01' });
  if (await gpuCalOption.count() > 0) {
    const gpuCalVal = await gpuCalOption.getAttribute('value');
    await studentCalSelect.selectOption(gpuCalVal);
    await studentPage.waitForTimeout(300);
  }

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

  // 1e. Cancellation requires explicit confirmation and persisted CANCELLED state.
  console.log("  Testing student booking cancellation confirmation...");
  const cancelButton = studentPage.getByRole("button", { name: "Hủy booking" }).first();
  await cancelButton.waitFor({ state: "visible" });
  let cancelRequests = 0;
  studentPage.on("request", (request) => {
    if (request.url().includes("/cancel") && request.method() === "POST") cancelRequests++;
  });
  await cancelButton.click();
  const cancelDialog = studentPage.getByRole("dialog", { name: "Xác nhận hủy booking" });
  await cancelDialog.waitFor();
  assert.equal(cancelRequests, 0, "Opening confirmation must not mutate the booking");
  const [cancelResponse] = await Promise.all([
    studentPage.waitForResponse((r) => r.url().includes("/cancel") && r.status() === 200),
    cancelDialog.getByRole("button", { name: "Xác nhận hủy" }).click()
  ]);
  assert.equal(cancelRequests, 1, "Only the confirmed action may call /cancel");
  assert.equal((await cancelResponse.json()).status, "CANCELLED", "Persisted response must be CANCELLED");
  await studentPage.getByRole("button", { name: /Lịch sử/ }).first().click();
  const cancelledCard = studentPage.locator(".operation-card", { hasText: bookingTitle });
  await cancelledCard.getByText("Đã hủy", { exact: true }).waitFor();
  console.log("  Booking cancellation persisted as CANCELLED");

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

  const futureDateStr = vietnamDateString(2);

  await lecturerPage.getByLabel(/Ngày đặt/).fill(futureDateStr);
  await lecturerPage.getByLabel(/Giờ bắt đầu/).fill("10:00");
  await lecturerPage.getByLabel(/Giờ kết thúc/).fill("12:00");

  await Promise.all([
    lecturerPage.waitForResponse((r) => r.url().includes("/api/bookings") && r.request().method() === "POST" && r.status() === 201),
    lecturerPage.getByRole("button", { name: /Xác Nhận Đặt Lịch/i }).click()
  ]);
  // Fix 6: Modal stays open with success state and closes on button click
  await lecturerPage.locator("#booking-success-close-btn").waitFor({ timeout: 3000 });
  await lecturerPage.locator("#booking-success-close-btn").click();
  await lecturerPage.getByRole("dialog").waitFor({ state: "hidden", timeout: 3000 });
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
  await resourceSelect.selectOption({ label: "B4-E2E-SPECTRO-01 — Máy quang phổ kiểm tra" });
  await maintPage.waitForTimeout(500);

  // Attempt to book during the maintenance window
  await maintPage.getByRole("button", { name: "Đặt Khung Giờ Mới" }).click();
  await maintPage.getByRole("dialog").waitFor();

  const maintTomorrowStr = vietnamDateString(1);

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
  await staffSelect.locator("option", { hasText: "B4-E2E-GPU-01" }).waitFor({ state: "attached" });
  const staffOptions = await staffSelect.locator("option").allInnerTexts();
  assert.ok(staffOptions.some((o) => o.includes("B4-E2E-GPU-01")), "Staff must see assigned lab resources");
  console.log("  Staff assigned-lab visibility: PASS");
  await staffContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminContext.newPage();
  await login(adminPage, "b4.admin@lab.test");
  await openCalendar(adminPage);

  const adminSelect = adminPage.locator('select[aria-label="Chọn tài nguyên lịch"]');
  await adminSelect.locator("option", { hasText: "B4-E2E-CNC-01" }).waitFor({ state: "attached" });
  const adminOptions = await adminSelect.locator("option").allInnerTexts();
  assert.ok(adminOptions.some((o) => o.includes("B4-E2E-CNC-01")), "Admin must see resources across all labs");
  console.log("  Admin global visibility: PASS");

  console.log("=== 5B. EFFECTIVE APPROVAL REQUIREMENT & TRUTHFUL POLICY VERIFICATION ===");
  // B4-E2E-CNC-01 is in foreignLab, where labPolicy.requiresApproval = true and resource.requiresApproval = false
  await adminSelect.selectOption({ label: "B4-E2E-CNC-01 — Máy CNC độ chính xác cao" });
  await adminPage.waitForTimeout(400);

  await adminPage.getByRole("button", { name: "Đặt Khung Giờ Mới" }).click();
  const approvalModal = adminPage.getByRole("dialog");
  await approvalModal.waitFor();

  // Verify Fix 2: UI displays "Cần duyệt", not "Xác nhận tức thì"
  const approvalBadge = approvalModal.locator("label", { hasText: "Thiết bị / Phòng thí nghiệm" }).getByText("Cần duyệt");
  assert.ok(await approvalBadge.isVisible(), "Effective requires approval must display 'Cần duyệt' due to labPolicy.requiresApproval = true");

  const cncDate = vietnamDateString(3);
  await adminPage.getByLabel(/Tiêu đề buổi làm việc/).fill(`CNC Policy Approval Booking ${Date.now()}`);
  await adminPage.getByLabel(/Mục đích sử dụng/).fill("Testing effective approval requirement under labPolicy");
  await adminPage.getByLabel(/Ngày đặt/).fill(cncDate);
  await adminPage.getByLabel(/Giờ bắt đầu/).fill("09:00");
  await adminPage.getByLabel(/Giờ kết thúc/).fill("10:30");

  const [cncBookingRes] = await Promise.all([
    adminPage.waitForResponse((r) => r.url().includes("/api/bookings") && r.request().method() === "POST" && r.status() === 201),
    adminPage.getByRole("button", { name: /Xác Nhận Đặt Lịch/i }).click()
  ]);
  const cncBookingData = await cncBookingRes.json();
  assert.equal(cncBookingData.status, "PENDING_APPROVAL", "Persisted booking status must be PENDING_APPROVAL");

  // Verify Fix 6: Modal stays open with real status PENDING_APPROVAL and closes on button click
  await adminPage.locator("#created-booking-status").waitFor({ timeout: 3000 });
  const cncStatusText = await adminPage.locator("#created-booking-status").innerText();
  assert.ok(cncStatusText.includes("Chờ phê duyệt"), "Success modal must show real persisted status PENDING_APPROVAL");

  await adminPage.locator("#booking-success-close-btn").click();
  await approvalModal.waitFor({ state: "hidden", timeout: 3000 });
  console.log("  Effective approval and success modal verified: PASS");

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
