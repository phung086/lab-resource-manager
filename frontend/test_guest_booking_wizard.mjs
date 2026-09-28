import assert from "node:assert/strict";
import { mapOtpErrorCode } from "./src/utils/otpErrors.ts";
import { getVietnamTodayDateString } from "./src/utils/timezone.ts";

console.log("=== RUNNING GUEST BOOKING WIZARD UNIT TESTS ===");

// 1. Error mapping tests
{
  assert.match(mapOtpErrorCode("OTP_INVALID"), /Mã OTP không chính xác/);
  assert.match(mapOtpErrorCode("OTP_EXPIRED"), /Mã OTP đã hết hạn/);
  assert.match(mapOtpErrorCode("OTP_ATTEMPTS_EXCEEDED"), /nhập sai OTP quá 5 lần/);
  assert.match(mapOtpErrorCode("OTP_ALREADY_USED"), /đã được sử dụng/);
  assert.match(mapOtpErrorCode("OTP_RESEND_TOO_SOON"), /chờ hết thời gian đếm ngược/);
  assert.match(mapOtpErrorCode("EMAIL_DELIVERY_FAILED"), /Không thể gửi email OTP/);
  assert.equal(mapOtpErrorCode("UNKNOWN_ERROR", "Lỗi bất định"), "Lỗi bất định");
}

// 2. Vietnam today string for date picker min
{
  const today = getVietnamTodayDateString();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
}

console.log("Guest Booking Wizard Unit Tests PASS!");
