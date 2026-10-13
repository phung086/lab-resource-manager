import { HelpDisclosure } from "./base/HelpDisclosure";
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Plus, RefreshCw, ArrowRight, ShieldCheck, UserCheck, UserX, Pencil, KeyRound, Trash2 } from 'lucide-react';
import { apiRequest } from '../api.js';
import { useLocale } from '../providers/LocaleProvider';
import { navigateApp, readRouteParams, workspacePathForTab } from '../workspaceRoutes.js';
import { USER_ROLES, managedUserServerFields, validateManagedUser } from '../utils/userValidation';
import type { UserRole } from '../utils/userValidation';
import { BaseModal2026 } from './BaseModal2026';
import { ManagedUserEditForm } from './features/accounts/ManagedUserEditForm';
import { PasswordChangeForm } from './features/accounts/PasswordChangeForm';
import { LoyaltyPolicySettings } from './features/accounts/LoyaltyPolicySettings';
import '../styles/users-workspace.css';

const roleLabels: Record<UserRole, string> = { ADMIN: 'ui.administrator_d00831ec', LAB_STAFF: 'ui.lab_staff_1b410267', CUSTOMER: 'core.roles.customer' };
type User = { id: string; email: string; fullName: string; role: UserRole; isActive: boolean; deletedAt?: string | null; phone?: string | null; organization?: string | null; department?: string | null; _count?: { bookings: number } };
type Laboratory = { id: string; code: string; name: string; isActive: boolean };
type Assignment = { laboratoryId: string; laboratory: Laboratory };
type Change = { user: User; type: 'role' | 'active' | 'assign' | 'remove' | 'delete'; role?: UserRole; laboratory?: Laboratory };
const failure = (error: unknown) => error instanceof Error ? error.message : 'ui.users.requestFailed';
const initialForm = { fullName: '', email: '', password: '', phone: '', organization: '', role: 'CUSTOMER' as UserRole };
const initialRole = () => { const role = readRouteParams().get('role'); return USER_ROLES.includes(role as UserRole) ? role || '' : ''; };

