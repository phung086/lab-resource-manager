import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright-core";

// Run only against the seeded disposable paymentMcp.integration.test.js database.
const base = "http://127.0.0.1:15178";
const apiBase = "http://127.0.0.1:15003/api";
const out = path.resolve("screenshots_temp_payment_ai_review");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const checks = [];
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
async function login(who, viewport = { width: 1440, height: 1050 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("pageerror", (e) => failures.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith(apiBase) && r.status() >= 500)
      failures.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator("input[type=email]").fill(`${who}@optional.test`);
  await page
    .locator("input[type=password]")
    .first()
    .fill("OptionalTest!Pass2026");
  await page.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();
  await page.getByRole("button", { name: "Trợ lý AI", exact: true }).waitFor();
  return page;
}
async function shot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(out, name + ".png"),
    fullPage: !(await page.getByRole("dialog").count()),
    animations: "disabled",
  });
  checks.push(name);
}
const closeModal = (page) =>
  page
    .getByRole("dialog")
    .getByRole("button", { name: /Đóng/ })
    .first()
    .click();
async function settle(transaction, success) {
  const params = {
    vnp_TmnCode: "TESTONLY",
    vnp_Amount: String(transaction.amount * 100),
    vnp_TxnRef: transaction.txnRef,
    vnp_ResponseCode: success ? "00" : "24",
    vnp_TransactionStatus: success ? "00" : "02",
    vnp_TransactionNo: "987654321",
    vnp_PayDate: "20260922120000",
  };
  const query = Object.keys(params)
    .sort()
    .map(
      (k) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g, "+")}`,
    )
    .join("&");
  const hash = crypto
    .createHmac("sha512", "isolated-unit-provider-secret")
    .update(query)
    .digest("hex");
  const r = await fetch(
    `${apiBase}/payments/vnpay/ipn?${query}&vnp_SecureHash=${hash}`,
  );
  assert.equal((await r.json()).RspCode, "00");
}
try {
  const admin = await api("/auth/login", null, {
    email: "admin@optional.test",
    password: "OptionalTest!Pass2026",
  });
  const student = await api("/auth/login", null, {
    email: "student@optional.test",
    password: "OptionalTest!Pass2026",
  });
  const bookings = await api("/bookings", student.accessToken);
  const start = new Date(
    Math.max(Date.now(), ...bookings.map((b) => new Date(b.endAt).getTime())) +
      7200000,
  );
  const booking = await api("/bookings", student.accessToken, {
    resourceId: "resource-assigned",
    title: "Automated UI test charge",
    purpose: "Isolated automated UI test only",
    startAt: start.toISOString(),
    endAt: new Date(start.getTime() + 3600000).toISOString(),
  });
  const charge = await api("/payments/charges", admin.accessToken, {
    bookingId: booking.id,
    amount: 35000,
    description: "Automated UI fixture; not a live merchant charge",
  });
  const page = await login("student");
  await page
    .locator(".sidebar-nav-item-2026", { hasText: "Thanh toán" })
    .click();
  await page.getByRole("heading", { name: "Thanh toán của tôi" }).waitFor();
  const pending = page
    .locator(".payment-card")
    .filter({ hasText: "Automated UI test charge" })
    .first();
  await pending.getByRole("button", { name: "Xem yêu cầu thanh toán" }).click();
  await shot(page, "student_payment_choice");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /VNPAY Sandbox/ })
    .click();
  await page.getByRole("link", { name: "Mở cổng VNPAY Sandbox" }).waitFor();
  await shot(page, "student_vnpay_sandbox_pending");
  await settle(charge, true);
  await page.getByRole("button", { name: "Làm mới trạng thái" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Mở biên nhận" })
    .waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Mở cổng VNPAY Sandbox" }).count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("dialog")
      .getByText(/Chưa có kết quả được xác minh/)
      .count(),
    0,
  );
  await shot(page, "payment_terminal_refresh");
  await closeModal(page);
  await page
    .locator(".payment-card", { hasText: "Optional test booking 0" })
    .getByRole("button", { name: "Mở biên nhận" })
    .click();
  await page
    .getByRole("dialog")
    .getByText("Không thay thế hóa đơn điện tử/tài chính theo quy định.")
    .waitFor();
  await shot(page, "student_vnpay_success_receipt");
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: path.join(out, "internal_receipt_test_fixture.pdf"),
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  await closeModal(page);
  await page
    .locator(".payment-card", { hasText: "Optional test booking 2" })
    .getByRole("button", { name: "Xem yêu cầu thanh toán" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /VietQR/ })
    .click();
  await page
    .getByRole("dialog")
    .getByText("TEST FIXTURE ONLY", { exact: false })
    .waitFor();
  await page.locator(".payment-qr").evaluate(async (image) => {
    if (!image.complete)
      await Promise.race([
        new Promise((r) => {
          image.onload = r;
          image.onerror = r;
        }),
        new Promise((r) => setTimeout(r, 12000)),
      ]);
  });
  await shot(page, "student_vietqr_pending");
  await closeModal(page);
  const before = await api("/bookings", student.accessToken);
  await page.getByRole("button", { name: "Trợ lý AI", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Tìm thiết bị phù hợp cho huấn luyện mô hình AI",
      exact: true,
    })
    .waitFor();
  await shot(page, "ai_assistant_empty");
  await page.getByLabel("Câu hỏi cho trợ lý").fill("Tìm thiết bị GPU");
  await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
  await page
    .locator(".assistant-turn")
    .getByText("search_resources", { exact: true })
    .waitFor();
  await shot(page, "ai_assistant_resource_search");
  await page
    .getByLabel("Câu hỏi cho trợ lý")
    .fill("Tìm lịch trống cho GPU trong 7 ngày tới");
  await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
  await page
    .getByRole("button", { name: /Mở form · GPU/ })
    .first()
    .waitFor();
  assert.ok(
    await page
      .locator(".assistant-question")
      .last()
      .evaluate((el) => {
        const box = el.getBoundingClientRect();
        return box.top >= 95 && box.top < 500;
      }),
    "New response must scroll into view without test assistance",
  );
  await shot(page, "ai_assistant_slot_recommendation");
  await page
    .getByRole("button", { name: /Mở form · GPU/ })
    .first()
    .click();
  await page.getByLabel("Chọn tài nguyên lịch").waitFor();
  assert.equal(
    await page.getByLabel("Chọn tài nguyên lịch").inputValue(),
    "resource-assigned",
  );
  await shot(page, "ai_assistant_booking_prefill");
  assert.equal(
    (await api("/bookings", student.accessToken)).length,
    before.length,
    "Assistant/prefill must not submit booking",
  );
  await closeModal(page);
  await page
    .locator(".sidebar-nav-item-2026", { hasText: "Lịch Đặt Của Tôi" })
    .click();
  await page
    .locator(".operation-card", { hasText: "Optional test booking 0" })
    .getByRole("button", { name: "Thanh toán lịch đặt" })
    .click();
  await page
    .getByRole("heading", { name: "Thanh toán đặt phòng LAB" })
    .waitFor();
  await page.locator(".payment-card").first().waitFor();
  assert.equal(await page.locator(".payment-card").count(), 1);
  assert.match(
    await page.locator(".payment-card").innerText(),
    /Optional test booking 0/,
  );
  await shot(page, "booking_payment_handoff");
  const adminPage = await login("admin");
  await adminPage
    .locator(".sidebar-nav-item-2026", { hasText: "Thanh toán" })
    .click();
  await adminPage
    .getByRole("heading", { name: "Sổ giao dịch thanh toán" })
    .waitFor();
  await adminPage.locator(".payment-card").first().waitFor();
  await shot(adminPage, "admin_payment_ledger");
  const staffPage = await login("staff");
  await staffPage
    .getByRole("button", { name: "Trợ lý AI", exact: true })
    .click();
  await staffPage.getByLabel("Câu hỏi cho trợ lý").fill("Tìm thiết bị GPU");
  await staffPage.getByRole("button", { name: "Gửi câu hỏi" }).click();
  await staffPage.locator(".assistant-turn").waitFor();
  assert.equal(
    await staffPage
      .locator(".assistant-answer")
      .getByText(/GPU-FOREIGN/)
      .count(),
    0,
  );
  await shot(staffPage, "staff_ai_scope");
  const mobile = await login("student", { width: 390, height: 844 });
  await mobile.getByRole("button", { name: "Trợ lý AI", exact: true }).click();
  await mobile
    .getByRole("button", {
      name: "Tìm thiết bị phù hợp cho huấn luyện mô hình AI",
      exact: true,
    })
    .waitFor();
  await shot(mobile, "ai_assistant_mobile");
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mobile.keyboard.press("Escape");
  assert.equal(await mobile.getByRole("dialog").count(), 0);
  await mobile.getByRole("button", { name: "Menu", exact: true }).click();
  await mobile
    .locator(".sidebar-nav-item-2026", { hasText: "Thanh toán" })
    .click();
  await mobile.getByRole("heading", { name: "Thanh toán của tôi" }).waitFor();
  await shot(mobile, "student_payment_mobile");
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mobile.getByRole("button", { name: "Trợ lý AI", exact: true }).click();
  for (const message of [
    "Tìm thiết bị GPU",
    "Tìm lịch trống cho GPU trong 7 ngày tới",
  ]) {
    const oldCount = await mobile.locator(".assistant-turn").count();
    await mobile.getByLabel("Câu hỏi cho trợ lý").fill(message);
    await mobile.getByRole("button", { name: "Gửi câu hỏi" }).click();
    await mobile.waitForFunction(
      (count) => document.querySelectorAll(".assistant-turn").length > count,
      oldCount,
    );
  }
  assert.ok(
    await mobile
      .locator(".assistant-question")
      .last()
      .evaluate((el) => {
        const box = el.getBoundingClientRect();
        return box.top >= 80 && box.top < 400;
      }),
  );
  await shot(mobile, "ai_assistant_mobile_response");
  assert.deepEqual(failures, []);
  console.log(
    JSON.stringify(
      {
        pass: true,
        screenshots: checks,
        failures,
        liveProviders: "NOT CONFIGURED; isolated automated fixtures only",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
