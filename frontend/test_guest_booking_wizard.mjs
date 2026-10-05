import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mapOtpErrorCode } from './src/utils/otpErrors.ts';
import { getVietnamTodayDateString } from './src/utils/timezone.ts';
import { loadLocale, activateLocale, translate } from './src/i18n.js';
const originalFetch = globalThis.fetch;
try {
  for (const locale of ['vi', 'en']) {
    globalThis.fetch = async () => new Response(readFileSync(new URL(`./src/locales/catalog/${locale}.json`, import.meta.url)));
    await loadLocale(locale); activateLocale(locale);
    const key = mapOtpErrorCode('OTP_INVALID');
    assert.equal(key, 'api.OTP_INVALID', 'State keeps a stable error key across locales');
    assert.match(translate(key), locale === 'vi' ? /Mã OTP không chính xác/ : /OTP is incorrect/);
    for (const code of ['OTP_EXPIRED','OTP_ATTEMPTS_EXCEEDED','OTP_ALREADY_USED','OTP_RESEND_TOO_SOON','EMAIL_DELIVERY_FAILED']) {
      assert.equal(mapOtpErrorCode(code), `api.${code}`);
      assert.ok(translate(mapOtpErrorCode(code)).length);
    }
    assert.equal(mapOtpErrorCode('UNKNOWN_ERROR', 'Original diagnostic'), 'Original diagnostic');
  }
  assert.match(getVietnamTodayDateString(), /^\d{4}-\d{2}-\d{2}$/);
  console.log('PASS: OTP keys and VI/EN rendering use the loaded catalog; Vietnam date picker remains canonical.');
} finally { globalThis.fetch = originalFetch; }
