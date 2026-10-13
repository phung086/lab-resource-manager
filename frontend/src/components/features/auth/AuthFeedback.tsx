import React from 'react';
import { useLocale, type LocaleMessage } from '../../../providers/LocaleProvider';
import type { useAuthForm } from './useAuthForm';
export function AuthFieldError({ id, error }: { id: string; error?: LocaleMessage }) {
  const { tr } = useLocale();
  return error ? <p id={`${id}-error`} className="auth-field-error">{tr(error)}</p> : null;
}
export function AuthErrorSummary({ feedback }: { feedback: ReturnType<typeof useAuthForm> }) {
  const { tr } = useLocale();
  return feedback.summary ? <div className="auth-error-summary" role="alert" tabIndex={-1} ref={feedback.summaryRef}>{tr(feedback.summary)}</div> : null;
}
