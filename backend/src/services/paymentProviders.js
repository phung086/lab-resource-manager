import crypto from "node:crypto";
import { HttpError } from "../middleware/errors.js";
export function paymentConfiguration() {
  return {
    vnpay: {
      enabled: process.env.VNPAY_ENABLED === "true",
      tmnCode: process.env.VNPAY_TMN_CODE || "",
      secret: process.env.VNPAY_HASH_SECRET || "",
      url:
        process.env.VNPAY_PAYMENT_URL ||
        "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
      returnUrl: process.env.VNPAY_RETURN_URL || "",
      ipnUrl: process.env.VNPAY_IPN_URL || "",
      version: process.env.VNPAY_VERSION || "2.1.0",
    },
    vietqr: {
      enabled: process.env.VIETQR_ENABLED === "true",
      bank: process.env.VIETQR_BANK_ID || "",
      account: process.env.VIETQR_ACCOUNT_NO || "",
      name: process.env.VIETQR_ACCOUNT_NAME || "",
      template: process.env.VIETQR_TEMPLATE || "compact2",
      client: process.env.VIETQR_CLIENT_ID || "",
      key: process.env.VIETQR_API_KEY || "",
    },
  };
}
const failConfig = () => {
  throw new HttpError(
    503,
    "Phương thức thanh toán chưa được cấu hình.",
    undefined,
    "PAYMENT_NOT_CONFIGURED",
  );
};
export function requireVnpay() {
  const c = paymentConfiguration().vnpay;
  if (
    !c.enabled ||
    !/^[a-zA-Z0-9]{8}$/.test(c.tmnCode) ||
    !c.secret ||
    c.version !== "2.1.0" ||
    c.url !== "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
  )
    failConfig();
  for (const value of [c.returnUrl, c.ipnUrl]) {
    try {
      const url = new URL(value);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        failConfig();
    } catch {
      failConfig();
    }
  }
  return c;
}
export function requireVietqr() {
  const c = paymentConfiguration().vietqr;
  if (
    !c.enabled ||
    !/^\d{6}$/.test(c.bank) ||
    !/^\d{6,19}$/.test(c.account) ||
    !/^[A-Z0-9 ]{5,50}$/.test(c.name) ||
    !/^[a-zA-Z0-9_]{1,40}$/.test(c.template) ||
    Boolean(c.key) !== Boolean(c.client)
  )
    failConfig();
  return c;
}
export function providerAvailability() {
  const ready = (check) => {
    try {
      check();
      return true;
    } catch {
      return false;
    }
  };
  return {
    vnpay: ready(requireVnpay),
    vietqr: ready(requireVietqr),
    vnpayMode: "SANDBOX",
    vietqrConfirmation: "NOT_CONFIGURED",
  };
}
// Official VNPAY 2.1.0 Node sample: sorted keys, UTF-8 percent encoding, spaces as '+'.
const encode = (value) => encodeURIComponent(value).replace(/%20/g, "+");
export function vnpayQuery(params) {
  return Object.keys(params)
    .filter(
      (k) =>
        k.startsWith("vnp_") &&
        !["vnp_SecureHash", "vnp_SecureHashType"].includes(k),
    )
    .sort()
    .map((k) => `${encode(k)}=${encode(params[k])}`)
    .join("&");
}
export function signVnpay(params, secret) {
  return crypto
    .createHmac("sha512", secret)
    .update(vnpayQuery(params), "utf8")
    .digest("hex");
}
export function verifyVnpay(query) {
  const c = requireVnpay();
  if (
    Object.entries(query).some(
      ([k, v]) =>
        !k.startsWith("vnp_") || typeof v !== "string" || v.length > 1024,
    )
  )
    throw new HttpError(
      400,
      "Callback không hợp lệ.",
      undefined,
      "INVALID_PROVIDER_CALLBACK",
    );
  const hash = query.vnp_SecureHash || "";
  if (
    !/^[a-fA-F0-9]{128}$/.test(hash) ||
    !crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(signVnpay(query, c.secret), "hex"),
    )
  )
    throw new HttpError(
      400,
      "Chữ ký callback không hợp lệ.",
      undefined,
      "INVALID_SIGNATURE",
    );
  if (
    query.vnp_TmnCode !== c.tmnCode ||
    !/^\d{1,12}$/.test(query.vnp_Amount || "") ||
    !/^[a-zA-Z0-9]{1,100}$/.test(query.vnp_TxnRef || "") ||
    !/^\d{2}$/.test(query.vnp_ResponseCode || "") ||
    !/^\d{2}$/.test(query.vnp_TransactionStatus || "")
  )
    throw new HttpError(
      400,
      "Callback không hợp lệ.",
      undefined,
      "INVALID_PROVIDER_CALLBACK",
    );
  return query;
}
export function vietnamPaymentDate(date) {
  return new Date(date.getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 19)
    .replace(/[-T:]/g, "");
}
export function buildVnpayUrl(row, ip) {
  const c = requireVnpay();
  const now = new Date();
  const params = {
    vnp_Version: c.version,
    vnp_Command: "pay",
    vnp_TmnCode: c.tmnCode,
    vnp_Amount: String(row.amount * 100),
    vnp_CurrCode: "VND",
    vnp_TxnRef: row.txnRef,
    vnp_OrderInfo: `LRM ${row.txnRef}`,
      vnp_OrderType: "other",
      // VNPAY renders the scannable QR on its hosted checkout page.
      vnp_BankCode: "VNPAYQR",
    vnp_Locale: "vn",
    vnp_ReturnUrl: c.returnUrl,
    vnp_IpAddr: ip?.replace(/^::ffff:/, "") || "127.0.0.1",
    vnp_CreateDate: vietnamPaymentDate(now),
    vnp_ExpireDate: vietnamPaymentDate(new Date(now.getTime() + 15 * 60000)),
  };
  return `${c.url}?${vnpayQuery(params)}&vnp_SecureHash=${signVnpay(params, c.secret)}`;
}
export async function buildVietqr(row) {
  const c = requireVietqr();
  const content = `LRM ${row.txnRef}`;
  const data = {
    bank: c.bank,
    accountNumber: c.account,
    accountName: c.name,
    amount: row.amount,
    content,
    reconciliation: "PENDING",
    mode: "quicklink",
  };
  if (c.key && c.client) {
    try {
      const response = await fetch("https://api.vietqr.io/v2/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": c.client,
          "x-api-key": c.key,
        },
        body: JSON.stringify({
          accountNo: c.account,
          accountName: c.name,
          acqId: Number(c.bank),
          amount: row.amount,
          addInfo: content,
          template: c.template,
          format: "text",
        }),
        signal: globalThis.AbortSignal.timeout(8000),
      });
      const result = await response.json();
      if (
        !response.ok ||
        result.code !== "00" ||
        !/^data:image\/png;base64,/.test(result.data?.qrDataURL || "") ||
        result.data.qrDataURL.length > 1500000
      )
        throw new Error("invalid provider response");
      return { ...data, mode: "api", qrUrl: result.data.qrDataURL };
    } catch {
      throw new HttpError(
        502,
        "Không thể tạo VietQR. Vui lòng thử lại.",
        undefined,
        "PROVIDER_UNAVAILABLE",
      );
    }
  }
  const qs = new globalThis.URLSearchParams({
    amount: String(row.amount),
    addInfo: content,
    accountName: c.name,
  });
  return {
    ...data,
    qrUrl: `https://img.vietqr.io/image/${c.bank}-${c.account}-${c.template}.png?${qs}`,
  };
}
