import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useState, useRef, useEffect } from "react";
import { Server, ShieldCheck, Lock, Mail, ArrowRight, Layers } from "lucide-react";
import { AuthIdentity } from "./AuthIdentity";
import { Eye, EyeOff } from "lucide-react";
import { login } from "../api.js";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const resourceCategories = [
    { name: tr("ui.practical_classroom_eaa0e133"), code: "ROOM" },
    { name: tr("ui.measurement_equipment_cd72960e"), code: "EQUIPMENT" },
    { name: tr("ui.specialist_machines_aeca1d7c"), code: "MACHINE" },
    { name: tr("ui.experiment_kits_dbba45a1"), code: "EXPERIMENT_KIT" },
    { name: tr("ui.consumables_48d8a486"), code: "MATERIAL" }
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError("");

    try {
      const result = await login(email, password);
      onLogin(result.user);
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_sign_in_check_e387b97e");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-screen min-h-screen w-full flex items-center justify-center font-sans">
      <div className="auth-split-grid relative border border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-[#111827]">
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
              <h3 className="text-2xl font-bold font-heading text-white tracking-tight">
                {tr("ui.sign_in_70d8f8fd")}</h3>
              <p className="text-xs text-slate-400 mt-1.5">
                {tr("ui.use_your_laboratory_account_to_02c1b4ab")}</p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-950/70 border border-rose-500/40 rounded-xl text-xs text-rose-200" role="alert" tabIndex={-1} ref={errorRef}>
                {translate(error)}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-email" className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>{tr("ui.account_email_8b7609c7")}</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="auth-input-icon text-slate-400" aria-hidden="true" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={translate("ui.email_domain_edu_vn_41f1371a")}
                    className="auth-form-input has-icon w-full text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-password" className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>{tr("ui.password_98128fff")}</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="auth-input-icon text-slate-400" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    maxLength={128}
                    placeholder={translate("ui._b36c6545")}
                    className="auth-form-input has-icon password-input w-full text-xs"
                  />
                  <button className="password-toggle" type="button" aria-label={showPassword ? tr("ui.hide_password_edd2eb31") : tr("ui.show_password_acfb0b77")} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="auth-submit-button mt-2 text-xs btn-cyan-gradient flex items-center justify-center gap-2 cursor-pointer font-semibold"
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
