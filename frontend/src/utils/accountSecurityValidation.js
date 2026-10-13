// These are presentation checks. The API verifies credentials, scope and OTP use.
export function validatePasswordDraft(values, assisted = false) {
  const errors = {};
  if (!assisted && (values.currentPassword.length < 8 || values.currentPassword.length > 128)) errors.currentPassword = 'ui.account.currentPasswordLength';
  if (values.newPassword.length < 8 || values.newPassword.length > 128) errors.newPassword = 'ui.account.newPasswordLength';
  else if (!assisted && values.newPassword === values.currentPassword) errors.newPassword = 'ui.account.passwordDifferent';
  if (!values.confirmPassword || values.confirmPassword !== values.newPassword) errors.confirmPassword = 'ui.new_passwords_do_not_match_c6f3eeb4';
  return errors;
}

export function validatePasswordCode(code) {
  return /^\d{6}$/.test(code) ? {} : { otp: 'account.security.codeInvalid' };
}

export function passwordServerFields(cause) {
  if (cause?.code === 'CURRENT_PASSWORD_INVALID') return { currentPassword: 'ui.customer.currentPasswordInvalid' };
  if (cause?.code === 'PASSWORD_UNCHANGED') return { newPassword: 'ui.account.passwordDifferent' };
  if (['OTP_INVALID', 'OTP_EXPIRED', 'OTP_ALREADY_USED', 'OTP_ATTEMPTS_EXCEEDED'].includes(cause?.code)) return { otp: `api.${cause.code}` };
  if (cause?.code !== 'VALIDATION_ERROR') return {};
  const descriptors = { currentPassword: 'ui.account.currentPasswordLength', newPassword: 'ui.account.newPasswordLength', otp: 'account.security.codeInvalid', reason: 'account.security.reasonInvalid' };
  return Object.fromEntries(Object.entries(descriptors).filter(([field]) => cause.details?.field === field || cause.details?.fieldErrors?.[field]?.length));
}

export function safePasswordFailure(cause) {
  const allowed = ['OTP_COOLDOWN', 'OTP_NOT_SENT', 'OTP_CONTEXT_CHANGED', 'SMTP_NOT_CONFIGURED', 'SMTP_SEND_FAILED', 'VALIDATION_ERROR', 'RATE_LIMITED', 'AUTH_FORBIDDEN', 'FORBIDDEN', 'ACCOUNT_INACTIVE', 'ACCOUNT_REMOVED', 'USER_NOT_FOUND', 'NETWORK_UNAVAILABLE', 'REQUEST_TIMEOUT', 'DATABASE_UNAVAILABLE'];
  return allowed.includes(cause?.code) ? `api.${cause.code}` : 'ui.could_not_change_your_password_6c44efd3';
}
