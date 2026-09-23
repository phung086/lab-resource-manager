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
    { title: "Tài khoản sinh viên mặc định", desc: "Vai trò đặc quyền chỉ do quản trị viên phân công", color: "text-emerald-400" },
    { title: "Bảo vệ lịch đặt ở cơ sở dữ liệu", desc: "Ngăn hai yêu cầu đồng thời chiếm cùng một tài nguyên", color: "text-cyan-400" },
    { title: "Quy trình duyệt và bàn giao", desc: "Theo dõi trạng thái đặt lịch và lịch sử sử dụng", color: "text-amber-400" }
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
      setError(requestError?.message || "Không thể đăng ký tài khoản.");
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
                VI
              </button>
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
                EN
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="auth-form-content my-auto w-full mx-auto">
            <div className="mb-4">
              <h3 className="text-2xl font-bold font-heading text-white tracking-tight">
                Đăng Ký Tài Khoản
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Tạo tài khoản LAB để đặt phòng, theo dõi thanh toán và lưu địa chỉ mặc định cho các nghiệp vụ mượn thiết bị sau này.
              </p>
            </div>

            {error && (
              <div className="alert danger mb-4 text-xs" role="alert" tabIndex={-1} ref={errorRef}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="register-full-name" className="font-mono text-[11px] text-slate-300">Họ và tên đầy đủ *</label>
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
                    placeholder="VD: Nguyễn Mai Phương"
                    className="auth-form-input has-icon w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="register-student-id" className="font-mono text-[11px] text-slate-300">Mã số sinh viên (không bắt buộc)</label>
                  <input
                    id="register-student-id"
                    type="text"
                    maxLength={50}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="VD: 20261456"
                    className="auth-form-input w-full text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="register-email" className="font-mono text-[11px] text-slate-300">Email tài khoản *</label>
                  <input
                    id="register-email"
                    autoComplete="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maiphuong@ailab.edu.vn"
                    className="auth-form-input w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="register-department" className="font-mono text-[11px] text-slate-300">Khoa / Bộ môn</label>
                  <input id="register-department" value={department} onChange={e => setDepartment(e.target.value)} maxLength={100} autoComplete="organization" placeholder="Nội bộ trường" className="auth-form-input w-full text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="register-organization" className="font-mono text-[11px] text-slate-300">Đơn vị / tổ chức</label>
                  <input id="register-organization" value={organization} onChange={e => setOrganization(e.target.value)} maxLength={160} autoComplete="organization" placeholder="Khách ngoài trường nếu có" className="auth-form-input w-full text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="register-phone" className="font-mono text-[11px] text-slate-300">Số điện thoại *</label>
                  <input id="register-phone" required value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} autoComplete="tel" placeholder="Dùng cho liên hệ bàn giao" className="auth-form-input w-full text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="register-customer-type" className="font-mono text-[11px] text-slate-300">Nhóm sử dụng</label>
                  <select id="register-customer-type" value={customerType} onChange={e => setCustomerType(e.target.value)} className="auth-form-input w-full text-xs">
                    <option value="INTERNAL">Nội bộ trường</option>
                    <option value="EXTERNAL">Khách / đơn vị ngoài trường</option>
                  </select>
                </div>
              </div>

              <VietnamAddressSelector value={address} onChange={setAddress} required compact />

              <div className="flex flex-col gap-1">
                <label htmlFor="register-password" className="font-mono text-[11px] text-slate-300">Mật khẩu khởi tạo *</label>
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
                    placeholder="Tối thiểu 8 ký tự..."
                    className="auth-form-input has-icon password-input w-full text-xs"
                  />
                  <button className="password-toggle" type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="auth-submit-button mt-2 text-xs btn-cyan-gradient flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? "ĐANG TẠO HỒ SƠ..." : "HOÀN TẤT ĐĂNG KÝ"}</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>

          {/* Switch to Login */}
          <div className="text-center pt-3 border-t border-white/10 text-xs text-slate-400">
            <span>Đã có tài khoản phòng lab? </span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="auth-switch-link text-blue-400 font-semibold cursor-pointer ml-1"
            >
              Đăng nhập ngay ➔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
