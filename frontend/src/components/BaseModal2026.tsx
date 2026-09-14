import React, { useEffect } from "react";
import { X, LucideIcon } from "lucide-react";

export interface BaseModal2026Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  maxWidth?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const BaseModal2026: React.FC<BaseModal2026Props> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-cyan-400",
  maxWidth = "max-w-2xl",
  children,
  footer
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop-2026"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={`modal-container-2026 ${maxWidth} mx-4 flex flex-col`}>
        {/* Hairline Cyan Gradient Accent Top Edge */}
        <div className="hairline-cyan-gradient" />

        {/* Modal Header */}
        {(title || Icon) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.2)]">
                  <Icon size={18} className={iconColor} />
                </div>
              )}
              <div>
                {title && (
                  <h3 className="text-base font-bold font-heading text-white tracking-tight leading-snug">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-400 font-sans mt-0.5 leading-normal">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-transform hover:rotate-90 duration-200 cursor-pointer"
              title="Đóng (Esc)"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(85vh-120px)] flex flex-col gap-4">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-white/10 bg-black/40 flex items-center justify-end gap-3 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
