import assert from "node:assert";
import test from "node:test";

import { createVnPayPaymentUrl, verifyVnPayReturn } from "../src/services/vnpayService.js";
import { createGhnShipment, trackGhnShipment } from "../src/services/ghnService.js";
import { sendBookingStatusEmail } from "../src/services/emailService.js";

import { prisma } from "../src/db.js";

test("VNPay Service generates valid payment URL with secure hash", async () => {
  let userId = "u0000000-0000-0000-0000-000000000001";
  try {
    const user = await prisma.user.findFirst();
    if (user) userId = user.id;
  } catch (_e) {}

  const result = await createVnPayPaymentUrl({
    userId,
    amount: 150000,
    orderInfo: "Thanh toan su dung DGX A100"
  });

  assert.strictEqual(result.success, true);
  assert.ok(result.paymentUrl.includes("sandbox.vnpayment.vn"));
  assert.ok(result.paymentUrl.includes("vnp_SecureHash="));
  assert.ok(result.paymentUrl.includes("vnp_TxnRef="));
});

test("VNPay Return verification validates checksum correctly", async () => {
  const params = {
    vnp_Amount: "15000000",
    vnp_BankCode: "NCB",
    vnp_CardType: "ATM",
    vnp_Command: "pay",
    vnp_CreateDate: "20260817120000",
    vnp_CurrCode: "VND",
    vnp_IpAddr: "127.0.0.1",
    vnp_Locale: "vn",
    vnp_OrderInfo: "Thanh toan su dung DGX A100",
    vnp_OrderType: "other",
    vnp_ResponseCode: "00",
    vnp_TmnCode: "DEMOVNPAY",
    vnp_TransactionNo: "14500123",
    vnp_TxnRef: "VNP_1700000000_123",
    vnp_Version: "2.1.0"
  };

  const verification = await verifyVnPayReturn({
    ...params,
    vnp_SecureHash: "INVALID_HASH"
  });

  assert.strictEqual(verification.isValidChecksum, false);
  assert.strictEqual(verification.isSuccess, false);
});

test("GHN Logistics Service creates mock shipment order", async () => {
  let userId = "u0000000-0000-0000-0000-000000000001";
  let resourceId = "r0000000-0000-0000-0000-000000000001";
  try {
    const user = await prisma.user.findFirst();
    if (user) userId = user.id;
    const resource = await prisma.resource.findFirst();
    if (resource) resourceId = resource.id;
  } catch (_e) {}

  const result = await createGhnShipment({
    resourceId,
    userId,
    recipientName: "Nguyễn Văn A",
    recipientPhone: "0901234567",
    recipientAddress: "Phòng B603, Tòa nhà A, Cơ sở chính"
  });

  assert.strictEqual(result.success, true);
  assert.ok(result.trackingCode.startsWith("GHN_MOCK_"));
  assert.strictEqual(result.fee, 30000);
});

test("Email Service renders and sends HTML booking notification", async () => {
  const result = await sendBookingStatusEmail({
    userEmail: "student@lab.local",
    userName: "Sinh viên A",
    bookingTitle: "Nghiên cứu Deep Learning",
    resourceName: "NVIDIA DGX A100",
    status: "approved",
    startAt: new Date(),
    endAt: new Date(Date.now() + 7200000)
  });

  assert.strictEqual(result.success, true);
});
