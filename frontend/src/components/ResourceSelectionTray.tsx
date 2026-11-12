import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Package, ShoppingCart } from 'lucide-react';
import { useLocale } from '../providers/LocaleProvider';
import type { SelectedResource } from '../providers/ResourceSelectionProvider';
import '../styles/resource-selection.css';

export function ResourceSelectionTray({ items, onOpen }: { items: SelectedResource[]; onOpen: () => void }) {
  const { tr } = useLocale();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return <div ref={root} className="header-resource-selection" onKeyDown={event => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
      root.current?.querySelector('button')?.focus();
    }
  }} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button type="button" className="header-icon-btn-2026 selection-toggle"
      aria-label={tr('ui.resourceDiscovery.selectedCount', { value0: items.length })}
      title={tr('ui.selectionTray.title')} aria-expanded={open}
      aria-controls={open ? 'header-resource-selection-panel' : undefined} onClick={() => setOpen(value => !value)}>
      <ShoppingCart size={18} aria-hidden="true" />
      {items.length > 0 && <span className="selection-count">{items.length}</span>}
    </button>
    {open && <section id="header-resource-selection-panel" className="header-selection-panel workspace-popover" aria-label={tr('ui.selectionTray.title')}>
      <header className="workspace-popover-heading"><span className="workspace-popover-icon"><ShoppingCart size={17} aria-hidden="true" /></span>
        <strong>{tr('ui.resourceDiscovery.selectedCount', { value0: items.length })}</strong>
      </header>
      {items.length > 0 && <ul>{items.map(item => <li key={item.id}><Package size={17} aria-hidden="true" /><div><strong>{item.name}</strong><small>{item.code}</small></div></li>)}</ul>}
      <p className="workspace-popover-note">{tr(items.length ? 'ui.selectionTray.hint' : 'ui.resourceSelection.empty')}</p>
      <button type="button" className="btn btn-primary" disabled={!items.length} onClick={() => { setOpen(false); onOpen(); }}>
        {tr('ui.selectionTray.open')}<ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>}
  </div>;
}
