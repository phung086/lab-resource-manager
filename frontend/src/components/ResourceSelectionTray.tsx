import { ArrowRight, Layers } from 'lucide-react';
import { useLocale } from '../providers/LocaleProvider';
import type { SelectedResource } from '../providers/ResourceSelectionProvider';
import '../styles/resource-selection.css';

export function ResourceSelectionTray({ items, onOpen }: { items: SelectedResource[]; onOpen: () => void }) {
  const { tr } = useLocale();
  if (!items.length) return null;
  return <aside className="resource-selection-tray" aria-label={tr('ui.selectionTray.title')}>
    <Layers size={22} aria-hidden="true" />
    <div><strong>{tr('ui.resourceDiscovery.selectedCount', { value0:items.length })}</strong><p>{items.slice(0,2).map(item => item.name).join(' · ')}{items.length > 2 ? tr('ui.selectionTray.more', { count:items.length - 2 }) : ''}</p><small>{tr('ui.selectionTray.hint')}</small></div>
    <button type="button" className="btn btn-primary" onClick={onOpen}>{tr('ui.selectionTray.open')}<ArrowRight size={18} aria-hidden="true" /></button>
  </aside>;
}
