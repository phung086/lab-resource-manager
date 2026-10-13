import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useLocale } from '../providers/LocaleProvider';
import { register } from '../api.js';
import { AuthIdentity } from './AuthIdentity';
import { normalizeAuth } from './features/auth/authValidation.js';
import { useAuthDraft, useAuthForm } from './features/auth/useAuthForm';
import { AuthErrorSummary, AuthFieldError } from './features/auth/AuthFeedback';
export interface AuthRegisterViewProps {
  onRegisterSuccess: (user: any) => void; onSwitchToLogin: () => void;
  locale?: string; onLocaleChange?: (locale: string) => void;
}
export const AuthRegisterView: React.FC<AuthRegisterViewProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const { tr } = useLocale();
  const [draft, setDraft, clearDraft] = useAuthDraft('register', { email: '', password: '' });
  const [loading, setLoading] = useState(false), [showPassword, setShowPassword] = useState(false);
  const feedback = useAuthForm('register', draft, { email: 'register-email', password: 'register-password' });
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (feedback.busy.current || !feedback.check()) return;
    feedback.busy.current = true; setLoading(true);
    try { const result = await register(normalizeAuth(draft)); clearDraft(); onRegisterSuccess(result.user); }
    catch (cause) { feedback.failure(cause); }
    finally { feedback.busy.current = false; setLoading(false); }
  }
  return <div className="auth-screen min-h-screen w-full flex items-center justify-center font-sans"><div className="auth-split-grid relative">
    <AuthIdentity registration />
    <div className="auth-panel auth-panel-form flex flex-col justify-between">
      <div className="auth-form-content my-auto w-full mx-auto"><h1 className="text-2xl font-bold font-heading">{tr('ui.create_an_account_aa096410')}</h1><p className="text-xs text-slate-400 mt-1">{tr('ui.customer.registrationHint')}</p>
        <AuthErrorSummary feedback={feedback} />
        <form noValidate ref={feedback.formRef} onBlur={feedback.feedback} onChange={feedback.feedback} onSubmit={submit} className="flex flex-col gap-3 mt-4">
          <div className="flex flex-col gap-1"><label htmlFor="register-email">{tr('ui.account_email_8b7609c7')}</label><div className="relative"><Mail size={16} className="auth-input-icon" /><input id="register-email" {...feedback.attrs('email')} type="email" autoComplete="email" required value={draft.email} onChange={event => setDraft({...draft,email:event.target.value})} className="auth-form-input has-icon w-full" /></div><AuthFieldError id="register-email" error={feedback.errors.email} /></div>
          <div className="flex flex-col gap-1"><label htmlFor="register-password">{tr('ui.password_e985d714')}</label><div className="relative"><Lock size={16} className="auth-input-icon" /><input id="register-password" {...feedback.attrs('password','register-password-hint')} type={showPassword?'text':'password'} autoComplete="new-password" required minLength={8} maxLength={128} value={draft.password} onChange={event => setDraft({...draft,password:event.target.value})} className="auth-form-input has-icon password-input w-full" /><button type="button" className="password-toggle" aria-label={tr(showPassword?'ui.hide_password_edd2eb31':'ui.show_password_acfb0b77')} aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><span id="register-password-hint" className="text-xs text-slate-400">{tr('ui.customer.passwordHint')}</span><AuthFieldError id="register-password" error={feedback.errors.password} /></div>
          <button type="submit" disabled={loading} className="auth-submit-button mt-2 flex items-center justify-center gap-2">{tr(loading?'ui.creating_account_b67f21a2':'ui.create_account_cb84eafd')}<ArrowRight size={16}/></button>
        </form>
      </div>
      <div className="text-center pt-3 border-t"><span>{tr('ui.already_have_a_lab_account_007025ab')}</span><button type="button" className="auth-switch-link ml-1" onClick={onSwitchToLogin}>{tr('ui.sign_in_b1912c20')}</button></div>
    </div>
  </div></div>;
};
