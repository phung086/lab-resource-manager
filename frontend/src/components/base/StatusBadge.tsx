import type { ReactNode } from 'react';
import '../../styles/status-badge.css';

export type StatusTone = 'positive' | 'info' | 'attention' | 'danger' | 'violet' | 'neutral';

/** Presentation only. Callers own status labels and all domain decisions. */
export function StatusBadge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: StatusTone; className?: string }) {
  return <span className={`lab-status ${className}`} data-tone={tone}>{children}</span>;
}
