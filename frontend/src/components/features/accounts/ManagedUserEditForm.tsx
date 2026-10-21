import React, { useEffect, useId, useRef, useState } from 'react';
import { Save, Mail, Phone, Building2, User as UserIcon } from 'lucide-react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { managedUserServerFields, validateManagedUserEdit } from '../../../utils/userValidation';

type ManagedContact = { id: string; fullName: string; email: string; phone?: string | null; organization?: string | null };
export function ManagedUserEditForm({ user, onSaved, onCancel, onBusyChange }: { user: ManagedContact; onSaved: () => void; onCancel: () => void; onBusyChange: (busy: boolean) => void }) {
  const { tr } = useLocale(), id = useId(), ref = useRef<HTMLFormElement>(null), busyRef = useRef(false);
  const [draft, setDraft] = useState({ fullName: user.fullName || '', phone: user.phone || '', organization: user.organization || '' });
  const [errors, setErrors] = useState<Record<string,string>>({}), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const focus = (field: string) => ref.current?.querySelector<HTMLElement>('[name="' + field + '"]')?.focus();
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    if (!busy && pendingFocus.current) { focus(pendingFocus.current); pendingFocus.current = null; }
  }, [busy, errors]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busyRef.current) return;
    const checked = validateManagedUserEdit(draft); setErrors(checked.errors); setError('');
    if (!checked.data) { focus(Object.keys(checked.errors)[0]); return; }
    busyRef.current = true; setBusy(true); onBusyChange(true);
    try { await apiRequest('/users/' + user.id, { method: 'PATCH', body: JSON.stringify(checked.data) }); onSaved(); }
    catch (cause: unknown) { const fields = managedUserServerFields(cause as Parameters<typeof managedUserServerFields>[0]); setErrors(fields); if (Object.keys(fields).length) pendingFocus.current = Object.keys(fields)[0]; else setError(cause instanceof Error ? cause.message : 'ui.users.requestFailed'); }
    finally { busyRef.current = false; setBusy(false); onBusyChange(false); }
  }
  // Three deliberate field groups: identity (who they are), contact (how to reach them),
  // affiliation (where they belong). The email lives in identity but is read-only — admins
  // cannot rewrite a user's login handle from this form, only confirm it.
  return <form ref={ref} className="users-edit-form" onSubmit={save} noValidate>
    <header className="users-edit-form-head">
      <p className="users-edit-form-eyebrow">{tr('ui.users.fieldGroup.eyebrow')}</p>
      <h3>{tr('account.users.editContact')}</h3>
      <p className="users-edit-form-sub">{tr('account.users.emailFixed', { email: user.email })}</p>
    </header>
    {Object.keys(errors).length > 0 && <div className="users-error" role="alert"><strong>{tr('ui.account.checkFields')}</strong><ul>{Object.entries(errors).map(([field,key]) => <li key={field}><a href={'#' + id + '-' + field} onClick={event => { event.preventDefault(); focus(field); }}>{tr(key)}</a></li>)}</ul></div>}
    {error && <p className="users-error" role="alert">{tr(error)}</p>}
    <fieldset disabled={busy}>
      <fieldset className="users-field-group">
        <legend className="users-field-group-title">
          <span className="users-field-group-icon"><UserIcon size={14} aria-hidden="true" /></span>
          {tr('ui.users.fieldGroup.identity')}
        </legend>
        <label htmlFor={id + '-fullName'}>{tr('ui.full_name_03de764f')}<input id={id + '-fullName'} name="fullName" type="text" autoComplete="name" maxLength={255} required value={draft.fullName} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? id + '-error-fullName' : undefined} onChange={event => { setDraft(current => ({ ...current, fullName: event.target.value })); setErrors(current => { const next = { ...current }; delete next.fullName; return next; }); }} />{errors.fullName && <span id={id + '-error-fullName'} className="users-field-error">{tr(errors.fullName)}</span>}</label>
        <div className="users-readonly">
          <span className="users-readonly-label"><Mail size={14} aria-hidden="true" />{tr('ui.email_b41d1762')}</span>
          <span className="users-readonly-value" data-field="email">{user.email}</span>
          <p className="users-readonly-hint">{tr('ui.users.fieldGroup.emailReadonly')}</p>
        </div>
      </fieldset>
      <fieldset className="users-field-group">
        <legend className="users-field-group-title">
          <span className="users-field-group-icon"><Phone size={14} aria-hidden="true" /></span>
          {tr('ui.users.fieldGroup.contact')}
        </legend>
        <label htmlFor={id + '-phone'}>{tr('ui.contact_phone_3b6da57f')}<input id={id + '-phone'} name="phone" type="tel" autoComplete="tel" maxLength={20} value={draft.phone} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? id + '-error-phone' : undefined} onChange={event => { setDraft(current => ({ ...current, phone: event.target.value })); setErrors(current => { const next = { ...current }; delete next.phone; return next; }); }} />{errors.phone && <span id={id + '-error-phone'} className="users-field-error">{tr(errors.phone)}</span>}</label>
      </fieldset>
      <fieldset className="users-field-group">
        <legend className="users-field-group-title">
          <span className="users-field-group-icon"><Building2 size={14} aria-hidden="true" /></span>
          {tr('ui.users.fieldGroup.affiliation')}
        </legend>
        <label htmlFor={id + '-organization'}>{tr('ui.department_organization_e30b494a')}<input id={id + '-organization'} name="organization" type="text" autoComplete="organization" maxLength={160} value={draft.organization} aria-invalid={!!errors.organization} aria-describedby={errors.organization ? id + '-error-organization' : undefined} onChange={event => { setDraft(current => ({ ...current, organization: event.target.value })); setErrors(current => { const next = { ...current }; delete next.organization; return next; }); }} />{errors.organization && <span id={id + '-error-organization'} className="users-field-error">{tr(errors.organization)}</span>}</label>
      </fieldset>
      <div className="users-actions"><button type="button" className="btn btn-secondary" onClick={onCancel}>{tr('ui.cancel_74fcd352')}</button><button type="submit" className="btn btn-primary"><Save size={16} />{tr(busy ? 'ui.users.saving' : 'account.users.saveContact')}</button></div>
    </fieldset>
  </form>;
}
