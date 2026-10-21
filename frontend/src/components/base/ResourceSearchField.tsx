import { ArrowRight, Search } from 'lucide-react';
import '../../styles/resource-search.css';

export function ResourceSearchField({ value, onChange, onSearch, label, placeholder, className = '', allowEmpty = false }: {
  value: string; onChange: (value: string) => void; onSearch: (value: string) => void;
  label: string; placeholder?: string; className?: string; allowEmpty?: boolean;
}) {
  return <form role="search" className={`resource-search ${className}`} aria-label={label} onSubmit={event => {event.preventDefault();onSearch(value.trim());}}>
    <Search size={18} aria-hidden="true"/>
    <input type="search" value={value} maxLength={120} onChange={event=>{const next=event.target.value;onChange(next);if(allowEmpty&&!next)onSearch('');}} aria-label={label} placeholder={placeholder || label}/>
    <button type="submit" disabled={!allowEmpty&&!value.trim()} aria-label={label} title={label}><ArrowRight size={18} aria-hidden="true"/></button>
  </form>;
}
