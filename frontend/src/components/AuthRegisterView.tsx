import React, { useState } from "react";
import { Server, ShieldCheck, Lock, Mail, User, BookOpen, ArrowRight, Sparkles, Terminal, CheckCircle2 } from "lucide-react";

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
    { title: "Cấp 40 GPU-hours khởi tạo", desc: "Đủ để hoàn thành bài tập lớn và huấn luyện mô hình cơ bản", color: "text-emerald-400" },
    { title: "Khóa độc quyền GiST Exclusion", desc: "Không bị tranh chấp hay gián đoạn trong suốt khung giờ đã đặt", color: "text-cyan-400" },
    { title: "Tích lũy Điểm Uy Tín Cá Nhân", desc: "Check-in đúng giờ nhận ngay +15% quota thưởng cho các ca sau", color: "text-amber-400" }
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    setTimeout(() => {
      setIsLoading(false);
      const newUser = {
        id: `usr-${Date.now().toString().slice(-4)}`,
        email: email || "newstudent@ailab.edu.vn",
        fullName: fullName || "SV. Nghiên Cứu Mới",
        role: "student",
        studentId: studentId || "20261234",
        department: department,
        quotaUsed: 0,
        quotaTotal: 40.0
      };

      localStorage.setItem("lrm_token", "jwt-token-2026-auth-session");
      localStorage.setItem("lrm_user", JSON.stringify(newUser));
      onRegisterSuccess(newUser);
    }, 700);
  }

  return (
    <div className="min-h-screen w-full bg-[#08090D] flex items-center justify-center p-4 lg:p-8 font-sans">
      <div className="auth-split-grid relative">
        {/* Top hairline gradient */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 z-20" />

        {/* CỘT TRÁI: Quy Chế & Lợi Ích Sinh Viên */}
        <div className="bg-gradient-to-br from-[#0B0F19] via-[#0E1424] to-[#080A10] p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 relative overflow-hidden">
          <div className="absolute top-10 left-10 w-80 h-80 rounded-full bg-cyan-500/10 filter blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-violet-500/10 filter blur-3xl pointer-events-none" />

          {/* Top Brand Tag */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                <Server size={18} />
              </div>
              <div>
                <span className="font-heading text-sm font-bold text-white tracking-wider block">
                  AI LAB ORCHESTRATION
                </span>
                <span className="font-mono text-[10.5px] text-cyan-400 tracking-widest uppercase">
                  ACADEMIC TIER 2026
                </span>
              </div>
            </div>

            <div className="mt-8">
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">
                TÀI KHOẢN NGHIÊN CỨU VIÊN & HỌC THUẬT
              </span>
              <h2 className="text-2xl lg:text-3xl font-bold font-heading text-white tracking-tight mt-3 leading-snug">
                Gia Nhập Cụm Tính Toán Hiệu Năng Cao Của Nhà Trường
              </h2>
              <p className="text-xs lg:text-sm text-slate-400 mt-2 leading-relaxed font-sans max-w-md">
                Dành cho sinh viên thực hiện Đồ án Tốt nghiệp, Học viên Cao học và Nghiên cứu sinh công bố bài báo khoa học Q1/Q2.
              </p>
            </div>
          </div>

          {/* Center: Perks & Quota Benefits */}
          <div className="my-6 flex flex-col gap-3 relative z-10">
            {perks.map((p) => (
              <div
                key={p.title}
                className="p-3.5 bg-black/40 border border-white/10 rounded-xl flex items-start gap-3"
              >
                <CheckCircle2 size={16} className={`${p.color} shrink-0 mt-0.5`} />
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">{p.title}</h4>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Security Footer */}
          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/10 text-[11px] font-mono text-slate-500">
            <span>CHÍNH SÁCH BẢO MẬT & DỮ LIỆU NỘI BỘ</span>
            <span>TIÊU CHUẨN ISO/IEC 27001</span>
          </div>
        </div>

        {/* CỘT PHẢI: Form Đăng Ký */}
        <div className="p-8 lg:p-12 flex flex-col justify-between bg-[#0E121B]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-cyan-400 font-bold">KHỞI TẠO TÀI KHOẢN MỚI</span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLocaleChange && onLocaleChange("vi")}
                className={`font-mono text-xs px-2.5 py-1 rounded border transition-all ${
                  locale === "vi"
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                VI
              </button>
              <button
                type="button"
                onClick={() => onLocaleChange && onLocaleChange("en")}
                className={`font-mono text-xs px-2.5 py-1 rounded border transition-all ${
                  locale === "en"
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="my-auto py-4 max-w-md w-full mx-auto">
            <div className="mb-4">
              <h3 className="text-2xl font-bold font-heading text-white tracking-tight">
                Đăng Ký Tài Khoản
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Điền thông tin định danh sinh viên / cán bộ để nhận mã phê duyệt
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-xs font-mono text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[11px] text-slate-300">Họ và tên đầy đủ *</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VD: Nguyễn Mai Phương"
                    className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-sans outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[11px] text-slate-300">Mã số sinh viên / CB *</label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="VD: 20261456"
                    className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-white rounded-xl px-3 py-2 text-xs font-mono outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[11px] text-slate-300">Email trường (@edu.vn) *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maiphuong@ailab.edu.vn"
                    className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-white rounded-xl px-3 py-2 text-xs font-mono outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-[11px] text-slate-300">Bộ môn / Khoa trực thuộc *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3 py-2 text-xs font-sans outline-none"
                >
                  <option value="Khoa CNTT - Bộ Môn Trí Tuệ Nhân Tạo">Khoa CNTT - Bộ Môn Trí Tuệ Nhân Tạo</option>
                  <option value="Bộ Môn Robotics & Hệ Thống Tự Hành">Bộ Môn Robotics & Hệ Thống Tự Hành</option>
                  <option value="Khối Đồ Án Tốt Nghiệp Kỹ Sư AI 2026">Khối Đồ Án Tốt Nghiệp Kỹ Sư AI 2026</option>
                  <option value="Bộ Môn Hệ Thống Nhúng & IoT">Bộ Môn Hệ Thống Nhúng & IoT</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-[11px] text-slate-300">Mật khẩu khởi tạo *</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự..."
                    className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-mono outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 font-mono text-xs btn-cyan-gradient py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,229,255,0.4)]"
              >
                <span>{isLoading ? "ĐANG TẠO HỒ SƠ..." : "HOÀN TẤT ĐĂNG KÝ (CẤP 40H QUOTA)"}</span>
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
              className="text-cyan-400 font-bold hover:underline cursor-pointer ml-1"
            >
              Đăng nhập ngay ➔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
