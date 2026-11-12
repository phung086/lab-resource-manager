import { timingSafeEqual } from "node:crypto";
import { URLSearchParams } from "node:url";
import { HttpError } from "../middleware/errors.js";
import { requireVietqr } from "./paymentProviders.js";

const qrEndpoint = "https://vietqr.app/img";
const invalidCallback = () => new HttpError(
  400, "Dữ liệu chuyển khoản không khớp.", undefined, "INVALID_PROVIDER_CALLBACK",
);

export function buildBankTransferUrl(row, recipient) {
  const url = new URL(qrEndpoint);
  url.search = new URLSearchParams({
    acc: recipient.account,
    bank: recipient.bank,
    amount: String(row.amount),
    des: `SEVQR LRM${row.txnRef}`,
    holder: recipient.name,
    template: "compact",
  });
  return url.href;
}

export function bankTransferDetails(row) {
  const url = new URL(row.paymentUrl);
  const params = url.searchParams;
  return {
    qrUrl: url.href,
    bank: params.get("bank"),
    accountNumber: params.get("acc"),
    accountName: params.get("holder"),
    content: params.get("des"),
    amount: row.amount,
  };
}

export function verifyBankTransfer(body, authorization, now = new Date()) {
  const { webhookKey } = requireVietqr();
  const actual = Buffer.from(authorization || "");
  const expected = Buffer.from(`Apikey ${webhookKey}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new HttpError(401, "Webhook chưa được xác thực.", undefined, "INVALID_SIGNATURE");
  }

  const { id, gateway, transactionDate, accountNumber, content, transferType, transferAmount } = body || {};
  if (!Number.isSafeInteger(id) || id <= 0 ||
      typeof gateway !== "string" || !/^[a-zA-Z][a-zA-Z0-9 ]{1,39}$/.test(gateway) ||
      typeof accountNumber !== "string" || !/^\d{6,19}$/.test(accountNumber) ||
      typeof content !== "string" || content.length > 1024 ||
      transferType !== "in" || !Number.isSafeInteger(transferAmount) || transferAmount <= 0 ||
      typeof transactionDate !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(transactionDate)) {
    throw invalidCallback();
  }

  const references = [...content.matchAll(/\bLRM([0-9A-F]{20})\b/gi)];
  if (references.length === 0) return null;
  const paidAt = new Date(`${transactionDate.replace(" ", "T")}+07:00`);
  if (references.length !== 1 || !Number.isFinite(+paidAt) || paidAt > now ||
      new Date(+paidAt + 7 * 3600000).toISOString().slice(0, 19).replace("T", " ") !== transactionDate) {
    throw invalidCallback();
  }
  return {
    txnRef: references[0][1].toUpperCase(),
    gateway,
    accountNumber,
    amount: transferAmount,
    paidAt,
    providerTransactionNo: String(id),
  };
}

export function matchesBankTransfer(row, recipient, paidAt) {
  if (!row.paymentUrl?.startsWith(`${qrEndpoint}?`) || !row.paymentUrlCreatedAt || !row.paymentUrlExpiresAt) return false;
  const details = bankTransferDetails(row);
  return details.accountNumber === recipient.accountNumber &&
    details.bank?.toLowerCase() === recipient.gateway.toLowerCase() &&
    +paidAt >= Math.floor(+row.paymentUrlCreatedAt / 1000) * 1000;
}
