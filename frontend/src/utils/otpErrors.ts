import { hasMessage } from '../i18n.js';
export function mapOtpErrorCode(code?: string, defaultMessage?: string): string {
  const key = `api.${code || 'VALIDATION_ERROR'}`;
  return hasMessage(key) ? key : defaultMessage || 'api.VALIDATION_ERROR';
}
