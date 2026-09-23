import React, { useState } from "react";
import { Server, ShieldCheck, Lock, Mail, ArrowRight, Layers } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const resourceCategories = [
    { name: "Phòng thực hành", code: "ROOM" },
    { name: "Thiết bị đo kiểm", code: "EQUIPMENT" },
    { name: "Máy móc chuyên dụng", code: "MACHINE" },
    { name: "Bộ kit thí nghiệm", code: "EXPERIMENT_KIT" },
    { name: "Vật tư tiêu hao", code: "MATERIAL" }
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login(email, password);
      onLogin(result.user);
    } catch (requestError: any) {
      setError(requestError?.message || "Không thể đăng nhập. Vui lòng kiểm tra thông tin tài khoản.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-screen min-h-screen w-full flex items-center justify-center font-sans">
      <div className="auth-split-grid relative border border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-[#111827]">
        {/* Left Column: Product Identity & Scope */}
        <div className="auth-panel auth-panel-identity flex flex-col justify-between relative">
          <div className="relative z-10">
            {/* Brand Mark */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                <Server size={22} />
              </div>
              <div>
                <h1 className="text-base font-bold font-heading text-white tracking-tight leading-tight">
                  LAB RESOURCE MANAGER
                </h1>
                <p className="text-xs text-slate-400">
                  Hệ thống quản lý tài nguyên phòng thí nghiệm
                </p>
              </div>
            </div>

            {/* Core Value Proposition */}
            <div className="mt-8">
              <span className="inline-block text-[11px] font-semibold text-blue-400 font-mono tracking-wider uppercase mb-2">
                Vận hành & Đặt lịch
              </span>
              <h2 className="text-2xl lg:text-3xl font-bold font-heading text-white tracking-tight leading-snug">
                Quản lý tập trung tài nguyên phòng thí nghiệm trường đại học
              </h2>
              <p className="text-xs lg:text-sm text-slate-400 mt-3 leading-relaxed">
                Nền tảng hỗ trợ giảng viên, sinh viên và cán bộ lab tra cứu danh mục thiết bị,
                đặt lịch sử dụng không trùng lặp, duyệt yêu cầu và quản lý vận hành.
              </p>
            </div>

            {/* 5 Canonical Categories Matrix */}
            <div className="auth-scope-overview mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layers size={14} className="text-blue-400" />
                  <span>PHẠM VI TÀI NGUYÊN</span>
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-medium">5 NHÓM CHUẨN</span>
              </div>
              <div className="auth-category-list">
                {resourceCategories.map((cat) => (
                  <div
                    key={cat.code}
                    className="auth-category-chip flex items-center gap-1.5 text-xs"
                  >
                    <span className="text-slate-300">{cat.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">[{cat.code}]</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security and RBAC footer */}
          <div className="auth-identity-footer relative z-10 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/10 text-xs text-slate-400 mt-6">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-blue-400 shrink-0" />
              <span>Phân quyền 4 vai trò: Admin · Staff · Lecturer · Student</span>
            </span>
          </div>
        </div>

        {/* Right Column: Authentication Form */}
        <div className="auth-panel auth-panel-form flex flex-col justify-between">
          {/* Header & Language Switch */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Cổng xác thực người dùng</span>

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
                VI
              </button>
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
                EN
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="auth-form-content my-auto w-full mx-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-bold font-heading text-white tracking-tight">
                Đăng nhập hệ thống
              </h3>
              <p className="text-xs text-slate-400 mt-1.5">
                Nhập tài khoản đơn vị nghiên cứu hoặc trường đại học để tiếp tục
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-950/70 border border-rose-500/40 rounded-xl text-xs text-rose-200" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-email" className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Email tài khoản *</span>
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
                    placeholder="email@domain.edu.vn"
                    className="auth-form-input has-icon w-full text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-password" className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Mật khẩu *</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="auth-input-icon text-slate-400" aria-hidden="true" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="auth-form-input has-icon w-full text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="auth-submit-button mt-2 text-xs btn-cyan-gradient flex items-center justify-center gap-2 cursor-pointer font-semibold"
              >
                <span>{isLoading ? "Đang xác thực tài khoản..." : "ĐĂNG NHẬP VÀO HỆ THỐNG"}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </form>
          </div>

          {/* Switch to Register */}
          <div className="text-center pt-4 border-t border-white/10 text-xs text-slate-400">
            <span>Chưa có tài khoản sinh viên? </span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="auth-switch-link text-blue-400 font-semibold cursor-pointer ml-1"
            >
              Đăng ký tài khoản mới ➔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
