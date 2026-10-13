import { randomUUID } from "node:crypto";
import { prisma } from "../db.js";
import { normalizeLocale, localize } from "../locales/index.js";
import { emailConfiguration, escapeHtml, sendEmail } from "./emailService.js";

const MAX_ATTEMPTS = 5;
const LEASE_MS = 120000;

export function emailApplicationUrl() {
  try {
    const url = new URL(process.env.EMAIL_APP_URL || process.env.PAYMENT_APP_URL || "http://localhost:5173");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password ||
      (process.env.NODE_ENV === "production" && url.protocol !== "https:")) return null;
    return url.origin;
  } catch { return null; }
}

async function enqueue(tx, { user, dedupeKey, kind, payload, locale }) {
  return tx.emailDelivery.upsert({
    where: { dedupeKey }, update: {},
    create: { id: randomUUID(), dedupeKey, userId: user.id, recipient: user.email,
      kind, payload, locale: normalizeLocale(locale) }
  });
}

export function enqueueRegistrationEmail(tx, user, locale = "vi") {
  // Explicit projection: plaintext passwords, password hashes and tokens never enter the outbox.
  return enqueue(tx, { user, locale, dedupeKey: `account:${user.id}:registered`, kind: "ACCOUNT_REGISTERED",
    payload: { name: user.fullName, email: user.email, requiresPasswordSetup: user.passwordResetRequired } });
}

export async function enqueuePaymentReceipt(tx, payment) {
  if (payment.status !== "success" || !payment.paidAt) throw new Error("Receipt requires a settled payment");
  const user = await tx.user.findUniqueOrThrow({ where: { id: payment.userId }, select: { id: true, email: true, fullName: true } });
  const booking = payment.bookingId ? await tx.booking.findUniqueOrThrow({ where: { id: payment.bookingId }, select: {
    id: true, bookingCode: true, title: true, status: true, startAt: true, endAt: true,
    resource: { select: { name: true, code: true, laboratory: { select: { name: true } } } }
  } }) : null;
  return enqueue(tx, { user, dedupeKey: `payment:${payment.id}:success`, kind: "PAYMENT_RECEIPT", locale: "vi",
    payload: { name: user.fullName, txnRef: payment.txnRef, amount: payment.amount, currency: payment.currency,
      provider: payment.provider, transactionNo: payment.vnpTransactionNo, paidAt: payment.paidAt.toISOString(),
      reconciliationRequired: payment.reconciliationStatus === "manual_review",
      booking: booking ? { id: booking.id, code: booking.bookingCode || booking.id, title: booking.title,
        status: booking.status, startAt: booking.startAt.toISOString(), endAt: booking.endAt.toISOString(),
        resource: booking.resource.name, resourceCode: booking.resource.code, laboratory: booking.resource.laboratory?.name || null } : null }
  });
}

