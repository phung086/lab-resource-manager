import React from 'react';
import { ShieldOff, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { roleLabels, UserRole } from './accountDirectory.contract';

export type AccountChange = { user: { id: string; role: UserRole; isActive: boolean; fullName: string }; type: 'role' | 'active' | 'delete'; role?: UserRole };

export interface AccountAccessPanelProps {
  isAdmin: boolean;
  actorId: string;
  user: { id: string; role: UserRole; isActive: boolean; fullName: string };
  busy: boolean;
  onPropose: (change: AccountChange) => void;
}

export function AccountAccessPanel(props: AccountAccessPanelProps) {
  const { tr } = useLocale();
  if (!props.isAdmin) {
    return (
      <section className="users-permissions users-permissions-readonly" aria-labelledby="users-perm-title">
        <header className="users-permissions-head">
          <p className="users-permissions-eyebrow">{tr('ui.users.permissions.eyebrow')}</p>
          <h4 id="users-perm-title">{tr('account.users.permissionsTitle')}</h4>
        </header>
        <p className="users-permissions-empty">{tr('account.users.permissionsStaffHint')}</p>
      </section>
    );
  }
  const isSelf = props.actorId === props.user.id;
  const role = props.user.role;
  const canChangeRole = !isSelf && !props.busy;
  const canToggleActive = !isSelf && !props.busy;
  const canDelete = !isSelf && !props.busy;
  return (
    <section className="users-permissions" aria-labelledby="users-perm-title">
      <header className="users-permissions-head">
        <p className="users-permissions-eyebrow">{tr('ui.users.permissions.eyebrow')}</p>
        <h4 id="users-perm-title">{tr('account.users.permissionsTitle')}</h4>
        <p className="users-permissions-sub">{tr('ui.users.permissions.sub')}</p>
      </header>
      <fieldset className="users-field-group" disabled={props.busy}>
        <legend className="users-field-group-title">
          <span className="users-field-group-icon"><UserCog size={14} aria-hidden="true" /></span>
          {tr('ui.users.fieldGroup.access')}
        </legend>
        <div className="users-permission-row">
          <label htmlFor="users-permission-role">{tr('account.users.changeRole')}</label>
          <select
            id="users-permission-role"
            value={role}
            disabled={!canChangeRole}
            onChange={(event) => {
              if (event.target.value === role) return;
              props.onPropose({ user: props.user, type: 'role', role: event.target.value as UserRole });
            }}
          >
            <option value="ADMIN">{tr(roleLabels.ADMIN)}</option>
            <option value="LAB_STAFF">{tr(roleLabels.LAB_STAFF)}</option>
            <option value="CUSTOMER">{tr(roleLabels.CUSTOMER)}</option>
          </select>
        </div>
        <div className="users-permission-row users-permission-row-actions">
          <button
            type="button"
            className={'btn ' + (props.user.isActive ? 'btn-warning' : 'btn-secondary')}
            disabled={!canToggleActive}
            onClick={() => props.onPropose({ user: props.user, type: 'active' })}
          >
            {props.user.isActive ? <><ShieldOff size={16} />{tr('account.users.deactivate')}</> : <><ShieldCheck size={16} />{tr('account.users.reactivate')}</>}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={!canDelete}
            onClick={() => props.onPropose({ user: props.user, type: 'delete' })}
          >
            <Trash2 size={16} />{tr('account.users.delete')}
          </button>
        </div>
        {isSelf && <p className="users-permissions-note">{tr('account.users.selfGuard')}</p>}
      </fieldset>
    </section>
  );
}
