import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, KeyRound, Mail } from 'lucide-react';
import { apiRequest, storeAuthResult } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { formatVietnamDateTime } from '../../../utils/timezone';
import { passwordServerFields, safePasswordFailure, validatePasswordCode, validatePasswordDraft } from '../../../utils/accountSecurityValidation.js';
import '../../../styles/account-security.css';

type Challenge = { challengeId: string; maskedEmail: string; expiresAt: string; resendAfter: string };
type Props = { email?: string; targetId?: string; showSteps?: boolean; onSuccess?: (result: unknown) => void; onBusyChange?: (busy: boolean) => void };

export function PasswordChangeForm({ email, targetId, showSteps = false, onSuccess, onBusyChange }: Props) {
  const { tr } = useLocale(), id = useId(), formRef = useRef<HTMLFormElement>(null), busyRef = useRef(false), requestRef = useRef<AbortController | null>(null), mountedRef = useRef(true);
  const assisted = Boolean(targetId);
  const [draft, setDraft] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [reason, setReason] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null), [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<Record<string,string>>({}), [error, setError] = useState(''), [busy, setBusy] = useState(false), [success, setSuccess] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [resendAt, setResendAt] = useState('');
  const pendingFocus = useRef<string | null>(null);
  const cooldownSeconds = Math.max(0, Math.ceil((Date.parse(resendAt) - now) / 1000)) || 0;
  const expired = Boolean(challenge && Date.parse(challenge.expiresAt) <= now);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; requestRef.current?.abort(); }; }, []);
  useEffect(() => {
    if (!challenge && !resendAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge, resendAt]);
  useEffect(() => {
    if (busy || !pendingFocus.current) return;
    const field = formRef.current?.querySelector<HTMLInputElement>('[name="' + pendingFocus.current + '"]');
    if (field && !field.matches(':disabled')) { pendingFocus.current = null; field.focus(); }
  }, [busy, challenge, errors]);
  const focus = (field: string) => formRef.current?.querySelector<HTMLElement>('[name="' + field + '"]')?.focus();
  function setField(field: keyof typeof draft, value: string) {
    setDraft(current => ({ ...current, [field]: value })); setErrors(current => { const next = { ...current }; delete next[field]; return next; }); setError('');
  }
  function editDetails() { pendingFocus.current = assisted ? 'newPassword' : 'currentPassword'; setChallenge(null); setOtp(''); setErrors({}); setError(''); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busyRef.current || success) return;
    if (!challenge && cooldownSeconds > 0) return;
    const invalid: Record<string,string> = challenge ? validatePasswordCode(otp) : { ...validatePasswordDraft(draft, assisted), ...(assisted && (reason.trim().length < 5 || reason.trim().length > 500) ? { reason: 'account.security.reasonInvalid' } : {}) };
    setErrors(invalid); setError('');
    if (Object.keys(invalid).length) { focus(Object.keys(invalid)[0]); return; }
    if (expired) { setErrors({ otp: 'api.OTP_EXPIRED' }); focus('otp'); return; }
    busyRef.current = true; setBusy(true); onBusyChange?.(true);
    const controller = new AbortController(); requestRef.current = controller;
    try {
      const prefix = assisted ? '/users/' + targetId + '/password-otp' : '/auth/password-otp';
      if (!challenge) {
        const result = await apiRequest(prefix + '/request', { signal: controller.signal, method: 'POST', body: JSON.stringify(assisted ? { reason: reason.trim() } : { currentPassword: draft.currentPassword }) });
        if (!mountedRef.current) return;
        pendingFocus.current = 'otp'; setChallenge(result); setResendAt(result.resendAfter); setNow(Date.now()); setOtp('');
      } else {
        const result = await apiRequest(assisted ? prefix + '/confirm' : '/auth/change-password', { signal: controller.signal, method: 'POST', body: JSON.stringify({ challengeId: challenge.challengeId, otp, newPassword: draft.newPassword, ...(!assisted ? { currentPassword: draft.currentPassword } : {}) }) });
        if (!mountedRef.current) return;
        if (!assisted && result.accessToken && result.user) storeAuthResult(result);
        setDraft({ currentPassword: '', newPassword: '', confirmPassword: '' }); setReason(''); setOtp(''); setChallenge(null); setResendAt(''); setSuccess(true); onSuccess?.(result);
      }
    } catch (cause: unknown) {
      if (!mountedRef.current || controller.signal.aborted) return;
      const fields = passwordServerFields(cause); setErrors(fields);
      if (fields.currentPassword || fields.newPassword || fields.reason) { pendingFocus.current = Object.keys(fields)[0]; setChallenge(null); setOtp(''); }
      else if (Object.keys(fields).length) pendingFocus.current = Object.keys(fields)[0]; else setError(safePasswordFailure(cause));
    } finally { busyRef.current = false; if (mountedRef.current) { setBusy(false); onBusyChange?.(false); } }
  }
  const fields = [
    ...(!assisted ? [{ name: 'currentPassword' as const, label: 'ui.current_password_7f06b3a5' }] : []),
    { name: 'newPassword' as const, label: 'ui.new_password_8f6cace3' },
    { name: 'confirmPassword' as const, label: 'ui.confirm_new_password_7a0fe0f4' }
  ];
  return <form ref={formRef} onSubmit={submit} noValidate className="account-security-form">
    {showSteps && <ol className="account-security-steps" aria-label={tr('ui.profile.passwordSteps')}>{['ui.profile.passwordStep', 'ui.profile.emailStep', 'ui.profile.doneStep'].map((key, index) => { const step = success ? 2 : challenge ? 1 : 0; return <li key={key} aria-current={index===step?'step':undefined} data-complete={index<step}><span aria-hidden="true">{index<step?<Check size={14} />:index+1}</span>{tr(key)}</li>; })}</ol>}
    {success ? <p className="account-security-success" role="status">{tr(assisted ? 'account.security.assistedSuccess' : 'ui.your_password_has_been_updated_90d53208')}</p> : <>
      <p className="account-security-hint">{tr(assisted ? 'account.security.assistedHint' : 'account.security.selfHint')}</p>
      {!challenge && email && <p className="account-security-recipient"><Mail size={16} aria-hidden="true" />{email}</p>}
      {Object.keys(errors).length > 0 && <div className="account-security-error" role="alert"><strong>{tr('ui.account.checkFields')}</strong><ul>{Object.entries(errors).map(([field, key]) => <li key={field}><a href={'#' + id + '-' + field} onClick={event => { event.preventDefault(); focus(field); }}>{tr(key)}</a></li>)}</ul></div>}
      {error && <p className="account-security-error" role="alert">{tr(error)}</p>}
      {!challenge ? <fieldset disabled={busy}>
        {fields.map(field => <label key={field.name} htmlFor={id + '-' + field.name}>{tr(field.label)}<input id={id + '-' + field.name} name={field.name} type="password" required minLength={8} maxLength={128} autoComplete={field.name === 'currentPassword' ? 'current-password' : 'new-password'} value={draft[field.name]} aria-invalid={!!errors[field.name]} aria-describedby={errors[field.name] ? id + '-error-' + field.name : field.name === 'newPassword' ? id + '-password-hint' : undefined} onChange={event => setField(field.name, event.target.value)} />{errors[field.name] && <span id={id + '-error-' + field.name} className="account-security-field-error">{tr(errors[field.name])}</span>}</label>)}
        {assisted && <label htmlFor={id + '-reason'}>{tr('account.security.reason')}<input id={id + '-reason'} name="reason" value={reason} maxLength={500} required aria-invalid={!!errors.reason} aria-describedby={errors.reason ? id + '-error-reason' : undefined} onChange={event => { setReason(event.target.value); setErrors(current => { const next = { ...current }; delete next.reason; return next; }); }} />{errors.reason && <span id={id + '-error-reason'} className="account-security-field-error">{tr(errors.reason)}</span>}</label>}
        <small id={id + '-password-hint'}>{tr('ui.account.passwordHint')}</small>
        {cooldownSeconds > 0 && <p className="account-security-hint" role="status">{tr('account.security.cooldown', { seconds: cooldownSeconds })}</p>}
        <button type="submit" className="btn btn-primary" disabled={cooldownSeconds > 0}><Mail size={16} />{tr(busy ? 'account.security.sendingCode' : 'account.security.sendCode')}</button>
      </fieldset> : <fieldset disabled={busy}>
        <p className="account-security-delivery" role="status">{tr('account.security.codeSent', { email: challenge.maskedEmail })}</p>
        <p className="account-security-hint">{tr('account.security.expiresAt', { time: formatVietnamDateTime(challenge.expiresAt) })}</p>
        {expired && <p className="account-security-error" role="alert">{tr('api.OTP_EXPIRED')}</p>}
        <label htmlFor={id + '-otp'}>{tr('account.security.codeLabel')}<input id={id + '-otp'} name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={otp} required aria-invalid={!!errors.otp} aria-describedby={errors.otp ? id + '-error-otp' : undefined} onChange={event => { setOtp(event.target.value.replace(/\D/g, '').slice(0, 6)); setErrors({}); setError(''); }} />{errors.otp && <span id={id + '-error-otp'} className="account-security-field-error">{tr(errors.otp)}</span>}</label>
        <div className="account-security-actions"><button type="button" className="btn btn-secondary" onClick={editDetails}>{tr(expired ? 'account.security.requestNewCode' : 'account.security.changeDetails')}</button><button type="submit" className="btn btn-primary" disabled={expired}><KeyRound size={16} />{tr(busy ? 'ui.users.saving' : 'account.security.confirmChange')}</button></div>
      </fieldset>}
    </>}
  </form>;
}
