/**
 * Email Notification Service
 * Powered by Nodemailer & HTML Templates
 * Requires real SMTP configuration; never reports console output as delivery.
 */

import nodemailer from "nodemailer";
import { createHash } from "node:crypto";

let transporter = null;
let transportFingerprint = null;

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

export function emailConfiguration() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM?.trim();
  const fromAddress = from?.match(/^(?:[^<>\r\n]*<)?([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>?$/)?.[1];
  return { host, port, user, pass, from, fromAddress, configured: Boolean(
    host && user && pass && fromAddress && Number.isInteger(port) && port > 0 && port <= 65535
  ) };
}

function getTransporter() {
  const c = emailConfiguration();
  if (!c.configured) return null;
  const requireTLS = !(process.env.NODE_ENV === "test" && ["127.0.0.1", "localhost"].includes(c.host)) && c.port !== 465;
  const fingerprint = createHash("sha256").update(JSON.stringify({ ...c, requireTLS })).digest("hex");
  if (transporter && transportFingerprint === fingerprint) return transporter;
  transporter?.close();
  transporter = nodemailer.createTransport({
    host: c.host, port: c.port, secure: c.port === 465,
    // Only the isolated SMTP integration fixture may run without TLS.
    requireTLS,
    auth: { user: c.user, pass: c.pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
  });
  transportFingerprint = fingerprint;
  return transporter;
}

function deliveryError(error) {
  return error?.code === "EAUTH" ? "SMTP_AUTH_FAILED"
    : error?.code === "EENVELOPE" ? "SMTP_RECIPIENT_REJECTED"
      : "SMTP_DELIVERY_FAILED";
}

export async function verifyEmailTransport() {
  const transport = getTransporter();
  if (!transport) return { success: false, error: "SMTP is not configured" };
  try { await transport.verify(); return { success: true }; }
  catch (error) { return { success: false, error: deliveryError(error) }; }
}

/**
 * Send email safely without throwing
 */
export async function sendEmail({ to, subject, html, text, messageId }) {
  try {
    const transport = getTransporter();
    if (!transport) return { success: false, error: "SMTP is not configured" };
    const info = await transport.sendMail({
      from: emailConfiguration().from,
      to,
      subject,
      text: text || subject,
      html, messageId,
      disableFileAccess: true, disableUrlAccess: true
    });
    if (!info.accepted?.length || info.rejected?.length) {
      return { success: false, error: "SMTP_RECIPIENT_REJECTED" };
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: deliveryError(error) };
  }
}

export const sendRequiredEmail = sendEmail;

/**
 * Send Booking Status HTML Email
 */
export function renderBookingStatusEmail({ userName, bookingTitle, resourceName, status, startAt, endAt, reason }) {
  const isApproved = status === "approved";
  const subject = isApproved
    ? `[Lab Management] Yêu cầu đặt lịch "${bookingTitle}" đã được PHÊ DUYỆT`
    : `[Lab Management] Yêu cầu đặt lịch "${bookingTitle}" bị TỪ CHỐI`;

  const statusColor = isApproved ? "#13a56f" : "#d04943";
  const statusLabel = isApproved ? "ĐÃ PHÊ DUYỆT" : "TỪ CHỐI";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: #172033; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Quản lý Phòng Thí Nghiệm</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Thông báo trạng thái đăng ký đặt lịch</p>
      </div>
      <div style="padding: 24px; color: #333333; line-height: 1.6;">
        <p>Xin chào <strong>${escapeHtml(userName)}</strong>,</p>
        <p>Yêu cầu sử dụng thiết bị của bạn đã được xử lý:</p>

        <div style="background: #f8f9fa; border-left: 4px solid ${statusColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0;">Trạng thái: <strong style="color: ${statusColor};">${statusLabel}</strong></p>
          <p style="margin: 0 0 4px 0;">Thiết bị: <strong>${escapeHtml(resourceName)}</strong></p>
          <p style="margin: 0 0 4px 0;">Tiêu đề: <strong>${escapeHtml(bookingTitle)}</strong></p>
          <p style="margin: 0 0 4px 0;">Thời gian bắt đầu: <strong>${new Date(startAt).toLocaleString("vi-VN")}</strong></p>
          <p style="margin: 0;">Thời gian kết thúc: <strong>${new Date(endAt).toLocaleString("vi-VN")}</strong></p>
          ${reason ? `<p style="margin: 8px 0 0 0; color: #666;">Lý do: <em>${escapeHtml(reason)}</em></p>` : ""}
        </div>

        ${isApproved ? `<p>Vui lòng đến đúng giờ và thực hiện <strong>Check-in</strong> trên hệ thống trước khi bắt đầu sử dụng.</p>` : `<p>Bạn có thể kiểm tra danh sách thiết bị/khung giờ khác trên hệ thống.</p>`}
      </div>
      <div style="background: #f1f3f5; padding: 12px; text-align: center; font-size: 12px; color: #666;">
        Email này được gửi tự động từ Hệ thống Quản lý & Lịch Phòng Thí nghiệm.
      </div>
    </div>
  `;

  return { subject, html };
}

export async function sendBookingStatusEmail({ userEmail, ...booking }) {
  const { subject, html } = renderBookingStatusEmail(booking);
  return sendEmail({ to: userEmail, subject, html });
}

/**
 * Send Incident Alert Email to Staff
 */
export function renderIncidentAlertEmail({ incidentTitle, resourceName, severity, reporterName, description }) {
  const subject = `[CẢNH BÁO SỰ CỐ - ${severity.toUpperCase()}] ${resourceName}: ${incidentTitle}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: #d04943; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">⚠️ Cảnh Báo Sự Cố Thiết Bị</h2>
      </div>
      <div style="padding: 24px; color: #333333; line-height: 1.6;">
        <p>Có báo cáo sự cố mới yêu cầu kiểm tra và xử lý:</p>

        <div style="background: #fff5f5; border-left: 4px solid #d04943; padding: 15px; margin: 20px 0;">
          <p style="margin: 0 0 4px 0;">Mức độ: <strong style="color: #d04943;">${escapeHtml(severity.toUpperCase())}</strong></p>
          <p style="margin: 0 0 4px 0;">Thiết bị: <strong>${escapeHtml(resourceName)}</strong></p>
          <p style="margin: 0 0 4px 0;">Sự cố: <strong>${escapeHtml(incidentTitle)}</strong></p>
          <p style="margin: 0 0 4px 0;">Người báo cáo: <strong>${escapeHtml(reporterName)}</strong></p>
          <p style="margin: 8px 0 0 0;">Mô tả: ${escapeHtml(description)}</p>
        </div>
      </div>
    </div>
  `;

  return { subject, html };
}

export async function sendIncidentAlertEmail({ staffEmails, ...incident }) {
  const { subject, html } = renderIncidentAlertEmail(incident);
  return Promise.all(staffEmails.map((email) => sendEmail({ to: email, subject, html })));
}
