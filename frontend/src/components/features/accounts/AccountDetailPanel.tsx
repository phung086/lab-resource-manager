import React from 'react';
import { Building2, Calendar, Mail, Phone, ShieldCheck, X } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { roleLabels, DirectoryUser } from './accountDirectory.contract';

export interface AccountDetailPanelProps {
  user: DirectoryUser;
  isAdmin: boolean;
  canEdit: boolean;
  busy: boolean;
  onEdit: () => void;
  onChangePassword: () => void;
  onClose: () => void;
}

export function AccountDetailPanel(props: AccountDetailPanelProps) {
  const { tr } = useLocale();

  const canEditContact = props.canEdit && !props.busy;
  const bookings = props.user._count?.bookings ?? 0;
  const isInactive = !props.user.isActive;

  return (
    <div className="users-dossier-content">
      <header className="users-dossier-head">
        <p className="users-dossier-eyebrow">{tr('ui.users.detail.eyebrow')}</p>
        <div className="users-dossier-id">
          <h3 className="users-dossier-name">{props.user.fullName}</h3>
          <span className={'users-account-role users-role-' + props.user.role.toLowerCase()}>{tr(roleLabels[props.user.role])}</span>
        </div>
        <p className="users-dossier-email"><Mail size={14} aria-hidden="true" />{props.user.email}</p>
        <div className="users-dossier-meta">
          <span className={'users-status' + (props.user.isActive ? ' is-active' : ' is-inactive')}>
            {tr(props.user.isActive ? 'ui.users.statusActive' : 'ui.users.statusInactive')}
          </span>
          {isInactive && <span className="users-status-warning">{tr('ui.users.statusInactiveHint')}</span>}
        </div>
        <button type="button" className="users-dossier-close" onClick={props.onClose} aria-label={tr('ui.users.detail.close')}>
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      <dl className="users-detail-grid">
        <div className="users-detail-card users-detail-card-role">
          <dt><ShieldCheck size={14} aria-hidden="true" />{tr('ui.users.detail.role')}</dt>
          <dd>
            <span className={'users-account-role users-role-' + props.user.role.toLowerCase()}>{tr(roleLabels[props.user.role])}</span>
          </dd>
        </div>
        <div className="users-detail-card users-detail-card-contact">
          <dt><Phone size={14} aria-hidden="true" />{tr('ui.users.detail.phone')}</dt>
          <dd>{props.user.phone || <span className="users-detail-missing">{tr('ui.users.detail.notProvided')}</span>}</dd>
        </div>
        <div className="users-detail-card users-detail-card-affiliation">
          <dt><Building2 size={14} aria-hidden="true" />{tr('ui.users.detail.affiliation')}</dt>
          <dd>{props.user.organization || <span className="users-detail-missing">{tr('ui.users.detail.notProvided')}</span>}</dd>
        </div>
        <div className="users-detail-card users-detail-card-activity">
          <dt><Calendar size={14} aria-hidden="true" />{tr('ui.users.detail.bookings')}</dt>
          <dd><strong>{bookings}</strong></dd>
        </div>
      </dl>

      {canEditContact && (
        <div className="users-contact-actions">
          <button type="button" className="btn btn-secondary" onClick={props.onEdit}>{tr('account.users.editContact')}</button>
          <button type="button" className="btn btn-secondary" onClick={props.onChangePassword}>{tr('account.users.changePassword')}</button>
        </div>
      )}
    </div>
  );
}