export function AccessUserManagement({ actorRole, actorId }: { actorRole: string; actorId: string }) {
  const { tr } = useLocale(), formId = useId(), createRef = useRef<HTMLFormElement>(null), dossierRef = useRef<HTMLElement>(null);
  const isAdmin = actorRole === 'ADMIN', allowedRoles = isAdmin ? USER_ROLES : ['CUSTOMER'] as const;
  const loadAbort = useRef<AbortController | null>(null), busyRef = useRef(false);
  const [users, setUsers] = useState<User[]>([]), [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [search, setSearch] = useState(''), [roleFilter, setRoleFilter] = useState(initialRole), [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(() => readRouteParams().get('user') || '');
  const [roles, setRoles] = useState<Record<string, UserRole>>({}), [labChoices, setLabChoices] = useState<Record<string, string>>({});
  const [assignmentRead, setAssignmentRead] = useState<{ userId: string; rows: Assignment[]; loading: boolean; error: string }>({ userId: '', rows: [], loading: false, error: '' });
  const [assignmentRevision, setAssignmentRevision] = useState(0);
  const [showCreate, setShowCreate] = useState(false), [createForm, setCreateForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}), [createError, setCreateError] = useState('');
  const [change, setChange] = useState<Change | null>(null), [busy, setBusy] = useState(false), [actionError, setActionError] = useState(''), [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false), [resetTarget, setResetTarget] = useState<User | null>(null), [reason, setReason] = useState('');
  const reasonRef = useRef<HTMLInputElement>(null);
  const user = !loading && !error ? users.find(item => item.id === selected) : undefined, isStaff = isAdmin && user?.role === 'LAB_STAFF';
  const assignments = assignmentRead.userId === selected ? assignmentRead.rows : [];
  const assignmentsLoading = isStaff && (assignmentRead.userId !== selected || assignmentRead.loading);
  const assignmentsError = assignmentRead.userId === selected ? assignmentRead.error : '';
  const visible = loading || error ? [] : users.filter(item => (!isAdmin ? item.role === 'CUSTOMER' : !roleFilter || item.role === roleFilter) && (!statusFilter || String(item.isActive) === statusFilter) && (item.fullName + ' ' + item.email).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  const load = useCallback(async () => {
    loadAbort.current?.abort(); const controller = new AbortController(); loadAbort.current = controller;
    setLoading(true); setError('');
    try {
      const [nextUsers, nextLabs] = await Promise.all([apiRequest('/users', { signal: controller.signal }), isAdmin ? apiRequest('/users/laboratories', { signal: controller.signal }) : Promise.resolve([])]);
      if (!controller.signal.aborted) { setUsers(nextUsers); setLaboratories(nextLabs); }
    } catch (cause: unknown) { if (!controller.signal.aborted) setError(failure(cause)); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [isAdmin]);
  useEffect(() => { void load(); return () => loadAbort.current?.abort(); }, [load]);
  useEffect(() => {
    const sync = () => { setSelected(readRouteParams().get('user') || ''); setRoleFilter(initialRole()); setActionError(''); setNotice(''); };
    window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => {
    if (!selected || !isStaff) return;
    const controller = new AbortController();
    setAssignmentRead({ userId: selected, rows: [], loading: true, error: '' });
    apiRequest('/users/' + selected + '/lab-assignments', { signal: controller.signal })
      .then(rows => { if (!controller.signal.aborted) setAssignmentRead({ userId: selected, rows, loading: false, error: '' }); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setAssignmentRead({ userId: selected, rows: [], loading: false, error: failure(cause) }); });
    return () => controller.abort();
  }, [selected, isStaff, assignmentRevision]);
  function choose(id: string) {
    if (busyRef.current) return;
    setSelected(id); setEditing(false); setActionError(''); setNotice('');
    const params = readRouteParams(); if (id) params.set('user', id); else params.delete('user');
    navigateApp(workspacePathForTab('users', params), { notify: false });
    if (id && window.matchMedia('(max-width: 1050px)').matches) requestAnimationFrame(() => { dossierRef.current?.scrollIntoView({ block: 'start' }); dossierRef.current?.focus({ preventScroll: true }); });
  }
  function filterRole(role: string) {
    setRoleFilter(role); const params = readRouteParams(); if (role) params.set('role', role); else params.delete('role');
    navigateApp(workspacePathForTab('users', params), { notify: false });
  }
  function propose(next: Change) { if (!busyRef.current) { setChange(next); setReason(''); setActionError(''); setNotice(''); } }
  async function applyChange() {
    if (!change || busyRef.current) return;
    if (change.type === 'delete' && (reason.trim().length < 5 || reason.trim().length > 500)) { setActionError('account.security.reasonInvalid'); reasonRef.current?.focus(); return; }
    busyRef.current = true; setBusy(true); setActionError(''); setNotice('');
    const target = change;
    try {
      const prefix = '/users/' + target.user.id;
      if (target.type === 'role') await apiRequest(prefix + '/role', { method: 'PATCH', body: JSON.stringify({ role: target.role }) });
      if (target.type === 'active') await apiRequest(prefix + '/active', { method: 'PATCH', body: JSON.stringify({ isActive: !target.user.isActive }) });
      if (target.type === 'assign') await apiRequest(prefix + '/lab-assignments', { method: 'POST', body: JSON.stringify({ laboratoryId: target.laboratory?.id }) });
      if (target.type === 'remove') await apiRequest(prefix + '/lab-assignments/' + target.laboratory?.id, { method: 'DELETE' });
      if (target.type === 'delete') await apiRequest(prefix, { method: 'DELETE', body: JSON.stringify({ reason: reason.trim() }) });
      setChange(null); setNotice(target.type === 'delete' ? 'account.users.deleted' : 'ui.users.saved');
      setRoles(current => { const next = { ...current }; delete next[target.user.id]; return next; });
      setLabChoices(current => ({ ...current, [target.user.id]: '' })); setAssignmentRevision(value => value + 1);
      await load();
    } catch (cause: unknown) { setActionError(failure(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault(); if (busyRef.current) return;
    const result = validateManagedUser(createForm, actorRole); setFieldErrors(result.errors); setCreateError('');
    if (!result.data) { createRef.current?.querySelector<HTMLElement>('[name="' + Object.keys(result.errors)[0] + '"]')?.focus(); return; }
    busyRef.current = true; setBusy(true); setNotice('');
    try {
      const created = await apiRequest('/users', { method: 'POST', body: JSON.stringify(result.data) });
      setCreateForm(initialForm); setShowCreate(false); setNotice('ui.users.created'); await load(); setSelected(created.id); const params = readRouteParams(); params.set('user', created.id); navigateApp(workspacePathForTab('users', params), { notify: false });
     } catch (cause: unknown) {
      const fields = managedUserServerFields(cause as Parameters<typeof managedUserServerFields>[0]);
      if (Object.keys(fields).length) {setFieldErrors(fields);createRef.current?.querySelector<HTMLElement>('[name="' + Object.keys(fields)[0] + '"]')?.focus();}
      else setCreateError(failure(cause));
    }
    finally { busyRef.current = false; setBusy(false); }
  }
  const createFields = [
    { name: 'fullName', label: 'ui.full_name_03de764f', type: 'text', max: 255, autocomplete: 'name' },
    { name: 'email', label: 'ui.email_969ccbd3', type: 'email', max: undefined, autocomplete: 'off' },
    { name: 'password', label: 'ui.initial_password_59759f04', type: 'password', max: 128, autocomplete: 'new-password' },
    { name: 'phone', label: 'ui.contact_phone_3b6da57f', type: 'tel', max: 20, autocomplete: 'tel' },
    { name: 'organization', label: 'ui.department_organization_e30b494a', type: 'text', max: 160, autocomplete: 'organization' }
  ] as const;
  const changeTitle = change?.type === 'delete' ? 'account.users.delete' : change?.type === 'role' ? 'ui.users.confirmRole' : change?.type === 'active' ? (change.user.isActive ? 'ui.users.deactivate' : 'ui.users.activate') : change?.type === 'remove' ? 'ui.users.removeLab' : 'ui.users.confirmAssignment';

  return <section className="view-section users-workspace" aria-busy={loading}>
    <header className="users-heading"><div><h1>{tr(isAdmin ? 'ui.user_administration_2a750b85' : 'account.users.customers')}</h1><HelpDisclosure>{tr(isAdmin ? 'ui.users.subtitle' : 'account.users.staffScope')}</HelpDisclosure></div><div className="users-actions">
      {isAdmin && <button type="button" className="btn btn-secondary" onClick={() => navigateApp(workspacePathForTab('chatgpt_bridge'))}>{tr('bridge.title')}</button>}
      <button type="button" className="btn btn-secondary" disabled={loading || busy} onClick={() => void load()}><RefreshCw size={16} />{tr('ui.refresh_46140fa8')}</button>
      <button type="button" className="btn btn-primary" aria-expanded={showCreate} aria-controls={formId + '-create'} disabled={busy} onClick={() => setShowCreate(value => !value)}><Plus size={16} />{tr('ui.create_user_70f60575')}</button>
    </div></header>
    {notice && <p className="users-notice" role="status">{tr(notice)}</p>}
    {isAdmin && <LoyaltyPolicySettings />}
    <div id={formId + '-create'} hidden={!showCreate} className="users-create">
      <div><h2>{tr('ui.create_user_70f60575')}</h2><p>{tr(isAdmin ? 'ui.users.createHint' : 'account.users.staffCreateHint')}</p></div>
      <form ref={createRef} className="users-form" onSubmit={create} noValidate>
        {Object.keys(fieldErrors).length > 0 && <div className="users-error users-form-summary" role="alert"><strong>{tr('ui.users.checkFields')}</strong><ul>{Object.entries(fieldErrors).map(([name, key]) => <li key={name}><a href={'#' + formId + '-' + name} onClick={event => { event.preventDefault(); createRef.current?.querySelector<HTMLElement>('[name="' + name + '"]')?.focus(); }}>{tr(key)}</a></li>)}</ul></div>}
        {createError && <p className="users-error users-form-summary" role="alert">{tr(createError)}</p>}
        {createFields.map(field => <label key={field.name} htmlFor={formId + '-' + field.name}>{tr(field.label)}<input id={formId + '-' + field.name} name={field.name} type={field.type} value={createForm[field.name]} maxLength={field.max} autoComplete={field.autocomplete} required={['fullName','email','password'].includes(field.name)} aria-invalid={!!fieldErrors[field.name]} aria-describedby={fieldErrors[field.name] ? formId + '-error-' + field.name : field.name === 'password' ? formId + '-password-hint' : undefined} disabled={busy} onChange={event => { setCreateForm(current => ({ ...current, [field.name]: event.target.value })); setFieldErrors(current => { const next = { ...current }; delete next[field.name]; return next; }); }} />{fieldErrors[field.name] && <span id={formId + '-error-' + field.name} className="users-field-error">{tr(fieldErrors[field.name])}</span>}{field.name === 'password' && <small id={formId + '-password-hint'}>{tr('ui.users.passwordHint')}</small>}</label>)}
        <label htmlFor={formId + '-role'}>{tr('ui.role_35195dea')}<select id={formId + '-role'} name="role" value={createForm.role} disabled={busy} onChange={event => setCreateForm(current => ({ ...current, role: event.target.value as UserRole }))}>{allowedRoles.map(role => <option key={role} value={role}>{tr(roleLabels[role])}</option>)}</select></label>
        <div className="users-actions users-form-summary"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setShowCreate(false)}>{tr('ui.cancel_74fcd352')}</button><button type="submit" className="btn btn-primary" disabled={busy}>{tr(busy ? 'ui.creating_45c27eb9' : 'ui.create_user_70f60575')}</button></div>
      </form>
    </div>
    {error && <div className="users-error" role="alert">{tr(error)} <button type="button" className="btn btn-secondary" disabled={loading || busy} onClick={() => void load()}>{tr('ui.users.retry')}</button></div>}
    <div className="users-layout">
      <div className="users-directory">
        <div className={isAdmin ? "users-filters" : "users-filters users-filters-customer"}>
          <label>{tr('ui.home.directory.search')}<input type="search" value={search} maxLength={120} placeholder={tr('ui.home.directory.placeholder')} onChange={event => setSearch(event.target.value)} /></label>
          {isAdmin && <label>{tr('ui.role_35195dea')}<select value={roleFilter} onChange={event => filterRole(event.target.value)}><option value="">{tr('ui.home.directory.all')}</option>{USER_ROLES.map(role => <option key={role} value={role}>{tr(roleLabels[role])}</option>)}</select></label>}
          <label>{tr('ui.status_cb31de81')}<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">{tr('ui.users.allStatuses')}</option><option value="true">{tr('ui.active_767d67bb')}</option><option value="false">{tr('ui.inactive_50157a4c')}</option></select></label>
        </div>
        <p className="users-result-count" role="status">{loading ? tr('ui.loading_data_84c68bd5') : tr('ui.users.resultCount', { count: visible.length, total: users.length })}</p>
        <div className="table-wrap users-table"><table><caption className="sr-only">{tr('ui.users_roles_and_laboratory_assignments_0f27b670')}</caption><thead><tr><th>{tr('ui.users_9e9519eb')}</th><th>{tr('ui.role_35195dea')}</th><th>{tr('ui.status_cb31de81')}</th></tr></thead><tbody>{visible.map(item => <tr key={item.id} className={item.id === selected ? 'is-selected' : ''}><td><button type="button" disabled={busy} aria-pressed={item.id === selected} className="users-account" onClick={() => choose(item.id)}><span><strong>{item.fullName || item.email}</strong><small>{item.email}</small></span><ArrowRight size={16} aria-hidden="true" /></button></td><td>{tr(roleLabels[item.role])}</td><td><span className={item.isActive ? 'users-status is-active' : 'users-status'}>{tr(item.deletedAt ? 'account.users.removed' : item.isActive ? 'ui.active_767d67bb' : 'ui.inactive_50157a4c')}</span></td></tr>)}</tbody></table></div>
        {!loading && !error && !visible.length && <div className="users-empty"><h2>{tr(users.length ? 'ui.users.noMatches' : 'ui.users.noAccounts')}</h2><p>{tr(users.length ? 'ui.users.filterHint' : 'ui.users.createHint')}</p>{users.length > 0 && <button className="btn btn-secondary" type="button" onClick={() => { setSearch(''); filterRole(''); setStatusFilter(''); }}>{tr('ui.users.clearFilters')}</button>}</div>}
      </div>
      <aside ref={dossierRef} tabIndex={-1} className="users-dossier" aria-label={tr('ui.users.accountDetails')}>
        {!user ? <div className="users-empty"><ShieldCheck size={28} aria-hidden="true" /><h2>{tr(selected && !loading ? 'ui.users.accountUnavailable' : 'ui.users.selectAccount')}</h2><p>{tr('ui.users.selectHint')}</p></div> : <>
          <header><h2>{user.fullName || user.email}</h2><p>{user.email}</p><span className={user.isActive ? 'users-status is-active' : 'users-status'}>{tr(user.deletedAt ? 'account.users.removed' : user.isActive ? 'ui.active_767d67bb' : 'ui.inactive_50157a4c')}</span></header>
          <dl><div><dt>{tr('ui.role_35195dea')}</dt><dd>{tr(roleLabels[user.role])}</dd></div>{user.department && <div><dt>{tr('ui.users.department')}</dt><dd>{user.department}</dd></div>}<div><dt>{tr('ui.users.bookingCount')}</dt><dd>{user._count?.bookings ?? '—'}</dd></div></dl>
          {!user.deletedAt && <section className="users-contact-actions"><div className="users-actions"><button type="button" className="btn btn-secondary" disabled={busy} aria-expanded={editing} onClick={() => setEditing(value => !value)}><Pencil size={16} />{tr('account.users.editContact')}</button>{user.id !== actorId && <button type="button" className="btn btn-secondary" disabled={busy || !user.isActive} onClick={() => setResetTarget(user)}><KeyRound size={16} />{tr('account.users.resetPassword')}</button>}</div>{editing && <ManagedUserEditForm key={user.id} user={user} onCancel={() => setEditing(false)} onBusyChange={value => { busyRef.current=value; setBusy(value); }} onSaved={() => { setEditing(false); setNotice('ui.users.saved'); void load(); }} />}</section>}
          {!user.deletedAt && <section className="users-permissions"><h3>{tr('ui.users.access')}</h3><p>{tr(isAdmin ? 'ui.users.accessHint' : 'account.users.staffAccessHint')}</p>
            {isAdmin && <><label>{tr('ui.users.newRole')}<select disabled={busy} value={roles[user.id] || user.role} onChange={event => setRoles(current => ({ ...current, [user.id]: event.target.value as UserRole }))}>{USER_ROLES.map(role => <option key={role} value={role}>{tr(roleLabels[role])}</option>)}</select></label>
            <button type="button" className="btn btn-secondary" disabled={busy || !roles[user.id] || roles[user.id] === user.role} onClick={() => propose({ user, type: 'role', role: roles[user.id] })}>{tr('ui.users.reviewRole')}</button></>}
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => propose({ user, type: 'active' })}>{user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}{tr(user.isActive ? 'ui.users.deactivate' : 'ui.users.activate')}</button><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => propose({ user, type: 'delete' })}><Trash2 size={16} />{tr('account.users.delete')}</button>
          </section>}
          {isStaff && <section className="users-lab-scope" aria-busy={assignmentsLoading}><h3>{tr('ui.laboratory_assignments_79925c7e')}</h3><p>{tr('ui.users.labHint')}</p>
            {assignmentsLoading ? <p role="status">{tr('ui.loading_data_84c68bd5')}</p> : assignmentsError ? <p className="users-error" role="alert">{tr(assignmentsError)} <button type="button" className="btn btn-secondary" onClick={() => setAssignmentRevision(value => value + 1)}>{tr('ui.users.retry')}</button></p> : <>
              {assignments.length ? <ul className="users-labs">{assignments.map(assignment => <li key={assignment.laboratoryId}><div><strong>{assignment.laboratory.code}</strong><span>{assignment.laboratory.name}</span>{!assignment.laboratory.isActive && <small>{tr('ui.inactive_50157a4c')}</small>}</div><button type="button" className="btn btn-secondary" disabled={busy} aria-label={tr('ui.users.removeLab') + ': ' + assignment.laboratory.code} onClick={() => propose({ user, type: 'remove', laboratory: assignment.laboratory })}>{tr('ui.users.remove')}</button></li>)}</ul> : <p className="users-muted">{tr('ui.users.noAssignments')}</p>}
              <label>{tr('ui.choose_laboratory_09dc49a7')}<select disabled={busy} value={labChoices[user.id] || ''} onChange={event => setLabChoices(current => ({ ...current, [user.id]: event.target.value }))}><option value="">{tr('ui.choose_laboratory_09dc49a7')}</option>{laboratories.filter(lab => !assignments.some(assignment => assignment.laboratoryId === lab.id)).map(lab => <option key={lab.id} value={lab.id}>{lab.code} · {lab.name}{lab.isActive ? '' : ' (' + tr('ui.inactive_50157a4c') + ')'}</option>)}</select></label>
              <button type="button" className="btn btn-primary" disabled={busy || !laboratories.some(lab => lab.id === labChoices[user.id])} onClick={() => propose({ user, type: 'assign', laboratory: laboratories.find(lab => lab.id === labChoices[user.id]) })}>{tr('ui.users.reviewAssignment')}</button>
            </>}
          </section>}
        </>}
      </aside>
    </div>
    <BaseModal2026 isOpen={!!change} onClose={() => { if (!busy) { setChange(null); setActionError(''); } }} title={tr(changeTitle)} dismissible={!busy}>
      {change && <div className="users-confirm"><h4>{change.user.fullName || change.user.email}</h4><p>{change.user.email}</p>
        {change.type === 'role' && <><p>{tr(roleLabels[change.user.role])} <ArrowRight size={16} aria-hidden="true" /> {tr(roleLabels[change.role!])}</p>{change.user.role === 'LAB_STAFF' && change.role !== 'LAB_STAFF' && <p className="users-error">{tr('ui.users.assignmentRemovalWarning')}</p>}</>}
        {change.type === 'active' && <p>{tr(change.user.isActive ? 'ui.users.deactivateHint' : 'ui.users.activateHint')}</p>}{change.type === 'delete' && <><p>{tr('account.users.deleteHint')}</p><label htmlFor={formId + '-delete-reason'}>{tr('account.security.reason')}<input ref={reasonRef} id={formId + '-delete-reason'} value={reason} required maxLength={500} disabled={busy} aria-invalid={actionError === 'account.security.reasonInvalid'} aria-describedby={actionError ? formId + '-action-error' : undefined} onChange={event => { setReason(event.target.value); setActionError(''); }} /></label></>}
        {change.laboratory && <p><strong>{change.laboratory.code}</strong> · {change.laboratory.name}</p>}
        {actionError && <p id={formId + '-action-error'} className="users-error" role="alert">{tr(actionError)}</p>}
        <div className="users-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { setChange(null); setActionError(''); }}>{tr('ui.cancel_74fcd352')}</button><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void applyChange()}>{tr(busy ? 'ui.users.saving' : 'ui.users.confirm')}</button></div>
      </div>}
    </BaseModal2026>
    <BaseModal2026 isOpen={!!resetTarget} title={tr('account.users.resetPassword')} dismissible={!busy} onClose={() => { if (!busy) setResetTarget(null); }}>
      {resetTarget && <PasswordChangeForm key={resetTarget.id} targetId={resetTarget.id} email={resetTarget.email} onBusyChange={value => { busyRef.current=value; setBusy(value); }} onSuccess={() => { setNotice('account.security.assistedSuccess'); void load(); }} />}
    </BaseModal2026>
  </section>;
}
