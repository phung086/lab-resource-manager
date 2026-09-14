import React from "react";
import { ShieldCheck, Inbox, FileCheck, Sparkles, RefreshCw, LucideIcon } from "lucide-react";

export interface EmptyStateCardProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  variant?: "safe" | "info" | "amber";
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  icon: Icon = ShieldCheck,
  title = "Hàng đợi sạch — Mọi tài nguyên đang vận hành ổn định không xung đột",
  description = "Không phát hiện sự cố tồn đọng hay xung đột tài nguyên nào cần xử lý. Hệ thống phân bổ NSGA-II đang hoạt động ở trạng thái tối ưu toàn cục.",
  actionLabel = "⚡ Tạo Vé Mô Phỏng Thử Nghiệm",
  onAction,
  secondaryLabel = "Làm Mới",
  onSecondaryAction,
  variant = "safe"
}) => {
  const glowColors = {
    safe: {
      border: "border-emerald-500/30",
      bgGlow: "rgba(16, 185, 129, 0.15)",
      iconColor: "text-emerald-400",
      badge: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
      btnBg: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-obsidian shadow-[0_0_20px_rgba(16,185,129,0.35)]"
    },
    info: {
      border: "border-cyan-500/30",
      bgGlow: "rgba(0, 229, 255, 0.15)",
      iconColor: "text-cyan-400",
      badge: "bg-cyan-950/80 text-cyan-300 border-cyan-500/40",
      btnBg: "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-obsidian shadow-[0_0_20px_rgba(0,229,255,0.35)]"
    },
    amber: {
      border: "border-amber-500/30",
      bgGlow: "rgba(245, 158, 11, 0.15)",
      iconColor: "text-amber-400",
      badge: "bg-amber-950/80 text-amber-300 border-amber-500/40",
      btnBg: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-obsidian shadow-[0_0_20px_rgba(245,158,11,0.35)]"
    }
  }[variant];

  return (
    <div className={`relative overflow-hidden card p-8 sm:p-12 bg-surface-card backdrop-blur-2xl border ${glowColors.border} rounded-2xl text-center flex flex-col items-center justify-center my-4`}>
      {/* Ambient background glow circle */}
      <div
        className="absolute w-72 h-72 rounded-full pointer-events-none filter blur-3xl opacity-40 -top-10"
        style={{ background: glowColors.bgGlow }}
      />

      {/* 3D Tech Icon with Glowing Ring */}
      <div className="relative mb-5 flex items-center justify-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center border border-white/15 backdrop-blur-xl relative z-10 shadow-2xl"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}
        >
          <Icon size={38} className={`${glowColors.iconColor} filter drop-shadow-[0_0_12px_currentColor]`} />
        </div>
        {/* Pulsing ring behind icon */}
        <div
          className="absolute inset-0 w-20 h-20 rounded-2xl animate-ping opacity-25 pointer-events-none"
          style={{ background: glowColors.bgGlow }}
        />
      </div>

      {/* Status Badge */}
      <div className={`font-mono text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border mb-3 flex items-center gap-1.5 ${glowColors.badge}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        <span>TRẠNG THÁI TỐI ƯU TOÀN CỤC</span>
      </div>

      {/* Confident, Positive Heading */}
      <h3 className="font-heading text-lg sm:text-xl font-bold text-white max-w-xl mb-2 tracking-tight">
        {title}
      </h3>

      {/* Subtitle Description */}
      <p className="text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed mb-6 font-sans">
        {description}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 relative z-10">
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className={`font-mono text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all transform active:scale-95 ${glowColors.btnBg}`}
          >
            <Sparkles size={14} />
            <span>{actionLabel}</span>
          </button>
        )}

        {onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="font-mono text-xs text-slate-300 hover:text-white px-4 py-2.5 rounded-lg border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <RefreshCw size={13} />
            <span>{secondaryLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
