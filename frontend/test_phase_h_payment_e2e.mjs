import { openWorkspace } from "./test-utils/openWorkspace.mjs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { chromium } from "playwright-core";

const base = process.env.PHASE_H_E2E_BASE_URL || "http://127.0.0.1:15188";
const apiBase = process.env.PHASE_H_E2E_API_URL || "http://127.0.0.1:15013/api";
const secret = process.env.PHASE_H_E2E_VNPAY_SECRET;
assert.equal(secret, "phase-h-signed-fixture-secret", "Use only the isolated Phase H signed fixture secret");

async function api(path, token, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json();
  assert.ok(response.ok, `${response.status} ${JSON.stringify(body)}`);
  return body;
}

function callback(transaction) {
  const params = {
    vnp_TmnCode: "TESTONLY",
    vnp_Amount: String(transaction.amount * 100),
    vnp_TxnRef: transaction.txnRef,
    vnp_ResponseCode: "00",
    vnp_TransactionStatus: "00",
    vnp_TransactionNo: BigInt(`0x${crypto.createHash("sha256").update(transaction.txnRef).digest("hex").slice(0, 12)}`).toString(),
    vnp_PayDate: "20260926120000",
  };
  const query = Object.keys(params).sort().map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`).join("&");
  return `${query}&vnp_SecureHash=${crypto.createHmac("sha512", secret).update(query).digest("hex")}`;
}

async function login(page, who) {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(`${who}@phase-h.test`);
  await page.locator('input[type="password"]').first().fill("PhaseH!Pass2026");
  await page.getByRole("button", { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();
  await openWorkspace(page);
}

const student = await api("/auth/login", null, { method: "POST", body: JSON.stringify({ email: "student@phase-h.test", password: "PhaseH!Pass2026" }) });
const pendingForSuccess = (await api("/payments/booking/phase-h-booking-22", student.accessToken))[0];
assert.equal(pendingForSuccess.status, "pending");
assert.equal((await fetch(`${apiBase}/payments/vnpay/ipn?${callback(pendingForSuccess)}`).then((response) => response.json())).RspCode, "00");

const lateBookingId = "phase-h-booking-21";
const latePayment = (await api(`/payments/booking/${lateBookingId}`, student.accessToken))[0];
await api(`/payments/${latePayment.id}/vnpay`, student.accessToken, { method: "POST", body: "{}" });
await api(`/bookings/${lateBookingId}/cancel`, student.accessToken, { method: "POST", body: JSON.stringify({ reason: "Phase H browser fixture cancellation" }) });
assert.equal((await fetch(`${apiBase}/payments/vnpay/ipn?${callback(latePayment)}`).then((response) => response.json())).RspCode, "00");

const browser = await chromium.launch({ headless: true });
try {
  const studentPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await login(studentPage, "student");
  await studentPage.goto(`${base}/#/workspace/thanh-toan?booking=phase-h-booking-22`, { waitUntil: "networkidle" });
  await studentPage.getByRole("heading", { name: "Thanh toán lịch đặt LAB" }).waitFor();
  await studentPage.getByText(/Đã xác minh thanh toán/).waitFor();

  await studentPage.goto(`${base}/#/workspace/thanh-toan?booking=${lateBookingId}`, { waitUntil: "networkidle" });
  await studentPage.getByText(/đang chờ quản trị viên đối soát và xử lý hoàn tiền thủ công/i).waitFor();

  const adminPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await login(adminPage, "admin");
  await adminPage.locator('[data-nav-id="payments"]').click();
  await adminPage.getByRole("heading", { name: "Sổ giao dịch thanh toán" }).waitFor();
  const exceptionCard = adminPage.locator(".payment-card").filter({ hasText: "Phase H booking 21" });
  await exceptionCard.getByText("Cần xử lý thủ công").waitFor();
  await exceptionCard.getByRole("button", { name: "Xử lý đối soát" }).click();
  await adminPage.getByRole("dialog").getByText("Cần đối soát thủ công").waitFor();

  console.log("Phase H payment browser E2E PASS: signed IPN refresh and late-cancellation reconciliation UI");
} finally {
  await browser.close();
}
