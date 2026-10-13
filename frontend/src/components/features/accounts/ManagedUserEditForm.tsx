import React, { useEffect, useId, useRef, useState } from 'react';
import { Save } from 'lucide-react';
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
  return <form ref={ref} className="users-edit-form" onSubmit={save} noValidate>
    <h3>{tr('account.users.editContact')}</h3><p>{tr('account.users.emailFixed', { email: user.email })}</p>
    {Object.keys(errors).length > 0 && <div className="users-error" role="alert"><strong>{tr('ui.account.checkFields')}</strong><ul>{Object.entries(errors).map(([field,key]) => <li key={field}><a href={'#' + id + '-' + field} onClick={event => { event.preventDefault(); focus(field); }}>{tr(key)}</a></li>)}</ul></div>}
    {error && <p className="users-error" role="alert">{tr(error)}</p>}
    <fieldset disabled={busy}>
      {[{name:'fullName' as const,label:'ui.full_name_03de764f',max:255,type:'text',autocomplete:'name'},{name:'phone' as const,label:'ui.contact_phone_3b6da57f',max:20,type:'tel',autocomplete:'tel'},{name:'organization' as const,label:'ui.department_organization_e30b494a',max:160,type:'text',autocomplete:'organization'}].map(field => <label htmlFor={id + '-' + field.name} key={field.name}>{tr(field.label)}<input id={id + '-' + field.name} name={field.name} type={field.type} autoComplete={field.autocomplete} maxLength={field.max} required={field.name === 'fullName'} value={draft[field.name]} aria-invalid={!!errors[field.name]} aria-describedby={errors[field.name] ? id + '-error-' + field.name : undefined} onChange={event => { setDraft(current => ({ ...current, [field.name]: event.target.value })); setErrors(current => { const next = { ...current }; delete next[field.name]; return next; }); }} />{errors[field.name] && <span id={id + '-error-' + field.name} className="users-field-error">{tr(errors[field.name])}</span>}</label>)}
      <div className="users-actions"><button type="button" className="btn btn-secondary" onClick={onCancel}>{tr('ui.cancel_74fcd352')}</button><button type="submit" className="btn btn-primary"><Save size={16} />{tr(busy ? 'ui.users.saving' : 'account.users.saveContact')}</button></div>
    </fieldset>
  </form>;
}
