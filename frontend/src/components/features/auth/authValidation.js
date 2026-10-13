// Mirrors the current auth schemas; the server remains authoritative.
const emailPattern = /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i;
export function normalizeAuth(values) {
  const result = { ...values, email: values.email.trim().toLowerCase() };
  for (const field of ['fullName', 'studentId', 'department', 'organization', 'phone']) {
    if (typeof result[field] === 'string') result[field] = result[field].trim();
  }
  if (values.address) result.address = { ...values.address, addressLine: values.address.addressLine.trim() };
  return result;
}
export function validateAuth(values, mode) {
  const data = normalizeAuth(values), errors = {};
  if (!data.email) errors.email = 'ui.customer.emailRequired';
  else if (!emailPattern.test(data.email)) errors.email = 'ui.invalid_email_format_b9c6e7d2';
  if (!data.password) errors.password = 'ui.customer.passwordRequired';
  else if (data.password.length < 8) errors.password = 'ui.password_must_be_at_least_8_7e8d9c0a';
  else if (mode === 'register' && data.password.length > 128) errors.password = 'ui.auth_password_policy';
  return errors;
}
export function authFailure(cause, mode) {
  const code = cause?.code;
  if (mode === 'login' && ['AUTH_INVALID', 'AUTH_INVALID_CREDENTIALS'].includes(code)) return 'api.AUTH_INVALID_CREDENTIALS';
  if (mode === 'register' && code === 'DUPLICATE_EMAIL') return 'ui.email_already_registered_please_login_4d3e2f1a';
  const allowed = ['ACCOUNT_INACTIVE', 'AUTH_EXPIRED', 'FORBIDDEN', 'AUTH_FORBIDDEN', 'RATE_LIMITED', 'DATABASE_UNAVAILABLE', 'NETWORK_UNAVAILABLE', 'REQUEST_TIMEOUT', 'ADDRESS_SOURCE_UNAVAILABLE', 'VALIDATION_ERROR'];
  return allowed.includes(code) ? `api.${code}` : 'ui.auth_service_error';
}
export function serverAuthFields(cause, mode) {
  const result = {};
  if (mode === 'register' && cause?.code === 'DUPLICATE_EMAIL') result.email = 'ui.email_already_registered_please_login_4d3e2f1a';
  if (cause?.code !== 'VALIDATION_ERROR') return result;
  const allowed = ['email', 'password'];
  for (const field of allowed) {
    if (cause.details?.field === field || cause.details?.fieldErrors?.[field]?.length) result[field] = field === 'email' ? 'ui.invalid_email_format_b9c6e7d2' : 'ui.auth_password_policy';
  }

  return result;
}
