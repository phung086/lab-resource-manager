import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useState, useId } from "react";
import { Server, ShieldCheck, Lock, Mail, ArrowRight, Layers } from "lucide-react";
import { AuthIdentity } from "./AuthIdentity";
import { Eye, EyeOff } from "lucide-react";
import { login } from "../api.js";
import { normalizeAuth } from "./features/auth/authValidation.js";
import { useAuthDraft, useAuthForm } from "./features/auth/useAuthForm";
import { AuthErrorSummary } from "./features/auth/AuthFeedback";

export interface AuthLoginViewProps {
  onLogin: (user: any) => void;
  onSwitchToRegister: () => void;
  locale?: string;
  onLocaleChange?: (loc: string) => void;
}

export const AuthLoginView: React.FC<AuthLoginViewProps> = ({
  onLogin,
  onSwitchToRegister,
  locale = "vi",
  onLocaleChange
}) => {
  const { tr } = useLocale();
  const formId = useId();
  const errorId = `${formId}-error`;
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;

  const [draft, setDraft, clearDraft] = useAuthDraft('login', { email: '', password: '' });
  const { email, password } = draft;
  const setEmail = (email: string) => setDraft({ ...draft, email });
  const setPassword = (password: string) => setDraft({ ...draft, password });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const feedback = useAuthForm('login', draft, { email: emailId, password: passwordId });
  const fieldErrors = feedback.errors;
  const emailErrorId = fieldErrors.email ? emailId + '-error' : undefined;
  const passwordErrorId = fieldErrors.password ? passwordId + '-error' : undefined;
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (feedback.busy.current || !feedback.check()) return;
    feedback.busy.current = true; setIsLoading(true);
    try {
      const data = normalizeAuth(draft);
      const result = await login(data.email, data.password);
      clearDraft(); onLogin(result.user);
    } catch (cause) { feedback.failure(cause); }
    finally { feedback.busy.current = false; setIsLoading(false); }
  }

  return (
    <div className="auth-screen min-h-screen w-full flex items-center justify-center font-sans">
      <div className="auth-split-grid">
        {/* Left Column: Product Identity & Scope */}
        <AuthIdentity />
        <div className="auth-panel auth-panel-form flex flex-col justify-between">
          {/* Header & Language Switch */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{tr("ui.account_access_34b777ad")}</span>

            <div className="auth-language flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLocaleChange && onLocaleChange("vi")}
                aria-pressed={locale === "vi"}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                  locale === "vi"
                    ? "bg-blue-600 border-blue-500 text-white font-semibold"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                 {translate("ui.vi_dc7b94e1")} </button>
              <button
                type="button"
                onClick={() => onLocaleChange && onLocaleChange("en")}
                aria-pressed={locale === "en"}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                  locale === "en"
                    ? "bg-blue-600 border-blue-500 text-white font-semibold"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                 {translate("ui.en_69374b09")} </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="auth-form-content my-auto w-full mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
                {tr("ui.sign_in_70d8f8fd")}</h1>
              <p className="text-xs text-slate-400 mt-1.5">
                {tr("ui.use_your_laboratory_account_to_02c1b4ab")}</p>
            </div>

            <AuthErrorSummary feedback={feedback} />

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
              ref={feedback.formRef}
              onBlur={feedback.feedback}
              onChange={feedback.feedback}
              noValidate
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor={emailId} className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>{tr("ui.account_email_8b7609c7")}</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="auth-input-icon text-slate-400" aria-hidden="true" />
                  <input
                    id={emailId}
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={emailErrorId}
                    className="auth-form-input has-icon w-full text-xs"
                  />
                </div>
                {fieldErrors.email && (
                  <p id={emailErrorId} className="auth-field-error">
                    {tr(fieldErrors.email)}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={passwordId} className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>{tr("ui.password_98128fff")}</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="auth-input-icon text-slate-400" aria-hidden="true" />
                  <input
                    id={passwordId}
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}

                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={passwordErrorId}
                    className="auth-form-input has-icon password-input w-full text-xs"
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    aria-label={showPassword ? tr("ui.hide_password_edd2eb31") : tr("ui.show_password_acfb0b77")}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(value => !value)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id={passwordErrorId} className="auth-field-error">
                    {tr(fieldErrors.password)}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="auth-submit-button mt-2 text-xs flex items-center justify-center gap-2 cursor-pointer font-semibold"
              >
                <span>{isLoading ? tr("ui.signing_in_9707ffe4") : tr("ui.sign_in_0c2debdf")}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </form>
          </div>

          {/* Switch to Register */}
          <div className="text-center pt-4 border-t border-white/10 text-xs text-slate-400">
            <span>{tr("ui.need_a_student_account_e21eee22")}</span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="auth-switch-link text-blue-400 font-semibold cursor-pointer ml-1"
            >
              {tr("ui.create_an_account_c260e2f4")}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
