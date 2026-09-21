import React, { useState } from "react";
import { Server, ShieldCheck, Lock, Mail, User, BookOpen, ArrowRight, Sparkles, Terminal, CheckCircle2 } from "lucide-react";
import { register } from "../api.js";

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
  const [department, setDepartment] = useState("Khoa CNTT - Bộ Môn Trí Tuệ Nhân Tạo");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const perks = [
    { title: "Tài khoản sinh viên mặc định", desc: "Vai trò đặc quyền chỉ do quản trị viên phân công", color: "text-emerald-400" },
    { title: "Bảo vệ lịch đặt ở cơ sở dữ liệu", desc: "Ngăn hai yêu cầu đồng thời chiếm cùng một tài nguyên", color: "text-cyan-400" },
    { title: "Quy trình duyệt và bàn giao", desc: "Theo dõi trạng thái đặt lịch và lịch sử sử dụng", color: "text-amber-400" }
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await register({ email, password, fullName, studentId, department });
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
        <div className="auth-panel auth-panel-identity flex flex-col justify-between relative overflow-hidden">
          {/* Top Brand Tag */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                <Server size={18} />
              </div>
              <div>
                <span className="font-heading text-sm font-bold text-white tracking-wider block">
                  LAB RESOURCE MANAGER
                </span>
                <span className="font-mono text-[10.5px] text-blue-400 tracking-wider uppercase">
                  HỆ THỐNG VẬN HÀNH PHÒNG THÍ NGHIỆM
                </span>
              </div>
            </div>

            <div className="mt-8">
              <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">
                ĐĂNG KÝ HỌC THUẬT & NGHIÊN CỨU
              </span>
              <h2 className="text-2xl lg:text-3xl font-bold font-heading text-white tracking-tight mt-3 leading-snug">
                Truy Cập Hệ Thống Tài Nguyên Phòng Thí Nghiệm
              </h2>
              <p className="text-xs lg:text-sm text-slate-400 mt-2 leading-relaxed font-sans max-w-md">
                Dành cho sinh viên, học viên cao học và cán bộ nghiên cứu thực hiện đồ án tốt nghiệp, đề tài khoa học và thực hành chuyên đề.
              </p>
            </div>
          </div>

          {/* Center: Perks & Quota Benefits */}
          <div className="auth-benefits my-6 flex flex-col gap-3 relative z-10">
            {perks.map((p) => (
              <div
                key={p.title}
                className="auth-perk flex items-start gap-3"
              >
                <CheckCircle2 size={16} className={`${p.color} shrink-0 mt-0.5`} />
                <div>
                  <h4 className="text-xs font-semibold text-white tracking-wide">{p.title}</h4>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Security Footer */}
          <div className="auth-identity-footer relative z-10 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/10 text-[11px] font-mono text-slate-500 mt-6">
            <span>QUẢN TRỊ TẬP TRUNG · KHOA HỌC DỮ LIỆU & CNTT</span>
            <span>PHIÊN BẢN CHUẨN HOÁ TỐT NGHIỆP</span>
          </div>
        </div>

        {/* CỘT PHẢI: Form Đăng Ký */}
        <div className="auth-panel auth-panel-form flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-blue-400 font-semibold tracking-wider">KHỞI TẠO TÀI KHOẢN MỚI</span>

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
                Điền thông tin định danh sinh viên / cán bộ để nhận quyền truy cập phòng lab
              </p>
            </div>

            {error && (
              <div className="alert danger mb-4 text-xs" role="alert">
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
                  <label htmlFor="register-student-id" className="font-mono text-[11px] text-slate-300">Mã số sinh viên / CB *</label>
                  <input
                    id="register-student-id"
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="VD: 20261456"
                    className="auth-form-input w-full text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="register-email" className="font-mono text-[11px] text-slate-300">Email trường (@edu.vn) *</label>
                  <input
                    id="register-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maiphuong@ailab.edu.vn"
                    className="auth-form-input w-full text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="register-department" className="font-mono text-[11px] text-slate-300">Bộ môn / Khoa trực thuộc *</label>
                <select
                  id="register-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="auth-form-input w-full text-xs"
                >
                  <option value="Khoa CNTT - Bộ Môn Trí Tuệ Nhân Tạo">Khoa CNTT - Bộ Môn Trí Tuệ Nhân Tạo</option>
                  <option value="Bộ Môn Robotics & Hệ Thống Tự Hành">Bộ Môn Robotics & Hệ Thống Tự Hành</option>
                  <option value="Khối Đồ Án Tốt Nghiệp Kỹ Sư AI 2026">Khối Đồ Án Tốt Nghiệp Kỹ Sư AI 2026</option>
                  <option value="Bộ Môn Hệ Thống Nhúng & IoT">Bộ Môn Hệ Thống Nhúng & IoT</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="register-password" className="font-mono text-[11px] text-slate-300">Mật khẩu khởi tạo *</label>
                <div className="relative">
                  <Lock size={14} className="auth-input-icon text-slate-400" />
                  <input
                    id="register-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự..."
                    className="auth-form-input has-icon w-full text-xs"
                  />
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
