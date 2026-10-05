import React, { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "../../providers/LocaleProvider";
import type { QueuePagination as Pagination } from "../../types/queue";
import "../../styles/queue-pagination.css";

export function QueuePagination({ pagination, onPage, disabled = false }: { pagination: Pagination; onPage: (page: number) => void; disabled?: boolean }) {
  const { t } = useLocale();
  const { page, pageSize, total, totalPages } = pagination;
  const previous = useRef<HTMLButtonElement>(null), next = useRef<HTMLButtonElement>(null);
  const keyboardPage = useRef<"previous" | "next" | null>(null);
  useEffect(() => {
    if (disabled || !keyboardPage.current) return;
    const preferred = keyboardPage.current === "next" ? next.current : previous.current;
    const alternate = keyboardPage.current === "next" ? previous.current : next.current;
    if (preferred && !preferred.disabled) preferred.focus();
    else if (alternate && !alternate.disabled) alternate.focus();
    keyboardPage.current = null;
  }, [disabled, page, totalPages]);
  return <nav className="queue-pagination" aria-label={t("ui.queue.pagination")} aria-busy={disabled}>
    <p role="status" aria-live="polite">{t("ui.queue.range", { start: total ? (page - 1) * pageSize + 1 : 0, end: Math.min(page * pageSize, total), total })}</p>
    <div><button ref={previous} type="button" className="secondary-button" disabled={disabled || page <= 1} onClick={event => { if (!event.detail) keyboardPage.current = "previous"; onPage(page - 1); }}><ChevronLeft size={16} aria-hidden="true" />{t("ui.queue.previous")}</button>
      <span>{t("ui.queue.page", { page, pages: Math.max(1, totalPages) })}</span>
      <button ref={next} type="button" className="secondary-button" disabled={disabled || page >= totalPages} onClick={event => { if (!event.detail) keyboardPage.current = "next"; onPage(page + 1); }}>{t("ui.queue.next")}<ChevronRight size={16} aria-hidden="true" /></button></div>
  </nav>;
}
