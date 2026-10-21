import React, { useId, useRef, useState } from 'react';
import { UserPlus, User as UserIcon, Phone, Building2, KeyRound, UserCog } from 'lucide-react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { managedUserServerFields, validateManagedUser, USER_ROLES, UserRole } from '../../../utils/userValidation';
import { roleLabels } from './accountDirectory.contract';

export interface UserCreatePanelProps {
  isAdmin: boolean;
  actorRole: UserRole;
  busy: boolean;
  onCreated: (id: string) => void;
  onBusyChange: (busy: boolean) => void;
  onCollapse: () => void;
}

const initialForm = { fullName: '', email: '', password: '', phone: '', organization: '', role: 'CUSTOMER' as UserRole };

export function UserCreatePanel(props: UserCreatePanelProps) {
  const { tr } = useLocale();
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const busyRef = useRef(false);
  const [draft, setDraft] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const focus = (field: string) => ref.current?.querySelector<HTMLElement>('[name="' + field + '"]')?.focus();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    const checked = validateManagedUser(draft, props.actorRole);
    setErrors(checked.errors);
    setError('');
    if (!checked.data) {
      focus(Object.keys(checked.errors)[0]);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    props.onBusyChange(true);
    try {
      const created = await apiRequest('/users', { method: 'POST', body: JSON.stringify(checked.data) });
      setDraft(initialForm);
      props.onCreated(created.id);
    } catch (cause: unknown) {
      const fields = managedUserServerFields(cause as Parameters<typeof managedUserServerFields>[0]);
      setErrors(fields);
      if (Object.keys(fields).length) focus(Object.keys(fields)[0]);
      else setError(cause instanceof Error ? cause.message : 'ui.users.requestFailed');
    } finally {
      busyRef.current = false;
      setBusy(false);
      props.onBusyChange(false);
    }
  }

  const allowedRoles = props.isAdmin ? USER_ROLES : (['CUSTOMER'] as const);

  return (
    <form ref={ref} className="users-create" onSubmit={save} noValidate>
      <header className="users-create-head">
        <p className="users-create-eyebrow">{tr('ui.users.create.eyebrow')}</p>
        <h3>
          <UserPlus size={18} aria-hidden="true" />
          {tr('account.users.createTitle')}
        </h3>
        <p className="users-create-sub">{tr('ui.users.create.sub')}</p>
      </header>

      {Object.keys(errors).length > 0 && (
        <div className="users-error" role="alert">
          <strong>{tr('ui.account.checkFields')}</strong>
          <ul>
            {Object.entries(errors).map(([field, key]) => (
              <li key={field}>
                <a href={'#' + id + '-' + field} onClick={(event) => { event.preventDefault(); focus(field); }}>{tr(key)}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="users-error" role="alert">{tr(error)}</p>}

      <fieldset disabled={busy || props.busy}>
        <fieldset className="users-field-group">
          <legend className="users-field-group-title">
            <span className="users-field-group-icon"><UserIcon size={14} aria-hidden="true" /></span>
            {tr('ui.users.fieldGroup.identity')}
          </legend>
          <label htmlFor={id + '-fullName'}>{tr('ui.full_name_03de764f')}
            <input id={id + '-fullName'} name="fullName" type="text" autoComplete="name" maxLength={255} required value={draft.fullName} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? id + '-error-fullName' : undefined} onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))} />
            {errors.fullName && <span id={id + '-error-fullName'} className="users-field-error">{tr(errors.fullName)}</span>}
          </label>
          <label htmlFor={id + '-email'}>{tr('ui.email_b41d1762')}
            <input id={id + '-email'} name="email" type="email" autoComplete="email" maxLength={255} required value={draft.email} aria-invalid={!!errors.email} aria-describedby={errors.email ? id + '-error-email' : undefined} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
            {errors.email && <span id={id + '-error-email'} className="users-field-error">{tr(errors.email)}</span>}
          </label>
          <label htmlFor={id + '-password'}>{tr('ui.password_d46b0c39')}
            <input id={id + '-password'} name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={draft.password} aria-invalid={!!errors.password} aria-describedby={errors.password ? id + '-error-password' : id + '-password-hint'} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} />
            {errors.password ? <span id={id + '-error-password'} className="users-field-error">{tr(errors.password)}</span> : <small id={id + '-password-hint'} className="users-field-hint">{tr('ui.account.passwordHint')}</small>}
          </label>
        </fieldset>

        <fieldset className="users-field-group">
          <legend className="users-field-group-title">
            <span className="users-field-group-icon"><Phone size={14} aria-hidden="true" /></span>
            {tr('ui.users.fieldGroup.contact')}
          </legend>
          <label htmlFor={id + '-phone'}>{tr('ui.contact_phone_3b6da57f')}
            <input id={id + '-phone'} name="phone" type="tel" autoComplete="tel" maxLength={20} value={draft.phone} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? id + '-error-phone' : undefined} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} />
            {errors.phone && <span id={id + '-error-phone'} className="users-field-error">{tr(errors.phone)}</span>}
          </label>
        </fieldset>

        <fieldset className="users-field-group">
          <legend className="users-field-group-title">
            <span className="users-field-group-icon"><Building2 size={14} aria-hidden="true" /></span>
            {tr('ui.users.fieldGroup.affiliation')}
          </legend>
          <label htmlFor={id + '-organization'}>{tr('ui.department_organization_e30b494a')}
            <input id={id + '-organization'} name="organization" type="text" autoComplete="organization" maxLength={160} value={draft.organization} aria-invalid={!!errors.organization} aria-describedby={errors.organization ? id + '-error-organization' : undefined} onChange={(event) => setDraft((current) => ({ ...current, organization: event.target.value }))} />
            {errors.organization && <span id={id + '-error-organization'} className="users-field-error">{tr(errors.organization)}</span>}
          </label>
        </fieldset>

        {props.isAdmin && (
          <fieldset className="users-field-group">
            <legend className="users-field-group-title">
              <span className="users-field-group-icon"><UserCog size={14} aria-hidden="true" /></span>
              {tr('ui.users.fieldGroup.access')}
            </legend>
            <label htmlFor={id + '-role'}>{tr('ui.users.create.roleLabel')}
              <select id={id + '-role'} name="role" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as UserRole }))}>
                {allowedRoles.map((r) => <option key={r} value={r}>{tr(roleLabels[r])}</option>)}
              </select>
            </label>
            <p className="users-field-hint">{tr('ui.users.create.roleHint')}</p>
          </fieldset>
        )}

        <div className="users-actions">
          <button type="button" className="btn btn-secondary" onClick={props.onCollapse} disabled={busy}>{tr('ui.cancel_74fcd352')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            <KeyRound size={16} />
            {tr(busy ? 'ui.users.saving' : 'account.users.createSubmit')}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
