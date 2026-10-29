import { translate } from "../i18n.js";
import { LanguageToggle } from "./base/LanguageToggle";
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
    const background: { element: HTMLElement; inert: boolean }[] = [];
    let branch = dialogRef.current?.parentElement;
    while (branch && branch !== document.body) {
      for (const sibling of Array.from(branch.parentElement?.children || [])) {
        if (sibling !== branch && sibling instanceof HTMLElement && !['SCRIPT','STYLE','LINK'].includes(sibling.tagName)) {
          background.push({element:sibling,inert:sibling.inert}); sibling.inert=true;
        }
      }
      branch=branch.parentElement;
    }
    const focusTimer = window.setTimeout(() => (closeButtonRef.current || dialogRef.current)?.focus(), 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || dialogRef.current?.closest('[inert]')) return;
      const eventDialog = e.target instanceof Element ? e.target.closest('[role="dialog"]') : null;
      if (eventDialog && eventDialog !== dialogRef.current?.parentElement) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (dismissibleRef.current) onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'summary, video[controls], button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []).filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[hidden],[inert],[aria-hidden="true"]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
      if (!focusable?.length) {
        e.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialogRef.current?.contains(document.activeElement)) {
        e.preventDefault(); (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && document.activeElement === first) {
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
      for (const {element,inert} of background) element.inert=inert;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
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
      aria-label={title || translate("ui.dialog_f750f1ee")}
    >
      <div ref={dialogRef} tabIndex={-1} className={`modal-container-2026 ${maxWidth} mx-4 flex flex-col`}>
        {/* Modal Header */}
        {(title || Icon) && (
          <div className="modal-heading-2026 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="modal-icon-surface flex items-center justify-center shrink-0">
                  <Icon size={18} className={iconColor} />
                </div>
              )}
              <div>
                {title && (
                  <h3 className="text-base font-bold font-heading tracking-tight leading-snug">
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
              title={translate("ui.close_esc_19ad3ad9")}
              aria-label={translate("ui.close_dialog_69eb60a0")}
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="modal-language-row"><LanguageToggle /></div>

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
