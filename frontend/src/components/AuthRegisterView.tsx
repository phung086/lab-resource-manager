import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useState, useRef, useEffect } from "react";
import { Server, ShieldCheck, Lock, Mail, User, BookOpen, ArrowRight, Sparkles, Terminal, CheckCircle2 } from "lucide-react";
import { AuthIdentity } from "./AuthIdentity";
import { Eye, EyeOff } from "lucide-react";
import { register } from "../api.js";
import { VietnamAddressSelector } from "./VietnamAddressSelector";

export interface AuthRegisterViewProps {
  onRegisterSuccess: (user: any) => void;
  onSwitchToLogin: () => void;
  locale?: string;
  onLocaleChange?: (loc: string) => void;
}

export const AuthRegisterView: React.FC<AuthRegisterViewProps> = ({
  onRegisterSuccess,
  onSwitchToLogin,
  locale = "vi",
  onLocaleChange
}) => {
  const { tr } = useLocale();
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [customerType, setCustomerType] = useState("INTERNAL");
  const [address, setAddress] = useState({ addressLine: "", provinceCode: "", wardCode: "" });
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const perks = [
    { title: tr("ui.student_account_by_default_eb7e5226"), desc: tr("ui.privileged_roles_are_assigned_by_1602dd73"), color: "text-emerald-400" },
    { title: tr("ui.database_booking_protection_f11937be"), desc: tr("ui.prevent_concurrent_requests_from_reserving_3fe3227a"), color: "text-cyan-400" },
    { title: tr("ui.approval_and_handover_workflow_2ab20f09"), desc: tr("ui.track_booking_status_and_usage_38c3ffde"), color: "text-amber-400" }
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError("");

    try {
      const result = await register({ email, password, fullName, studentId, department, phone, organization, customerType, address });
      onRegisterSuccess(result.user);
    } catch (requestError: any) {
      setError(requestError?.message || "ui.could_not_create_your_account_40c2f4b9");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-screen min-h-screen w-full flex items-center justify-center font-sans">
      <div className="auth-split-grid relative">
        {/* Top hairline border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-80 z-20" />

        {/* CỘT TRÁI: Quy Chế & Lợi Ích Sinh Viên */}
        <AuthIdentity registration />
        <div className="auth-panel auth-panel-form flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between">

            <div className="auth-language flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLocaleChange && onLocaleChange("vi")}
                aria-pressed={locale === "vi"}
                className={`font-mono text-xs px-2.5 py-1 rounded border transition-all ${
                  locale === "vi"
                    ? "bg-blue-600/20 border-blue-500 text-blue-300 font-semibold"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                 {translate("ui.vi_dc7b94e1")} </button>
              <button
                type="button"
                onClick={() => onLocaleChange && onLocaleChange("en")}
                aria-pressed={locale === "en"}
                className={`font-mono text-xs px-2.5 py-1 rounded border transition-all ${
                  locale === "en"
                    ? "bg-blue-600/20 border-blue-500 text-blue-300 font-semibold"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                 {translate("ui.en_69374b09")} </button>
            </div>
          </div>

          {/* Form */}
          <div className="auth-form-content my-auto w-full mx-auto">
            <div className="mb-4">
              <h3 className="text-2xl font-bold font-heading text-white tracking-tight">
                {tr("ui.create_an_account_aa096410")}</h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                {tr("ui.create_a_lab_account_to_5b26383a")}</p>
            </div>

            {error && (
              <div className="alert danger mb-4 text-xs" role="alert" tabIndex={-1} ref={errorRef}>
                {translate(error)}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="register-full-name" className="font-mono text-[11px] text-slate-300">{tr("ui.full_name_00e2b103")}</label>
                <div className="relative">
                  <User size={14} className="auth-input-icon text-slate-400" />
                  <input
                    id="register-full-name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={255}
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={tr("ui.your_full_name_f26b86e8")}
                    className="auth-form-input has-icon w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="register-student-id" className="font-mono text-[11px] text-slate-300">{tr("ui.student_id_optional_b502e713")}</label>
                  <input
                    id="register-student-id"
                    type="text"
                    maxLength={50}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder={translate("ui.vd_20261456_224f830c")}
                    className="auth-form-input w-full text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="register-email" className="font-mono text-[11px] text-slate-300">{tr("ui.account_email_8b7609c7")}</label>
                  <input
                    id="register-email"
                    autoComplete="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={translate("ui.maiphuong_ailab_edu_vn_dda7481d")}
                    className="auth-form-input w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="register-department" className="font-mono text-[11px] text-slate-300">{tr("ui.faculty_department_2612ad06")}</label>
                  <input id="register-department" value={department} onChange={e => setDepartment(e.target.value)} maxLength={100} autoComplete="organization" placeholder={tr("ui.institution_member_c405637f")} className="auth-form-input w-full text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="register-organization" className="font-mono text-[11px] text-slate-300">{tr("ui.organization_317f6525")}</label>
                  <input id="register-organization" value={organization} onChange={e => setOrganization(e.target.value)} maxLength={160} autoComplete="organization" placeholder={tr("ui.external_organization_if_applicable_506f737e")} className="auth-form-input w-full text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="register-phone" className="font-mono text-[11px] text-slate-300">{tr("ui.phone_number_837d435d")}</label>
                  <input id="register-phone" required value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} autoComplete="tel" placeholder={tr("ui.for_handover_coordination_2b6b1a36")} className="auth-form-input w-full text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="register-customer-type" className="font-mono text-[11px] text-slate-300">{tr("ui.self_declared_user_group_753919d6")}</label>
                  <select id="register-customer-type" value={customerType} onChange={e => setCustomerType(e.target.value)} className="auth-form-input w-full text-xs">
                    <option value="INTERNAL">{tr("ui.institution_member_unverified_c6ed94d8")}</option>
                    <option value="EXTERNAL">{tr("ui.external_visitor_organization_1ef50442")}</option>
                  </select>
                  <span className="font-mono text-[10px] leading-4 text-slate-400">{tr("ui.this_does_not_grant_access_a721d72e")}</span>
                </div>
              </div>

              <VietnamAddressSelector value={address} onChange={setAddress} required compact />

              <div className="flex flex-col gap-1">
                <label htmlFor="register-password" className="font-mono text-[11px] text-slate-300">{tr("ui.password_e985d714")}</label>
                <div className="relative">
                  <Lock size={14} className="auth-input-icon text-slate-400" />
                  <input
                    id="register-password"
                    autoComplete="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    maxLength={128}
                    placeholder={tr("ui.at_least_8_characters_39d8466f")}
                    className="auth-form-input has-icon password-input w-full text-xs"
                  />
                  <button className="password-toggle" type="button" aria-label={showPassword ? tr("ui.hide_password_edd2eb31") : tr("ui.show_password_acfb0b77")} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="auth-submit-button mt-2 text-xs btn-cyan-gradient flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? tr("ui.creating_account_b67f21a2") : tr("ui.create_account_cb84eafd")}</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>

          {/* Switch to Login */}
          <div className="text-center pt-3 border-t border-white/10 text-xs text-slate-400">
            <span>{tr("ui.already_have_a_lab_account_007025ab")}</span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="auth-switch-link text-blue-400 font-semibold cursor-pointer ml-1"
            >
              {tr("ui.sign_in_b1912c20")}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
