import assert from "node:assert/strict";
import crypto from "node:crypto";
import { chromium } from "playwright-core";
const base = "http://127.0.0.1:15178",
  apiBase = "http://127.0.0.1:15003/api";
async function api(route, token, body) {
  const r = await fetch(apiBase + route, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  assert.ok(r.ok, JSON.stringify(data));
  return data;
}
const browser = await chromium.launch({ headless: true });
async function login(who) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  await p.goto(base);
  await p.locator("input[type=email]").fill(`${who}@optional.test`);
  await p.locator("input[type=password]").first().fill("OptionalTest!Pass2026");
  await p.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();
  await p.getByRole("button", { name: "Trợ lý AI", exact: true }).waitFor();
  return p;
}
const screenshot = (p, name) =>
  p.screenshot({
    path: `screenshots_temp_payment_ai_review/${name}.png`,
    animations: "disabled",
  });
try {
  const admin = await api("/auth/login", null, {
    email: "admin@optional.test",
    password: "OptionalTest!Pass2026",
  });
  const student = await api("/auth/login", null, {
    email: "student@optional.test",
    password: "OptionalTest!Pass2026",
  });
  const code = "ROOM-" + Date.now();
  const room = await api("/resources", admin.accessToken, {
    code,
    name: "Phòng LAB kiểm thử thanh toán",
    laboratoryId: "assigned",
    category: "ROOM",
    subtype: "ROOM",
    operationalStatus: "AVAILABLE",
    bookingState: "bookable",
    location: "Phòng LAB kiểm thử riêng",
    ownerTeam: "Isolated automated test",
    capacity: 20,
    requiresApproval: false,
    specs: {},
  });
  const page = await login("student");
  await page.getByRole("button", { name: "Trợ lý AI", exact: true }).click();
  await page.getByLabel("Câu hỏi cho trợ lý").fill(`Tìm lịch trống ${code}`);
  await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
  await page
    .getByRole("button", { name: new RegExp(`Mở form · ${code}`) })
    .first()
    .click();
  await page.getByLabel("Chọn tài nguyên lịch").waitFor();
  assert.equal(
    await page.getByLabel("Chọn tài nguyên lịch").inputValue(),
    room.id,
  );
  await page
    .locator("#booking-title")
    .fill("Đặt phòng LAB — kiểm thử thanh toán");
  await page
    .locator("#booking-purpose")
    .fill("Kiểm thử luồng đặt phòng và thanh toán VNPAY");
  const created = page.waitForResponse(
    (r) => r.url() === apiBase + "/bookings" && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Xác nhận đặt lịch", exact: true })
    .click();
  const response = await created;
  assert.equal(response.status(), 201);
  const booking = await response.json();
  await page
    .getByRole("button", { name: "Xem khoản thanh toán của lịch đặt" })
    .waitFor();
  await screenshot(page, "lab_room_booking_success");
  await page
    .getByRole("button", { name: "Xem khoản thanh toán của lịch đặt" })
    .click();
  await page
    .getByRole("heading", { name: "Thanh toán đặt phòng LAB" })
    .waitFor();
  await page
    .getByText("Chưa có yêu cầu thanh toán phù hợp.", { exact: true })
    .waitFor();
  assert.equal(
    (await api(`/payments/booking/${booking.id}`, student.accessToken)).length,
    0,
    "Booking must not invent fees",
  );
  const adminPage = await login("admin");
  await adminPage
    .locator(".sidebar-nav-item-2026", { hasText: "Thanh toán" })
    .click();
  await adminPage
    .getByText("Tạo yêu cầu thanh toán", { exact: true })
    .first()
    .click();
  await adminPage
    .locator("select[name=bookingId] option")
    .filter({ hasText: booking.id })
    .waitFor({ state: "attached" });
  await adminPage.locator("select[name=bookingId]").selectOption(booking.id);
  await adminPage.locator("input[name=amount]").fill("45000");
  await adminPage
    .locator("input[name=description]")
    .fill("Khoản thu đặt phòng LAB — chỉ là kiểm thử tự động");
  await adminPage
    .getByRole("button", { name: "Tạo yêu cầu", exact: true })
    .click();
  await adminPage.locator(".payment-card", { hasText: booking.id }).count();
  await page.getByRole("button", { name: "Làm mới", exact: true }).click();
  await page.getByRole("button", { name: "Xem yêu cầu thanh toán" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /VNPAY Sandbox/ })
    .click();
  await page.getByRole("link", { name: "Mở cổng VNPAY Sandbox" }).waitFor();
  await screenshot(page, "lab_room_vnpay_pending");
  const [transaction] = await api(
    `/payments/booking/${booking.id}`,
    student.accessToken,
  );
  const params = {
    vnp_TmnCode: "TESTONLY",
    vnp_Amount: String(transaction.amount * 100),
    vnp_TxnRef: transaction.txnRef,
    vnp_ResponseCode: "24",
    vnp_TransactionStatus: "02",
  };
  const query = Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(params[k])}`)
    .join("&");
  const hash = crypto
    .createHmac("sha512", "isolated-unit-provider-secret")
    .update(query)
    .digest("hex");
  const result = await fetch(
    `${apiBase}/payments/vnpay/ipn?${query}&vnp_SecureHash=${hash}`,
  );
  assert.equal((await result.json()).RspCode, "00");
  await page.getByRole("button", { name: "Làm mới trạng thái" }).click();
  await page
    .getByRole("dialog")
    .getByText("Thanh toán thất bại", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Mở cổng VNPAY Sandbox" }).count(),
    0,
  );
  await screenshot(page, "lab_room_payment_failed");
  const persisted = await api("/bookings", student.accessToken);
  assert.equal(
    persisted.find((b) => b.id === booking.id).status,
    booking.status,
  );
  console.log(
    "PASS: real ROOM booking in canonical form -> no automatic fee -> ADMIN creates charge in UI -> owner booking payment -> persisted VNPAY URL -> signed failure -> stale link removed; BookingStatus unchanged.",
  );
} finally {
  await browser.close();
}
