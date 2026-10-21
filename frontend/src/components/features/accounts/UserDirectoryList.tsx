import React from 'react';
import { Search, Users as UsersIcon, X, Mail } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { roleLabels } from './accountDirectory.contract';

type UserRole = 'ADMIN' | 'LAB_STAFF' | 'CUSTOMER';

export type DirectoryUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
  organization?: string | null;
  department?: string | null;
  _count?: { bookings: number };
};

export interface UserDirectoryListProps {
  users: DirectoryUser[];
  total: number;
  isAdmin: boolean;
  selectedId: string;
  search: string;
  roleFilter: '' | UserRole;
  statusFilter: '' | 'true' | 'false';
  busy: boolean;
  onSearch: (next: string) => void;
  onRoleFilter: (next: '' | UserRole) => void;
  onStatusFilter: (next: '' | 'true' | 'false') => void;
  onSelect: (id: string) => void;
}

export function UserDirectoryList(props: UserDirectoryListProps) {
  const { tr } = useLocale();
  const filtered = props.users.filter((row) =>
    (!props.isAdmin ? row.role === 'CUSTOMER' : !props.roleFilter || row.role === props.roleFilter) &&
    (!props.statusFilter || String(row.isActive) === props.statusFilter) &&
    (row.fullName + ' ' + row.email).toLocaleLowerCase().includes(props.search.trim().toLocaleLowerCase())
  );
  const hasAnyFilter = Boolean(props.search.trim() || props.roleFilter || props.statusFilter);
  return (
    <section className="users-directory" aria-label={tr('ui.users.directory.eyebrow')}>
      <header className="users-directory-head">
        <p className="users-directory-eyebrow">{tr('ui.users.directory.eyebrow')}</p>
        <h3 className="users-directory-title">{tr('ui.users.directory.title')}</h3>
        <p className="users-directory-count">
          <strong>{filtered.length}</strong>
          <span>{tr('ui.users.directory.of', { total: props.total })}</span>
        </p>
      </header>
      <div className="users-filters" role="search">
        <label className="users-filter-search">
          <span className="users-filter-icon"><Search size={14} aria-hidden="true" /></span>
          <input
            type="search"
            value={props.search}
            onChange={(event) => props.onSearch(event.target.value)}
            placeholder={tr('ui.users.directory.searchPlaceholder')}
            aria-label={tr('ui.users.directory.searchLabel')}
          />
          {props.search && (
            <button type="button" className="users-filter-clear" onClick={() => props.onSearch('')} aria-label={tr('ui.users.directory.clearSearch')}>
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </label>
        <label>
          <span>{tr('ui.users.directory.roleFilter')}</span>
          <select value={props.roleFilter} onChange={(event) => props.onRoleFilter(event.target.value as '' | UserRole)}>
            <option value="">{tr('ui.users.directory.roleAll')}</option>
            {props.isAdmin && (
              <>
                <option value="ADMIN">{tr(roleLabels.ADMIN)}</option>
                <option value="LAB_STAFF">{tr(roleLabels.LAB_STAFF)}</option>
              </>
            )}
            <option value="CUSTOMER">{tr(roleLabels.CUSTOMER)}</option>
          </select>
        </label>
        <label>
          <span>{tr('ui.users.directory.statusFilter')}</span>
          <select value={props.statusFilter} onChange={(event) => props.onStatusFilter(event.target.value as '' | 'true' | 'false')}>
            <option value="">{tr('ui.users.directory.statusAll')}</option>
            <option value="true">{tr('ui.users.directory.statusActive')}</option>
            <option value="false">{tr('ui.users.directory.statusInactive')}</option>
          </select>
        </label>
      </div>
      {hasAnyFilter && (
        <p className="users-filter-hint">{tr('ui.users.directory.filterHint')}</p>
      )}
      {filtered.length === 0 ? (
        <div className="users-empty" role="status">
          <span className="users-empty-icon"><UsersIcon size={24} aria-hidden="true" /></span>
          <h4>{tr(props.total === 0 ? 'ui.users.directory.emptyTitle' : 'ui.users.directory.emptyFilteredTitle')}</h4>
          <p>{tr(props.total === 0 ? 'ui.users.directory.emptyBody' : 'ui.users.directory.emptyFilteredBody')}</p>
        </div>
      ) : (
        <ul className="users-table" role="listbox" aria-busy={props.busy}>
          {filtered.map((row) => (
            <li key={row.id} role="option" aria-selected={props.selectedId === row.id}>
              <button
                type="button"
                className={'users-account' + (props.selectedId === row.id ? ' is-selected' : '') + (!row.isActive ? ' is-inactive' : '')}
                onClick={() => props.onSelect(row.id)}
              >
                <span className="users-account-main">
                  <strong className="users-account-name">{row.fullName}</strong>
                  <span className="users-account-email"><Mail size={12} aria-hidden="true" />{row.email}</span>
                </span>
                <span className={'users-account-role users-role-' + row.role.toLowerCase()}>{tr(roleLabels[row.role])}</span>
                <span className={'users-status' + (row.isActive ? ' is-active' : ' is-inactive')}>
                  {tr(row.isActive ? 'ui.users.statusActive' : 'ui.users.statusInactive')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
