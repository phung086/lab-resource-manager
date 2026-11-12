import type { ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import '../../styles/expandable-card.css';

/** Native disclosure: optional context expands without hiding required actions. */
export function ExpandableCard({ title, icon: Icon, children, className = '', tone = 'blue' }: {
  title: string; icon: LucideIcon; children: ReactNode; className?: string;
  tone?: 'blue' | 'teal' | 'violet';
}) {
  return <details className={`expandable-card ${className}`} data-tone={tone}>
    <summary><span className="expandable-card-icon"><Icon size={18} aria-hidden="true" /></span><span className="expandable-card-title">{title}</span><ChevronDown className="expandable-card-chevron" size={17} aria-hidden="true" /></summary>
    <div className="expandable-card-content">{children}</div>
  </details>;
}
