import React, { useState } from "react";
import { Server, ShieldCheck, Lock, Mail, ArrowRight, Sparkles, Cpu, Radio, Globe, Terminal, CheckCircle2 } from "lucide-react";

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
  const [email, setEmail] = useState("admin@ailab.edu.vn");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const hardwareChips = [
    { name: "DGX H100 SXM5", status: "Online", color: "text-emerald-400" },
    { name: "DGX A100 SuperPOD", status: "Active", color: "text-cyan-400" },
    { name: "DJI Matrice 300 UAV", status: "Docked", color: "text-blue-400" },
    { name: "Jetson AGX Orin 64GB", status: "Ready", color: "text-violet-400" },
    { name: "4K RealSense AI Vision", status: "Stream", color: "text-teal-400" }
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    setTimeout(() => {
      setIsLoading(false);
      // Mock successful login
      const mockUser = {
        id: "admin-01",
        email: email || "admin@ailab.edu.vn",
        fullName: email.includes("student") ? "SV. Nguyễn Mai Phương" : "GS.TS Nguyễn Văn A",
        role: email.includes("student") ? "student" : "admin",
        department: "Khoa CNTT - PTN Trí Tuệ Nhân Tạo 2026",
        quotaUsed: 42.5,
        quotaTotal: 100.0
      };

      localStorage.setItem("lrm_token", "jwt-token-2026-auth-session");
      localStorage.setItem("lrm_user", JSON.stringify(mockUser));
      onLogin(mockUser);
    }, 600);
  }

  function handleQuickFill(role: "admin" | "student") {
    if (role === "admin") {
      setEmail("admin@ailab.edu.vn");
      setPassword("admin123");
    } else {
      setEmail("student@ailab.edu.vn");
      setPassword("student123");
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#08090D] flex items-center justify-center p-4 lg:p-8 font-sans">
      <div className="auth-split-grid relative">
        {/* Top hairline cyan accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 z-20" />

        {/* CỘT TRÁI: Visual Server Rack & Hardware Mesh Graphic */}
        <div className="bg-gradient-to-br from-[#0B0F19] via-[#0E1424] to-[#080A10] p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 relative overflow-hidden">
          {/* Ambient background glow */}
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
                  AUTONOMOUS 2026 CORE
                </span>
              </div>
            </div>

            <div className="mt-8">
              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded border border-amber-500/30">
                LAB HARMONY ENGINE 2026
              </span>
              <h2 className="text-2xl lg:text-3xl font-bold font-heading text-white tracking-tight mt-3 leading-snug">
                Trung Tâm Điều Phối Tài Nguyên Thí Nghiệm AI & Bản Sao Số
              </h2>
              <p className="text-xs lg:text-sm text-slate-400 mt-2 leading-relaxed font-sans max-w-md">
                Tự động hóa phân bổ cụm máy chủ GPU, lịch thiết bị bay không người lái UAV và tối ưu biểu giá điện xanh EVN bằng thuật toán tiến hóa NSGA-II.
              </p>
            </div>
          </div>

          {/* Center Graphic: Hardware Chips Mesh */}
          <div className="my-6 p-4 bg-black/40 border border-white/10 rounded-xl relative z-10">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10 text-[11px] font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Terminal size={12} className="text-cyan-400" />
                <span>ACTIVE CLUSTER TELEMETRY</span>
              </span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>MESH: HEALTHY</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {hardwareChips.map((chip) => (
                <div
                  key={chip.name}
                  className="px-2.5 py-1.5 bg-white/[0.03] border border-white/10 rounded-lg flex items-center gap-2 font-mono text-xs text-slate-300"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${chip.color} bg-current`} />
                  <span>{chip.name}</span>
                  <span className={`text-[10px] ${chip.color}`}>[{chip.status}]</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Security Footer */}
          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/10 text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-cyan-400" />
              <span>TLS 1.3 • Ed25519 Token Signed</span>
            </span>
            <span>NODE-ID: LAB-CORE-VN</span>
          </div>
        </div>

        {/* CỘT PHẢI: Form Đăng Nhập */}
        <div className="p-8 lg:p-12 flex flex-col justify-between bg-[#0E121B]">
          {/* Header & Language Switch */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-slate-500">BẢN THỬ NGHIỆM v3.4.0</span>

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

          {/* Form Content */}
          <div className="my-auto py-6 max-w-md w-full mx-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-bold font-heading text-white tracking-tight">
                Đăng Nhập Cổng Điều Phối
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Nhập tài khoản định danh đơn vị nghiên cứu hoặc trường đại học
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-xs font-mono text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs text-slate-300 flex items-center justify-between">
                  <span>Email Trường / Đơn vị *</span>
                  <span className="text-[10.5px] text-slate-500 font-normal">Đuôi @ailab.edu.vn</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ten.cb@ailab.edu.vn"
                    className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-white rounded-xl pl-10 pr-3 py-2.5 text-xs font-mono outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs text-slate-300 flex items-center justify-between">
                  <span>Mật Khẩu *</span>
                  <a href="#forgot" className="text-[10.5px] text-cyan-400 hover:underline">
                    Quên mật khẩu?
                  </a>
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-white rounded-xl pl-10 pr-3 py-2.5 text-xs font-mono outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 font-mono text-xs btn-cyan-gradient py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,229,255,0.4)]"
              >
                <span>{isLoading ? "ĐANG XÁC THỰC DANH TÍNH..." : "ĐĂNG NHẬP VÀO HỆ THỐNG"}</span>
                <ArrowRight size={14} />
              </button>
            </form>

            {/* Quick Demo Fill Buttons */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Điền mẫu nhanh:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill("admin")}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 text-[11px] cursor-pointer"
                >
                  ⚡ Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("student")}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-300 text-[11px] cursor-pointer"
                >
                  ⚡ Sinh viên
                </button>
              </div>
            </div>
          </div>

          {/* Switch to Register */}
          <div className="text-center pt-4 border-t border-white/10 text-xs text-slate-400">
            <span>Chưa có tài khoản nghiên cứu? </span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-cyan-400 font-bold hover:underline cursor-pointer ml-1"
            >
              Đăng ký tài khoản mới ➔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
