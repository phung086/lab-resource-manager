/**
 * Shared OTP Error Code mapping for Open LAB Guest Booking
 */

export function mapOtpErrorCode(code?: string, defaultMessage?: string): string {
  switch (code) {
    case "OTP_INVALID":
      return "Mã OTP không chính xác. Vui lòng kiểm tra lại email.";
    case "OTP_EXPIRED":
      return "Mã OTP đã hết hạn sau 10 phút. Vui lòng gửi lại mã mới.";
    case "OTP_ATTEMPTS_EXCEEDED":
      return "Bạn đã nhập sai OTP quá 5 lần. Yêu cầu đã bị khóa để bảo mật; vui lòng gửi lại mã mới.";
    case "OTP_ALREADY_USED":
      return "Mã OTP này đã được sử dụng. Vui lòng gửi lại mã mới.";
    case "OTP_RESEND_TOO_SOON":
      return "Vui lòng chờ hết thời gian đếm ngược trước khi gửi lại OTP.";
    case "EMAIL_DELIVERY_FAILED":
      return "Không thể gửi email OTP đến địa chỉ này. Vui lòng kiểm tra lại địa chỉ email.";
    default:
      return defaultMessage || "Xác thực OTP thất bại. Vui lòng thử lại.";
  }
}
