import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { buildVnpayUrl, requireVnpay } from "../src/services/paymentProviders.js";

const settings = {
  VNPAY_ENABLED: "true",
  VNPAY_TMN_CODE: "TESTONLY",
  VNPAY_HASH_SECRET: "isolated-payment-provider-test-key",
  VNPAY_PAYMENT_URL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  VNPAY_RETURN_URL: "https://lab.example/api/payments/vnpay/return",
  VNPAY_IPN_URL: "https://lab.example/api/payments/vnpay/ipn",
  VNPAY_VERSION: "2.1.0",
};

function withBank(bank, run) {
  const names = [...Object.keys(settings), "VNPAY_BANK_CODE"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, settings);
  if (bank === undefined) delete process.env.VNPAY_BANK_CODE;
  else process.env.VNPAY_BANK_CODE = bank;
  try {
    return run();
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}

function checkout() {
  return new URL(buildVnpayUrl(
    { amount: 90000, txnRef: "LABTEST1" }, "127.0.0.1",
    new Date("2026-10-13T06:00:00Z"), new Date("2026-10-13T06:15:00Z"),
  ));
}

test("an absent bank setting preserves the existing QR checkout", () => {
  withBank(undefined, () => assert.equal(checkout().searchParams.get("vnp_BankCode"), "VNPAYQR"));
});

test("an empty bank setting opens provider choice and signs no empty bank parameter", () => {
  withBank("", () => {
    const url = checkout();
    assert.equal(url.searchParams.has("vnp_BankCode"), false);
    // Independently specified VNPAY 2.1.0 canonical data, not the application's encoder.
    const canonical = "vnp_Amount=9000000&vnp_Command=pay&vnp_CreateDate=20261013130000&vnp_CurrCode=VND&vnp_ExpireDate=20261013131500&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=LRM+LABTEST1&vnp_OrderType=other&vnp_ReturnUrl=https%3A%2F%2Flab.example%2Fapi%2Fpayments%2Fvnpay%2Freturn&vnp_TmnCode=TESTONLY&vnp_TxnRef=LABTEST1&vnp_Version=2.1.0";
    assert.equal(url.search.slice(1).split("&vnp_SecureHash=")[0], canonical);
    assert.equal(url.searchParams.get("vnp_SecureHash"), crypto.createHmac("sha512", settings.VNPAY_HASH_SECRET).update(canonical, "utf8").digest("hex"));
  });
});

test("a configured supported bank is carried into the signed checkout", () => {
  withBank("NCB", () => assert.equal(checkout().searchParams.get("vnp_BankCode"), "NCB"));
});

test("malformed bank settings fail configuration before creating a checkout", () => {
  for (const value of ["ncb", "NCB ", "NCB\n", "NCB&evil", "X".repeat(21)]) {
    withBank(value, () => assert.throws(requireVnpay, error => error.code === "PAYMENT_NOT_CONFIGURED"));
  }
});
