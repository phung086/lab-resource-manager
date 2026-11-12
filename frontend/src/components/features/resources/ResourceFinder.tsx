import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUpRight, ChevronUp, DoorOpen, Search, SearchX, Server, X } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { searchResources, type SearchableResource } from '../../../utils/resourceSearch';
import '../../../styles/resource-finder.css';

type Props<T extends SearchableResource> = {
  records: readonly T[];
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  onPick: (resource: T) => void;
  label: string;
  placeholder?: string;
  className?: string;
  ready?: boolean;
  actionLabel?: string;
  collapsible?: boolean;
};

export function ResourceFinder<T extends SearchableResource>({ records, value, onChange, onSearch, onPick, label, placeholder, className = '', ready = true, actionLabel, collapsible = false }: Props<T>) {
  const { t } = useLocale();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = value.trim();
  const candidates = useMemo(() => query.length < 2 ? [] : searchResources(records, query).slice(0, 5), [records, query]);
  const expanded = open && query.length >= 2;
  const option = expanded && active >= 0 ? candidates[active] : undefined;
  const optionId = (index: number) => `${id}-result-${index}`;

  function close() {
    setOpen(false);
    setActive(-1);
  }
  function dismiss(restoreFocus = false) {
    close();
    if (collapsible) {
      setRevealed(false);
      if (restoreFocus) toggle.current?.focus();
    }
  }
  function submit() {
    if (!query) return;
    dismiss(true);
    onSearch(query);
  }
  function choose(resource: T) {
    dismiss(true);
    onPick(resource);
  }
  function navigateResults(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && option) {
      event.preventDefault();
      choose(option);
      return;
    }
    if (event.key === 'Escape' && (expanded || collapsible)) {
      event.preventDefault();
      event.stopPropagation();
      dismiss(true);
    }
    if (!candidates.length || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
    event.preventDefault();
    setOpen(true);
    const last = candidates.length - 1;
    setActive(event.key === 'ArrowDown' ? (active >= last ? 0 : active + 1) : (active <= 0 ? last : active - 1));
  }

  return <div className={`resource-finder ${className}${collapsible ? ' is-collapsible' : ''}`} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
  }}>
    {collapsible && <button ref={toggle} type="button" className="resource-finder-toggle"
      aria-expanded={revealed} aria-controls={`${id}-search`} aria-label={label} title={label}
      onClick={() => {
        if (revealed) dismiss();
        else {
          setRevealed(true);
          requestAnimationFrame(() => input.current?.focus());
        }
      }}><Search size={19} aria-hidden="true" /></button>}
    <div id={`${id}-search`} className="resource-finder-content" hidden={collapsible && !revealed}
      onKeyDown={event => {
        if (collapsible && event.key === 'Escape' && !event.nativeEvent.isComposing) {
          event.stopPropagation();
          dismiss(true);
        }
      }}>
    <form className="resource-finder-control" role="search" aria-label={label} onSubmit={event => {
      event.preventDefault();
      submit();
    }}>
      <Search className="resource-finder-icon" size={18} aria-hidden="true" />
      <input ref={input} type="search" role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={expanded}
        aria-controls={expanded ? `${id}-results` : undefined} aria-activedescendant={option ? optionId(active) : undefined}
        autoComplete="off" maxLength={120} placeholder={placeholder || label} value={value}
        onFocus={() => setOpen(true)} onKeyDown={navigateResults} onChange={event => { setActive(-1); setOpen(true); onChange(event.target.value); }} />
      {value && <button type="button" className="resource-finder-clear" aria-label={t('ui.resourceFinder.clear')} onClick={() => {
        onChange(''); close(); input.current?.focus();
      }}><X size={15} aria-hidden="true" /></button>}
      <button type="submit" className="resource-finder-submit" aria-label={actionLabel || t('ui.resourceFinder.submit')} disabled={!query}><Search size={18} aria-hidden="true" /></button>
      {collapsible && <button type="button" className="resource-finder-close" aria-label={t('ui.resourceFinder.close')} onClick={() => dismiss(true)}><ChevronUp size={18} aria-hidden="true" /></button>}
    </form>
    {expanded && <div className="resource-finder-panel">
      {candidates.length > 0 && <h3>{t('ui.resourceFinder.matches')}</h3>}
      <div id={`${id}-results`} role="listbox" aria-label={t('ui.resourceFinder.matches')}>
        {candidates.map((record, index) => {
          const image = record.media?.find(item => item.kind === 'IMAGE' && item.url);
          const Icon = record.category === 'ROOM' ? DoorOpen : Server;
          return <div key={record.id} id={optionId(index)} className="resource-finder-option" role="option" aria-selected={active === index}
            onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(record)}>
            <span className="resource-finder-thumbnail" aria-hidden="true"><Icon size={19} />{image && <img src={image.url} alt="" loading="lazy" decoding="async" onError={event => { event.currentTarget.hidden = true; }} />}</span>
            <span className="resource-finder-record"><strong>{record.name}</strong><small>{record.code}{record.laboratory?.name ? ` · ${record.laboratory.name}` : ''}</small></span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </div>;
        })}
      </div>
      {!candidates.length && <div className="resource-finder-empty" role="status"><SearchX size={21} aria-hidden="true" /><span>{t(ready ? 'ui.resourceFinder.noMatches' : 'ui.resourceFinder.unavailable')}</span></div>}
      <button type="button" className="resource-finder-all" onClick={submit} onKeyDown={event => {
        if (event.key === 'Escape' && !collapsible) { event.stopPropagation(); input.current?.focus(); close(); }
      }}>{actionLabel || t('ui.resourceFinder.submit')}<ArrowUpRight size={15} aria-hidden="true" /></button>
    </div>}
    </div>
  </div>;
}
