/**
 * Email Notification Service
 * Powered by Nodemailer & HTML Templates
 * Supports SMTP, SendGrid, Ethereal Test Account, and Dev Console fallback.
 */

import nodemailer from "nodemailer";

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
    return transporter;
  }

  // Local Dev Fallback: Ethereal Test Account or Console log
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    return transporter;
  } catch (_err) {
    return null;
  }
}

/**
 * Send email safely without throwing
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const transport = await getTransporter();
    const from = process.env.EMAIL_FROM || '"Lab Management System" <no-reply@lab.local>';

    if (!transport) {
      console.log(`[EMAIL DEV MOCK] To: ${to} | Subject: ${subject}`);
      return { success: true, mocked: true };
    }

    const info = await transport.sendMail({
      from,
      to,
      subject,
      text: text || subject,
      html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EMAIL TEST PREVIEW]: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error("Failed to send email:", error.message);
    return { success: false, error: error.message };
  }
}

export async function sendRequiredEmail({ to, subject, html, text }) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  if (!host || !user) {
    return { success: false, error: "SMTP is not configured" };
  }
  return sendEmail({ to, subject, html, text });
}

/**
 * Send Booking Status HTML Email
 */
export async function sendBookingStatusEmail({ userEmail, userName, bookingTitle, resourceName, status, startAt, endAt, reason }) {
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
        <p>Xin chào <strong>${userName}</strong>,</p>
        <p>Yêu cầu sử dụng thiết bị của bạn đã được xử lý:</p>

        <div style="background: #f8f9fa; border-left: 4px solid ${statusColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0;">Trạng thái: <strong style="color: ${statusColor};">${statusLabel}</strong></p>
          <p style="margin: 0 0 4px 0;">Thiết bị: <strong>${resourceName}</strong></p>
          <p style="margin: 0 0 4px 0;">Tiêu đề: <strong>${bookingTitle}</strong></p>
          <p style="margin: 0 0 4px 0;">Thời gian bắt đầu: <strong>${new Date(startAt).toLocaleString("vi-VN")}</strong></p>
          <p style="margin: 0;">Thời gian kết thúc: <strong>${new Date(endAt).toLocaleString("vi-VN")}</strong></p>
          ${reason ? `<p style="margin: 8px 0 0 0; color: #666;">Lý do: <em>${reason}</em></p>` : ""}
        </div>

        ${isApproved ? `<p>Vui lòng đến đúng giờ và thực hiện <strong>Check-in</strong> trên hệ thống trước khi bắt đầu sử dụng.</p>` : `<p>Bạn có thể kiểm tra danh sách thiết bị/khung giờ khác trên hệ thống.</p>`}
      </div>
      <div style="background: #f1f3f5; padding: 12px; text-align: center; font-size: 12px; color: #666;">
        Email này được gửi tự động từ Hệ thống Quản lý & Lịch Phòng Thí nghiệm.
      </div>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, html });
}

/**
 * Send Incident Alert Email to Staff
 */
export async function sendIncidentAlertEmail({ staffEmails, incidentTitle, resourceName, severity, reporterName, description }) {
  const subject = `[CẢNH BÁO SỰ CỐ - ${severity.toUpperCase()}] ${resourceName}: ${incidentTitle}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: #d04943; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">⚠️ Cảnh Báo Sự Cố Thiết Bị</h2>
      </div>
      <div style="padding: 24px; color: #333333; line-height: 1.6;">
        <p>Có báo cáo sự cố mới yêu cầu kiểm tra và xử lý:</p>

        <div style="background: #fff5f5; border-left: 4px solid #d04943; padding: 15px; margin: 20px 0;">
          <p style="margin: 0 0 4px 0;">Mức độ: <strong style="color: #d04943;">${severity.toUpperCase()}</strong></p>
          <p style="margin: 0 0 4px 0;">Thiết bị: <strong>${resourceName}</strong></p>
          <p style="margin: 0 0 4px 0;">Sự cố: <strong>${incidentTitle}</strong></p>
          <p style="margin: 0 0 4px 0;">Người báo cáo: <strong>${reporterName}</strong></p>
          <p style="margin: 8px 0 0 0;">Mô tả: ${description}</p>
        </div>
      </div>
    </div>
  `;

  return Promise.all(staffEmails.map((email) => sendEmail({ to: email, subject, html })));
}
