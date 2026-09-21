import React, { useEffect, useRef } from "react";
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
  dismissible?: boolean;
}

export const BaseModal2026: React.FC<BaseModal2026Props> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-blue-400",
  maxWidth = "max-w-2xl",
  children,
  footer,
  dismissible = true
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dismissibleRef.current) onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop-2026"
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) {
          onCloseRef.current();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Hộp thoại"}
    >
      <div ref={dialogRef} className={`modal-container-2026 ${maxWidth} mx-4 flex flex-col`}>
        {/* Hairline Border Accent Top Edge */}
        <div className="hairline-cyan-gradient" />

        {/* Modal Header */}
        {(title || Icon) && (
          <div className="modal-heading-2026 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center shrink-0">
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
              ref={closeButtonRef}
              type="button"
              onClick={() => { if (dismissible) onCloseRef.current(); }}
              aria-disabled={!dismissible}
              className="modal-close-button-2026 flex items-center justify-center cursor-pointer"
              title="Đóng (Esc)"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="modal-body-2026 px-6 py-5 flex flex-col gap-4">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="modal-footer-2026 flex items-center justify-end gap-3 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