export function renderAutomatedEmail(row) {
  const t = (key, params) => localize(row.locale, `email.auto.${key}`, params);
  const p = row.payload;
  const appUrl = emailApplicationUrl();
  if (!appUrl) throw new Error("EMAIL_APP_URL_INVALID");
  const date = value => new Intl.DateTimeFormat(row.locale === "en" ? "en-GB" : "vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short", hour12: false
  }).format(new Date(value)) + " (UTC+7)";
  const fields = [], paragraphs = [t("greeting", { name: p.name || p.email })];
  let subject, path;
  if (row.kind === "ACCOUNT_REGISTERED") {
    subject = t("registeredSubject"); path = "/";
    paragraphs.push(t("registered"));
    if (p.name) fields.push([t("name"), p.name]);
    fields.push([t("account"), p.email]);
    paragraphs.push(t(p.requiresPasswordSetup ? "passwordSetup" : "passwordChosen"));
  } else if (row.kind === "PAYMENT_RECEIPT") {
    subject = t("paymentSubject", { reference: p.txnRef }); path = "/";
    paragraphs.push(t("paymentReceived"));
    fields.push([t("paymentReference"), p.txnRef], [t("provider"), String(p.provider).toUpperCase()],
      [t("providerReference"), p.transactionNo],
      [t("amount"), new Intl.NumberFormat(row.locale === "en" ? "en-GB" : "vi-VN", { style: "currency", currency: p.currency }).format(p.amount)],
      [t("paidAt"), date(p.paidAt)]);
    if (p.booking) {
      fields.push([t("bookingReference"), p.booking.code], [t("bookingTitle"), p.booking.title],
        [t("resource"), `${p.booking.resource} (${p.booking.resourceCode})`], [t("laboratory"), p.booking.laboratory],
        [t("startAt"), date(p.booking.startAt)], [t("endAt"), date(p.booking.endAt)],
        [t("bookingStatus"), localize(row.locale, `enum.booking.${p.booking.status}`)]);
      paragraphs.push(t(p.reconciliationRequired ? "reconciliation" : "bookingNotice"));
    } else if (p.reconciliationRequired) paragraphs.push(t("reconciliation"));
    paragraphs.push(t("receiptNotice"));
  } else throw new Error("EMAIL_KIND_INVALID");
  const link = appUrl + path;
  const text = [...paragraphs, ...fields.map(([label, value]) => `${label}: ${value ?? "—"}`), `${t("openApp")}: ${link}`, t("footer")].join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#172033;line-height:1.6">
    <h2>${escapeHtml(subject)}</h2>${paragraphs.map(line => `<p>${escapeHtml(line)}</p>`).join("")}
    <table style="border-collapse:collapse;width:100%">${fields.map(([label, value]) => `<tr><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd">${escapeHtml(label)}</th><td style="padding:8px;border-bottom:1px solid #ddd">${escapeHtml(value ?? "—")}</td></tr>`).join("")}</table>
    <p><a href="${escapeHtml(link)}">${escapeHtml(t("openApp"))}</a></p><p style="font-size:12px;color:#64748b">${escapeHtml(t("footer"))}</p></div>`;
  return { subject, html, text };
}

export async function dispatchEmailDeliveries({ client = prisma, limit = 10, now = new Date() } = {}) {
  const configuration = emailConfiguration();
  if (!configuration.configured || !emailApplicationUrl()) {
    const error = !configuration.configured ? "SMTP_NOT_CONFIGURED" : "EMAIL_APP_URL_INVALID";
    await client.emailDelivery.updateMany({ where: { status: "PENDING", nextAttemptAt: { lte: now } },
      data: { lastError: error, nextAttemptAt: new Date(now.getTime() + 10000) } });
    return { sent: 0, failed: 0, blocked: error };
  }
  const result = { sent: 0, failed: 0 };
  for (let i = 0; i < Math.min(Math.max(limit, 0), 25); i++) {
    const leaseToken = randomUUID(), staleAt = new Date(now.getTime() - LEASE_MS);
    const row = await client.$transaction(async tx => {
      await tx.emailDelivery.updateMany({ where: { status: "SENDING", lockedAt: { lt: staleAt }, attempts: { gte: MAX_ATTEMPTS } },
        data: { status: "FAILED", nextAttemptAt: null, leaseToken: null, lockedAt: null, lastError: "DELIVERY_UNCERTAIN" } });
      const [candidate] = await tx.$queryRaw`SELECT id FROM email_deliveries
        WHERE "attempts" < ${MAX_ATTEMPTS} AND ((status = 'PENDING' AND "nextAttemptAt" <= ${now})
          OR (status = 'SENDING' AND "lockedAt" < ${staleAt}))
        ORDER BY "createdAt", id FOR UPDATE SKIP LOCKED LIMIT 1`;
      if (!candidate) return null;
      return tx.emailDelivery.update({ where: { id: candidate.id }, data: {
        status: "SENDING", attempts: { increment: 1 }, leaseToken, lockedAt: new Date(), lastError: null
      } });
    });
    if (!row) break;
    let delivery;
    try {
      delivery = await sendEmail({ to: row.recipient, ...renderAutomatedEmail(row),
        messageId: `<${row.id}@${configuration.fromAddress.split("@")[1]}>` });
    } catch { delivery = { success: false, error: "EMAIL_TEMPLATE_INVALID" }; }
    const finishedAt = new Date();
    const finalFailure = row.attempts >= MAX_ATTEMPTS;
    // A worker whose lease was recovered must never overwrite the new owner's result.
    const saved = await client.emailDelivery.updateMany({ where: { id: row.id, status: "SENDING", leaseToken }, data: delivery.success ? {
      status: "SENT", sentAt: finishedAt, messageId: delivery.messageId, nextAttemptAt: null, leaseToken: null, lockedAt: null, lastError: null
    } : {
      status: finalFailure ? "FAILED" : "PENDING", leaseToken: null, lockedAt: null,
      nextAttemptAt: finalFailure ? null : new Date(finishedAt.getTime() + Math.min(30000 * 2 ** (row.attempts - 1), 900000)),
      lastError: delivery.error === "SMTP is not configured" ? "SMTP_NOT_CONFIGURED" : delivery.error
    } });
    if (saved.count) result[delivery.success ? "sent" : "failed"]++;
  }
  return result;
}

export function startEmailDeliveryScheduler({ client = prisma } = {}) {
  if (process.env.EMAIL_AUTOMATION_ENABLED === "false" || process.env.NODE_ENV === "test") return async () => {};
  let stopped = false, inFlight = null;
  const tick = () => {
    if (stopped || inFlight) return;
    inFlight = dispatchEmailDeliveries({ client }).catch(() => {
      console.error("Email queue processing failed; delivery state retained for retry.");
    }).finally(() => { inFlight = null; });
  };
  const timer = setInterval(tick, 10000); timer.unref(); tick();
  return async () => { stopped = true; clearInterval(timer); await inFlight; };
}
