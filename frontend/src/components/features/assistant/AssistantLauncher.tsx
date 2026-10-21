import { X } from 'lucide-react';
import { RobotMascot } from './RobotMascot';
import { useLocale } from '../../../providers/LocaleProvider';
import './assistant-widget.css';

export function AssistantLauncher({ open, onClick }: { open: boolean; onClick: () => void }) {
  const { tr } = useLocale();
  return <button type="button" className="assistant-launcher" onClick={onClick}
    aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? 'lab-assistant-panel' : undefined}
    aria-label={tr(open ? 'assistant.minimize' : 'assistant.launcher')}>
    <RobotMascot />
    {open ? <span className="assistant-launcher-close"><X size={16} aria-hidden="true" /></span> : <span className="assistant-launcher-label">{tr('assistant.mascot.label')}</span>}
  </button>;
}
