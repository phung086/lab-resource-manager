import { MessageCircle, X } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import './assistant-widget.css';

export function AssistantLauncher({ open, onClick }: { open: boolean; onClick: () => void }) {
  const { tr } = useLocale();
  return <button type="button" className="assistant-launcher" onClick={onClick}
    aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? 'lab-assistant-panel' : undefined}
    aria-label={tr(open ? 'assistant.minimize' : 'assistant.launcher')}>
    {open ? <X size={19} aria-hidden="true" /> : <MessageCircle size={19} aria-hidden="true" />}
    <span>{tr('assistant.title')}</span>
  </button>;
}
