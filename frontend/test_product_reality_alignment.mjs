import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const base = process.env.REALITY_UI_URL || "http://127.0.0.1:15179";
const apiBase = process.env.REALITY_API_URL || "http://127.0.0.1:15004/api";
const optional = process.env.REALITY_PAYMENT_MODE === "true";
const out = new URL("./screenshots_temp_reality_alignment/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const paymentRequests = [];
const accounts = [];
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => { if (request.url().includes("/api/payments")) paymentRequests.push(request.url()); });
async function shot(name) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: fileURLToPath(new URL(`${name}_realigned.png`, out)), animations: "disabled" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow: ${name}`);
}
async function nav(text) {
  await page.locator(".sidebar-nav-item-2026", { hasText: text }).click();
  await page.waitForLoadState("networkidle");
}
async function login(role) {
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator("input[type=email]").fill(`${role}@lrm.local`);
  await page.locator("input[type=password]").first().fill("LabDemo!2026Pass");
  await page.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();
  await page.locator(".workspace-home").waitFor();
  await page.waitForLoadState("networkidle");
  accounts.push(role);
}
try {
  await page.goto(base, { waitUntil: "networkidle" });
  assert.match(await page.locator("h1").first().innerText(), /Đặt lịch và giám sát tài nguyên phòng thí nghiệm/);
  if (optional) {
    await page.getByText("Khả năng tích hợp mở rộng", { exact: true }).click();
    assert.match(await page.locator("#thanh-toan").innerText(), /Optional \/ Sandbox integration/);
    await login("student");
    await nav("Thanh toán");
    await page.getByText("Chưa có yêu cầu thanh toán phù hợp.", { exact: true }).waitFor();
    const response = await fetch(`${apiBase}/payments`);
    assert.equal(response.status, 401, "Optional payment API is mounted and requires authentication");
    assert.ok(paymentRequests.length > 0);
  } else {
    assert.doesNotMatch(await page.locator("body").innerText(), /VNPAY|VietQR|thanh toán/i);
    await shot("landing_desktop");
    await page.setViewportSize({ width: 390, height: 844 });
    await shot("landing_mobile");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator(".public-footer").scrollIntoViewIfNeeded();
    await shot("footer");
    // Every public anchor resolves to real content.
    for (const href of await page.locator('.public-site a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute("href")))) {
      assert.equal(await page.locator(href).count(), 1, `Broken anchor ${href}`);
    }
    await login("student");
    await shot("student_home");
    await nav("Danh mục tài nguyên");
    await shot("student_resources");
    await page.getByRole("button", { name: "Xem chi tiết", exact: true }).first().click();
    await page.locator(".lab-policy-summary").waitFor();
    assert.match(await page.locator(".lab-policy-summary").innerText(), /30 ngày/);
    assert.match(await page.locator(".lab-policy-summary").innerText(), /480 phút/);
    await page.getByRole("button", { name: "Đóng", exact: true }).click();
    await page.getByRole("button", { name: "Trợ lý AI", exact: true }).click();
    await page.getByLabel("Câu hỏi cho trợ lý").fill("Tìm lịch trống LOCAL-ROOM-01");
    await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
    await page.getByRole("button", { name: "Mở form đặt lịch", exact: true }).first().click();
    await page.locator("#booking-title").fill("Thực hành LAB — kiểm chứng luồng nội bộ");
    await page.locator("#booking-purpose").fill("LOCAL DEMO — yêu cầu sử dụng tài nguyên phục vụ học tập, tạo qua form đặt lịch.");
    assert.equal(await page.locator(".lab-policy-summary dt").count(), 6);
    await page.locator(".lab-policy-summary").scrollIntoViewIfNeeded();
    await shot("student_booking");
    assert.doesNotMatch(await page.locator('[role="dialog"]').innerText(), /thanh toán|VNPAY|VietQR/i);
    const bookingResponse = page.waitForResponse(response => response.url().endsWith("/api/bookings") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Xác nhận đặt lịch", exact: true }).click();
    const response = await bookingResponse;
    assert.equal(response.status(), 201);
    const booking = await response.json();
    assert.equal(booking.status, "PENDING_APPROVAL");
    await page.locator("#booking-success-close-btn").waitFor();
    assert.doesNotMatch(await page.locator('[role="dialog"]').innerText(), /thanh toán|VNPAY|VietQR/i);
    fs.writeFileSync(new URL("booking.json", out), JSON.stringify({ id: booking.id, status: booking.status, source: "Student UI booking with payments disabled" }, null, 2));
    for (const role of ["lecturer", "staff", "admin"]) {
      await login(role);
      assert.equal(await page.locator(".sidebar-nav-item-2026", { hasText: "Thanh toán" }).count(), 0);
      if (role === "lecturer") {
        await nav("Lịch Đặt Khung Giờ");
        assert.doesNotMatch(await page.locator("main").innerText(), /thanh toán|VNPAY|VietQR/i);
      }
      if (role === "staff") {
        await nav("Vận Hành Booking"); await shot("staff_operations");
        await nav("Bảng Điều Khiển Vận Hành"); await shot("monitoring");
        assert.match(await page.locator("main").innerText(), /NO_DATA/);
        assert.match(await page.locator("main").innerText(), /NON-CERTIFIED · NOT A FIRE ALARM/);
      }
    }
    assert.deepEqual(paymentRequests, [], "Default UI must not call the payment API");
    assert.equal((await fetch(`${apiBase}/payments`)).status, 404, "Default payment API is not mounted");
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ mode: optional ? "optional payment ON" : "default payment OFF", accounts, paymentRequestCount: paymentRequests.length, errors, result: "PASS" }, null, 2));
} finally { await browser.close(); }
